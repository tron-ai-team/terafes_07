package com.tronai.admin;

import com.tronai.agentengine.AgentEngineRegistry;
import com.tronai.ai.gateway.usage.AiUsageEventRepository;
import com.tronai.auth.RefreshTokenRepository;
import com.tronai.desktopagent.device.DesktopDeviceRepository;
import com.tronai.desktopagent.device.DeviceStatus;
import com.tronai.hybrid.HybridRoutingService;
import com.tronai.hybrid.PlatformControlEntity;
import com.tronai.hybrid.PlatformMode;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
// LinkedHashMap used for suspend response

@Service
public class AdminControlService {

    private final UserRepository users;
    private final HybridRoutingService hybrid;
    private final AdminAuditService auditService;
    private final DesktopDeviceRepository devices;
    private final AgentEngineRegistry engines;
    private final AiUsageEventRepository usageEvents;
    private final RefreshTokenRepository refreshTokens;

    public AdminControlService(UserRepository users,
                               HybridRoutingService hybrid,
                               AdminAuditService auditService,
                               DesktopDeviceRepository devices,
                               AgentEngineRegistry engines,
                               AiUsageEventRepository usageEvents,
                               RefreshTokenRepository refreshTokens) {
        this.users = users;
        this.hybrid = hybrid;
        this.auditService = auditService;
        this.devices = devices;
        this.engines = engines;
        this.usageEvents = usageEvents;
        this.refreshTokens = refreshTokens;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Instant dayAgo = Instant.now().minus(1, ChronoUnit.DAYS);
        Map<String, Object> dash = new LinkedHashMap<>();
        dash.put("registeredUsers", users.count());
        dash.put("enabledUsers", users.countByEnabledTrue());
        dash.put("suspendedUsers", users.countBySuspendedAtIsNotNull());
        dash.put("onlineDevices", devices.countByStatus(DeviceStatus.ONLINE));
        dash.put("hybrid", hybrid.metrics());
        dash.put("agentEngines", engines.healthAll());
        // Real usage counts — never invent credits.
        try {
            dash.put("aiUsageEventsLast24h", usageEvents.countByCreatedAtAfter(dayAgo));
        } catch (Exception e) {
            dash.put("aiUsageEventsLast24h", null);
            dash.put("aiUsageEventsNote", "Usage repository query unavailable: " + e.getMessage());
        }
        dash.put("generatedAt", Instant.now());
        dash.put("secretsVisible", false);
        dash.put("note", "Admin dashboard never returns raw provider API secrets.");
        return dash;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listUsers() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : users.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("email", u.getEmail());
            row.put("displayName", u.getDisplayName());
            row.put("role", u.getRole());
            row.put("enabled", u.isEnabled());
            row.put("suspendedAt", u.getSuspendedAt());
            row.put("suspendReason", u.getSuspendReason());
            row.put("lastLoginAt", u.getLastLoginAt());
            out.add(row);
        }
        return out;
    }

    @Transactional
    public Map<String, Object> suspendUser(Long actorId, Long targetId, String reason) {
        User u = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if ("OWNER".equalsIgnoreCase(u.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot suspend OWNER");
        }
        if (actorId != null && actorId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot suspend yourself");
        }
        u.setEnabled(false);
        u.setSuspendedAt(Instant.now());
        u.setSuspendReason(reason == null ? "Suspended by admin" : reason);
        users.save(u);
        // Revoke refresh sessions immediately so suspended users cannot continue via cookie refresh.
        int revoked = refreshTokens.revokeAllForUser(u, Instant.now());
        audit(actorId, "USER_SUSPEND", "user", String.valueOf(targetId),
                (reason == null ? "" : reason) + " refreshTokensRevoked=" + revoked);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("enabled", u.isEnabled());
        out.put("suspendedAt", u.getSuspendedAt());
        out.put("refreshTokensRevoked", revoked);
        return out;
    }

    @Transactional
    public Map<String, Object> restoreUser(Long actorId, Long targetId) {
        User u = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setEnabled(true);
        u.setSuspendedAt(null);
        u.setSuspendReason(null);
        users.save(u);
        audit(actorId, "USER_RESTORE", "user", String.valueOf(targetId), null);
        return Map.of("id", u.getId(), "enabled", u.isEnabled());
    }

    @Transactional
    public PlatformControlEntity updateControl(Long actorId, PlatformControlEntity patch) {
        PlatformControlEntity saved = hybrid.update(patch, actorId);
        audit(actorId, "PLATFORM_CONTROL_UPDATE", "platform", "1", saved.getMode().name());
        return saved;
    }

    @Transactional
    public PlatformControlEntity applyControlPatch(Long actorId, Map<String, Object> body) {
        PlatformControlEntity current = hybrid.state();
        PlatformControlEntity patch = new PlatformControlEntity();
        patch.setMode(current.getMode());
        patch.setLocalRoutingEnabled(current.isLocalRoutingEnabled());
        patch.setCloudRoutingEnabled(current.isCloudRoutingEnabled());
        patch.setPauseNewAiTasks(current.isPauseNewAiTasks());
        patch.setStopNewAgentJobs(current.isStopNewAgentJobs());
        patch.setExhibitionRegistrationOpen(current.isExhibitionRegistrationOpen());
        patch.setMaxConcurrentAiRequests(current.getMaxConcurrentAiRequests());
        patch.setQueueCapacity(current.getQueueCapacity());
        patch.setRtxOverride(current.getRtxOverride());
        patch.setGtxOverride(current.getGtxOverride());

        if (body.get("mode") != null) {
            patch.setMode(PlatformMode.valueOf(String.valueOf(body.get("mode")).toUpperCase()));
        }
        if (body.containsKey("localRoutingEnabled")) {
            patch.setLocalRoutingEnabled(asBool(body.get("localRoutingEnabled")));
        }
        if (body.containsKey("cloudRoutingEnabled")) {
            patch.setCloudRoutingEnabled(asBool(body.get("cloudRoutingEnabled")));
        }
        if (body.containsKey("pauseNewAiTasks")) {
            patch.setPauseNewAiTasks(asBool(body.get("pauseNewAiTasks")));
        }
        if (body.containsKey("stopNewAgentJobs")) {
            patch.setStopNewAgentJobs(asBool(body.get("stopNewAgentJobs")));
        }
        if (body.containsKey("exhibitionRegistrationOpen")) {
            patch.setExhibitionRegistrationOpen(asBool(body.get("exhibitionRegistrationOpen")));
        }
        if (body.get("maxConcurrentAiRequests") != null) {
            patch.setMaxConcurrentAiRequests(Integer.parseInt(String.valueOf(body.get("maxConcurrentAiRequests"))));
        }
        if (body.get("queueCapacity") != null) {
            patch.setQueueCapacity(Integer.parseInt(String.valueOf(body.get("queueCapacity"))));
        }
        if (body.get("rtxOverride") != null) {
            patch.setRtxOverride(String.valueOf(body.get("rtxOverride")));
        }
        if (body.get("gtxOverride") != null) {
            patch.setGtxOverride(String.valueOf(body.get("gtxOverride")));
        }
        return updateControl(actorId, patch);
    }

    private static boolean asBool(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(v));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentAudits() {
        return auditService.recentAudits(100);
    }

    private void audit(Long actorId, String action, String targetType, String targetId, String detail) {
        auditService.log(actorId, action, targetType, targetId, detail, "SUCCESS", null, null);
    }
}
