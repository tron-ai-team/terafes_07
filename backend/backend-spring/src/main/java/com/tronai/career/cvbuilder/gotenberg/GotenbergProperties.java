package com.tronai.career.cvbuilder.gotenberg;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Local Gotenberg document conversion settings (private Docker service).
 */
@ConfigurationProperties(prefix = "tron.pdf")
public class GotenbergProperties {

    /** Primary engine id: {@code gotenberg} (default). */
    private String engine = "gotenberg";

    private final Gotenberg gotenberg = new Gotenberg();

    /**
     * When true and Gotenberg is down, allow local LibreOffice headless conversion
     * (same XLSX→PDF path) if a valid PDF is produced. Never treat PDFBox text-dump as success.
     */
    private boolean allowLocalLibreOfficeFallback = true;

    public String getEngine() {
        return engine;
    }

    public void setEngine(String engine) {
        this.engine = engine;
    }

    public Gotenberg getGotenberg() {
        return gotenberg;
    }

    public boolean isAllowLocalLibreOfficeFallback() {
        return allowLocalLibreOfficeFallback;
    }

    public void setAllowLocalLibreOfficeFallback(boolean allowLocalLibreOfficeFallback) {
        this.allowLocalLibreOfficeFallback = allowLocalLibreOfficeFallback;
    }

    public static class Gotenberg {
        private String baseUrl = "http://localhost:3000";
        private int connectTimeoutMs = 5_000;
        private int readTimeoutMs = 120_000;
        private int maxRetries = 1;

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public int getConnectTimeoutMs() {
            return connectTimeoutMs;
        }

        public void setConnectTimeoutMs(int connectTimeoutMs) {
            this.connectTimeoutMs = connectTimeoutMs;
        }

        public int getReadTimeoutMs() {
            return readTimeoutMs;
        }

        public void setReadTimeoutMs(int readTimeoutMs) {
            this.readTimeoutMs = readTimeoutMs;
        }

        public int getMaxRetries() {
            return maxRetries;
        }

        public void setMaxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
        }
    }
}
