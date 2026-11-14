package com.tronai.ai.research.search;

/**
 * Outcome of {@link SearchDecisionPolicy} for a single user turn.
 */
public record SearchDecision(
        ResolvedSearchMode mode,
        boolean shouldSearch,
        String reason,
        String sanitizedQuery,
        boolean containsPrivateSignals
) {
    public static SearchDecision skip(ResolvedSearchMode mode, String reason) {
        return new SearchDecision(mode, false, reason, "", false);
    }

    public static SearchDecision search(ResolvedSearchMode mode, String reason, String query, boolean privateSignals) {
        return new SearchDecision(mode, true, reason, query == null ? "" : query, privateSignals);
    }
}
