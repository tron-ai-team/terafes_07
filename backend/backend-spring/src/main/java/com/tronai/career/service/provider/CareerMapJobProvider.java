package com.tronai.career.service.provider;

import com.tronai.career.service.JobSourceCacheService;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

/**
 * CareerMap connector using publicly crawlable structured surfaces only:
 * <ul>
 *   <li>robots.txt-allowed sitemaps ({@code /sitemap/*.xml})</li>
 *   <li>Public job pages' Open Graph metadata</li>
 *   <li>Public {@code /jobs} HTML job-id hints</li>
 * </ul>
 * School-linked / OAuth listings remain blocked. Never fabricates vacancies.
 */
@Component
public class CareerMapJobProvider implements JobSearchProvider {

    private static final Logger log = LoggerFactory.getLogger(CareerMapJobProvider.class);
    private static final String PUBLIC_JOBS = "https://www.careermap.jp/jobs";
    private static final String SEARCH_UI = "https://www.careermap.jp/jobs/jobs-search";
    private static final String[] SITEMAPS = {
            "https://www.careermap.jp/sitemap/0.xml",
            "https://www.careermap.jp/sitemap/1.xml",
            "https://www.careermap.jp/sitemap/2.xml"
    };
    private static final String USER_AGENT =
            "TRON-CareerCenter/1.0 (+https://tron.ai; respectful job discovery; respects robots.txt)";

    private final AtomicReference<String> lastStatus = new AtomicReference<>("NOT_FETCHED");
    private final JobSourceCacheService cacheService;

    @Value("${career.jobs.careermap.oauth-enabled:false}")
    private boolean oauthEnabled;

    @Value("${career.jobs.careermap.enabled:true}")
    private boolean enabled = true;

    @Value("${career.jobs.careermap.max-fetches-per-search:40}")
    private int maxFetchesPerSearch;

    @Value("${career.jobs.careermap.fetch-delay-ms:250}")
    private long fetchDelayMs;

    public CareerMapJobProvider(JobSourceCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @Override
    public String providerId() {
        return "careermap";
    }

    @Override
    public boolean isAvailable() {
        return enabled;
    }

    @Override
    public String lastFetchStatus() {
        return lastStatus.get();
    }

    public boolean isOauthEnabled() {
        return oauthEnabled;
    }

    @Override
    public String externalSearchUrl(JobSearchCriteria criteria) {
        String q = criteria != null && criteria.getQuery() != null ? criteria.getQuery().trim() : "";
        if (q.isBlank()) {
            return SEARCH_UI;
        }
        return SEARCH_UI + "?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
    }

    @Override
    public List<ExternalJobListing> fetchJobs() {
        return search(JobSearchCriteria.from("エンジニア", null, List.of(), null, null, 15, false));
    }

    @Override
    public List<ExternalJobListing> search(JobSearchCriteria criteria) {
        if (!enabled) {
            lastStatus.set("DISABLED");
            return List.of();
        }
        JobSearchCriteria c = criteria != null ? criteria : new JobSearchCriteria();
        List<String> tokens = meaningfulTokens(c);
        try {
            List<ExternalJobListing> fromCache = List.of();
            if (cacheService != null && !c.isForceRefresh()) {
                fromCache = cacheService.searchFresh(providerId(), tokens.isEmpty()
                        ? List.of("エンジニア")
                        : tokens);
                fromCache = filterByCriteria(fromCache, c);
                if (fromCache.size() >= Math.min(c.getMaxResults(), 5)) {
                    lastStatus.set("CACHE_HIT:" + fromCache.size());
                    return fromCache.stream().limit(c.getMaxResults()).toList();
                }
            }

            List<String> candidateUrls = discoverCandidateUrls();
            if (candidateUrls.isEmpty()) {
                lastStatus.set(oauthEnabled ? "OAUTH_ENABLED_BUT_EMPTY" : "PUBLIC_EMPTY_OR_AUTH_REQUIRED");
                log.info("CareerMap discovery found no public job URLs");
                return fromCache;
            }

            List<ExternalJobListing> discovered = new ArrayList<>();
            int fetches = 0;
            int matches = fromCache.size();
            Set<String> seen = new LinkedHashSet<>();
            fromCache.forEach(l -> seen.add(l.getSourceUrl()));

            for (String url : candidateUrls) {
                if (fetches >= Math.max(5, maxFetchesPerSearch)) break;
                if (matches >= c.getMaxResults()) break;
                if (!seen.add(url)) continue;
                if (isSchoolLinkedUrl(url)) continue;

                ExternalJobListing listing = fetchAndParse(url);
                fetches++;
                if (listing == null) continue;
                if (cacheService != null) {
                    cacheService.upsert(listing, JobSourceCacheService.DEFAULT_TTL);
                }
                if (matchesCriteria(listing, c, tokens)) {
                    discovered.add(listing);
                    matches++;
                }
                sleepQuietly(fetchDelayMs);
            }

            List<ExternalJobListing> merged = new ArrayList<>(fromCache);
            for (ExternalJobListing d : discovered) {
                boolean dup = merged.stream().anyMatch(m -> m.getSourceUrl().equals(d.getSourceUrl()));
                if (!dup) merged.add(d);
            }
            List<ExternalJobListing> out = filterByCriteria(merged, c).stream()
                    .limit(c.getMaxResults())
                    .toList();
            lastStatus.set(out.isEmpty()
                    ? "LIVE_EMPTY_AFTER_FETCH:" + fetches
                    : "LIVE_OK:" + out.size() + "/fetched=" + fetches);
            return out;
        } catch (Exception e) {
            lastStatus.set("LIVE_ERROR:" + e.getClass().getSimpleName());
            log.warn("CareerMap search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<String> discoverCandidateUrls() {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        // 1) Public /jobs page hints (robots-allowed)
        try {
            String jobsHtml = get(PUBLIC_JOBS);
            for (String id : OpenGraphJobParser.extractJobIdsFromHtml(jobsHtml)) {
                urls.add("https://www.careermap.jp/jobs/" + id);
            }
        } catch (Exception e) {
            log.debug("CareerMap /jobs seed failed: {}", e.getMessage());
        }
        // 2) Sitemap job URLs (explicitly advertised in robots.txt)
        List<String> sitemapUrls = new ArrayList<>();
        for (String sm : SITEMAPS) {
            try {
                String xml = get(sm);
                sitemapUrls.addAll(OpenGraphJobParser.extractJobUrlsFromSitemap(xml));
            } catch (Exception e) {
                log.debug("CareerMap sitemap {} failed: {}", sm, e.getMessage());
            }
        }
        // Prefer higher (newer) IDs first
        sitemapUrls.sort((a, b) -> Integer.compare(jobIdOf(b), jobIdOf(a)));
        urls.addAll(sitemapUrls);
        return new ArrayList<>(urls);
    }

    private ExternalJobListing fetchAndParse(String url) {
        try {
            String html = get(url);
            return OpenGraphJobParser.parseCareerMapJob(url, html, Instant.now());
        } catch (Exception e) {
            log.debug("CareerMap job fetch failed url={} err={}", url, e.getMessage());
            return null;
        }
    }

    private String get(String url) throws Exception {
        Connection.Response resp = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(15000)
                .followRedirects(true)
                .ignoreContentType(true)
                .execute();
        return resp.body();
    }

    private List<ExternalJobListing> filterByCriteria(List<ExternalJobListing> listings, JobSearchCriteria c) {
        List<String> tokens = meaningfulTokens(c);
        return listings.stream()
                .filter(l -> matchesCriteria(l, c, tokens))
                .toList();
    }

    private boolean matchesCriteria(ExternalJobListing l, JobSearchCriteria c, List<String> tokens) {
        if (c.getNewGraduateOnly() != null && c.getNewGraduateOnly()
                && !Boolean.TRUE.equals(l.getNewGraduateEligible())) {
            // CareerMap rarely exposes 新卒 flag in OG — do not hard-drop UNKNOWN; only drop explicit false.
            if (Boolean.FALSE.equals(l.getNewGraduateEligible())) {
                return false;
            }
        }
        if (tokens.isEmpty()) {
            return true;
        }
        String hay = ((l.getTitle() == null ? "" : l.getTitle()) + " "
                + (l.getCompany() == null ? "" : l.getCompany()) + " "
                + (l.getLocation() == null ? "" : l.getLocation()) + " "
                + (l.getDescription() == null ? "" : l.getDescription()) + " "
                + (l.getTags() == null ? "" : String.join(" ", l.getTags()))).toLowerCase(Locale.ROOT);
        // Location soft-prefer: if location filter set, require it when location known.
        if (c.getLocation() != null && !c.getLocation().isBlank()
                && l.getLocation() != null && !l.getLocation().isBlank()) {
            if (!hay.contains(c.getLocation().toLowerCase(Locale.ROOT))
                    && !locationAliasesMatch(c.getLocation(), l.getLocation())) {
                return false;
            }
        }
        for (String token : tokens) {
            if (hay.contains(token.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static boolean locationAliasesMatch(String want, String have) {
        String w = want.toLowerCase(Locale.ROOT);
        String h = have.toLowerCase(Locale.ROOT);
        if (w.contains("tokyo") || w.contains("東京")) return h.contains("東京") || h.contains("tokyo");
        if (w.contains("kanagawa") || w.contains("神奈川")) return h.contains("神奈川") || h.contains("kanagawa");
        if (w.contains("chiba") || w.contains("千葉")) return h.contains("千葉") || h.contains("chiba");
        if (w.contains("saitama") || w.contains("埼玉")) return h.contains("埼玉") || h.contains("saitama");
        return false;
    }

    private List<String> meaningfulTokens(JobSearchCriteria c) {
        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        addTokens(tokens, c.getQuery());
        addTokens(tokens, c.getLocation());
        if (c.getKeywords() != null) {
            for (String k : c.getKeywords()) addTokens(tokens, k);
        }
        // Default IT-oriented discovery when user provided no tokens
        if (tokens.isEmpty()) {
            tokens.add("エンジニア");
        }
        return new ArrayList<>(tokens);
    }

    private static void addTokens(Set<String> out, String raw) {
        if (raw == null || raw.isBlank()) return;
        for (String part : raw.trim().split("[\\s,、/|]+")) {
            if (part.isBlank()) continue;
            if (isMeaningfulToken(part)) {
                out.add(part);
            }
        }
        // Also keep full phrase for Japanese compound roles
        if (isMeaningfulToken(raw.trim())) {
            out.add(raw.trim());
        }
    }

    static boolean isMeaningfulToken(String token) {
        if (token == null || token.isBlank()) return false;
        boolean cjk = token.codePoints().anyMatch(cp ->
                Character.UnicodeScript.of(cp) == Character.UnicodeScript.HAN
                        || Character.UnicodeScript.of(cp) == Character.UnicodeScript.HIRAGANA
                        || Character.UnicodeScript.of(cp) == Character.UnicodeScript.KATAKANA);
        if (cjk) return token.length() >= 2;
        return token.length() >= 2;
    }

    private static int jobIdOf(String url) {
        try {
            int slash = url.lastIndexOf('/');
            return Integer.parseInt(url.substring(slash + 1));
        } catch (Exception e) {
            return 0;
        }
    }

    private static void sleepQuietly(long ms) {
        if (ms <= 0) return;
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public static boolean isSchoolLinkedUrl(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.contains("careermap") && (lower.contains("school") || lower.contains("campus")
                || lower.contains("gakko") || lower.contains("login") || lower.contains("oauth")
                || lower.contains("sign_in") || lower.contains("users/sign"));
    }
}
