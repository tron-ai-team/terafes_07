package com.tronai.ai.gateway;

/**
 * User-facing intelligence modes for the shared AI gateway.
 * FAST, QUALITY, and CLOUD remain valid for existing / exhibition clients.
 */
public enum AiMode {
    FAST,
    SMART,
    CLOUD,
    QUALITY,
    ULTRA,
    AUTO;

    public static AiMode fromString(String value) {
        if (value == null || value.isBlank()) {
            return AUTO;
        }
        String clean = value.trim().toUpperCase();
        for (AiMode mode : values()) {
            if (mode.name().equals(clean)) {
                return mode;
            }
        }
        throw new IllegalArgumentException(
                "Unknown AI mode: '" + value + "'. Allowed: FAST, SMART, CLOUD, QUALITY, ULTRA, AUTO");
    }

    /**
     * QUALITY remains an API-compatible alias for SMART routing.
     * CLOUD is a distinct selectable cloud route (does not alias to SMART).
     */
    public AiMode routingMode() {
        return this == QUALITY ? SMART : this;
    }

    public boolean consumesUltraCredits() {
        return this == ULTRA;
    }
}
