package com.tronai.admin.security;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping("/events")
    public ResponseEntity<?> events(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(security.listEvents(PageRequest.of(page, size)));
    }
}
