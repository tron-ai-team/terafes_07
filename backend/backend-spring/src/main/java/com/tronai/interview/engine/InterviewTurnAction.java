package com.tronai.interview.engine;

/**
 * Interviewer decision for the next spoken turn.
 */
public enum InterviewTurnAction {
    FOLLOW_UP,
    NEXT_TOPIC,
    CLARIFY,
    REDIRECT,
    CLOSE;

    public static InterviewTurnAction fromString(String value) {
        if (value == null || value.isBlank()) {
            return NEXT_TOPIC;
        }
        String clean = value.trim().toUpperCase().replace('-', '_');
        for (InterviewTurnAction action : values()) {
            if (action.name().equals(clean)) {
                return action;
            }
        }
        return NEXT_TOPIC;
    }
}
