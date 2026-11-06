package com.tronai.ai.research;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tavily Search API client — {@code POST /search} with Bearer auth.
 * Does not invent results when unconfigured or failing.
 */
@Component
public class TavilySearchClient {

    private static final Logger log = LoggerFactory.getLogger(TavilySearchClient.class);

    private final ResearchProperties properties;
    private final ObjectMapper objectMapper;

    public TavilySearchClient(ResearchProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return properties.getTavily().isConfigured();
    }

    public ResearchToolStatus status() {
        return isConfigured() ? ResearchToolStatus.CONFIGURED : ResearchToolStatus.DISABLED;
    }

    public WebSearchResult search(String query, int maxResults) {
        if (!isConfigured()) {
            return WebSearchResult.failed(query, "tavily", "Tavily is not configured");
        }
        if (query == null || query.isBlank()) {
            return WebSearchResult.failed(query, "tavily", "query required");
        }
        int limit = Math.max(1, Math.min(maxResults > 0 ? maxResults : properties.getMaxSearchResults(), 20));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("query", query.trim());
        body.put("search_depth", properties.getTavily().getSearchDepth());
        body.put("max_results", limit);
        body.put("include_answer", false);

        long started = System.currentTimeMillis();
        try {
            String raw = restClient().post()
                    .uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.getTavily().getApiKey().trim())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            List<WebSearchResult.Hit> hits = parseHits(raw);
            log.info("Tavily search ok hits={} latencyMs={}", hits.size(), System.currentTimeMillis() - started);
            return new WebSearchResult(query.trim(), "tavily", hits, null);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            log.warn("Tavily search failed status={} latencyMs={}", status, System.currentTimeMillis() - started);
            if (status == 401 || status == 403) {
                return WebSearchResult.failed(query, "tavily", "invalid_credentials");
            }
            if (status == 429) {
                return WebSearchResult.failed(query, "tavily", "rate_limited");
            }
            return WebSearchResult.failed(query, "tavily", "upstream_" + status);
        } catch (Exception e) {
            log.warn("Tavily search unavailable: {}", e.getClass().getSimpleName());
            return WebSearchResult.failed(query, "tavily", "unavailable");
        }
    }

    private List<WebSearchResult.Hit> parseHits(String raw) throws Exception {
        List<WebSearchResult.Hit> hits = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return hits;
        }
        JsonNode root = objectMapper.readTree(raw);
        JsonNode results = root.path("results");
        if (!results.isArray()) {
            return hits;
        }
        for (JsonNode node : results) {
            String url = text(node, "url");
            if (url.isBlank()) {
                continue;
            }
            String title = text(node, "title");
            String snippet = text(node, "content");
            if (snippet.isBlank()) {
                snippet = text(node, "raw_content");
            }
            Double score = node.path("score").isNumber() ? node.path("score").asDouble() : null;
            hits.add(new WebSearchResult.Hit(title, url, clip(snippet, 600), score));
        }
        return hits;
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        String base = properties.getTavily().getBaseUrl().replaceAll("/+$", "");
        return RestClient.builder().baseUrl(base).requestFactory(factory).build();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("");
    }

    private static String clip(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() > max ? s.substring(0, max) : s;
    }
}
