package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.profile.AiProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Single search orchestration entry for Chat/Voice/Interview.
 * Preserves inference-mode locks: search never reroutes FAST/SMART to cloud.
 */
@Service
public class SearchOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(SearchOrchestrator.class);

    private final WebSearchProperties properties;
    private final SearchDecisionPolicy decisionPolicy;
    private final SearxngSearchClient searxng;
    private final SerperSearchClient serper;
    private final SearchCache cache;
    private final CloudNativeSearchSupport nativeSupport;
    private final Semaphore concurrency;

    public SearchOrchestrator(
            WebSearchProperties properties,
            SearchDecisionPolicy decisionPolicy,
            SearxngSearchClient searxng,
            SerperSearchClient serper,
            SearchCache cache,
            CloudNativeSearchSupport nativeSupport) {
        this.properties = properties;
        this.decisionPolicy = decisionPolicy;
        this.searxng = searxng;
        this.serper = serper;
        this.cache = cache;
        this.nativeSupport = nativeSupport;
        this.concurrency = new Semaphore(Math.max(1, properties.getMaxConcurrentSearches()));
    }

    public SearchBundle orchestrate(String rawSearchMode, String userText, String language, AiProfile profile) {
        SearchDecision decision = decisionPolicy.decide(rawSearchMode, userText);
        ResolvedSearchMode mode = decision.mode();

        if (mode == ResolvedSearchMode.OFF) {
            return SearchBundle.skipped(mode, "Search is turned off");
        }

        if (!properties.isWebSearchV1Enabled()) {
            // Legacy stub behavior preserved when master flag is off.
            return SearchBundle.unavailable(mode, "Search provider not configured");
        }

        if (!decision.shouldSearch()) {
            return new SearchBundle(false, false, false, mode, "", "", decision.sanitizedQuery(),
                    "skipped", decision.reason(), List.of(),
                    decision.containsPrivateSignals()
                            ? List.of("Private signals were generalized or search skipped")
                            : List.of(),
                    0L, false, "");
        }

        AiMode aiMode = toAiMode(profile);
        boolean localLock = isLocalLocked(aiMode);

        // Cloud-native tool path: do not also call Serper/SearXNG in the same turn.
        if (!localLock && nativeSupport.isCloudLike(aiMode)) {
            String nativeProvider = nativeSupport.preferredNativeProvider(aiMode);
            if (!nativeProvider.isBlank()) {
                List<String> warnings = new ArrayList<>();
                if (decision.containsPrivateSignals()) {
                    warnings.add("Private content was generalized before any search");
                }
                warnings.add("Native provider search uses Exa/provider engines — not claimed as Google unless Serper is used");
                return new SearchBundle(true, true, true, mode, nativeProvider, "",
                        decision.sanitizedQuery(), "ok",
                        "Provider-native web search enabled for this turn",
                        List.of(), warnings, 0L, true, nativeProvider);
            }
            // Fall through to Serper Google results if native unavailable and Serper enabled.
            if (serper.isConfigured()) {
                return runSerper(decision, mode, maxResultsFor(aiMode), "native_unavailable");
            }
            return SearchBundle.unavailable(mode,
                    "Cloud native web search is not enabled for the configured provider/model");
        }

        // Local FAST/SMART → private SearXNG
        if (localLock || aiMode == AiMode.FAST || aiMode == AiMode.SMART || aiMode == AiMode.QUALITY) {
            SearchBundle local = runSearxng(decision, mode, language, maxResultsFor(aiMode));
            if (local.succeeded() && !local.results().isEmpty()) {
                return local;
            }
            // Paid fallback only with explicit owner flag — never silent.
            if (properties.isLocalPaidFallbackEnabled() && serper.isConfigured()) {
                SearchBundle paid = runSerper(decision, mode, maxResultsFor(aiMode),
                        local.detail().isBlank() ? "searxng_failed" : local.detail());
                if (paid.succeeded()) {
                    return paid;
                }
            }
            if (mode == ResolvedSearchMode.ON) {
                return local.attempted() ? local : SearchBundle.unavailable(mode,
                        searxng.isConfigured() ? local.detail() : "SearXNG is not configured");
            }
            // AUTO: honest skip/unavailable without fabricating citations
            return local;
        }

        // Remaining cloud-like without native tools
        if (serper.isConfigured()) {
            return runSerper(decision, mode, maxResultsFor(aiMode), "");
        }
        return SearchBundle.unavailable(mode, "No search provider configured for this mode");
    }

    private SearchBundle runSearxng(SearchDecision decision, ResolvedSearchMode mode, String language, int maxResults) {
        if (!searxng.isConfigured()) {
            return SearchBundle.unavailable(mode, "SearXNG is not configured");
        }
        String query = decision.sanitizedQuery();
        ProviderSearchOutcome cached = cache.get("SEARXNG", query);
        if (cached != null) {
            return toBundle(decision, mode, cached, "", false, "");
        }
        if (!tryAcquire()) {
            return new SearchBundle(true, false, false, mode, "SEARXNG", "", query,
                    "error", "Search concurrency limit reached", List.of(), List.of(), 0L, false, "");
        }
        try {
            ProviderSearchOutcome outcome = searxng.search(query, language, maxResults);
            if (outcome.hasHits()) {
                cache.put("SEARXNG", query, outcome);
            }
            return toBundle(decision, mode, outcome, "", false, "");
        } finally {
            concurrency.release();
        }
    }

    private SearchBundle runSerper(SearchDecision decision, ResolvedSearchMode mode, int maxResults, String fallbackReason) {
        if (!serper.isConfigured()) {
            return SearchBundle.unavailable(mode, "Serper is not configured or budget is zero");
        }
        String query = decision.sanitizedQuery();
        ProviderSearchOutcome cached = cache.get("SERPER", query);
        if (cached != null) {
            return toBundle(decision, mode, cached, fallbackReason, false, "");
        }
        if (!tryAcquire()) {
            return new SearchBundle(true, false, false, mode, "SERPER", fallbackReason, query,
                    "error", "Search concurrency limit reached", List.of(), List.of(), 0L, false, "");
        }
        try {
            ProviderSearchOutcome outcome = serper.search(query, maxResults);
            if (outcome.hasHits()) {
                cache.put("SERPER", query, outcome);
            }
            return toBundle(decision, mode, outcome, fallbackReason, false, "");
        } finally {
            concurrency.release();
        }
    }

    private SearchBundle toBundle(
            SearchDecision decision,
            ResolvedSearchMode mode,
            ProviderSearchOutcome outcome,
            String fallbackReason,
            boolean useNative,
            String nativeProvider) {
        List<String> warnings = new ArrayList<>();
        if (decision.containsPrivateSignals()) {
            warnings.add("Private signals were generalized before search");
        }
        if (fallbackReason != null && !fallbackReason.isBlank()) {
            warnings.add("fallback:" + fallbackReason);
        }
        List<NormalizedSearchHit> sanitized = SearchResultSanitizer.sanitize(
                outcome.results(),
                Math.max(1, properties.getMaxResultsSmart()),
                properties.getMaxSnippetChars(),
                warnings);
        boolean ok = outcome.hasHits() && !sanitized.isEmpty();
        String status = ok ? "ok" : outcome.status();
        String detail = ok
                ? ("Search completed via " + outcome.provider())
                : (outcome.detail() == null || outcome.detail().isBlank()
                ? "No usable search results"
                : outcome.detail());
        log.debug("Search bundle provider={} status={} hits={} mode={}",
                outcome.provider(), status, sanitized.size(), mode);
        return new SearchBundle(
                true,
                outcome.attempted(),
                ok,
                mode,
                outcome.provider(),
                fallbackReason,
                decision.sanitizedQuery(),
                status,
                detail,
                sanitized,
                warnings,
                outcome.timingMs(),
                useNative,
                nativeProvider);
    }

    private boolean tryAcquire() {
        try {
            return concurrency.tryAcquire(50, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private int maxResultsFor(AiMode mode) {
        if (mode == AiMode.FAST) {
            return properties.getMaxResultsFast();
        }
        if (mode == AiMode.CLOUD || mode == AiMode.ULTRA) {
            return properties.getMaxResultsCloud();
        }
        return properties.getMaxResultsSmart();
    }

    private boolean isLocalLocked(AiMode mode) {
        // FAST/SMART/QUALITY/AUTO chat turns use private SearXNG for grounding.
        // Search never changes which GPU/provider performs inference.
        return mode == AiMode.FAST
                || mode == AiMode.SMART
                || mode == AiMode.QUALITY
                || mode == AiMode.AUTO;
    }

    private static AiMode toAiMode(AiProfile profile) {
        if (profile == null) {
            return AiMode.FAST;
        }
        return switch (profile) {
            case FAST -> AiMode.FAST;
            case QUALITY -> AiMode.QUALITY;
            case SMART -> AiMode.SMART;
            case CLOUD -> AiMode.CLOUD;
            case ULTRA -> AiMode.ULTRA;
            case AUTO -> AiMode.AUTO;
        };
    }
}
