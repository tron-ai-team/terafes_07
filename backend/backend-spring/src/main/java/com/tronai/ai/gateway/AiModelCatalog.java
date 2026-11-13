package com.tronai.ai.gateway;

import com.tronai.ai.gateway.provider.GatewayProvider;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.model.ModelProviderType;
import com.tronai.ai.model.ModelRegistry;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class AiModelCatalog {

    private final AiGatewayProperties properties;
    private final AiProviderRegistry providerRegistry;
    private final ModelRegistry modelRegistry;

    public AiModelCatalog(
            AiGatewayProperties properties,
            AiProviderRegistry providerRegistry,
            ModelRegistry modelRegistry) {
        this.properties = properties;
        this.providerRegistry = providerRegistry;
        this.modelRegistry = modelRegistry;
    }

    public List<CatalogEntry> listPublicModels() {
        Set<CatalogEntry> entries = new LinkedHashSet<>();
        for (GatewayProvider provider : providerRegistry.all()) {
            for (String modelId : provider.knownModels()) {
                entries.add(new CatalogEntry(provider.id(), modelId, modelId));
            }
        }
        for (ModelProfile profile : modelRegistry.findEnabled()) {
            if (profile.getProvider() == ModelProviderType.OLLAMA) {
                String modelName = profile.getProviderModelName();
                if (modelName != null && !modelName.isBlank()) {
                    entries.add(new CatalogEntry(GatewayProviderId.OLLAMA, modelName, profile.getDisplayName()));
                }
            }
        }
        return new ArrayList<>(entries);
    }

    public boolean isAllowed(GatewayProviderId provider, String modelId) {
        if (provider == null || modelId == null || modelId.isBlank()) {
            return false;
        }
        return providerRegistry.find(provider)
                .map(p -> p.knownModels().contains(modelId.trim()))
                .orElse(false);
    }

    public Optional<ResolvedModel> resolveDefault(AiMode mode, AiFeature feature) {
        AiMode routing = mode != null ? mode.routingMode() : AiMode.AUTO.routingMode();
        return switch (routing) {
            case FAST -> firstConfigured(
                    resolved(GatewayProviderId.GROQ, properties.getGroqModelFast()),
                    resolved(GatewayProviderId.CLOUDFLARE_WORKERS_AI, properties.getCloudflareModelFast()),
                    resolved(GatewayProviderId.OLLAMA, firstOllamaFast()));
            case SMART -> properties.isRtxSmartModeEnabled()
                    ? firstConfigured(resolved(GatewayProviderId.OLLAMA, properties.getRtxSmartModel()))
                    : firstConfigured(
                    resolved(GatewayProviderId.GROQ, properties.getGroqModelSmart()),
                    resolved(GatewayProviderId.MISTRAL, properties.getMistralModelSmart()),
                    resolved(GatewayProviderId.GEMINI, properties.getGeminiModelSmart()),
                    resolved(GatewayProviderId.OPENROUTER, properties.getOpenrouterModelSmart()),
                    resolved(GatewayProviderId.OLLAMA, firstOllamaQuality()));
            case CLOUD -> firstConfigured(
                    resolved(GatewayProviderId.GROQ, properties.getGroqModelSmart()),
                    resolved(GatewayProviderId.OPENROUTER, properties.getOpenrouterModelSmart()),
                    resolved(GatewayProviderId.MISTRAL, properties.getMistralModelSmart()),
                    resolved(GatewayProviderId.CLOUDFLARE_WORKERS_AI, properties.getCloudflareModelFast()));
            case ULTRA -> firstConfigured(
                    resolved(GatewayProviderId.OPENROUTER, properties.getOpenrouterModelUltra()),
                    resolved(GatewayProviderId.MISTRAL, properties.getMistralModelUltra()),
                    resolved(GatewayProviderId.GEMINI, properties.getGeminiModelUltra()));
            case AUTO -> resolveDefault(AiMode.SMART, feature);
            case QUALITY -> resolveDefault(AiMode.SMART, feature);
        };
    }

    private Optional<ResolvedModel> firstConfigured(Optional<ResolvedModel>... candidates) {
        for (Optional<ResolvedModel> candidate : candidates) {
            if (candidate.isEmpty()) {
                continue;
            }
            ResolvedModel model = candidate.get();
            if (providerRegistry.find(model.provider()).map(GatewayProvider::isConfigured).orElse(false)
                    && isAllowed(model.provider(), model.modelId())) {
                return candidate;
            }
        }
        return Optional.empty();
    }

    private Optional<ResolvedModel> resolved(GatewayProviderId provider, String modelId) {
        if (modelId == null || modelId.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new ResolvedModel(provider, modelId.trim()));
    }

    private String firstOllamaFast() {
        return providerRegistry.find(GatewayProviderId.OLLAMA)
                .flatMap(p -> p.knownModels().stream().findFirst())
                .orElse("");
    }

    private String firstOllamaQuality() {
        List<String> models = providerRegistry.find(GatewayProviderId.OLLAMA)
                .map(GatewayProvider::knownModels)
                .orElse(List.of());
        if (models.size() > 1) {
            return models.get(1);
        }
        return models.isEmpty() ? "" : models.get(0);
    }

    public record CatalogEntry(GatewayProviderId provider, String modelId, String label) {
    }

    public record ResolvedModel(GatewayProviderId provider, String modelId) {
    }
}
