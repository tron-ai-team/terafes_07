package com.tronai.ai.research.search;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived cache for public search queries only. Never caches private user content.
 */
@Component
public class SearchCache {

    private final WebSearchProperties properties;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();

    public SearchCache(WebSearchProperties properties) {
        this.properties = properties;
    }

    public ProviderSearchOutcome get(String provider, String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String key = key(provider, query);
        Entry entry = cache.get(key);
        if (entry == null) {
            return null;
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            cache.remove(key);
            return null;
        }
        return entry.outcome();
    }

    public void put(String provider, String query, ProviderSearchOutcome outcome) {
        if (outcome == null || !outcome.hasHits()) {
            return;
        }
        int ttl = Math.max(30, properties.getCacheTtlSeconds());
        cache.put(key(provider, query), new Entry(outcome, Instant.now().plusSeconds(ttl)));
        if (cache.size() > 512) {
            // Simple bound — drop expired entries.
            Instant now = Instant.now();
            cache.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
        }
    }

    private static String key(String provider, String query) {
        return (provider == null ? "" : provider) + "|" + query.trim().toLowerCase(Locale.ROOT);
    }

    private record Entry(ProviderSearchOutcome outcome, Instant expiresAt) {
    }
}
