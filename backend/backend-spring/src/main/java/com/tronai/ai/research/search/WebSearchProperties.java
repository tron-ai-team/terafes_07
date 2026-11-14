package com.tronai.ai.research.search;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

/**
 * Backend Intelligence V1 web-search controls. Defaults keep current behavior (no search).
 */
@Component
@ConfigurationProperties(prefix = "tron.search")
public class WebSearchProperties {

    /** Master kill switch. When false, chat/voice search stays on the legacy stub path. */
    private boolean webSearchV1Enabled = false;

    private final Searxng searxng = new Searxng();
    private final Serper serper = new Serper();
    private final GroqNative groqNative = new GroqNative();
    private final OpenRouterNative openRouterNative = new OpenRouterNative();

    private int maxQueriesFast = 1;
    private int maxQueriesSmart = 2;
    private int maxResultsFast = 3;
    private int maxResultsSmart = 5;
    private int maxResultsCloud = 5;
    private int maxSnippetChars = 400;
    private int maxQueryChars = 240;
    private int maxContextChars = 3500;
    private int cacheTtlSeconds = 300;
    private int maxConcurrentSearches = 4;
    /** When true, local FAST/SMART may use Serper if SearXNG fails. Default false. */
    private boolean localPaidFallbackEnabled = false;
    private int maxChatHistoryMessages = 24;

    public boolean isWebSearchV1Enabled() {
        return webSearchV1Enabled;
    }

    public void setWebSearchV1Enabled(boolean webSearchV1Enabled) {
        this.webSearchV1Enabled = webSearchV1Enabled;
    }

    public Searxng getSearxng() {
        return searxng;
    }

    public Serper getSerper() {
        return serper;
    }

    public GroqNative getGroqNative() {
        return groqNative;
    }

    public OpenRouterNative getOpenRouterNative() {
        return openRouterNative;
    }

    public int getMaxQueriesFast() {
        return maxQueriesFast;
    }

    public void setMaxQueriesFast(int maxQueriesFast) {
        this.maxQueriesFast = maxQueriesFast;
    }

    public int getMaxQueriesSmart() {
        return maxQueriesSmart;
    }

    public void setMaxQueriesSmart(int maxQueriesSmart) {
        this.maxQueriesSmart = maxQueriesSmart;
    }

    public int getMaxResultsFast() {
        return maxResultsFast;
    }

    public void setMaxResultsFast(int maxResultsFast) {
        this.maxResultsFast = maxResultsFast;
    }

    public int getMaxResultsSmart() {
        return maxResultsSmart;
    }

    public void setMaxResultsSmart(int maxResultsSmart) {
        this.maxResultsSmart = maxResultsSmart;
    }

    public int getMaxResultsCloud() {
        return maxResultsCloud;
    }

    public void setMaxResultsCloud(int maxResultsCloud) {
        this.maxResultsCloud = maxResultsCloud;
    }

    public int getMaxSnippetChars() {
        return maxSnippetChars;
    }

    public void setMaxSnippetChars(int maxSnippetChars) {
        this.maxSnippetChars = maxSnippetChars;
    }

    public int getMaxQueryChars() {
        return maxQueryChars;
    }

    public void setMaxQueryChars(int maxQueryChars) {
        this.maxQueryChars = maxQueryChars;
    }

    public int getMaxContextChars() {
        return maxContextChars;
    }

    public void setMaxContextChars(int maxContextChars) {
        this.maxContextChars = maxContextChars;
    }

    public int getCacheTtlSeconds() {
        return cacheTtlSeconds;
    }

    public void setCacheTtlSeconds(int cacheTtlSeconds) {
        this.cacheTtlSeconds = cacheTtlSeconds;
    }

    public int getMaxConcurrentSearches() {
        return maxConcurrentSearches;
    }

    public void setMaxConcurrentSearches(int maxConcurrentSearches) {
        this.maxConcurrentSearches = maxConcurrentSearches;
    }

    public boolean isLocalPaidFallbackEnabled() {
        return localPaidFallbackEnabled;
    }

    public void setLocalPaidFallbackEnabled(boolean localPaidFallbackEnabled) {
        this.localPaidFallbackEnabled = localPaidFallbackEnabled;
    }

    public int getMaxChatHistoryMessages() {
        return maxChatHistoryMessages;
    }

    public void setMaxChatHistoryMessages(int maxChatHistoryMessages) {
        this.maxChatHistoryMessages = maxChatHistoryMessages;
    }

    public static class Searxng {
        private boolean enabled = false;
        /** Private base URL only — never expose to frontend. */
        private String baseUrl = "http://127.0.0.1:8888";
        private int connectTimeoutMs = 1500;
        private int readTimeoutMs = 6000;
        private int maxResults = 5;
        private String language = "en";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "http://127.0.0.1:8888" : baseUrl.trim();
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

        public int getMaxResults() {
            return maxResults;
        }

        public void setMaxResults(int maxResults) {
            this.maxResults = maxResults;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public boolean isReady() {
            return enabled && baseUrl != null && !baseUrl.isBlank();
        }
    }

    public static class Serper {
        private boolean enabled = false;
        private String apiKey = "";
        private String baseUrl = "https://google.serper.dev";
        private int connectTimeoutMs = 2000;
        private int readTimeoutMs = 6000;
        private int dailyMaxCalls = 0;
        private int maxResults = 5;
        /**
         * Durable daily budget ledger path. Paid Serper requires an <b>absolute</b> path on
         * persistent storage (host mount / volume). Relative defaults are local/dev only and
         * fail-closed for paid searches so container replacement cannot reset spend.
         */
        private String budgetLedgerPath = "data/serper-daily-budget.ledger";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

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
            this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://google.serper.dev" : baseUrl.trim();
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

        public int getDailyMaxCalls() {
            return dailyMaxCalls;
        }

        public void setDailyMaxCalls(int dailyMaxCalls) {
            this.dailyMaxCalls = dailyMaxCalls;
        }

        public int getMaxResults() {
            return maxResults;
        }

        public void setMaxResults(int maxResults) {
            this.maxResults = maxResults;
        }

        public String getBudgetLedgerPath() {
            return budgetLedgerPath;
        }

        public void setBudgetLedgerPath(String budgetLedgerPath) {
            this.budgetLedgerPath = budgetLedgerPath == null ? "" : budgetLedgerPath.trim();
        }

        public boolean isReady() {
            if (!enabled || apiKey == null || apiKey.isBlank() || dailyMaxCalls <= 0) {
                return false;
            }
            // Absolute ledger required — relative paths reset on container replace.
            if (budgetLedgerPath == null || budgetLedgerPath.isBlank()) {
                return false;
            }
            return Path.of(budgetLedgerPath).isAbsolute();
        }
    }

    public static class GroqNative {
        private boolean browserSearchEnabled = false;

        public boolean isBrowserSearchEnabled() {
            return browserSearchEnabled;
        }

        public void setBrowserSearchEnabled(boolean browserSearchEnabled) {
            this.browserSearchEnabled = browserSearchEnabled;
        }
    }

    public static class OpenRouterNative {
        private boolean webSearchToolEnabled = false;

        public boolean isWebSearchToolEnabled() {
            return webSearchToolEnabled;
        }

        public void setWebSearchToolEnabled(boolean webSearchToolEnabled) {
            this.webSearchToolEnabled = webSearchToolEnabled;
        }
    }
}
