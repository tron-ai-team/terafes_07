package com.tronai.admin.quota;

import com.tronai.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/quotas")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminQuotaController {

    private final AdminQuotaAdminService adminQuota;
    private final AdminFeatureQuotaService featureQuotaService;

    public AdminQuotaController(AdminQuotaAdminService adminQuota, AdminFeatureQuotaService featureQuotaService) {
        this.adminQuota = adminQuota;
        this.featureQuotaService = featureQuotaService;
    }

    @GetMapping("/global")
    public ResponseEntity<?> globalQuotas() {
        return ResponseEntity.ok(adminQuota.getGlobalQuotaFacade());
    }

    @PutMapping("/global")
    public ResponseEntity<?> updateGlobalQuotas(@RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.putGlobalQuotaFacade(actorId, body));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> putUserOverrides(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.putUserOverridesBulk(actorId, userId, body));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUserOverrides(@PathVariable Long userId) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.deleteAllUserOverrides(actorId, userId));
    }

    @PostMapping("/users/{userId}/reset-today")
    public ResponseEntity<?> resetToday(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, String> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        String reason = body == null ? null : body.get("reason");
        return ResponseEntity.ok(adminQuota.resetAllMetersToday(actorId, userId, reason));
    }

    @GetMapping("/policies")
    public ResponseEntity<?> policies() {
        return ResponseEntity.ok(adminQuota.listPolicies());
    }

    @PutMapping("/policies/{id}")
    public ResponseEntity<?> patchPolicy(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.patchPolicy(actorId, id, body));
    }

    @PutMapping("/policies/by-meter/{meter}")
    public ResponseEntity<?> patchPolicyByMeter(@PathVariable String meter, @RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.patchPolicyByMeter(actorId, meter, body));
    }

    @GetMapping("/users/{userId}/overrides")
    public ResponseEntity<?> overrides(@PathVariable Long userId) {
        return ResponseEntity.ok(adminQuota.listUserOverrides(userId));
    }

    @PutMapping("/users/{userId}/overrides/{meter}")
    public ResponseEntity<?> upsertOverride(
            @PathVariable Long userId,
            @PathVariable String meter,
            @RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.upsertUserOverride(actorId, userId, meter, body));
    }

    @DeleteMapping("/users/{userId}/overrides/{meter}")
    public ResponseEntity<?> deleteOverride(@PathVariable Long userId, @PathVariable String meter) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(adminQuota.deleteUserOverride(actorId, userId, meter));
    }

    @GetMapping("/users/{userId}/usage")
    public ResponseEntity<?> usage(@PathVariable Long userId) {
        return ResponseEntity.ok(featureQuotaService.usageSummary(userId));
    }

    @PostMapping("/users/{userId}/reset-day")
    public ResponseEntity<?> resetDay(
            @PathVariable Long userId,
            @RequestParam String meter,
            @RequestBody(required = false) Map<String, String> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        String reason = body == null ? null : body.get("reason");
        AdminQuotaMeter m = AdminQuotaMeter.valueOf(meter.trim().toUpperCase());
        return ResponseEntity.ok(featureQuotaService.resetUserDay(actorId, userId, m, reason));
    }
}
