package com.tronai.ai.gateway;

import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.provider.GatewayProvider;
import com.tronai.hybrid.HybridRoutingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class AiModelRouter {

    private final AiGatewayProperties properties;
    private final AiProviderRegistry providerRegistry;
    private final AiModelCatalog modelCatalog;
    private final HybridRoutingService hybrid;

    public AiModelRouter(
            AiGatewayProperties properties,
            AiProviderRegistry providerRegistry,
            AiModelCatalog modelCatalog,
            @Autowired(required = false) HybridRoutingService hybrid) {
        this.properties = properties;
        this.providerRegistry = providerRegistry;
        this.modelCatalog = modelCatalog;
        this.hybrid = hybrid;
    }

    public record Route(GatewayProviderId provider, String modelId) {
    }

    public AiMode resolveEffectiveMode(AiRequestContext context) {
        AiMode requested = context.getMode() != null ? context.getMode() : AiMode.AUTO;
        if (requested != AiMode.AUTO) {
            return requested.routingMode();
        }
        return autoMode(context);
    }

    public Route resolveRoute(AiRequestContext context, AiMode effectiveMode) {
        AiMode mode = effectiveMode != null ? effectiveMode.routingMode() : AiMode.SMART;

        Route overrideRoute = resolveOverrides(context);
        if (overrideRoute != null) {
            return overrideRoute;
        }

        Route primary = pickPrimary(mode);
        if (primary == null) {
            if (mode == AiMode.ULTRA) {
                throw new IllegalStateException(
                        "Ultra AI mode is not available: no configured ultra providers.");
            }
            throw new IllegalStateException("No AI provider route available for mode " + mode);
        }
        return primary;
    }

    public List<Route> fallbackCandidates(AiMode effectiveMode) {
        AiMode mode = effectiveMode != null ? effectiveMode.routingMode() : AiMode.SMART;
        List<Route> ordered = orderedCandidates(mode);
        if (ordered.size() <= 1) {
            return List.of();
        }
        return List.copyOf(ordered.subList(1, ordered.size()));
    }

    private Route resolveOverrides(AiRequestContext context) {
        String modelOverride = context.getModelOverride();
        String providerOverride = context.getProviderOverride();
        if ((modelOverride == null || modelOverride.isBlank())
                && (providerOverride == null || providerOverride.isBlank())) {
            return null;
        }

        GatewayProviderId providerId = parseProviderOverride(providerOverride);
        String modelId = modelOverride != null ? modelOverride.trim() : "";

        if (providerId != null && !modelId.isBlank()) {
            if (!modelCatalog.isAllowed(providerId, modelId)) {
                throw new IllegalArgumentException(
                        "Model override is not allowed for provider " + providerId + ": " + modelId);
            }
            if (!isUsable(providerId, modelId)) {
                throw new IllegalArgumentException(
                        "Model override provider is not available: " + providerId);
            }
            return new Route(providerId, modelId);
        }

        if (providerId != null && modelId.isBlank()) {
            Optional<Route> defaultForProvider = defaultModelForProvider(providerId);
            if (defaultForProvider.isEmpty()) {
                throw new IllegalArgumentException("No default model for provider override: " + providerId);
            }
            Route route = defaultForProvider.get();
            if (!modelCatalog.isAllowed(route.provider(), route.modelId())) {
                throw new IllegalArgumentException("Provider override model is not allowed: " + providerId);
            }
            return route;
        }

        if (!modelId.isBlank()) {
            for (GatewayProviderId candidate : GatewayProviderId.values()) {
                if (modelCatalog.isAllowed(candidate, modelId) && isUsable(candidate, modelId)) {
                    return new Route(candidate, modelId);
                }
            }
            throw new IllegalArgumentException("Unsupported model override: " + modelId);
        }
        return null;
    }

    private Route pickPrimary(AiMode mode) {
        List<Route> candidates = orderedCandidates(mode);
        return candidates.isEmpty() ? null : candidates.get(0);
    }

    private List<Route> orderedCandidates(AiMode mode) {
        List<Route> routes = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        switch (mode) {
            case FAST -> addRoute(routes, seen, tryOllamaFast(), tryGroqFast(), tryCloudflareFast());
            // Stage A benchmark (2026-10-24): OPENROUTER 10/10 @ ~3.8s avg beat GROQ fallback mix
            // and GEMINI (0/10 — keys/config unavailable). Prefer OpenRouter for SMART defaults.
            case SMART, QUALITY -> addRoute(routes, seen,
                    tryOpenRouterSmart(), tryGroqSmart(), tryMistralSmart(), tryOllamaQuality(), tryOllamaFast());
            case ULTRA -> addRoute(routes, seen, tryGeminiUltra(), tryOpenRouterUltra(), tryMistralUltra());
            case AUTO -> addRoute(routes, seen, orderedCandidates(autoMode(null)).toArray(new Route[0]));
            default -> { }
        }
        return routes;
    }

    @SafeVarargs
    private void addRoute(List<Route> routes, Set<String> seen, Route... candidates) {
        for (Route candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            String key = candidate.provider() + "|" + candidate.modelId();
            if (seen.add(key)) {
                routes.add(candidate);
            }
        }
    }

    private void addRoute(List<Route> routes, Set<String> seen, List<Route> candidates) {
        addRoute(routes, seen, candidates.toArray(new Route[0]));
    }

    private AiMode autoMode(AiRequestContext context) {
        AiFeature feature = context != null && context.getFeature() != null
                ? context.getFeature()
                : AiFeature.CHAT;

        return switch (feature) {
            case CHAT, VOICE_REASONING -> AiMode.FAST;
            case CV_REVIEW, CV_GENERATION, CAREER_JOB_MATCHING, INTERVIEW_FEEDBACK -> AiMode.SMART;
            case CODING_AGENT, BROWSER_AGENT, INTERVIEW ->
                    complexityHint(context) ? AiMode.SMART : AiMode.FAST;
            default -> AiMode.SMART;
        };
    }

    private boolean complexityHint(AiRequestContext context) {
        if (context == null) {
            return false;
        }
        if (context.isJsonMode()) {
            return true;
        }
        int chars = 0;
        for (ChatMessage message : context.getMessages()) {
            if (message != null && message.getContent() != null) {
                chars += message.getContent().length();
            }
        }
        return chars > 800;
    }

    private Route tryOllamaFast() {
        if (!ollamaAvailable()) {
            return null;
        }
        List<String> models = providerRegistry.find(GatewayProviderId.OLLAMA)
                .map(GatewayProvider::knownModels)
                .orElse(List.of());
        if (models.isEmpty()) {
            return null;
        }
        String model = models.get(0);
        return usableRoute(GatewayProviderId.OLLAMA, model);
    }

    private Route tryOllamaQuality() {
        if (!ollamaAvailable()) {
            return null;
        }
        List<String> models = providerRegistry.find(GatewayProviderId.OLLAMA)
                .map(GatewayProvider::knownModels)
                .orElse(List.of());
        if (models.isEmpty()) {
            return null;
        }
        String model = models.size() > 1 ? models.get(1) : models.get(0);
        return usableRoute(GatewayProviderId.OLLAMA, model);
    }

    private Route tryGroqFast() {
        return usableRoute(GatewayProviderId.GROQ, properties.getGroqModelFast());
    }

    private Route tryGroqSmart() {
        return usableRoute(GatewayProviderId.GROQ, properties.getGroqModelSmart());
    }

    private Route tryCloudflareFast() {
        return usableRoute(GatewayProviderId.CLOUDFLARE_WORKERS_AI, properties.getCloudflareModelFast());
    }

    private Route tryMistralSmart() {
        return usableRoute(GatewayProviderId.MISTRAL, properties.getMistralModelSmart());
    }

    private Route tryMistralUltra() {
        return usableRoute(GatewayProviderId.MISTRAL, properties.getMistralModelUltra());
    }

    private Route tryOpenRouterSmart() {
        return usableRoute(GatewayProviderId.OPENROUTER, properties.getOpenrouterModelSmart());
    }

    private Route tryOpenRouterUltra() {
        return usableRoute(GatewayProviderId.OPENROUTER, properties.getOpenrouterModelUltra());
    }

    private Route tryGeminiUltra() {
        return usableRoute(GatewayProviderId.GEMINI, properties.getGeminiModelUltra());
    }

    private Route usableRoute(GatewayProviderId provider, String modelId) {
        if (modelId == null || modelId.isBlank()) {
            return null;
        }
        if (!isUsable(provider, modelId.trim())) {
            return null;
        }
        return new Route(provider, modelId.trim());
    }

    private boolean isUsable(GatewayProviderId providerId, String modelId) {
        if (!modelCatalog.isAllowed(providerId, modelId)) {
            return false;
        }
        return providerRegistry.find(providerId)
                .map(p -> p.isConfigured() && healthPermitsRouting(p.health()))
                .orElse(false);
    }

    private boolean ollamaAvailable() {
        // Honor admin hybrid controls (FORCE_OFFLINE, localRoutingEnabled) — never bypass via gateway OLLAMA.
        if (hybrid != null && !hybrid.allowsLocalInference()) {
            return false;
        }
        return providerRegistry.find(GatewayProviderId.OLLAMA)
                .map(p -> healthPermitsRouting(p.health()))
                .orElse(false);
    }

    private boolean healthPermitsRouting(ProviderHealthStatus status) {
        return status == ProviderHealthStatus.CONFIGURED
                || status == ProviderHealthStatus.AVAILABLE;
    }

    private Optional<Route> defaultModelForProvider(GatewayProviderId providerId) {
        return switch (providerId) {
            case GROQ -> Optional.ofNullable(usableRoute(providerId, properties.getGroqModelSmart()));
            case MISTRAL -> Optional.ofNullable(usableRoute(providerId, properties.getMistralModelSmart()));
            case OPENROUTER -> Optional.ofNullable(usableRoute(providerId, properties.getOpenrouterModelSmart()));
            case CLOUDFLARE_WORKERS_AI ->
                    Optional.ofNullable(usableRoute(providerId, properties.getCloudflareModelFast()));
            case GEMINI -> Optional.ofNullable(usableRoute(providerId, properties.getGeminiModelUltra()));
            case OLLAMA -> Optional.ofNullable(tryOllamaFast());
        };
    }

    private GatewayProviderId parseProviderOverride(String providerOverride) {
        if (providerOverride == null || providerOverride.isBlank()) {
            return null;
        }
        String clean = providerOverride.trim().toUpperCase().replace('-', '_');
        if ("CLOUDFLARE".equals(clean) || "CLOUDFLARE_WORKERS_AI".equals(clean)) {
            return GatewayProviderId.CLOUDFLARE_WORKERS_AI;
        }
        for (GatewayProviderId id : GatewayProviderId.values()) {
            if (id.name().equals(clean) || id.wireName().equalsIgnoreCase(providerOverride.trim())) {
                return id;
            }
        }
        throw new IllegalArgumentException("Unknown provider override: " + providerOverride);
    }
}
