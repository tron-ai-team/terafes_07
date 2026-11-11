package com.tronai.admin.analytics;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/analytics")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminAnalyticsController {

    private final AdminAnalyticsService analytics;

    public AdminAnalyticsController(AdminAnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview() {
        return ResponseEntity.ok(analytics.overview());
    }

    @GetMapping("/timeseries")
    public ResponseEntity<?> timeseries(@RequestParam(required = false, defaultValue = "7d") String range) {
        return ResponseEntity.ok(analytics.timeseries(range));
    }

    @GetMapping("/usage")
    public ResponseEntity<?> usage(@RequestParam(required = false, defaultValue = "7d") String range) {
        return ResponseEntity.ok(analytics.usage(range));
    }
}
