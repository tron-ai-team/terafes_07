package com.tronai.admin;

import com.tronai.ai.gateway.AiProviderHealthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/system")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminSystemController {

    private final AiProviderHealthService providerHealthService;

    public AdminSystemController(AiProviderHealthService providerHealthService) {
        this.providerHealthService = providerHealthService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "UP");
        out.put("providers", providerHealthService.publicViews().size());
        out.put("timestamp", Instant.now());
        return ResponseEntity.ok(out);
    }
}
