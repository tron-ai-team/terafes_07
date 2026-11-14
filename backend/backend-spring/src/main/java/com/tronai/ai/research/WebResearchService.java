package com.tronai.ai.research;

import com.tronai.career.company.SafeUrlFetcher;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Orchestrates Tavily search + Firecrawl/SafeUrlFetcher extraction.
 * Never fabricates web evidence when tools are unavailable.
 */
@Service
public class WebResearchService {

    private static final Logger log = LoggerFactory.getLogger(WebResearchService.class);

    private final ResearchProperties properties;
    private final TavilySearchClient tavily;
    private final FirecrawlScrapeClient firecrawl;
    private final SafeUrlFetcher safeUrlFetcher;
    private final com.tronai.ai.research.search.SearxngSearchClient searxng;
    private final com.tronai.ai.research.search.SerperSearchClient serper;
    private final com.tronai.ai.research.search.WebSearchProperties webSearchProperties;

    public WebResearchService(
            ResearchProperties properties,
            TavilySearchClient tavily,
            FirecrawlScrapeClient firecrawl,
            SafeUrlFetcher safeUrlFetcher,
            com.tronai.ai.research.search.SearxngSearchClient searxng,
            com.tronai.ai.research.search.SerperSearchClient serper,
            com.tronai.ai.research.search.WebSearchProperties webSearchProperties) {
        this.properties = properties;
        this.tavily = tavily;
        this.firecrawl = firecrawl;
        this.safeUrlFetcher = safeUrlFetcher;
        this.searxng = searxng;
        this.serper = serper;
        this.webSearchProperties = webSearchProperties;
    }

    public Map<String, Object> toolHealth() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tavily", Map.of(
                "status", tavily.status().name(),
                "configured", tavily.isConfigured(),
                "capability", "web_search"));
        out.put("firecrawl", Map.of(
                "status", firecrawl.status().name(),
                "configured", firecrawl.isConfigured(),
                "capability", "web_extract"));
        out.put("safeFetcher", Map.of(
                "status", ResearchToolStatus.CONFIGURED.name(),
                "configured", true,
                "capability", "web_extract_fallback"));
        out.put("searxng", Map.of(
                "status", searxng.status().name(),
                "configured", searxng.isConfigured(),
                "capability", "private_web_search",
                "v1Enabled", webSearchProperties.isWebSearchV1Enabled()));
        out.put("serper", Map.of(
                "status", serper.status().name(),
                "configured", serper.isConfigured(),
                "capability", "google_results_opt_in",
                "v1Enabled", webSearchProperties.isWebSearchV1Enabled()));
        return out;
    }

    public WebSearchResult searchCompany(String companyName, String hintUrl) {
        StringBuilder q = new StringBuilder();
        q.append(companyName == null ? "" : companyName.trim());
        q.append(" official website recruitment careers");
        if (hintUrl != null && !hintUrl.isBlank()) {
            q.append(' ').append(hintUrl.trim());
        }
        if (!tavily.isConfigured()) {
            return WebSearchResult.failed(q.toString(), "none", "tavily_disabled");
        }
        return tavily.search(q.toString(), properties.getMaxSearchResults());
    }

    /**
     * Extract public page content. Prefer Firecrawl when configured; otherwise SafeUrlFetcher.
     * SSRF validation always runs first.
     */
    public WebExtractResult extractPublicPage(String url) {
        try {
            safeUrlFetcher.validate(url);
        } catch (Exception e) {
            return WebExtractResult.failed(url, "blocked", e.getMessage());
        }

        String firecrawlError = null;
        if (firecrawl.isConfigured()) {
            WebExtractResult fc = firecrawl.scrape(url);
            if (fc.verified() && fc.error() == null) {
                return fc;
            }
            firecrawlError = fc.error();
            log.info("Firecrawl unavailable for URL; falling back to SafeUrlFetcher");
        }

        try {
            Document doc = safeUrlFetcher.fetch(url);
            String title = doc.title() == null ? "" : doc.title();
            String text = doc.body() != null ? doc.body().text() : "";
            text = clip(text, properties.getMaxExtractChars());
            if (text.isBlank()) {
                return WebExtractResult.failed(url, "safe_fetcher",
                        firecrawlError != null ? firecrawlError : "no_content");
            }
            // Preserve Firecrawl rate_limit signal so callers can stop burning scrape credits.
            String note = "rate_limited".equals(firecrawlError) ? "rate_limited" : null;
            return new WebExtractResult(url, title, text, "safe_fetcher", true, note);
        } catch (Exception e) {
            return WebExtractResult.failed(url, "safe_fetcher",
                    firecrawlError != null ? firecrawlError : e.getMessage());
        }
    }

    /**
     * Collect verified extracts for company advisor: user URLs first, then Tavily-discovered public URLs.
     */
    public List<WebExtractResult> collectCompanyEvidence(String companyName, String websiteUrl, String recruitmentUrl) {
        List<WebExtractResult> evidence = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        addIfNew(evidence, seen, extractPublicPage(websiteUrl));
        if (recruitmentUrl != null && !recruitmentUrl.isBlank()) {
            addIfNew(evidence, seen, extractPublicPage(recruitmentUrl));
        }

        if (properties.isCompanyAdvisorEnabled() && tavily.isConfigured()) {
            WebSearchResult search = searchCompany(companyName, websiteUrl);
            for (WebSearchResult.Hit hit : search.hits()) {
                // Cap total URLs attempted (user URLs + search hits) to conserve Firecrawl credits.
                if (seen.size() >= Math.min(4, properties.getMaxSearchResults() + 2)) {
                    break;
                }
                if (!isLikelyUsefulCompanyUrl(hit.url(), companyName)) {
                    continue;
                }
                WebExtractResult extracted = extractPublicPage(hit.url());
                addIfNew(evidence, seen, extracted);
                // After Firecrawl rate-limit, stop further search-hit scrapes (SafeUrlFetcher already used).
                if (extracted != null && "rate_limited".equals(extracted.error())) {
                    log.info("Stopping additional company URL extracts after Firecrawl rate limit");
                    break;
                }
            }
        }
        return evidence;
    }

    private void addIfNew(List<WebExtractResult> evidence, Set<String> seen, WebExtractResult result) {
        if (result == null || result.url() == null || result.url().isBlank()) {
            return;
        }
        String key = result.url().trim().toLowerCase(Locale.ROOT);
        if (!seen.add(key)) {
            return;
        }
        // Accept verified extracts even when error carries a soft signal (e.g. rate_limited after fallback).
        if (result.verified() && (result.error() == null || "rate_limited".equals(result.error()))) {
            evidence.add(result);
        }
    }

    private boolean isLikelyUsefulCompanyUrl(String url, String companyName) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("facebook.com") || lower.contains("twitter.com") || lower.contains("x.com")
                || lower.contains("instagram.com") || lower.contains("tiktok.com")) {
            return false;
        }
        // Prefer career / about / company pages when possible; still allow official roots.
        return true;
    }

    private static String clip(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() > max ? s.substring(0, max) : s;
    }
}
