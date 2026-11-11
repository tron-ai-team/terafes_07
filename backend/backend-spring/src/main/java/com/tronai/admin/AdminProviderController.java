package com.tronai.admin;

import com.tronai.ai.gateway.AiProviderHealthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/providers")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminProviderController {

    private final AiProviderHealthService providerHealthService;

    public AdminProviderController(AiProviderHealthService providerHealthService) {
        this.providerHealthService = providerHealthService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> providers() {
        List<Map<String, Object>> providers = providerHealthService.publicViews().stream()
                .map(view -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("provider", view.providerId().name());
                    item.put("status", view.status().name());
                    item.put("detail", view.detail());
                    item.put("configured", view.configured());
                    return item;
                })
                .toList();
        return ResponseEntity.ok(Map.of("providers", providers, "secretsExposed", false));
    }
}
