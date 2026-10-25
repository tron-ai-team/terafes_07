package com.tronai.career.cvbuilder.gotenberg;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.Locale;

/**
 * Thin client for Gotenberg v8 LibreOffice / Chromium conversion APIs.
 * Does not log document contents.
 */
@Component
@EnableConfigurationProperties(GotenbergProperties.class)
public class GotenbergPdfClient {

    private static final Logger log = LoggerFactory.getLogger(GotenbergPdfClient.class);
    private static final byte[] PDF_MAGIC = new byte[]{'%', 'P', 'D', 'F'};

    private final GotenbergProperties properties;
    private final RestClient restClient;

    public GotenbergPdfClient(GotenbergProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getGotenberg().getConnectTimeoutMs());
        factory.setReadTimeout(properties.getGotenberg().getReadTimeoutMs());
        this.restClient = RestClient.builder()
                .baseUrl(normalizeBaseUrl(properties.getGotenberg().getBaseUrl()))
                .requestFactory(factory)
                .build();
    }

    public boolean isAvailable() {
        try {
            restClient.get()
                    .uri("/health")
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.debug("Gotenberg health check failed: {}", e.getMessage());
            return false;
        }
    }

    public String baseUrl() {
        return normalizeBaseUrl(properties.getGotenberg().getBaseUrl());
    }

    /**
     * Convert an office document (XLSX/DOCX/…) via LibreOffice route.
     */
    public byte[] convertLibreOffice(byte[] sourceBytes, String filename) {
        if (sourceBytes == null || sourceBytes.length == 0) {
            throw new GotenbergException(GotenbergException.Kind.CONVERSION_FAILED, "Source document is empty");
        }
        String safeName = sanitizeFilename(filename, "document.xlsx");
        return convertWithRetries("/forms/libreoffice/convert", sourceBytes, safeName);
    }

    /**
     * Convert HTML via Chromium. Part name must be {@code index.html}.
     */
    public byte[] convertHtml(byte[] htmlBytes) {
        if (htmlBytes == null || htmlBytes.length == 0) {
            throw new GotenbergException(GotenbergException.Kind.CONVERSION_FAILED, "HTML document is empty");
        }
        return convertWithRetries("/forms/chromium/convert/html", htmlBytes, "index.html");
    }

    private byte[] convertWithRetries(String path, byte[] bytes, String filename) {
        int attempts = Math.max(1, properties.getGotenberg().getMaxRetries() + 1);
        GotenbergException last = null;
        for (int i = 0; i < attempts; i++) {
            try {
                return convertOnce(path, bytes, filename);
            } catch (GotenbergException e) {
                last = e;
                if (!e.isUnavailable() || i + 1 >= attempts) {
                    throw e;
                }
                log.warn("Gotenberg transient failure (attempt {}/{}): {}", i + 1, attempts, e.getMessage());
            }
        }
        throw last != null ? last : new GotenbergException(GotenbergException.Kind.UNAVAILABLE, "Gotenberg unavailable");
    }

    private byte[] convertOnce(String path, byte[] bytes, String filename) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("files", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });

        try {
            byte[] pdf = restClient.post()
                    .uri(path)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
            validatePdf(pdf);
            return pdf;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 502 || status == 503 || status == 504) {
                throw new GotenbergException(GotenbergException.Kind.UNAVAILABLE,
                        "Gotenberg temporarily unavailable (HTTP " + status + ")", e);
            }
            throw new GotenbergException(GotenbergException.Kind.CONVERSION_FAILED,
                    "Gotenberg conversion failed (HTTP " + status + ")", e);
        } catch (RestClientException e) {
            throw new GotenbergException(GotenbergException.Kind.UNAVAILABLE,
                    "Gotenberg is unreachable at " + baseUrl() + ". Start the tron-gotenberg container (Docker Desktop required).",
                    e);
        } catch (GotenbergException e) {
            throw e;
        } catch (Exception e) {
            throw new GotenbergException(GotenbergException.Kind.CONVERSION_FAILED,
                    "Gotenberg conversion error", e);
        }
    }

    static void validatePdf(byte[] pdf) {
        if (pdf == null || pdf.length < 100) {
            throw new GotenbergException(GotenbergException.Kind.INVALID_RESPONSE, "Gotenberg returned an empty or tiny PDF");
        }
        for (int i = 0; i < PDF_MAGIC.length; i++) {
            if (pdf[i] != PDF_MAGIC[i]) {
                throw new GotenbergException(GotenbergException.Kind.INVALID_RESPONSE, "Gotenberg response is not a valid PDF");
            }
        }
    }

    private static String sanitizeFilename(String filename, String fallback) {
        if (filename == null || filename.isBlank()) {
            return fallback;
        }
        String base = filename.replaceAll("[\\\\/\\r\\n\\t]", "_").trim();
        if (base.isEmpty()) {
            return fallback;
        }
        if (!base.contains(".")) {
            return base + ".xlsx";
        }
        return base;
    }

    private static String normalizeBaseUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:3000";
        }
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        // Guard against accidental public demo hosts
        try {
            URI uri = URI.create(trimmed);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.contains("demo.gotenberg.dev") || host.contains("gotenberg.io")) {
                throw new IllegalStateException("Public Gotenberg demo hosts are not allowed; use local Docker only");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception ignored) {
            // keep trimmed
        }
        return trimmed;
    }
}
