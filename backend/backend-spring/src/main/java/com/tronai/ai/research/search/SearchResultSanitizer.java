package com.tronai.ai.research.search;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Normalize, dedupe, and neutralize untrusted search snippets before prompt injection.
 */
public final class SearchResultSanitizer {

    private SearchResultSanitizer() {
    }

    public static List<NormalizedSearchHit> sanitize(
            List<NormalizedSearchHit> hits,
            int maxResults,
            int maxSnippetChars,
            List<String> warningsOut) {
        Map<String, NormalizedSearchHit> deduped = new LinkedHashMap<>();
        if (hits == null) {
            return List.of();
        }
        for (NormalizedSearchHit hit : hits) {
            if (hit == null) {
                continue;
            }
            var urlOpt = SearchUrlSanitizer.sanitize(hit.url());
            if (urlOpt.isEmpty()) {
                continue;
            }
            String url = urlOpt.get();
            String key = SearchUrlSanitizer.canonicalizeForDedup(url);
            if (key.isBlank() || deduped.containsKey(key)) {
                continue;
            }
            String snippet = clip(hit.snippet(), maxSnippetChars);
            if (SearchDecisionPolicy.looksLikeInjection(snippet)) {
                if (warningsOut != null) {
                    warningsOut.add("Ignored potentially adversarial snippet from a search result");
                }
                snippet = "[snippet redacted: untrusted content]";
            }
            // Wrap as evidence — never treat as instructions.
            snippet = "SOURCE_EVIDENCE: " + snippet;
            deduped.put(key, new NormalizedSearchHit(
                    clip(hit.title(), 200),
                    url,
                    snippet,
                    hit.sourceProvider(),
                    hit.sourceEngine(),
                    hit.publishedAt(),
                    hit.fetchedAt(),
                    hit.confidence()));
            if (deduped.size() >= Math.max(1, maxResults)) {
                break;
            }
        }
        return new ArrayList<>(deduped.values());
    }

    private static String clip(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replaceAll("\\s+", " ").trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
