package com.tronai.ai.research.search;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.research.ResearchToolStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Opt-in Serper.dev Google Search adapter with hard daily budget gates.
 */
@Component
public class SerperSearchClient {

    private static final Logger log = LoggerFactory.getLogger(SerperSearchClient.class);

    private final WebSearchProperties properties;
    private final ObjectMapper objectMapper;
    private final SerperBudgetTracker budgetTracker;

    public SerperSearchClient(
            WebSearchProperties properties,
            ObjectMapper objectMapper,
            SerperBudgetTracker budgetTracker) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.budgetTracker = budgetTracker;
    }

    public boolean isConfigured() {
        return properties.getSerper().isReady();
    }

    public ResearchToolStatus status() {
        return isConfigured() ? ResearchToolStatus.CONFIGURED : ResearchToolStatus.DISABLED;
    }

    public ProviderSearchOutcome search(String query, int maxResults) {
        if (!isConfigured()) {
            return ProviderSearchOutcome.failed("SERPER", query, "unavailable", "Serper is not configured or disabled");
        }
        if (query == null || query.isBlank()) {
            return ProviderSearchOutcome.failed("SERPER", query, "error", "query required");
        }
        if (!budgetTracker.tryConsume()) {
            return ProviderSearchOutcome.failed("SERPER", query, "unavailable",
                    "Serper daily budget exhausted or zero");
        }

        WebSearchProperties.Serper cfg = properties.getSerper();
        int limit = Math.max(1, Math.min(maxResults > 0 ? maxResults : cfg.getMaxResults(), 10));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("q", query.trim());
        body.put("num", limit);

        long started = System.currentTimeMillis();
        try {
            String raw = restClient(cfg).post()
                    .uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-API-KEY", cfg.getApiKey().trim())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            List<NormalizedSearchHit> hits = parseHits(raw, limit);
            long ms = System.currentTimeMillis() - started;
            log.info("Serper search ok hits={} latencyMs={} remainingBudget={}",
                    hits.size(), ms, budgetTracker.remaining());
            return new ProviderSearchOutcome("SERPER", query.trim(), true, "ok",
                    "Serper Google results", hits, ms, null);
        } catch (RestClientResponseException e) {
            budgetTracker.releaseUnused();
            int code = e.getStatusCode().value();
            long ms = System.currentTimeMillis() - started;
            log.warn("Serper search failed status={} latencyMs={}", code, ms);
            if (code == 401 || code == 403) {
                return ProviderSearchOutcome.failed("SERPER", query, "unavailable", "invalid_credentials");
            }
            if (code == 429) {
                return ProviderSearchOutcome.failed("SERPER", query, "error", "rate_limited");
            }
            return ProviderSearchOutcome.failed("SERPER", query, "error", "upstream_" + code);
        } catch (Exception e) {
            budgetTracker.releaseUnused();
            String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase(Locale.ROOT);
            boolean timeout = msg.contains("timed out") || msg.contains("timeout");
            log.warn("Serper search unavailable: {}", e.getClass().getSimpleName());
            return ProviderSearchOutcome.failed("SERPER", query,
                    timeout ? "timeout" : "unavailable",
                    timeout ? "Serper timed out" : "Serper unreachable");
        }
    }

    private List<NormalizedSearchHit> parseHits(String raw, int limit) throws Exception {
        List<NormalizedSearchHit> hits = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return hits;
        }
        JsonNode root = objectMapper.readTree(raw);
        JsonNode organic = root.path("organic");
        Instant now = Instant.now();
        if (organic.isArray()) {
            for (JsonNode node : organic) {
                if (hits.size() >= limit) {
                    break;
                }
                String url = text(node, "link");
                var safe = SearchUrlSanitizer.sanitize(url);
                if (safe.isEmpty()) {
                    continue;
                }
                hits.add(new NormalizedSearchHit(
                        text(node, "title"),
                        safe.get(),
                        text(node, "snippet"),
                        "SERPER",
                        "google",
                        null,
                        now,
                        null));
            }
        }
        return hits;
    }

    private RestClient restClient(WebSearchProperties.Serper cfg) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(cfg.getConnectTimeoutMs());
        factory.setReadTimeout(cfg.getReadTimeoutMs());
        String base = cfg.getBaseUrl().replaceAll("/+$", "");
        return RestClient.builder().baseUrl(base).requestFactory(factory).build();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("");
    }
}
