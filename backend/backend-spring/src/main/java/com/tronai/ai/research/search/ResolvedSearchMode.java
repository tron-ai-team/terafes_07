package com.tronai.ai.research.search;

import java.util.Locale;

/**
 * Normalized chat/voice search mode. Unknown values fall back to AUTO for backward compatibility.
 */
public enum ResolvedSearchMode {
    OFF,
    AUTO,
    ON;

    public static ResolvedSearchMode fromRaw(String raw) {
        if (raw == null || raw.isBlank()) {
            return AUTO;
        }
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "off" -> OFF;
            case "on" -> ON;
            default -> AUTO;
        };
    }

    public String wireValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
