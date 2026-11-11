package com.tronai.admin.announcement;

import com.tronai.auth.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/announcements")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminAnnouncementController {

    private final AdminAnnouncementService announcements;

    public AdminAnnouncementController(AdminAnnouncementService announcements) {
        this.announcements = announcements;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(announcements.listAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(announcements.create(SecurityUtils.getRequiredUserId(), body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(announcements.update(SecurityUtils.getRequiredUserId(), id, body));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publish(@PathVariable Long id) {
        return ResponseEntity.ok(announcements.publish(SecurityUtils.getRequiredUserId(), id));
    }
}
