package com.tronai.ai.research.search;

import java.util.List;

public record ProviderSearchOutcome(
        String provider,
        String query,
        boolean attempted,
        String status,
        String detail,
        List<NormalizedSearchHit> results,
        long timingMs,
        String errorCode
) {
    public ProviderSearchOutcome {
        results = results == null ? List.of() : List.copyOf(results);
        provider = provider == null ? "" : provider;
        query = query == null ? "" : query;
        status = status == null ? "unavailable" : status;
        detail = detail == null ? "" : detail;
    }

    public static ProviderSearchOutcome failed(String provider, String query, String status, String detail) {
        return new ProviderSearchOutcome(provider, query, true, status, detail, List.of(), 0L, detail);
    }

    public boolean hasHits() {
        return !results.isEmpty();
    }
}
