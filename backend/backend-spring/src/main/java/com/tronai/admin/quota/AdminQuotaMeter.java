package com.tronai.admin.quota;

import com.tronai.ai.gateway.AiFeature;

/**
 * JST-day feature quota meters (independent of Ultra UTC credits).
 */
public enum AdminQuotaMeter {
    AI_CHAT,
    AI_VOICE,
    AI_INTERVIEW,
    CV_MAGIC_FILL,
    CV_AI_ASSIST,
    OTHER_AI;

    public static AdminQuotaMeter fromAiFeature(AiFeature feature, String meterHint) {
        if (feature == null) {
            return OTHER_AI;
        }
        return switch (feature) {
            case CHAT -> AI_CHAT;
            case VOICE_REASONING -> AI_VOICE;
            case INTERVIEW, INTERVIEW_FEEDBACK -> AI_INTERVIEW;
            case CV_GENERATION -> resolveCvMeter(meterHint);
            default -> OTHER_AI;
        };
    }

    private static AdminQuotaMeter resolveCvMeter(String meterHint) {
        if (meterHint == null || meterHint.isBlank()) {
            return CV_MAGIC_FILL;
        }
        String normalized = meterHint.trim().toUpperCase();
        if ("CV_AI_ASSIST".equals(normalized)) {
            return CV_AI_ASSIST;
        }
        if ("CV_MAGIC_FILL".equals(normalized)) {
            return CV_MAGIC_FILL;
        }
        try {
            return AdminQuotaMeter.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return CV_MAGIC_FILL;
        }
    }
}
