package com.tronai.admin.announcement;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementPublicController {

    private final AdminAnnouncementService announcements;

    public AnnouncementPublicController(AdminAnnouncementService announcements) {
        this.announcements = announcements;
    }

    @GetMapping("/active")
    public ResponseEntity<?> active() {
        return ResponseEntity.ok(announcements.listActive());
    }
}
