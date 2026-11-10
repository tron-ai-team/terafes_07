package com.tronai.interview.engine;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Structured interviewer turn: spoken dialogue stays separate from internal scoring.
 */
public class InterviewTurnDecision {

    private InterviewTurnAction nextAction = InterviewTurnAction.NEXT_TOPIC;
    private InterviewAnswerQuality answerQuality = InterviewAnswerQuality.ADEQUATE;
    private String spokenReply = "";
    private String nextQuestion = "";
    private String currentTopic = "";
    private List<String> coverage = new ArrayList<>();
    private Map<String, Integer> internalScores = new LinkedHashMap<>();
    private String assessmentNotes = "";
    private boolean usedAi;
    private String provider;
    private String modelId;
    private boolean aiUnavailable;

    public String interviewerUtterance() {
        if (nextAction == InterviewTurnAction.CLOSE) {
            return spokenReply != null ? spokenReply.trim() : "";
        }
        String reply = spokenReply == null ? "" : spokenReply.trim();
        String question = nextQuestion == null ? "" : nextQuestion.trim();
        if (reply.isBlank()) {
            return question;
        }
        if (question.isBlank()) {
            return reply;
        }
        if (reply.contains(question) || question.contains(reply)) {
            return reply.length() >= question.length() ? reply : question;
        }
        return reply + " " + question;
    }

    public InterviewTurnAction getNextAction() {
        return nextAction;
    }

    public void setNextAction(InterviewTurnAction nextAction) {
        this.nextAction = nextAction != null ? nextAction : InterviewTurnAction.NEXT_TOPIC;
    }

    public InterviewAnswerQuality getAnswerQuality() {
        return answerQuality;
    }

    public void setAnswerQuality(InterviewAnswerQuality answerQuality) {
        this.answerQuality = answerQuality != null ? answerQuality : InterviewAnswerQuality.ADEQUATE;
    }

    public String getSpokenReply() {
        return spokenReply;
    }

    public void setSpokenReply(String spokenReply) {
        this.spokenReply = spokenReply != null ? spokenReply : "";
    }

    public String getNextQuestion() {
        return nextQuestion;
    }

    public void setNextQuestion(String nextQuestion) {
        this.nextQuestion = nextQuestion != null ? nextQuestion : "";
    }

    public String getCurrentTopic() {
        return currentTopic;
    }

    public void setCurrentTopic(String currentTopic) {
        this.currentTopic = currentTopic != null ? currentTopic : "";
    }

    public List<String> getCoverage() {
        return coverage;
    }

    public void setCoverage(List<String> coverage) {
        this.coverage = coverage != null ? new ArrayList<>(coverage) : new ArrayList<>();
    }

    public Map<String, Integer> getInternalScores() {
        return internalScores;
    }

    public void setInternalScores(Map<String, Integer> internalScores) {
        this.internalScores = internalScores != null ? new LinkedHashMap<>(internalScores) : new LinkedHashMap<>();
    }

    public String getAssessmentNotes() {
        return assessmentNotes;
    }

    public void setAssessmentNotes(String assessmentNotes) {
        this.assessmentNotes = assessmentNotes != null ? assessmentNotes : "";
    }

    public boolean isUsedAi() {
        return usedAi;
    }

    public void setUsedAi(boolean usedAi) {
        this.usedAi = usedAi;
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

    public boolean isAiUnavailable() {
        return aiUnavailable;
    }

    public void setAiUnavailable(boolean aiUnavailable) {
        this.aiUnavailable = aiUnavailable;
    }
}
