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
