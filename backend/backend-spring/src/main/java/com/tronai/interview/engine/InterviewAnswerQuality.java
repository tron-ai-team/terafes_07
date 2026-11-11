package com.tronai.interview.engine;

/**
 * Internal answer quality label — never spoken to the candidate.
 */
public enum InterviewAnswerQuality {
    STRONG,
    ADEQUATE,
    VAGUE,
    INCORRECT,
    IRRELEVANT,
    UNCLEAR_STT;

    public static InterviewAnswerQuality fromString(String value) {
        if (value == null || value.isBlank()) {
            return ADEQUATE;
        }
        String clean = value.trim().toUpperCase().replace('-', '_');
        for (InterviewAnswerQuality quality : values()) {
            if (quality.name().equals(clean)) {
                return quality;
            }
        }
        return ADEQUATE;
    }
}
