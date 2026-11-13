package com.tronai.admin.security;

import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/security")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminSecurityController {

    private final AdminSecurityService security;

    public AdminSecurityController(AdminSecurityService security) {
        this.security = security;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        return ResponseEntity.ok(security.summary());
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview() {
        return ResponseEntity.ok(security.overview());
    }

    @GetMapping("/events")
    public ResponseEntity<?> events(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(security.listEvents(PageRequest.of(page, size)));
    }

    @PostMapping("/users/{id}/revoke-sessions")
    public ResponseEntity<?> revokeUserSessions(@PathVariable Long id) {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(security.revokeUserSessions(actor.getId(), actor.getRole(), id));
    }

    @PostMapping("/emergency-revoke-all")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> emergencyRevokeAll() {
        UserPrincipal actor = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(security.emergencyRevokeAllNonOwners(actor.getId(), actor.getRole()));
    }
}
