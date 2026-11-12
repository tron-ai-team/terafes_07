package com.tronai.admin;

import com.tronai.ai.gateway.AiProviderHealthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
                .map(this::toProviderRow)
                .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("providers", providers);
        out.put("secretsExposed", false);
        out.put("routingMatrixEditable", false);
        out.put("note", "Provider credentials are never returned. Routing mutation APIs remain disabled pending owner approval.");
        return ResponseEntity.ok(out);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> provider(@PathVariable String id) {
        return ResponseEntity.ok(findProvider(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProvider(@PathVariable String id, @RequestBody Map<String, Object> body) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Provider configuration mutation is NOT_ACTIVATED. Changing routing/enablement can break live Chat/Voice/CV. Use out-of-band secret management.");
    }

    /**
     * Safe cached health probe — never triggers a paid provider call just to paint the dashboard.
     */
    @PostMapping("/{id}/ping")
    public ResponseEntity<Map<String, Object>> ping(@PathVariable String id) {
        Map<String, Object> provider = findProvider(id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("providerId", provider.get("providerId"));
        out.put("status", provider.get("status"));
        out.put("latencyMs", provider.get("latencyMs"));
        out.put("checkedAt", provider.get("lastCheckedAt") != null ? provider.get("lastCheckedAt") : Instant.now());
        out.put("probeMode", "CACHED_HEALTH_ONLY");
        out.put("paidCallExecuted", false);
        out.put("configured", provider.get("configured"));
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> findProvider(String id) {
        String wanted = id == null ? "" : id.trim().toLowerCase(Locale.ROOT);
        return providerHealthService.publicViews().stream()
                .map(this::toProviderRow)
                .filter(row -> wanted.equalsIgnoreCase(String.valueOf(row.get("providerId")))
                        || wanted.equalsIgnoreCase(String.valueOf(row.get("provider"))))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Provider not found"));
    }

    private Map<String, Object> toProviderRow(AiProviderHealthService.PublicProviderHealthView view) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("provider", view.providerId().name());
        item.put("providerId", view.providerId().name().toLowerCase(Locale.ROOT));
        item.put("status", view.status().name());
        item.put("detail", view.detail());
        item.put("configured", view.configured());
        item.put("credentialMasked", view.configured() ? "••••configured" : null);
        item.put("latencyMs", null);
        item.put("lastCheckedAt", Instant.now());
        item.put("secretsExposed", false);
        return item;
    }
}
