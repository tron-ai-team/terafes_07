package com.tronai.ai.research;

import java.util.ArrayList;
import java.util.List;

public record WebSearchResult(
        String query,
        String engine,
        List<Hit> hits,
        String error
) {
    public record Hit(String title, String url, String snippet, Double score) {
    }

    public static WebSearchResult empty(String query, String engine) {
        return new WebSearchResult(query, engine, List.of(), null);
    }

    public static WebSearchResult failed(String query, String engine, String error) {
        return new WebSearchResult(query, engine, List.of(), error);
    }

    public WebSearchResult {
        hits = hits == null ? List.of() : List.copyOf(hits);
    }

    public List<Hit> mutableHits() {
        return new ArrayList<>(hits);
    }
}
