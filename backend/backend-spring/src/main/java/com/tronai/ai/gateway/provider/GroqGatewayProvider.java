package com.tronai.ai.gateway.provider;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.ProviderHealthStatus;
import com.tronai.ai.research.search.CloudNativeSearchSupport;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Component
public class GroqGatewayProvider implements GatewayProvider {

    private static final String BASE_URL = "https://api.groq.com/openai/v1";

    private final AiGatewayProperties properties;
    private final OpenAiCompatibleClient client;

    public GroqGatewayProvider(AiGatewayProperties properties, OpenAiCompatibleClient client) {
        this.properties = properties;
        this.client = client;
    }

    @Override
    public GatewayProviderId id() {
        return GatewayProviderId.GROQ;
    }

    @Override
    public boolean isConfigured() {
        return hasText(properties.getGroqApiKey());
    }

    @Override
    public ProviderHealthStatus health() {
        return isConfigured() ? ProviderHealthStatus.CONFIGURED : ProviderHealthStatus.DISABLED;
    }

    @Override
    public List<String> knownModels() {
        return Stream.of(properties.getGroqModelFast(), properties.getGroqModelSmart())
                .filter(GroqGatewayProvider::hasText)
                .distinct()
                .toList();
    }

    @Override
    public AiGenerationResult generate(AiRequestContext context, String modelId) {
        if (!isConfigured()) {
            throw new GatewayProviderException(GatewayProviderException.UNAVAILABLE, 503, "Groq is not configured");
        }
        String model = hasText(modelId) ? modelId : properties.getGroqModelSmart();
        List<Map<String, Object>> tools = null;
        // browser_search is Exa-backed and only valid on compatible GPT-OSS models.
        if (context.isEnableNativeWebSearch()
                && "GROQ_BROWSER_SEARCH".equalsIgnoreCase(context.getNativeWebSearchProvider())
                && CloudNativeSearchSupport.isGroqBrowserCompatibleModel(model)
                && !context.isJsonMode()) {
            tools = List.of(Map.of("type", "browser_search"));
        }
        AiGenerationResult result = client.generate(
                BASE_URL,
                properties.getGroqApiKey().trim(),
                model,
                context.getMessages(),
                context.getTemperature(),
                context.getMaxTokens(),
                context.isJsonMode(),
                Map.of(),
                properties.getRequestTimeoutSeconds(),
                tools);
        enrich(result, context, model);
        return result;
    }

    private void enrich(AiGenerationResult result, AiRequestContext context, String model) {
        result.setProvider(GatewayProviderId.GROQ);
        result.setModelId(model);
        result.setMode(context.getMode());
        result.setFeature(context.getFeature());
        result.setRequestId(context.getRequestId());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
