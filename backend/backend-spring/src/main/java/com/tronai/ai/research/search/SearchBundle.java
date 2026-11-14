package com.tronai.ai.research.search;

import com.tronai.chat.dto.SearchHit;
import com.tronai.chat.dto.SearchInfo;

import java.util.ArrayList;
import java.util.List;

/**
 * Internal search orchestration result for one request turn.
 */
public record SearchBundle(
        boolean requested,
        boolean attempted,
        boolean succeeded,
        ResolvedSearchMode mode,
        String provider,
        String fallbackReason,
        String query,
        String status,
        String detail,
        List<NormalizedSearchHit> results,
        List<String> warnings,
        long timingMs,
        boolean useNativeCloudTool,
        String nativeCloudProvider
) {
    public SearchBundle {
        results = results == null ? List.of() : List.copyOf(results);
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
        provider = provider == null ? "" : provider;
        fallbackReason = fallbackReason == null ? "" : fallbackReason;
        query = query == null ? "" : query;
        status = status == null ? "unavailable" : status;
        detail = detail == null ? "" : detail;
        nativeCloudProvider = nativeCloudProvider == null ? "" : nativeCloudProvider;
    }

    public static SearchBundle skipped(ResolvedSearchMode mode, String detail) {
        return new SearchBundle(false, false, false, mode, "", "", "", "skipped", detail,
                List.of(), List.of(), 0L, false, "");
    }

    public static SearchBundle unavailable(ResolvedSearchMode mode, String detail) {
        return new SearchBundle(true, false, false, mode, "", "", null, "unavailable", detail,
                List.of(), List.of(), 0L, false, "");
    }

    public SearchInfo toSearchInfo() {
        List<SearchHit> hits = new ArrayList<>();
        for (NormalizedSearchHit hit : results) {
            hits.add(SearchHit.builder()
                    .title(hit.title())
                    .url(hit.url())
                    .snippet(hit.snippet())
                    .build());
        }
        boolean verified = succeeded && !results.isEmpty();
        SearchInfo.Builder b = SearchInfo.builder()
                .mode(mode.wireValue())
                // Never claim performed=true merely because a native tool was requested.
                .performed(verified)
                .status(status)
                .query(query.isBlank() ? null : query)
                .detail(detail)
                .results(hits)
                .requested(requested)
                .available(verified)
                .provider(provider.isBlank() ? null : provider)
                .warnings(warnings.isEmpty() ? null : warnings);
        return b.build();
    }
}
