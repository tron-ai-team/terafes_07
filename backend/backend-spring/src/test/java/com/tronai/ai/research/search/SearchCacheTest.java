package com.tronai.ai.research.search;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SearchCacheTest {

    private SearchCache cache;

    @BeforeEach
    void setUp() {
        WebSearchProperties properties = new WebSearchProperties();
        properties.setCacheTtlSeconds(300);
        cache = new SearchCache(properties);
    }

    private ProviderSearchOutcome hit(String provider, String marker) {
        return new ProviderSearchOutcome(provider, "q", true, "ok", marker,
                List.of(new NormalizedSearchHit(marker, "https://example.com/" + marker, "s",
                        provider, "google", null, Instant.now(), null)),
                1L, null);
    }

    @Test
    @DisplayName("Language is part of the cache key")
    void languageIsolatesEntries() {
        cache.put("SEARXNG", "java release", "en", 3, hit("SEARXNG", "en-hit"));
        cache.put("SEARXNG", "java release", "ja", 3, hit("SEARXNG", "ja-hit"));

        assertThat(cache.get("SEARXNG", "java release", "en", 3).detail()).isEqualTo("en-hit");
        assertThat(cache.get("SEARXNG", "java release", "ja", 3).detail()).isEqualTo("ja-hit");
        assertThat(cache.get("SEARXNG", "java release", "en", 3).detail())
                .isNotEqualTo(cache.get("SEARXNG", "java release", "ja", 3).detail());
    }

    @Test
    @DisplayName("Result limit is part of the cache key (FAST vs SMART)")
    void resultLimitIsolatesFastAndSmart() {
        cache.put("SEARXNG", "latest news", "en", 3, hit("SEARXNG", "fast-3"));
        cache.put("SEARXNG", "latest news", "en", 5, hit("SEARXNG", "smart-5"));

        assertThat(cache.get("SEARXNG", "latest news", "en", 3).detail()).isEqualTo("fast-3");
        assertThat(cache.get("SEARXNG", "latest news", "en", 5).detail()).isEqualTo("smart-5");
        assertThat(cache.get("SEARXNG", "latest news", "en", 3)).isNotNull();
        assertThat(cache.get("SEARXNG", "latest news", "en", 4)).isNull();
    }

    @Test
    @DisplayName("Cache stays bounded")
    void boundsMemory() {
        for (int i = 0; i < SearchCache.MAX_ENTRIES + 40; i++) {
            cache.put("SEARXNG", "q-" + i, "en", 3, hit("SEARXNG", "m" + i));
        }
        assertThat(cache.size()).isLessThanOrEqualTo(SearchCache.MAX_ENTRIES);
    }
}
