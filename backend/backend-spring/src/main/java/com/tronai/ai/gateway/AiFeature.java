package com.tronai.ai.gateway;

/**
 * Product surfaces that share the AI gateway.
 */
public enum AiFeature {
    CHAT(1),
    VOICE_REASONING(1),
    INTERVIEW(2),
    INTERVIEW_FEEDBACK(1),
    CV_REVIEW(1),
    CV_GENERATION(1),
    COMPANY_RESEARCH(1),
    CAREER_JOB_MATCHING(1),
    CODING_AGENT(2),
    BROWSER_AGENT(2),
    SUPERVISOR_PLAN(1);

    private final int defaultUltraCredits;

    AiFeature(int defaultUltraCredits) {
        this.defaultUltraCredits = defaultUltraCredits;
    }

    public int defaultUltraCredits() {
        return defaultUltraCredits;
    }

    public static AiFeature fromString(String value) {
        if (value == null || value.isBlank()) {
            return CHAT;
        }
        return AiFeature.valueOf(value.trim().toUpperCase());
    }
}
