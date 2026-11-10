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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Firecrawl scrape API — {@code POST /v2/scrape} with Bearer auth.
 * Callers must SSRF-validate URLs before invoking.
 */
@Component
public class FirecrawlScrapeClient {

    private static final Logger log = LoggerFactory.getLogger(FirecrawlScrapeClient.class);

    private final ResearchProperties properties;
    private final ObjectMapper objectMapper;

    public FirecrawlScrapeClient(ResearchProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return properties.getFirecrawl().isConfigured();
    }

    public ResearchToolStatus status() {
        return isConfigured() ? ResearchToolStatus.CONFIGURED : ResearchToolStatus.DISABLED;
    }

    public WebExtractResult scrape(String url) {
        if (!isConfigured()) {
            return WebExtractResult.failed(url, "firecrawl", "Firecrawl is not configured");
        }
        if (url == null || url.isBlank()) {
            return WebExtractResult.failed(url, "firecrawl", "url required");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("url", url.trim());
        body.put("formats", List.of("markdown"));
        body.put("onlyMainContent", true);

        long started = System.currentTimeMillis();
        try {
            String raw = restClient().post()
                    .uri("/v2/scrape")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.getFirecrawl().getApiKey().trim())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            WebExtractResult parsed = parse(url.trim(), raw);
            log.info("Firecrawl scrape ok latencyMs={} chars={}",
                    System.currentTimeMillis() - started,
                    parsed.content() == null ? 0 : parsed.content().length());
            return parsed;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            log.warn("Firecrawl scrape failed status={} latencyMs={}", status, System.currentTimeMillis() - started);
            if (status == 401 || status == 403) {
                return WebExtractResult.failed(url, "firecrawl", "invalid_credentials");
            }
            if (status == 429) {
                return WebExtractResult.failed(url, "firecrawl", "rate_limited");
            }
            return WebExtractResult.failed(url, "firecrawl", "upstream_" + status);
        } catch (Exception e) {
            log.warn("Firecrawl scrape unavailable: {}", e.getClass().getSimpleName());
            return WebExtractResult.failed(url, "firecrawl", "unavailable");
        }
    }

    private WebExtractResult parse(String url, String raw) throws Exception {
        if (raw == null || raw.isBlank()) {
            return WebExtractResult.failed(url, "firecrawl", "empty_response");
        }
        JsonNode root = objectMapper.readTree(raw);
        JsonNode data = root.has("data") ? root.path("data") : root;
        String title = text(data, "title");
        if (title.isBlank() && data.path("metadata").isObject()) {
            title = text(data.path("metadata"), "title");
        }
        String content = text(data, "markdown");
        if (content.isBlank()) {
            content = text(data, "content");
        }
        if (content.isBlank()) {
            content = text(data, "html");
        }
        content = clip(content, properties.getMaxExtractChars());
        if (content.isBlank()) {
            return WebExtractResult.failed(url, "firecrawl", "no_content");
        }
        return new WebExtractResult(url, title, content, "firecrawl", true, null);
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        String base = properties.getFirecrawl().getBaseUrl().replaceAll("/+$", "");
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
