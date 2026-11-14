package com.tronai.ai.research.search;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.research.ResearchToolStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Private SearXNG JSON search client. Does not invent results.
 * Requires SearXNG {@code search.formats} to include {@code json}.
 */
@Component
public class SearxngSearchClient {

    private static final Logger log = LoggerFactory.getLogger(SearxngSearchClient.class);

    private final WebSearchProperties properties;
    private final ObjectMapper objectMapper;

    public SearxngSearchClient(WebSearchProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return properties.getSearxng().isReady();
    }

    public ResearchToolStatus status() {
        return isConfigured() ? ResearchToolStatus.CONFIGURED : ResearchToolStatus.DISABLED;
    }

    public ProviderSearchOutcome search(String query, String language, int maxResults) {
        if (!isConfigured()) {
            return ProviderSearchOutcome.failed("SEARXNG", query, "unavailable", "SearXNG is not configured");
        }
        if (query == null || query.isBlank()) {
            return ProviderSearchOutcome.failed("SEARXNG", query, "error", "query required");
        }

        WebSearchProperties.Searxng cfg = properties.getSearxng();
        int limit = Math.max(1, Math.min(maxResults > 0 ? maxResults : cfg.getMaxResults(), 10));
        String lang = (language == null || language.isBlank()) ? cfg.getLanguage() : language;
        long started = System.currentTimeMillis();

        try {
            String raw = restClient(cfg).get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query.trim())
                            .queryParam("format", "json")
                            .queryParam("language", lang)
                            .queryParam("pageno", 1)
                            .build())
                    .retrieve()
                    .body(String.class);

            List<NormalizedSearchHit> hits = parseHits(raw, limit);
            long ms = System.currentTimeMillis() - started;
            log.info("SearXNG search ok hits={} latencyMs={}", hits.size(), ms);
            if (hits.isEmpty()) {
                return new ProviderSearchOutcome("SEARXNG", query.trim(), true, "ok",
                        "No usable results", hits, ms, null);
            }
            return new ProviderSearchOutcome("SEARXNG", query.trim(), true, "ok",
                    "SearXNG results", hits, ms, null);
        } catch (RestClientResponseException e) {
            int code = e.getStatusCode().value();
            long ms = System.currentTimeMillis() - started;
            log.warn("SearXNG search failed status={} latencyMs={}", code, ms);
            if (code == 403) {
                return ProviderSearchOutcome.failed("SEARXNG", query, "unavailable",
                        "SearXNG JSON format is disabled (HTTP 403). Enable search.formats: [html, json].");
            }
            if (code == 429) {
                return ProviderSearchOutcome.failed("SEARXNG", query, "error", "rate_limited");
            }
            if (code >= 500) {
                return ProviderSearchOutcome.failed("SEARXNG", query, "error", "upstream_" + code);
            }
            return ProviderSearchOutcome.failed("SEARXNG", query, "error", "upstream_" + code);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - started;
            String msg = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            boolean timeout = msg.toLowerCase(Locale.ROOT).contains("timed out")
                    || msg.toLowerCase(Locale.ROOT).contains("timeout");
            log.warn("SearXNG search unavailable: {}", e.getClass().getSimpleName());
            return ProviderSearchOutcome.failed("SEARXNG", query,
                    timeout ? "timeout" : "unavailable",
                    timeout ? "SearXNG timed out" : "SearXNG unreachable");
        }
    }

    private List<NormalizedSearchHit> parseHits(String raw, int limit) throws Exception {
        List<NormalizedSearchHit> hits = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return hits;
        }
        JsonNode root = objectMapper.readTree(raw);
        JsonNode results = root.path("results");
        if (!results.isArray()) {
            return hits;
        }
        Instant now = Instant.now();
        for (JsonNode node : results) {
            if (hits.size() >= limit) {
                break;
            }
            String url = text(node, "url");
            var safeUrl = SearchUrlSanitizer.sanitize(url);
            if (safeUrl.isEmpty()) {
                continue;
            }
            String title = text(node, "title");
            String snippet = text(node, "content");
            if (snippet.isBlank()) {
                snippet = text(node, "snippet");
            }
            String engine = text(node, "engine");
            if (engine.isBlank() && node.path("engines").isArray() && !node.path("engines").isEmpty()) {
                engine = node.path("engines").get(0).asText("");
            }
            hits.add(new NormalizedSearchHit(
                    title, safeUrl.get(), snippet, "SEARXNG", engine, null, now, null));
        }
        return hits;
    }

    private RestClient restClient(WebSearchProperties.Searxng cfg) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(cfg.getConnectTimeoutMs());
        factory.setReadTimeout(cfg.getReadTimeoutMs());
        return RestClient.builder()
                .baseUrl(trimSlash(cfg.getBaseUrl()))
                .requestFactory(factory)
                .build();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("");
    }

    private static String trimSlash(String base) {
        if (base == null) {
            return "";
        }
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }
}
