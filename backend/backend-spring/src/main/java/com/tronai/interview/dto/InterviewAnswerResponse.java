package com.tronai.interview.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response payload for POST /api/v1/interviews/{interviewId}/answers.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InterviewAnswerResponse {

    private TranscriptMessageDto userMessage;
    private TranscriptMessageDto aiFollowUpMessage;
    private int nextQuestionIndex;

    @JsonProperty("isFinished")
    private boolean isFinished;

    /** Interview V2 turn action — optional for API compatibility. */
    private String nextAction;
    private String answerQuality;
    private Boolean aiUnavailable;
    private String provider;
    private String modelId;

    public InterviewAnswerResponse() {
    }

    public InterviewAnswerResponse(TranscriptMessageDto userMessage, TranscriptMessageDto aiFollowUpMessage,
                                   int nextQuestionIndex, boolean isFinished) {
        this.userMessage = userMessage;
        this.aiFollowUpMessage = aiFollowUpMessage;
        this.nextQuestionIndex = nextQuestionIndex;
        this.isFinished = isFinished;
    }

    public TranscriptMessageDto getUserMessage() {
        return userMessage;
    }

    public void setUserMessage(TranscriptMessageDto userMessage) {
        this.userMessage = userMessage;
    }

    public TranscriptMessageDto getAiFollowUpMessage() {
        return aiFollowUpMessage;
    }

    public void setAiFollowUpMessage(TranscriptMessageDto aiFollowUpMessage) {
        this.aiFollowUpMessage = aiFollowUpMessage;
    }

    public int getNextQuestionIndex() {
        return nextQuestionIndex;
    }

    public void setNextQuestionIndex(int nextQuestionIndex) {
        this.nextQuestionIndex = nextQuestionIndex;
    }

    @JsonProperty("isFinished")
    public boolean isFinished() {
        return isFinished;
    }

    @JsonProperty("isFinished")
    public void setFinished(boolean finished) {
        isFinished = finished;
    }

    public String getNextAction() {
        return nextAction;
    }

    public void setNextAction(String nextAction) {
        this.nextAction = nextAction;
    }

    public String getAnswerQuality() {
        return answerQuality;
    }

    public void setAnswerQuality(String answerQuality) {
        this.answerQuality = answerQuality;
    }

    public Boolean getAiUnavailable() {
        return aiUnavailable;
    }

    public void setAiUnavailable(Boolean aiUnavailable) {
        this.aiUnavailable = aiUnavailable;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getModelId() {
        return modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }
}
