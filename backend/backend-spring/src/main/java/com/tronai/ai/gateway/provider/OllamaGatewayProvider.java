package com.tronai.ai.gateway.provider;

import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.OllamaClient;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.ProviderHealthStatus;
import com.tronai.ai.model.ModelProperties;
import com.tronai.ai.model.ModelRegistry;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class OllamaGatewayProvider implements GatewayProvider {

    private final AiProvider localAiProvider;
    private final OllamaClient ollamaClient;
    private final ModelRegistry modelRegistry;
    private final ModelProperties modelProperties;
    private final AiGatewayProperties gatewayProperties;

    public OllamaGatewayProvider(
            @Qualifier("ollamaAiProvider") AiProvider localAiProvider,
            OllamaClient ollamaClient,
            ModelRegistry modelRegistry,
            ModelProperties modelProperties,
            AiGatewayProperties gatewayProperties) {
        this.localAiProvider = localAiProvider;
        this.ollamaClient = ollamaClient;
        this.modelRegistry = modelRegistry;
        this.modelProperties = modelProperties;
        this.gatewayProperties = gatewayProperties;
    }

    @Override
    public GatewayProviderId id() {
        return GatewayProviderId.OLLAMA;
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public ProviderHealthStatus health() {
        return ollamaClient.checkHealth() ? ProviderHealthStatus.CONFIGURED : ProviderHealthStatus.UNAVAILABLE;
    }

    @Override
    public List<String> knownModels() {
        Set<String> models = new LinkedHashSet<>();
        models.add(modelProperties.getFastModel());
        models.add(modelProperties.getQualityModel());
        if (gatewayProperties.getRtxSmartModel() != null && !gatewayProperties.getRtxSmartModel().isBlank()) {
            models.add(gatewayProperties.getRtxSmartModel().trim());
        }
        modelRegistry.findAll().forEach(p -> {
            if (p.getProviderModelName() != null && !p.getProviderModelName().isBlank()) {
                models.add(p.getProviderModelName().trim());
            }
        });
        models.removeIf(m -> m == null || m.isBlank());
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
        var chatResult = localAiProvider.generate(request);
        AiGenerationResult result = AiGenerationResult.builder()
                .text(chatResult.getText())
                .finishReason(chatResult.getFinishReason())
                .truncated(chatResult.isTruncated())
                .promptTokens(chatResult.getPromptEvalCount())
                .completionTokens(chatResult.getEvalCount())
                .provider(GatewayProviderId.OLLAMA)
                .modelId(chatResult.getActualModelId() != null ? chatResult.getActualModelId() : modelId)
                .mode(context.getMode())
                .feature(context.getFeature())
                .requestId(context.getRequestId())
                .build();
        return result;
    }
}
