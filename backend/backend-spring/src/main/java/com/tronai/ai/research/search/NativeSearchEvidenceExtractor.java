package com.tronai.ai.research.search;

import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.gateway.AiGenerationResult;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Converts provider-returned citation objects into normalized search hits.
 * Never invents URLs — only maps what the provider actually exposed.
 */
public final class NativeSearchEvidenceExtractor {

    private NativeSearchEvidenceExtractor() {
    }

    public static List<NormalizedSearchHit> fromGeneration(AiGenerationResult result, String provider) {
        if (result == null || result.getCitations() == null || result.getCitations().isEmpty()) {
            return List.of();
        }
        return map(result.getCitations(), provider);
    }

    public static List<NormalizedSearchHit> fromChatResult(ChatGenerationResult result, String provider) {
        if (result == null || result.getCitations() == null || result.getCitations().isEmpty()) {
            return List.of();
        }
        return map(result.getCitations(), provider);
    }

    private static List<NormalizedSearchHit> map(List<AiGenerationResult.Citation> citations, String provider) {
        List<NormalizedSearchHit> hits = new ArrayList<>();
        Instant now = Instant.now();
        String prov = provider == null || provider.isBlank() ? "NATIVE" : provider;
        for (AiGenerationResult.Citation c : citations) {
            if (c == null || c.url() == null || c.url().isBlank()) {
                continue;
            }
            var safe = SearchUrlSanitizer.sanitize(c.url());
            if (safe.isEmpty()) {
                continue;
            }
            hits.add(new NormalizedSearchHit(
                    c.title() == null ? "" : c.title(),
                    safe.get(),
                    c.snippet() == null ? "" : c.snippet(),
                    prov,
                    "native",
                    null,
                    now,
                    null));
        }
        return hits;
    }
}
