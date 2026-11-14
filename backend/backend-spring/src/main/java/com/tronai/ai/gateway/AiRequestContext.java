package com.tronai.ai.gateway;

import com.tronai.ai.ChatMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AiRequestContext {

    private Long userId;
    private AiFeature feature = AiFeature.CHAT;
    private AiMode mode = AiMode.AUTO;
    private String modelOverride;
    private String providerOverride;
    private List<ChatMessage> messages = new ArrayList<>();
    private Double temperature;
    private Integer maxTokens;
    private boolean jsonMode;
    private String idempotencyKey;
    private String requestId = UUID.randomUUID().toString();
    private String taskBudgetId;
    private int taskCallIndex;
    private boolean stream;
    /**
     * When true, router may use cloud providers.
     * When false, only local Ollama routes are eligible (privacy-preserving).
     */
    private boolean allowCloud = true;
    /**
     * When true, compatible cloud providers may attach native web-search tools for this request.
     * Never set for local FAST/SMART inference paths.
     */
    private boolean enableNativeWebSearch;
    private String nativeWebSearchProvider = "";

    public static Builder builder() {
        return new Builder();
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public AiFeature getFeature() { return feature; }
    public void setFeature(AiFeature feature) { this.feature = feature; }
    public AiMode getMode() { return mode; }
    public void setMode(AiMode mode) { this.mode = mode; }
    public String getModelOverride() { return modelOverride; }
    public void setModelOverride(String modelOverride) { this.modelOverride = modelOverride; }
    public String getProviderOverride() { return providerOverride; }
    public void setProviderOverride(String providerOverride) { this.providerOverride = providerOverride; }
    public List<ChatMessage> getMessages() { return messages; }
    public void setMessages(List<ChatMessage> messages) { this.messages = messages != null ? messages : new ArrayList<>(); }
    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }
    public Integer getMaxTokens() { return maxTokens; }
    public void setMaxTokens(Integer maxTokens) { this.maxTokens = maxTokens; }
    public boolean isJsonMode() { return jsonMode; }
    public void setJsonMode(boolean jsonMode) { this.jsonMode = jsonMode; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public String getTaskBudgetId() { return taskBudgetId; }
    public void setTaskBudgetId(String taskBudgetId) { this.taskBudgetId = taskBudgetId; }
    public int getTaskCallIndex() { return taskCallIndex; }
    public void setTaskCallIndex(int taskCallIndex) { this.taskCallIndex = taskCallIndex; }
    public boolean isStream() { return stream; }
    public void setStream(boolean stream) { this.stream = stream; }
    public boolean isAllowCloud() { return allowCloud; }
    public void setAllowCloud(boolean allowCloud) { this.allowCloud = allowCloud; }
    public boolean isEnableNativeWebSearch() { return enableNativeWebSearch; }
    public void setEnableNativeWebSearch(boolean enableNativeWebSearch) { this.enableNativeWebSearch = enableNativeWebSearch; }
    public String getNativeWebSearchProvider() { return nativeWebSearchProvider; }
    public void setNativeWebSearchProvider(String nativeWebSearchProvider) {
        this.nativeWebSearchProvider = nativeWebSearchProvider == null ? "" : nativeWebSearchProvider;
    }

    public static final class Builder {
        private final AiRequestContext ctx = new AiRequestContext();

        public Builder userId(Long userId) { ctx.userId = userId; return this; }
        public Builder feature(AiFeature feature) { ctx.feature = feature; return this; }
        public Builder mode(AiMode mode) { ctx.mode = mode; return this; }
        public Builder modelOverride(String modelOverride) { ctx.modelOverride = modelOverride; return this; }
        public Builder providerOverride(String providerOverride) { ctx.providerOverride = providerOverride; return this; }
        public Builder messages(List<ChatMessage> messages) { ctx.setMessages(messages); return this; }
        public Builder temperature(Double temperature) { ctx.temperature = temperature; return this; }
        public Builder maxTokens(Integer maxTokens) { ctx.maxTokens = maxTokens; return this; }
        public Builder jsonMode(boolean jsonMode) { ctx.jsonMode = jsonMode; return this; }
        public Builder idempotencyKey(String idempotencyKey) { ctx.idempotencyKey = idempotencyKey; return this; }
        public Builder requestId(String requestId) { ctx.requestId = requestId; return this; }
        public Builder taskBudgetId(String taskBudgetId) { ctx.taskBudgetId = taskBudgetId; return this; }
        public Builder taskCallIndex(int taskCallIndex) { ctx.taskCallIndex = taskCallIndex; return this; }
        public Builder stream(boolean stream) { ctx.stream = stream; return this; }
        public Builder allowCloud(boolean allowCloud) { ctx.allowCloud = allowCloud; return this; }
        public Builder enableNativeWebSearch(boolean enableNativeWebSearch) {
            ctx.enableNativeWebSearch = enableNativeWebSearch;
            return this;
        }
        public Builder nativeWebSearchProvider(String nativeWebSearchProvider) {
            ctx.setNativeWebSearchProvider(nativeWebSearchProvider);
            return this;
        }
        public AiRequestContext build() { return ctx; }
    }
}
