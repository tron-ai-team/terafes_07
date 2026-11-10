package com.tronai.interview.session;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Serializable snapshot of {@link InterviewSession} turn-engine memory for MySQL durability.
 */
public class InterviewEngineState {

    private String activeTopic;
    private int followUpsOnActiveTopic;
    private List<String> topicCoverage = new ArrayList<>();
    private List<Map<String, Object>> assessments = new ArrayList<>();
    private List<String> askedQuestions = new ArrayList<>();

    public InterviewEngineState() {
    }

    public static InterviewEngineState fromSession(InterviewSession session) {
        InterviewEngineState state = new InterviewEngineState();
        state.activeTopic = session.getActiveTopic();
        state.followUpsOnActiveTopic = session.getFollowUpsOnActiveTopic();
        state.topicCoverage = new ArrayList<>(session.getTopicCoverage());
        state.assessments = new ArrayList<>(session.getAssessments());
        state.askedQuestions = new ArrayList<>(session.getAskedQuestions());
        return state;
    }

    public void applyTo(InterviewSession session) {
        if (activeTopic != null && !activeTopic.isBlank()) {
            session.setActiveTopic(activeTopic);
        }
        session.restoreFollowUpsOnActiveTopic(followUpsOnActiveTopic);
        if (topicCoverage != null) {
            session.setTopicCoverage(topicCoverage);
        }
        if (assessments != null) {
            session.replaceAssessments(assessments);
        }
        if (askedQuestions != null) {
            session.replaceAskedQuestions(askedQuestions);
        }
    }

    public String getActiveTopic() {
        return activeTopic;
    }

    public void setActiveTopic(String activeTopic) {
        this.activeTopic = activeTopic;
    }

    public int getFollowUpsOnActiveTopic() {
        return followUpsOnActiveTopic;
    }

    public void setFollowUpsOnActiveTopic(int followUpsOnActiveTopic) {
        this.followUpsOnActiveTopic = followUpsOnActiveTopic;
    }

    public List<String> getTopicCoverage() {
        return topicCoverage;
    }

    public void setTopicCoverage(List<String> topicCoverage) {
        this.topicCoverage = topicCoverage;
    }

    public List<Map<String, Object>> getAssessments() {
        return assessments;
    }

    public void setAssessments(List<Map<String, Object>> assessments) {
        this.assessments = assessments;
    }

    public List<String> getAskedQuestions() {
        return askedQuestions;
    }

    public void setAskedQuestions(List<String> askedQuestions) {
        this.askedQuestions = askedQuestions;
    }
}
