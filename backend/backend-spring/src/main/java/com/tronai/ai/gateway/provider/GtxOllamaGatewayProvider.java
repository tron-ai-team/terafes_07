package com.tronai.ai.gateway.provider;

import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.GtxOllamaClient;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.ProviderHealthStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Gateway provider for the dedicated GTX Fast Ollama server.
 * Health and generation never use the RTX {@link OllamaGatewayProvider} client.
 */
@Component
public class GtxOllamaGatewayProvider implements GatewayProvider {

    private final GtxOllamaClient gtxOllamaClient;
    private final AiGatewayProperties gatewayProperties;

    public GtxOllamaGatewayProvider(GtxOllamaClient gtxOllamaClient, AiGatewayProperties gatewayProperties) {
        this.gtxOllamaClient = gtxOllamaClient;
        this.gatewayProperties = gatewayProperties;
    }

    @Override
    public GatewayProviderId id() {
        return GatewayProviderId.OLLAMA_GTX;
    }

    @Override
    public boolean isConfigured() {
        return gatewayProperties.isGtxFastModeEnabled();
    }

    @Override
    public ProviderHealthStatus health() {
        if (!isConfigured()) {
            return ProviderHealthStatus.UNAVAILABLE;
        }
        String model = gatewayProperties.getGtxFastModel();
        return gtxOllamaClient.isModelAvailable(model)
                ? ProviderHealthStatus.CONFIGURED
                : ProviderHealthStatus.UNAVAILABLE;
    }

    @Override
    public String healthDetail() {
        if (!isConfigured()) {
            return "GTX Fast Mode disabled";
        }
        String model = gatewayProperties.getGtxFastModel();
        if (gtxOllamaClient.isModelAvailable(model)) {
            return "GTX Ollama reachable; model " + model + " available";
        }
        if (gtxOllamaClient.checkHealth()) {
            return "GTX Ollama reachable but model " + model + " is not installed";
        }
        return "GTX Ollama offline";
    }

    @Override
    public List<String> knownModels() {
        Set<String> models = new LinkedHashSet<>();
        if (gatewayProperties.getGtxFastModel() != null && !gatewayProperties.getGtxFastModel().isBlank()) {
            models.add(gatewayProperties.getGtxFastModel().trim());
        }
        return new ArrayList<>(models);
    }

    @Override
    public AiGenerationResult generate(AiRequestContext context, String modelId) {
        ChatGenerationRequest request = ChatGenerationRequest.builder()
                .model(modelId)
                .messages(context.getMessages())
                .temperature(context.getTemperature())
                .numPredict(context.getMaxTokens())
                .jsonMode(context.isJsonMode())
                .logicalProfile(context.getMode() != null ? context.getMode().name() : null)
                .build();
        var chatResult = gtxOllamaClient.chat(request);
        return AiGenerationResult.builder()
                .text(chatResult.getText())
                .finishReason(chatResult.getFinishReason())
                .truncated(chatResult.isTruncated())
                .promptTokens(chatResult.getPromptEvalCount())
                .completionTokens(chatResult.getEvalCount())
                .provider(GatewayProviderId.OLLAMA_GTX)
                .modelId(chatResult.getActualModelId() != null ? chatResult.getActualModelId() : modelId)
                .mode(context.getMode())
                .feature(context.getFeature())
                .requestId(context.getRequestId())
                .build();
    }
}
