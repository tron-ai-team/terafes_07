package com.tronai.ai.gateway.provider;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.ProviderHealthStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

@Component
public class OpenRouterGatewayProvider implements GatewayProvider {

    private static final String BASE_URL = "https://openrouter.ai/api/v1";

    private final AiGatewayProperties properties;
    private final OpenAiCompatibleClient client;
    private final AtomicInteger keyRotation = new AtomicInteger(0);

    public OpenRouterGatewayProvider(AiGatewayProperties properties, OpenAiCompatibleClient client) {
        this.properties = properties;
        this.client = client;
    }

    @Override
    public GatewayProviderId id() {
        return GatewayProviderId.OPENROUTER;
    }

    @Override
    public boolean isConfigured() {
        return !apiKeys().isEmpty();
    }

    @Override
    public ProviderHealthStatus health() {
        return isConfigured() ? ProviderHealthStatus.CONFIGURED : ProviderHealthStatus.DISABLED;
    }

    @Override
    public List<String> knownModels() {
        return Stream.of(properties.getOpenrouterModelSmart(), properties.getOpenrouterModelUltra())
                .filter(OpenRouterGatewayProvider::hasText)
                .distinct()
                .toList();
    }

    @Override
    public AiGenerationResult generate(AiRequestContext context, String modelId) {
        List<String> keys = apiKeys();
        if (keys.isEmpty()) {
            throw new GatewayProviderException(GatewayProviderException.UNAVAILABLE, 503, "OpenRouter is not configured");
        }
        String model = hasText(modelId) ? modelId : properties.getOpenrouterModelSmart();
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("HTTP-Referer", "http://localhost:5174");
        headers.put("X-Title", "TRON AI");

        GatewayProviderException last = null;
        int start = Math.floorMod(keyRotation.getAndIncrement(), keys.size());
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get((start + i) % keys.size());
            try {
                List<Map<String, Object>> tools = null;
                // Current server tool — not the deprecated web-search plugin.
                if (context.isEnableNativeWebSearch()
                        && "OPENROUTER_WEB_SEARCH".equalsIgnoreCase(context.getNativeWebSearchProvider())
                        && !context.isJsonMode()) {
                    tools = List.of(Map.of("type", "openrouter:web_search"));
                }
                AiGenerationResult result = client.generate(
                        BASE_URL,
                        key,
                        model,
                        context.getMessages(),
                        context.getTemperature(),
                        context.getMaxTokens(),
                        context.isJsonMode(),
                        headers,
                        properties.getRequestTimeoutSeconds(),
                        tools);
                enrich(result, context, model);
                return result;
            } catch (GatewayProviderException e) {
                last = e;
                if (!GatewayProviderException.RATE_LIMITED.equals(e.getCategory())
                        && !GatewayProviderException.INVALID_CREDENTIAL.equals(e.getCategory())) {
                    throw e;
                }
            }
        }
        throw last != null ? last : new GatewayProviderException(
                GatewayProviderException.UNAVAILABLE, 503, "OpenRouter request failed");
    }

    private List<String> apiKeys() {
        List<String> keys = new ArrayList<>(2);
        if (hasText(properties.getOpenrouterApiKey1())) {
            keys.add(properties.getOpenrouterApiKey1().trim());
        }
        if (hasText(properties.getOpenrouterApiKey2())) {
            keys.add(properties.getOpenrouterApiKey2().trim());
        }
        return keys;
    }

    private void enrich(AiGenerationResult result, AiRequestContext context, String model) {
        result.setProvider(GatewayProviderId.OPENROUTER);
        result.setModelId(model);
        result.setMode(context.getMode());
        result.setFeature(context.getFeature());
        result.setRequestId(context.getRequestId());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
