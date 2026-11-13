package com.tronai.ai.profile;

/**
 * Universal AI performance profile enum.
 * Represents logical user-facing AI tiers (FAST, QUALITY).
 */
public enum AiProfile {
    FAST("Fast", "Fast responses for everyday use", "tron-fast", 0.4, 1024),
    QUALITY("Quality", "Higher-quality answers with deeper reasoning and slower response time", "tron-quality", 0.2, 2048),
    SMART("Smart", "RTX-powered local Smart routing via the shared AI gateway", "tron-quality", 0.25, 1536),
    CLOUD("Cloud", "Existing verified cloud providers via the shared AI gateway", "tron-quality", 0.25, 1536),
    ULTRA("Ultra", "Highest-quality gateway models with daily Ultra credits", "tron-quality", 0.15, 4096),
    AUTO("Auto", "Automatic gateway mode selection by feature", "tron-fast", 0.35, 1024);

    private final String displayName;
    private final String description;
    private final String modelId;
    private final double defaultTemperature;
    private final int defaultMaxTokens;

    AiProfile(String displayName, String description, String modelId, double defaultTemperature, int defaultMaxTokens) {
        this.displayName = displayName;
        this.description = description;
        this.modelId = modelId;
        this.defaultTemperature = defaultTemperature;
        this.defaultMaxTokens = defaultMaxTokens;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public String getModelId() {
        return modelId;
    }

    public double getDefaultTemperature() {
        return defaultTemperature;
    }

    public int getDefaultMaxTokens() {
        return defaultMaxTokens;
    }

    /**
     * Resolves an AiProfile from string safely.
     * Defaults to FAST if null or empty (strict backward compatibility requirement).
     * Rejects unknown profile strings with IllegalArgumentException.
     */
    public static AiProfile fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return FAST;
        }
        String clean = value.trim().toUpperCase();
        for (AiProfile profile : values()) {
            if (profile.name().equals(clean)) {
                return profile;
            }
        }
        throw new IllegalArgumentException(
                "Unknown AI profile: '" + value + "'. Allowed profiles are: FAST, QUALITY, SMART, CLOUD, ULTRA, AUTO");
    }
}
