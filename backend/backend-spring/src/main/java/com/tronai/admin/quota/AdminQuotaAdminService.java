package com.tronai.admin.quota;

import com.tronai.admin.AdminAuditService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminQuotaAdminService {

    private final AdminQuotaPolicyRepository policyRepository;
    private final AdminUserQuotaOverrideRepository overrideRepository;
    private final AdminFeatureQuotaService featureQuotaService;
    private final AdminAuditService auditService;

    public AdminQuotaAdminService(
            AdminQuotaPolicyRepository policyRepository,
            AdminUserQuotaOverrideRepository overrideRepository,
            AdminFeatureQuotaService featureQuotaService,
            AdminAuditService auditService) {
        this.policyRepository = policyRepository;
        this.overrideRepository = overrideRepository;
        this.featureQuotaService = featureQuotaService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPolicies() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminQuotaPolicyEntity p : policyRepository.findAllByOrderByMeterAscScopeAsc()) {
            out.add(policyMap(p));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> patchPolicy(Long actorId, Long policyId, Map<String, Object> body) {
        AdminQuotaPolicyEntity p = policyRepository.findById(policyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Policy not found"));
        if (body.get("dailyLimit") != null) {
            p.setDailyLimit(Integer.parseInt(String.valueOf(body.get("dailyLimit"))));
        }
        if (body.get("mode") != null) {
            p.setMode(AdminQuotaMode.fromDb(String.valueOf(body.get("mode"))).name());
        }
        if (body.containsKey("enabled")) {
            p.setEnabled(Boolean.parseBoolean(String.valueOf(body.get("enabled"))));
        }
        p.setRevision(p.getRevision() + 1);
        p.setUpdatedBy(actorId);
        p.setUpdatedAt(Instant.now());
        policyRepository.save(p);
        auditService.log(actorId, "QUOTA_POLICY_UPDATE", "quota_policy", String.valueOf(policyId), null, "SUCCESS", null, null);
        return policyMap(p);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listUserOverrides(Long userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminUserQuotaOverrideEntity o : overrideRepository.findByUserId(userId)) {
            out.add(overrideMap(o));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> upsertUserOverride(Long actorId, Long userId, String meter, Map<String, Object> body) {
        AdminQuotaMeter parsed = AdminQuotaMeter.valueOf(meter.trim().toUpperCase());
        AdminUserQuotaOverrideEntity entity = overrideRepository.findByUserIdAndMeter(userId, parsed.name())
                .orElseGet(AdminUserQuotaOverrideEntity::new);
        boolean creating = entity.getId() == null;
        entity.setUserId(userId);
        entity.setMeter(parsed.name());
        if (body != null && body.containsKey("inherit") && Boolean.parseBoolean(String.valueOf(body.get("inherit")))) {
            entity.setInherit(true);
            entity.setOverrideLimit(null);
        } else {
            entity.setInherit(false);
            if (body == null || body.get("overrideLimit") == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "overrideLimit is required unless inherit=true");
            }
            entity.setOverrideLimit(Integer.parseInt(String.valueOf(body.get("overrideLimit"))));
        }
        if (body != null && body.get("notes") != null) {
            entity.setNotes(String.valueOf(body.get("notes")));
        }
        entity.setRevision(creating ? 1 : entity.getRevision() + 1);
        entity.setUpdatedBy(actorId);
        entity.setUpdatedAt(Instant.now());
        if (creating) {
            entity.setCreatedAt(Instant.now());
        }
        overrideRepository.save(entity);
        auditService.log(actorId, "QUOTA_OVERRIDE_UPSERT", "user", String.valueOf(userId),
                parsed.name(), "SUCCESS", null, null);
        return overrideMap(entity);
    }

    @Transactional
    public Map<String, Object> deleteUserOverride(Long actorId, Long userId, String meter) {
        AdminQuotaMeter parsed = AdminQuotaMeter.valueOf(meter.trim().toUpperCase());
        AdminUserQuotaOverrideEntity entity = overrideRepository.findByUserIdAndMeter(userId, parsed.name())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Override not found"));
        overrideRepository.delete(entity);
        auditService.log(actorId, "QUOTA_OVERRIDE_DELETE", "user", String.valueOf(userId),
                parsed.name(), "SUCCESS", null, null);
        return Map.of("userId", userId, "meter", parsed.name(), "status", "INHERIT");
    }

    @Transactional
    public Map<String, Object> patchPolicyByMeter(Long actorId, String meter, Map<String, Object> body) {
        AdminQuotaMeter parsed = AdminQuotaMeter.valueOf(meter.trim().toUpperCase());
        AdminQuotaPolicyEntity p = policyRepository
                .findByMeterAndScopeAndRoleNameIsNull(parsed.name(), AdminFeatureQuotaService.SCOPE_GLOBAL)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Global policy not found"));
        return patchPolicy(actorId, p.getId(), body);
    }

    /**
     * Frontend-shaped global quota view expected by Antigravity Admin UI.
     * Maps meter policies → flat GlobalQuotaConfig fields. Does not invent token budgets.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getGlobalQuotaFacade() {
        Map<String, AdminQuotaPolicyEntity> byMeter = new LinkedHashMap<>();
        for (AdminQuotaPolicyEntity p : policyRepository.findAllByOrderByMeterAscScopeAsc()) {
            if (AdminFeatureQuotaService.SCOPE_GLOBAL.equals(p.getScope()) && p.getRoleName() == null) {
                byMeter.put(p.getMeter(), p);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("aiChatDailyLimit", limitOf(byMeter, AdminQuotaMeter.AI_CHAT));
        out.put("aiVoiceDailyLimit", limitOf(byMeter, AdminQuotaMeter.AI_VOICE));
        out.put("aiInterviewDailyLimit", limitOf(byMeter, AdminQuotaMeter.AI_INTERVIEW));
        out.put("cvMagicFillDailyLimit", limitOf(byMeter, AdminQuotaMeter.CV_MAGIC_FILL));
        out.put("cvAiAssistDailyLimit", limitOf(byMeter, AdminQuotaMeter.CV_AI_ASSIST));
        // Explicit UNAVAILABLE markers (never emit fabricated 0 budgets).
        out.put("dailyTokenBudget", "UNAVAILABLE");
        out.put("monthlyTokenBudget", "UNAVAILABLE");
        out.put("monthlySpendingCapUsd", "UNAVAILABLE");
        out.put("tokenBudgetsMeasurement", "unavailable");
        out.put("resetSchedule", "Daily at 00:00 JST (15:00 UTC)");
        out.put("timezone", AdminFeatureQuotaService.JST.getId());
        out.put("resetAt", featureQuotaService.nextResetAtJst());
        Map<String, Object> featuresEnabled = new LinkedHashMap<>();
        featuresEnabled.put("aiChat", enabledOf(byMeter, AdminQuotaMeter.AI_CHAT));
        featuresEnabled.put("aiVoice", enabledOf(byMeter, AdminQuotaMeter.AI_VOICE));
        featuresEnabled.put("aiInterview", enabledOf(byMeter, AdminQuotaMeter.AI_INTERVIEW));
        featuresEnabled.put("cvMagicFill", enabledOf(byMeter, AdminQuotaMeter.CV_MAGIC_FILL));
        featuresEnabled.put("cvAiAssist", enabledOf(byMeter, AdminQuotaMeter.CV_AI_ASSIST));
        out.put("featuresEnabled", featuresEnabled);
        Map<String, Object> modes = new LinkedHashMap<>();
        for (AdminQuotaMeter meter : AdminQuotaMeter.values()) {
            AdminQuotaPolicyEntity p = byMeter.get(meter.name());
            modes.put(meter.name(), p == null ? AdminQuotaMode.OBSERVE.name() : p.getMode());
        }
        out.put("modes", modes);
        out.put("note", "Feature request caps are persisted; token/spend budgets remain unavailable until pricing is configured.");
        return out;
    }

    @Transactional
    public Map<String, Object> putGlobalQuotaFacade(Long actorId, Map<String, Object> body) {
        if (body == null || body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body is required");
        }
        patchLimitIfPresent(actorId, body, "aiChatDailyLimit", AdminQuotaMeter.AI_CHAT);
        patchLimitIfPresent(actorId, body, "aiVoiceDailyLimit", AdminQuotaMeter.AI_VOICE);
        patchLimitIfPresent(actorId, body, "aiInterviewDailyLimit", AdminQuotaMeter.AI_INTERVIEW);
        patchLimitIfPresent(actorId, body, "cvMagicFillDailyLimit", AdminQuotaMeter.CV_MAGIC_FILL);
        patchLimitIfPresent(actorId, body, "cvAiAssistDailyLimit", AdminQuotaMeter.CV_AI_ASSIST);

        Object featuresObj = body.get("featuresEnabled");
        if (featuresObj instanceof Map<?, ?> features) {
            patchEnabledIfPresent(actorId, features, "aiChat", AdminQuotaMeter.AI_CHAT);
            patchEnabledIfPresent(actorId, features, "aiVoice", AdminQuotaMeter.AI_VOICE);
            patchEnabledIfPresent(actorId, features, "aiInterview", AdminQuotaMeter.AI_INTERVIEW);
            patchEnabledIfPresent(actorId, features, "cvMagicFill", AdminQuotaMeter.CV_MAGIC_FILL);
            patchEnabledIfPresent(actorId, features, "cvAiAssist", AdminQuotaMeter.CV_AI_ASSIST);
        }

        if (body.containsKey("dailyTokenBudget")
                || body.containsKey("monthlyTokenBudget")
                || body.containsKey("monthlySpendingCapUsd")) {
            auditService.log(actorId, "QUOTA_GLOBAL_TOKEN_BUDGET_IGNORED", "quota_policy", "GLOBAL",
                    "Token/spend budget fields are not persisted yet", "SUCCESS", null, null);
        }
        auditService.log(actorId, "QUOTA_GLOBAL_UPDATE", "quota_policy", "GLOBAL", null, "SUCCESS", null, null);
        return getGlobalQuotaFacade();
    }

    @Transactional
    public Map<String, Object> putUserOverridesBulk(Long actorId, Long userId, Map<String, Object> body) {
        if (body == null || body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body is required");
        }
        String notes = body.get("notes") == null ? null : String.valueOf(body.get("notes"));
        List<Map<String, Object>> saved = new ArrayList<>();
        upsertIfPresent(actorId, userId, body, notes, "aiChatDailyLimit", AdminQuotaMeter.AI_CHAT, saved);
        upsertIfPresent(actorId, userId, body, notes, "aiVoiceDailyLimit", AdminQuotaMeter.AI_VOICE, saved);
        upsertIfPresent(actorId, userId, body, notes, "aiInterviewDailyLimit", AdminQuotaMeter.AI_INTERVIEW, saved);
        upsertIfPresent(actorId, userId, body, notes, "cvMagicFillDailyLimit", AdminQuotaMeter.CV_MAGIC_FILL, saved);
        upsertIfPresent(actorId, userId, body, notes, "cvAiAssistDailyLimit", AdminQuotaMeter.CV_AI_ASSIST, saved);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", userId);
        out.put("overrides", listUserOverrides(userId));
        out.put("updatedMeters", saved.size());
        if (notes != null) {
            out.put("notes", notes);
        }
        if (body.containsKey("dailyTokenCeiling")) {
            out.put("dailyTokenCeiling", Map.of(
                    "accepted", false,
                    "measurement", "unavailable",
                    "reason", "Token ceilings are not enforced yet; request-count overrides only"));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> deleteAllUserOverrides(Long actorId, Long userId) {
        List<AdminUserQuotaOverrideEntity> existing = overrideRepository.findByUserId(userId);
        for (AdminUserQuotaOverrideEntity entity : existing) {
            overrideRepository.delete(entity);
        }
        auditService.log(actorId, "QUOTA_OVERRIDE_DELETE_ALL", "user", String.valueOf(userId),
                "count=" + existing.size(), "SUCCESS", null, null);
        return Map.of("userId", userId, "deleted", existing.size(), "status", "INHERIT");
    }

    @Transactional
    public Map<String, Object> resetAllMetersToday(Long actorId, Long userId, String reason) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (AdminQuotaMeter meter : AdminQuotaMeter.values()) {
            results.add(featureQuotaService.resetUserDay(actorId, userId, meter, reason));
        }
        return Map.of(
                "userId", userId,
                "quotaDay", featureQuotaService.quotaDayJst().toString(),
                "timezone", AdminFeatureQuotaService.JST.getId(),
                "meters", results);
    }

    private void upsertIfPresent(
            Long actorId,
            Long userId,
            Map<String, Object> body,
            String notes,
            String field,
            AdminQuotaMeter meter,
            List<Map<String, Object>> saved) {
        if (!body.containsKey(field) || body.get(field) == null) {
            return;
        }
        Map<String, Object> patch = new LinkedHashMap<>();
        patch.put("overrideLimit", Integer.parseInt(String.valueOf(body.get(field))));
        if (notes != null) {
            patch.put("notes", notes);
        }
        saved.add(upsertUserOverride(actorId, userId, meter.name(), patch));
    }

    private void patchLimitIfPresent(Long actorId, Map<String, Object> body, String field, AdminQuotaMeter meter) {
        if (!body.containsKey(field) || body.get(field) == null) {
            return;
        }
        Map<String, Object> patch = new LinkedHashMap<>();
        patch.put("dailyLimit", Integer.parseInt(String.valueOf(body.get(field))));
        patchPolicyByMeter(actorId, meter.name(), patch);
    }

    private void patchEnabledIfPresent(Long actorId, Map<?, ?> features, String field, AdminQuotaMeter meter) {
        if (!features.containsKey(field) || features.get(field) == null) {
            return;
        }
        Map<String, Object> patch = new LinkedHashMap<>();
        patch.put("enabled", Boolean.parseBoolean(String.valueOf(features.get(field))));
        patchPolicyByMeter(actorId, meter.name(), patch);
    }

    private static Integer limitOf(Map<String, AdminQuotaPolicyEntity> byMeter, AdminQuotaMeter meter) {
        AdminQuotaPolicyEntity p = byMeter.get(meter.name());
        return p == null ? null : p.getDailyLimit();
    }

    private static boolean enabledOf(Map<String, AdminQuotaPolicyEntity> byMeter, AdminQuotaMeter meter) {
        AdminQuotaPolicyEntity p = byMeter.get(meter.name());
        return p == null || p.isEnabled();
    }

    private Map<String, Object> overrideMap(AdminUserQuotaOverrideEntity o) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", o.getId());
        row.put("userId", o.getUserId());
        row.put("meter", o.getMeter());
        row.put("overrideLimit", o.getOverrideLimit());
        row.put("inherit", o.isInherit());
        row.put("notes", o.getNotes());
        row.put("revision", o.getRevision());
        row.put("updatedAt", o.getUpdatedAt());
        return row;
    }

    private Map<String, Object> policyMap(AdminQuotaPolicyEntity p) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", p.getId());
        row.put("meter", p.getMeter());
        row.put("scope", p.getScope());
        row.put("roleName", p.getRoleName());
        row.put("dailyLimit", p.getDailyLimit());
        row.put("enabled", p.isEnabled());
        row.put("mode", p.getMode());
        row.put("timezone", p.getTimezone());
        row.put("revision", p.getRevision());
        return row;
    }

    public AdminFeatureQuotaService featureQuotaService() {
        return featureQuotaService;
    }
}
