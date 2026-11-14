package com.tronai.ai.research.search;

import java.net.URI;
import java.util.Locale;
import java.util.Optional;

/**
 * Accept only http(s) public citation URLs. Reject schemes usable for SSRF/injection.
 */
public final class SearchUrlSanitizer {

    private SearchUrlSanitizer() {
    }

    public static Optional<String> sanitize(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String trimmed = raw.trim();
        try {
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme();
            if (scheme == null) {
                return Optional.empty();
            }
            String lower = scheme.toLowerCase(Locale.ROOT);
            if (!"http".equals(lower) && !"https".equals(lower)) {
                return Optional.empty();
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                return Optional.empty();
            }
            // Citations may be public hosts; private hosts are still allowed for private SearXNG
            // result URLs that point at public content. Block obvious metadata endpoints.
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            if ("metadata.google.internal".equals(host) || host.endsWith(".internal")) {
                return Optional.empty();
            }
            return Optional.of(uri.normalize().toString());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public static String canonicalizeForDedup(String url) {
        return sanitize(url)
                .map(u -> {
                    try {
                        URI uri = URI.create(u);
                        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
                        String path = uri.getPath() == null ? "" : uri.getPath();
                        if (path.endsWith("/") && path.length() > 1) {
                            path = path.substring(0, path.length() - 1);
                        }
                        return host + path;
                    } catch (Exception e) {
                        return u.toLowerCase(Locale.ROOT);
                    }
                })
                .orElse("");
    }
}
