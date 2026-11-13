package com.tronai.admin.security;

import com.tronai.admin.AdminAuditService;
import com.tronai.auth.RefreshTokenRepository;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AdminSecurityService {

    private final AdminSecurityEventRepository events;
    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;
    private final AdminAuditService auditService;

    public AdminSecurityService(
            AdminSecurityEventRepository events,
            RefreshTokenRepository refreshTokens,
            UserRepository users,
            AdminAuditService auditService) {
        this.events = events;
        this.refreshTokens = refreshTokens;
        this.users = users;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary() {
        Instant now = Instant.now();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mfa", Map.of(
                "status", "NOT_IMPLEMENTED",
                "detail", "Multi-factor authentication is not enabled on this deployment"));
        out.put("sessionRevocation", Map.of("supported", true));
        out.put("oauth", Map.of("providersExposed", false));
        out.put("activeRefreshSessions", refreshTokens.countActiveSessions(now));
        out.put("suspendedAccounts", users.countBySuspendedAtIsNotNull());
        out.put("failedLoginTracking", Map.of(
                "status", "PARTIAL",
                "detail", "Dedicated failed_login_attempts table is planned; use security events / auth logs when present"));
        out.put("generatedAt", now);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        return summary();
    }

    @Transactional
    public Map<String, Object> revokeUserSessions(Long actorId, String actorRole, Long targetUserId) {
        User target = users.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if ("OWNER".equalsIgnoreCase(target.getRole()) && !"OWNER".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot revoke OWNER sessions");
        }
        int revoked = refreshTokens.revokeAllForUser(target, Instant.now());
        auditService.log(actorId, "SECURITY_REVOKE_USER_SESSIONS", "user", String.valueOf(targetUserId),
                "revoked=" + revoked, "SUCCESS", null, actorRole);
        recordEvent("SESSION_REVOKE_USER", "INFO", actorId, targetUserId, "revoked=" + revoked, null);
        return Map.of("userId", targetUserId, "refreshTokensRevoked", revoked);
    }

    @Transactional
    public Map<String, Object> emergencyRevokeAllNonOwners(Long actorId, String actorRole) {
        if (!"OWNER".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "OWNER role required");
        }
        int revoked = refreshTokens.revokeAllActiveExceptOwners(Instant.now());
        auditService.log(actorId, "SECURITY_EMERGENCY_REVOKE_ALL", "system", "ALL_NON_OWNER",
                "revoked=" + revoked, "SUCCESS", null, actorRole);
        recordEvent("SESSION_EMERGENCY_REVOKE", "CRITICAL", actorId, null,
                "revokedNonOwnerSessions=" + revoked, null);
        return Map.of(
                "revoked", revoked,
                "ownersPreserved", true,
                "note", "TRON refresh sessions revoked for non-OWNER accounts. Google account passwords are unaffected.");
    }

    private void recordEvent(
            String type, String severity, Long actorId, Long targetUserId, String detail, String requestId) {
        AdminSecurityEventEntity event = new AdminSecurityEventEntity();
        event.setEventType(type);
        event.setSeverity(severity);
        event.setActorUserId(actorId);
        event.setTargetUserId(targetUserId);
        event.setDetail(detail);
        event.setRequestId(requestId);
        event.setCreatedAt(Instant.now());
        events.save(event);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listEvents(Pageable pageable) {
        return events.findAllByOrderByCreatedAtDesc(pageable).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId());
            row.put("eventType", e.getEventType());
            row.put("severity", e.getSeverity());
            row.put("actorUserId", e.getActorUserId());
            row.put("targetUserId", e.getTargetUserId());
            row.put("detail", e.getDetail());
            row.put("requestId", e.getRequestId());
            row.put("createdAt", e.getCreatedAt());
            return row;
        });
    }
}
