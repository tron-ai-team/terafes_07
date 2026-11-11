package com.tronai.ai.gateway;

import com.tronai.ai.research.WebResearchService;
import com.tronai.ai.secrets.InfisicalSecretsLoader;
import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Gateway", description = "Shared AI gateway modes, models, usage, and provider health")
public class AiGatewayController {

    private final AiGatewayProperties properties;
    private final AiModelCatalog modelCatalog;
    private final AiQuotaService quotaService;
    private final com.tronai.admin.quota.AdminFeatureQuotaService featureQuotaService;
    private final AiProviderHealthService providerHealthService;
    private final AiModelRouter modelRouter;
    private final WebResearchService webResearchService;
    private final InfisicalSecretsLoader infisicalSecretsLoader;

    public AiGatewayController(
            AiGatewayProperties properties,
            AiModelCatalog modelCatalog,
            AiQuotaService quotaService,
            com.tronai.admin.quota.AdminFeatureQuotaService featureQuotaService,
            AiProviderHealthService providerHealthService,
            AiModelRouter modelRouter,
            WebResearchService webResearchService,
            InfisicalSecretsLoader infisicalSecretsLoader) {
        this.properties = properties;
        this.modelCatalog = modelCatalog;
        this.quotaService = quotaService;
        this.featureQuotaService = featureQuotaService;
        this.providerHealthService = providerHealthService;
        this.modelRouter = modelRouter;
        this.webResearchService = webResearchService;
        this.infisicalSecretsLoader = infisicalSecretsLoader;
    }

    @GetMapping("/modes")
    @Operation(summary = "List AI gateway modes")
    public ResponseEntity<Map<String, Object>> modes() {
        boolean ultraAvailable = isUltraAvailable();
        List<Map<String, Object>> modes = new ArrayList<>();
        modes.add(modeEntry(AiMode.FAST, "Low-latency responses for chat and voice.", true));
        modes.add(modeEntry(AiMode.SMART, "Balanced quality for analysis, CV, and agents.", true));
        modes.add(modeEntry(AiMode.QUALITY, "Alias for SMART (legacy clients).", true));
        modes.add(modeEntry(AiMode.ULTRA, "Highest-quality models; consumes daily Ultra credits.", ultraAvailable));
        modes.add(modeEntry(AiMode.AUTO, "Automatic mode selection based on feature and context.", true));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("modes", modes);
        body.put("ultraEnabled", properties.isUltraEnabled());
        body.put("ultraAvailable", ultraAvailable);
        body.put("dailyUltraCredits", properties.getDailyUltraCredits());
        if (ultraAvailable) {
            try {
                AiModelRouter.Route ultraRoute = modelRouter.resolveRoute(
                        AiRequestContext.builder().feature(AiFeature.CHAT).mode(AiMode.ULTRA).build(),
                        AiMode.ULTRA);
                body.put("ultraProvider", ultraRoute.provider().name());
                body.put("ultraModelId", ultraRoute.modelId());
            } catch (RuntimeException ignored) {
                // availability already computed; route metadata is best-effort
            }
        }
        return ResponseEntity.ok(body);
    }

    private boolean isUltraAvailable() {
        if (!properties.isUltraEnabled()) {
            return false;
        }
        try {
            modelRouter.resolveRoute(
                    AiRequestContext.builder().feature(AiFeature.CHAT).mode(AiMode.ULTRA).build(),
                    AiMode.ULTRA);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    @GetMapping("/models")
    @Operation(summary = "Public AI gateway model catalog")
    public ResponseEntity<Map<String, Object>> models() {
        List<Map<String, String>> models = modelCatalog.listPublicModels().stream()
                .map(entry -> {
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("provider", entry.provider().name());
                    item.put("modelId", entry.modelId());
                    item.put("label", entry.label());
                    return item;
                })
                .toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("models", models);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/usage")
    @Operation(summary = "Authenticated user's Ultra usage summary")
    public ResponseEntity<Map<String, Object>> usage() {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(quotaService.usageSummary(userId));
    }

    @GetMapping("/quotas")
    @Operation(summary = "Authenticated user's JST feature quota summary")
    public ResponseEntity<Map<String, Object>> featureQuotas() {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(featureQuotaService.usageSummary(userId));
    }

    @GetMapping("/providers")
    @Operation(summary = "Provider health snapshots (no secrets)")
    public ResponseEntity<Map<String, Object>> providers() {
        List<Map<String, Object>> providers = providerHealthService.publicViews().stream()
                .map(view -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("provider", view.providerId().name());
                    item.put("status", view.status().name());
                    item.put("detail", view.detail());
                    item.put("configured", view.configured());
                    item.put("knownModels", view.knownModels());
                    return item;
                })
                .toList();
        Map<String, Object> privacy = new LinkedHashMap<>();
        privacy.put("cvAssistCloudEnabled", properties.isCvAssistCloudEnabled());
        privacy.put("companyAnalysisCloudEnabled", properties.isCompanyAnalysisCloudEnabled());
        privacy.put("interviewCloudEnabled", properties.isInterviewCloudEnabled());
        privacy.put("preferGroqForSmart", properties.isPreferGroqForSmart());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("providers", providers);
        body.put("researchTools", webResearchService.toolHealth());
        body.put("privacy", privacy);
        body.put("infisical", infisicalSecretsLoader.publicStatus());
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> modeEntry(AiMode mode, String description, boolean available) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", mode.name());
        entry.put("description", description);
        entry.put("consumesUltraCredits", mode.consumesUltraCredits());
        entry.put("available", available);
        return entry;
    }
}
