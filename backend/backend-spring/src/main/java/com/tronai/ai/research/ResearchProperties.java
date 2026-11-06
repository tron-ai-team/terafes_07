package com.tronai.ai.research;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Web research tools (search + extract). Distinct from LLM {@code GatewayProvider}s.
 */
@Component
@ConfigurationProperties(prefix = "tron.research")
public class ResearchProperties {

    private final Tavily tavily = new Tavily();
    private final Firecrawl firecrawl = new Firecrawl();
    private boolean companyAdvisorEnabled = true;
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 30000;
    private int maxSearchResults = 5;
    private int maxExtractChars = 4000;

    public Tavily getTavily() {
        return tavily;
    }

    public Firecrawl getFirecrawl() {
        return firecrawl;
    }

    public boolean isCompanyAdvisorEnabled() {
        return companyAdvisorEnabled;
    }

    public void setCompanyAdvisorEnabled(boolean companyAdvisorEnabled) {
        this.companyAdvisorEnabled = companyAdvisorEnabled;
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

    public int getMaxSearchResults() {
        return maxSearchResults;
    }

    public void setMaxSearchResults(int maxSearchResults) {
        this.maxSearchResults = maxSearchResults;
    }

    public int getMaxExtractChars() {
        return maxExtractChars;
    }

    public void setMaxExtractChars(int maxExtractChars) {
        this.maxExtractChars = maxExtractChars;
    }

    public static class Tavily {
        private String apiKey = "";
        private String baseUrl = "https://api.tavily.com";
        private String searchDepth = "basic";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey == null ? "" : apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.tavily.com" : baseUrl;
        }

        public String getSearchDepth() {
            return searchDepth;
        }

        public void setSearchDepth(String searchDepth) {
            this.searchDepth = searchDepth;
        }

        public boolean isConfigured() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public static class Firecrawl {
        private String apiKey = "";
        private String baseUrl = "https://api.firecrawl.dev";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey == null ? "" : apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.firecrawl.dev" : baseUrl;
        }

        public boolean isConfigured() {
            return apiKey != null && !apiKey.isBlank();
        }
    }
}
