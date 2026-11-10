package com.tronai.career.service.provider;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Mynavi 2027 connector.
 * <p>
 * Findings (CP-04): there is no public authorized job-search API for job.mynavi.jp/2027.
 * Search result cards are populated client-side (static HTML shows 0社). Hitting undocumented
 * AJAX endpoints would be unauthorized scraping. This provider therefore:
 * <ul>
 *   <li>Does <b>not</b> fabricate listings</li>
 *   <li>Returns empty automated discovery with honest status</li>
 *   <li>Exposes verified deep-links to the official Mynavi search UI</li>
 *   <li>Supports URL import via Open Graph / title metadata when the user pastes a page</li>
 * </ul>
 */
@Component
public class MynaviJobProvider implements JobSearchProvider {

    private static final Logger log = LoggerFactory.getLogger(MynaviJobProvider.class);
    private static final String SEARCH_BASE = "https://job.mynavi.jp/27/pc/search/query.html";
    private static final String HOME_2027 = "https://job.mynavi.jp/2027/";
    private static final String USER_AGENT =
            "TRON-CareerCenter/1.0 (+https://tron.ai; respectful job discovery)";

    private final AtomicReference<String> lastStatus = new AtomicReference<>("NOT_FETCHED");

    @Value("${career.jobs.mynavi.enabled:true}")
    private boolean enabled = true;

    @Override
    public String providerId() {
        return "mynavi";
    }

    @Override
    public boolean isAvailable() {
        return enabled;
    }

    @Override
    public String lastFetchStatus() {
        return lastStatus.get();
    }

    @Override
    public String externalSearchUrl(JobSearchCriteria criteria) {
        String q = criteria != null && criteria.getQuery() != null ? criteria.getQuery().trim() : "";
        if (q.isBlank() && criteria != null && criteria.getKeywords() != null && !criteria.getKeywords().isEmpty()) {
            q = String.join(" ", criteria.getKeywords());
        }
        if (q.isBlank()) {
            return HOME_2027;
        }
        return SEARCH_BASE + "?FW:word=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
    }

    @Override
    public List<ExternalJobListing> fetchJobs() {
        return search(new JobSearchCriteria());
    }

    @Override
    public List<ExternalJobListing> search(JobSearchCriteria criteria) {
        if (!enabled) {
            lastStatus.set("DISABLED");
            return List.of();
        }
        // Probe connectivity for ops status — do not parse fabricated cards from nav chrome.
        try {
            String url = externalSearchUrl(criteria);
            Document doc = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(12000)
                    .followRedirects(true)
                    .get();
            String bodyText = doc.body() != null ? doc.body().text() : "";
            boolean zeroResultsMarker = bodyText.contains("0社") || doc.select("#searchResultkensuu").stream()
                    .anyMatch(el -> "0".equals(el.text().trim()));
            // Confirm page is reachable but listings are JS-rendered / empty in static HTML.
            lastStatus.set(zeroResultsMarker
                    ? "NO_PUBLIC_API_JS_RENDERED"
                    : "LIVE_REACHABLE_NO_STRUCTURED_LISTINGS");
            log.info("Mynavi automated listing extraction blocked (no public API; JS-rendered results). "
                    + "External search URL available: {}", url);
            return List.of();
        } catch (Exception e) {
            lastStatus.set("LIVE_ERROR:" + e.getClass().getSimpleName());
            log.warn("Mynavi connectivity probe failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Import a user-supplied Mynavi URL using public page metadata only.
     */
    public ExternalJobListing importFromUrl(String url) {
        try {
            String html = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(12000)
                    .followRedirects(true)
                    .get()
                    .html();
            return OpenGraphJobParser.parseMynaviImport(url, html, Instant.now());
        } catch (Exception e) {
            log.warn("Mynavi import fetch failed: {}", e.getMessage());
            return OpenGraphJobParser.parseMynaviImport(url, null, Instant.now());
        }
    }
}
