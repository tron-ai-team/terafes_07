package com.tronai.ai;

import com.tronai.ai.gateway.AiGenerationResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class ChatGenerationResult {
    private String text;
    private String finishReason = "stop";
    private boolean truncated;
    private int evalCount;
    private int promptEvalCount;
    private String logicalProfile;
    private ProviderType providerType;
    private String actualModelId;
    private List<AiGenerationResult.Citation> citations = new ArrayList<>();

    public ChatGenerationResult() {
    }

    public ChatGenerationResult(String text, String finishReason, boolean truncated, int evalCount, int promptEvalCount) {
        this.text = text;
        this.finishReason = finishReason != null ? finishReason : "stop";
        this.truncated = truncated;
        this.evalCount = evalCount;
        this.promptEvalCount = promptEvalCount;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getFinishReason() {
        return finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }

    public boolean isTruncated() {
        return truncated;
    }

    public void setTruncated(boolean truncated) {
        this.truncated = truncated;
    }

    public int getEvalCount() {
        return evalCount;
    }

    public void setEvalCount(int evalCount) {
        this.evalCount = evalCount;
    }

    public int getPromptEvalCount() {
        return promptEvalCount;
    }

    public void setPromptEvalCount(int promptEvalCount) {
        this.promptEvalCount = promptEvalCount;
    }

    public String getLogicalProfile() {
        return logicalProfile;
    }

    public void setLogicalProfile(String logicalProfile) {
        this.logicalProfile = logicalProfile;
    }

    public ProviderType getProviderType() {
        return providerType;
    }

    public void setProviderType(ProviderType providerType) {
        this.providerType = providerType;
    }

    public String getActualModelId() {
        return actualModelId;
    }

    public void setActualModelId(String actualModelId) {
        this.actualModelId = actualModelId;
    }

    public List<AiGenerationResult.Citation> getCitations() {
        return citations;
    }

    public void setCitations(List<AiGenerationResult.Citation> citations) {
        this.citations = citations != null ? citations : new ArrayList<>();
    }

    public static class Builder {
        private String text;
        private String finishReason = "stop";
        private boolean truncated;
        private int evalCount;
        private int promptEvalCount;
        private String logicalProfile;
        private ProviderType providerType;
        private String actualModelId;
        private List<AiGenerationResult.Citation> citations = new ArrayList<>();

        public Builder text(String text) {
            this.text = text;
            return this;
        }

        public Builder finishReason(String finishReason) {
            this.finishReason = finishReason;
            return this;
        }

        public Builder truncated(boolean truncated) {
            this.truncated = truncated;
            return this;
        }

        public Builder evalCount(int evalCount) {
            this.evalCount = evalCount;
            return this;
        }

        public Builder promptEvalCount(int promptEvalCount) {
            this.promptEvalCount = promptEvalCount;
            return this;
        }

        public Builder logicalProfile(String logicalProfile) {
            this.logicalProfile = logicalProfile;
            return this;
        }

        public Builder providerType(ProviderType providerType) {
            this.providerType = providerType;
            return this;
        }

        public Builder actualModelId(String actualModelId) {
            this.actualModelId = actualModelId;
            return this;
        }

        public Builder citations(List<AiGenerationResult.Citation> citations) {
            this.citations = citations != null ? citations : new ArrayList<>();
            return this;
        }

        public ChatGenerationResult build() {
            ChatGenerationResult result = new ChatGenerationResult(text, finishReason, truncated, evalCount, promptEvalCount);
            result.setLogicalProfile(logicalProfile);
            result.setProviderType(providerType);
            result.setActualModelId(actualModelId);
            result.setCitations(citations);
            return result;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ChatGenerationResult that)) return false;
        return truncated == that.truncated &&
                evalCount == that.evalCount &&
                promptEvalCount == that.promptEvalCount &&
                Objects.equals(text, that.text) &&
                Objects.equals(finishReason, that.finishReason);
    }

    @Override
    public int hashCode() {
        return Objects.hash(text, finishReason, truncated, evalCount, promptEvalCount);
    }

    @Override
    public String toString() {
        return "ChatGenerationResult{" +
                "text='" + text + '\'' +
                ", finishReason='" + finishReason + '\'' +
                ", truncated=" + truncated +
                ", evalCount=" + evalCount +
                ", promptEvalCount=" + promptEvalCount +
                '}';
    }
}
