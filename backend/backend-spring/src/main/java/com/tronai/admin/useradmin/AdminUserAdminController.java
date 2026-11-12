package com.tronai.admin.useradmin;

import com.tronai.admin.quota.AdminFeatureQuotaService;
import com.tronai.admin.quota.AdminQuotaAdminService;
import com.tronai.admin.quota.AdminQuotaMeter;
import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import org.springframework.data.domain.PageRequest;
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

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminUserAdminController {

    private final AdminUserService users;
    private final AdminFeatureQuotaService featureQuotaService;
    private final AdminQuotaAdminService quotaAdmin;

    public AdminUserAdminController(
            AdminUserService users,
            AdminFeatureQuotaService featureQuotaService,
            AdminQuotaAdminService quotaAdmin) {
        this.users = users;
        this.featureQuotaService = featureQuotaService;
        this.quotaAdmin = quotaAdmin;
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) Boolean deleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        int bounded = Math.min(Math.max(size, 1), 100);
        return ResponseEntity.ok(users.search(q, role, enabled, deleted, PageRequest.of(Math.max(page, 0), bounded)));
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        // Intentionally rejects plaintext temporaryPassword creates from frontend contract.
        return ResponseEntity.unprocessableEntity().body(users.rejectInsecurePasswordCreate(body));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id) {
        return ResponseEntity.ok(users.detail(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        String reason = body == null ? null : body.get("reason");
        Map<String, Object> deleted = users.softDelete(actor.getId(), actor.getRole(), id, reason);
        Map<String, Object> out = new LinkedHashMap<>(deleted);
        out.put("deleted", true);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/{id}/soft-delete")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> softDelete(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        String reason = body == null ? null : body.get("reason");
        return ResponseEntity.ok(users.softDelete(actor.getId(), actor.getRole(), id, reason));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(users.changeRole(actor.getId(), actor.getRole(), id, body.get("role")));
    }

    @PostMapping("/{id}/revoke-sessions")
    public ResponseEntity<?> revokeSessions(@PathVariable Long id) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(users.revokeSessions(actor.getId(), actor.getRole(), id));
    }

    @PostMapping("/invite")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> invite(@RequestBody Map<String, String> body) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        String note = body.get("note");
        if ((note == null || note.isBlank()) && body.get("personalNote") != null) {
            note = body.get("personalNote");
        }
        Map<String, Object> invited = users.invite(
                actor.getId(), actor.getRole(), body.get("email"), body.get("role"), note);
        Map<String, Object> out = new LinkedHashMap<>(invited);
        out.put("success", true);
        if (invited.get("setupToken") != null) {
            out.put("inviteToken", invited.get("setupToken"));
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping("/{id}/password-reset")
    public ResponseEntity<?> passwordReset(@PathVariable Long id) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(users.passwordResetInitiate(actor.getId(), actor.getRole(), id));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPasswordAlias(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        if (body != null && body.get("temporaryPassword") != null) {
            users.rejectInsecurePasswordAssign(body);
        }
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(users.passwordResetInitiate(actor.getId(), actor.getRole(), id));
    }

    @GetMapping("/{id}/quotas")
    public ResponseEntity<?> quotas(@PathVariable Long id) {
        return ResponseEntity.ok(featureQuotaService.usageSummary(id));
    }

    @PutMapping("/{id}/quotas/{meter}")
    public ResponseEntity<?> upsertQuota(
            @PathVariable Long id,
            @PathVariable String meter,
            @RequestBody Map<String, Object> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(quotaAdmin.upsertUserOverride(actorId, id, meter, body));
    }

    @DeleteMapping("/{id}/quotas/{meter}")
    public ResponseEntity<?> deleteQuota(@PathVariable Long id, @PathVariable String meter) {
        Long actorId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(quotaAdmin.deleteUserOverride(actorId, id, meter));
    }

    @PostMapping("/{id}/quotas/{meter}/reset")
    public ResponseEntity<?> resetQuota(
            @PathVariable Long id,
            @PathVariable String meter,
            @RequestBody(required = false) Map<String, String> body) {
        Long actorId = SecurityUtils.getRequiredUserId();
        String reason = body == null ? null : body.get("reason");
        return ResponseEntity.ok(featureQuotaService.resetUserDay(
                actorId, id, AdminQuotaMeter.valueOf(meter.trim().toUpperCase()), reason));
    }
}
