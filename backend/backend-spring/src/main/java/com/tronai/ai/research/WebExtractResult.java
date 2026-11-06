package com.tronai.ai.research;

public record WebExtractResult(
        String url,
        String title,
        String content,
        String engine,
        boolean verified,
        String error
) {
    public static WebExtractResult failed(String url, String engine, String error) {
        return new WebExtractResult(url, "", "", engine, false, error);
    }
}
