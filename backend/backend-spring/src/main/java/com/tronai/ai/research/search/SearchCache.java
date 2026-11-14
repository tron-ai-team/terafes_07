package com.tronai.ai.research.search;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived cache for public search queries only. Never caches private user content.
 * Keys include provider, language, and result limit to prevent cross-contamination.
 */
@Component
public class SearchCache {

    static final int MAX_ENTRIES = 512;

    private final WebSearchProperties properties;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();

    public SearchCache(WebSearchProperties properties) {
        this.properties = properties;
    }

    public ProviderSearchOutcome get(String provider, String query, String language, int maxResults) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String key = key(provider, query, language, maxResults);
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

    /** @deprecated Use {@link #get(String, String, String, int)}. */
    @Deprecated
    public ProviderSearchOutcome get(String provider, String query) {
        return get(provider, query, "", 0);
    }

    public void put(String provider, String query, String language, int maxResults, ProviderSearchOutcome outcome) {
        if (outcome == null || !outcome.hasHits()) {
            return;
        }
        int ttl = Math.max(30, properties.getCacheTtlSeconds());
        cache.put(key(provider, query, language, maxResults), new Entry(outcome, Instant.now().plusSeconds(ttl)));
        evictIfNeeded();
    }

    /** @deprecated Use {@link #put(String, String, String, int, ProviderSearchOutcome)}. */
    @Deprecated
    public void put(String provider, String query, ProviderSearchOutcome outcome) {
        put(provider, query, "", 0, outcome);
    }

    int size() {
        return cache.size();
    }

    static String key(String provider, String query, String language, int maxResults) {
        String p = provider == null ? "" : provider.trim().toUpperCase(Locale.ROOT);
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String lang = language == null || language.isBlank() ? "_" : language.trim().toLowerCase(Locale.ROOT);
        int limit = Math.max(0, maxResults);
        return p + "|" + lang + "|" + limit + "|" + q;
    }

    private void evictIfNeeded() {
        if (cache.size() <= MAX_ENTRIES) {
            return;
        }
        Instant now = Instant.now();
        cache.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
        if (cache.size() <= MAX_ENTRIES) {
            return;
        }
        // Bound memory: drop oldest entries by expiry time.
        cache.entrySet().stream()
                .sorted((a, b) -> a.getValue().expiresAt().compareTo(b.getValue().expiresAt()))
                .limit(Math.max(1, cache.size() - MAX_ENTRIES))
                .map(Map.Entry::getKey)
                .toList()
                .forEach(cache::remove);
    }

    private record Entry(ProviderSearchOutcome outcome, Instant expiresAt) {
    }
}
