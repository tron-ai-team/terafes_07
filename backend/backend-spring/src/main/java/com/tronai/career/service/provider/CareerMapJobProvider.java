package com.tronai.career.service.provider;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

/**
 * CareerMap provider. Public pages are attempted first.
 * School-linked / OAuth listings remain blocked without user authorization.
 */
@Component
public class CareerMapJobProvider implements JobSearchProvider {

    private static final Logger log = LoggerFactory.getLogger(CareerMapJobProvider.class);
    private static final String PUBLIC_ENTRY = "https://careermap.jp/";

    private final AtomicReference<String> lastStatus = new AtomicReference<>("NOT_FETCHED");

    @Value("${career.jobs.careermap.oauth-enabled:false}")
    private boolean oauthEnabled;

    @Value("${career.jobs.careermap.public-url:https://careermap.jp/}")
    private String publicUrl;

    @Override
    public String providerId() {
        return "careermap";
    }

    @Override
    public boolean isAvailable() {
        // Always available for public scrape attempt; school-linked path gated separately.
        return true;
    }

    public String lastFetchStatus() {
        return lastStatus.get();
    }

    public boolean isOauthEnabled() {
        return oauthEnabled;
    }

    @Override
    public List<ExternalJobListing> fetchJobs() {
        try {
            String url = publicUrl == null || publicUrl.isBlank() ? PUBLIC_ENTRY : publicUrl;
            Document doc = Jsoup.connect(url)
                    .userAgent("TRON-CareerCenter/1.0 (+https://tron.ai; job-finder)")
                    .timeout(15000)
                    .followRedirects(true)
                    .get();
            List<ExternalJobListing> parsed = parsePublic(doc);
            if (parsed.isEmpty()) {
                lastStatus.set(oauthEnabled ? "OAUTH_ENABLED_BUT_EMPTY" : "PUBLIC_EMPTY_OR_AUTH_REQUIRED");
                log.info("CareerMap public fetch returned no listings; school-linked OAuth={}", oauthEnabled);
                return List.of();
            }
            lastStatus.set("PUBLIC_OK");
            return parsed;
        } catch (Exception e) {
            lastStatus.set("LIVE_ERROR:" + e.getClass().getSimpleName());
            log.warn("CareerMap fetch failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<ExternalJobListing> parsePublic(Document doc) {
        Set<String> seen = new LinkedHashSet<>();
        List<ExternalJobListing> out = new ArrayList<>();
        Elements anchors = doc.select("a[href]");
        for (Element a : anchors) {
            String href = a.absUrl("href");
            if (href == null || href.isBlank()) continue;
            String lower = href.toLowerCase(Locale.ROOT);
            if (!lower.contains("careermap")) continue;
            if (isSchoolLinkedUrl(href)) continue; // never scrape school-restricted without OAuth
            String title = a.text() == null ? "" : a.text().trim();
            if (title.length() < 2) continue;
            if (!(lower.contains("job") || lower.contains("recruit") || lower.contains("company")
                    || lower.contains("offer") || lower.contains("kyujin"))) {
                continue;
            }
            if (!seen.add(href)) continue;
            out.add(ExternalJobListing.builder()
                    .provider(providerId())
                    .sourceId(Integer.toHexString(href.hashCode()))
                    .sourceUrl(href)
                    .title(title)
                    .company(title.length() > 60 ? title.substring(0, 60) : title)
                    .location("")
                    .employmentType("full_time")
                    .newGraduateEligible(null)
                    .description("Extracted from CareerMap public HTML at " + Instant.now())
                    .tags(List.of("careermap"))
                    .publishedAt(Instant.now())
                    .build());
            if (out.size() >= 10) break;
        }
        return out;
    }

    public static boolean isSchoolLinkedUrl(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.contains("careermap") && (lower.contains("school") || lower.contains("campus")
                || lower.contains("gakko") || lower.contains("login") || lower.contains("oauth"));
    }
}
