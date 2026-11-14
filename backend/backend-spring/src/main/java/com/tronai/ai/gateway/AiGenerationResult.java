package com.tronai.ai.gateway;

import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ProviderType;

import java.util.ArrayList;
import java.util.List;

public class AiGenerationResult {

    private String text = "";
    private String finishReason = "stop";
    private boolean truncated;
    private int promptTokens;
    private int completionTokens;
    private long latencyMs;
    private String requestId;
    private GatewayProviderId provider;
    private String modelId;
    private AiMode mode;
    private AiFeature feature;
    private String errorCategory;
    private List<String> streamChunks = new ArrayList<>();
    private List<ToolCall> toolCalls = new ArrayList<>();
    private List<Citation> citations = new ArrayList<>();

    public static Builder builder() {
        return new Builder();
    }

    public ChatGenerationResult toChatGenerationResult() {
        ChatGenerationResult result = ChatGenerationResult.builder()
                .text(text)
                .finishReason(finishReason)
                .truncated(truncated)
                .promptEvalCount(promptTokens)
                .evalCount(completionTokens)
                .logicalProfile(mode == null ? null : mode.name())
                .actualModelId(modelId)
                .providerType(provider != null && provider.isLocalOllama() ? ProviderType.LOCAL : ProviderType.CLOUD)
                .citations(citations)
                .build();
        return result;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text == null ? "" : text; }
    public String getFinishReason() { return finishReason; }
    public void setFinishReason(String finishReason) { this.finishReason = finishReason; }
    public boolean isTruncated() { return truncated; }
    public void setTruncated(boolean truncated) { this.truncated = truncated; }
    public int getPromptTokens() { return promptTokens; }
    public void setPromptTokens(int promptTokens) { this.promptTokens = promptTokens; }
    public int getCompletionTokens() { return completionTokens; }
    public void setCompletionTokens(int completionTokens) { this.completionTokens = completionTokens; }
    public long getLatencyMs() { return latencyMs; }
    public void setLatencyMs(long latencyMs) { this.latencyMs = latencyMs; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public GatewayProviderId getProvider() { return provider; }
    public void setProvider(GatewayProviderId provider) { this.provider = provider; }
    public String getModelId() { return modelId; }
    public void setModelId(String modelId) { this.modelId = modelId; }
    public AiMode getMode() { return mode; }
    public void setMode(AiMode mode) { this.mode = mode; }
    public AiFeature getFeature() { return feature; }
    public void setFeature(AiFeature feature) { this.feature = feature; }
    public String getErrorCategory() { return errorCategory; }
    public void setErrorCategory(String errorCategory) { this.errorCategory = errorCategory; }
    public List<String> getStreamChunks() { return streamChunks; }
    public void setStreamChunks(List<String> streamChunks) { this.streamChunks = streamChunks != null ? streamChunks : new ArrayList<>(); }
    public List<ToolCall> getToolCalls() { return toolCalls; }
    public void setToolCalls(List<ToolCall> toolCalls) { this.toolCalls = toolCalls != null ? toolCalls : new ArrayList<>(); }
    public List<Citation> getCitations() { return citations; }
    public void setCitations(List<Citation> citations) { this.citations = citations != null ? citations : new ArrayList<>(); }

    public record ToolCall(String id, String name, String argumentsJson) {}

    /** Provider-exposed web citation — never invent these client-side. */
    public record Citation(String title, String url, String snippet) {}

    public static final class Builder {
        private final AiGenerationResult result = new AiGenerationResult();

        public Builder text(String text) { result.setText(text); return this; }
        public Builder finishReason(String finishReason) { result.finishReason = finishReason; return this; }
        public Builder truncated(boolean truncated) { result.truncated = truncated; return this; }
        public Builder promptTokens(int promptTokens) { result.promptTokens = promptTokens; return this; }
        public Builder completionTokens(int completionTokens) { result.completionTokens = completionTokens; return this; }
        public Builder latencyMs(long latencyMs) { result.latencyMs = latencyMs; return this; }
        public Builder requestId(String requestId) { result.requestId = requestId; return this; }
        public Builder provider(GatewayProviderId provider) { result.provider = provider; return this; }
        public Builder modelId(String modelId) { result.modelId = modelId; return this; }
        public Builder mode(AiMode mode) { result.mode = mode; return this; }
        public Builder feature(AiFeature feature) { result.feature = feature; return this; }
        public Builder errorCategory(String errorCategory) { result.errorCategory = errorCategory; return this; }
        public Builder streamChunks(List<String> streamChunks) { result.setStreamChunks(streamChunks); return this; }
        public Builder toolCalls(List<ToolCall> toolCalls) { result.setToolCalls(toolCalls); return this; }
        public Builder citations(List<Citation> citations) { result.setCitations(citations); return this; }
        public AiGenerationResult build() { return result; }
    }
}
