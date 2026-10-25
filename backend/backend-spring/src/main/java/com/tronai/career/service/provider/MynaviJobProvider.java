package com.tronai.career.service.provider;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Mynavi public job discovery. Attempts live HTML extraction from job.mynavi.jp.
 * Does not fabricate listings when live extraction yields nothing.
 */
@Component
public class MynaviJobProvider implements JobSearchProvider {

    private static final Logger log = LoggerFactory.getLogger(MynaviJobProvider.class);
    private static final String SEARCH_URL =
            "https://job.mynavi.jp/27/pc/search/query.html?FW:word=%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%8B%E3%82%A2";

    private final AtomicReference<String> lastStatus = new AtomicReference<>("NOT_FETCHED");

    @Override
    public String providerId() {
        return "mynavi";
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    public String lastFetchStatus() {
        return lastStatus.get();
    }

    @Override
    public List<ExternalJobListing> fetchJobs() {
        try {
            Document doc = Jsoup.connect(SEARCH_URL)
                    .userAgent("TRON-CareerCenter/1.0 (+https://tron.ai; job-finder)")
                    .timeout(15000)
                    .followRedirects(true)
                    .get();
            List<ExternalJobListing> parsed = parseListings(doc);
            if (parsed.isEmpty()) {
                lastStatus.set("LIVE_EMPTY_OR_BLOCKED");
                log.info("Mynavi live fetch returned no parseable company links (page may require JS/auth)");
                return List.of();
            }
            lastStatus.set("LIVE_OK");
            return parsed;
        } catch (Exception e) {
            lastStatus.set("LIVE_ERROR:" + e.getClass().getSimpleName());
            log.warn("Mynavi live fetch failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<ExternalJobListing> parseListings(Document doc) {
        Set<String> seen = new LinkedHashSet<>();
        List<ExternalJobListing> out = new ArrayList<>();
        Elements anchors = doc.select("a[href]");
        for (Element a : anchors) {
            String href = a.absUrl("href");
            if (href == null || href.isBlank()) continue;
            String lower = href.toLowerCase(Locale.ROOT);
            if (!lower.contains("job.mynavi.jp")) continue;
            if (!(lower.contains("/corp") || lower.contains("/company") || lower.contains("/job")
                    || lower.contains("/search/") || lower.contains("/preview"))) {
                continue;
            }
            String title = a.text() == null ? "" : a.text().trim();
            if (title.length() < 2) continue;
            if (!seen.add(href)) continue;
            String company = title.length() > 80 ? title.substring(0, 80) : title;
            out.add(ExternalJobListing.builder()
                    .provider(providerId())
                    .sourceId(Integer.toHexString(href.hashCode()))
                    .sourceUrl(href)
                    .title(title)
                    .company(company)
                    .location("")
                    .employmentType("full_time")
                    .newGraduateEligible(true)
                    .description("Extracted from Mynavi public HTML at " + Instant.now())
                    .tags(List.of("mynavi"))
                    .publishedAt(Instant.now())
                    .build());
            if (out.size() >= 15) break;
        }
        return out;
    }
}
