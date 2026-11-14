package com.tronai.ai.research.search;

import java.time.Instant;

/**
 * Provider-agnostic search hit used for grounding and API citations.
 */
public record NormalizedSearchHit(
        String title,
        String url,
        String snippet,
        String sourceProvider,
        String sourceEngine,
        Instant publishedAt,
        Instant fetchedAt,
        Double confidence
) {
    public NormalizedSearchHit {
        title = title == null ? "" : title;
        url = url == null ? "" : url;
        snippet = snippet == null ? "" : snippet;
        sourceProvider = sourceProvider == null ? "" : sourceProvider;
        sourceEngine = sourceEngine == null ? "" : sourceEngine;
        fetchedAt = fetchedAt == null ? Instant.now() : fetchedAt;
    }
}
