package com.tronai.ai.gateway;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "tron.ai")
public class AiGatewayProperties {

    private int dailyUltraCredits = 5;
    private boolean ultraEnabled = true;
    private boolean liveProviderSmokeTest = false;
    private int maxProviderCallsPerTask = 12;
    private int maxTokensPerTask = 24000;
    private long globalDailyBudgetUsdCents = 500;
    private int requestTimeoutSeconds = 90;

    private String groqApiKey = "";
    private String openrouterApiKey1 = "";
    private String openrouterApiKey2 = "";
    private String mistralApiKey = "";
    private String cloudflareApiToken = "";
    private String cloudflareAccountId = "";
    private String geminiApiKey1 = "";
    private String geminiApiKey2 = "";
    private String geminiApiKey3 = "";
    private String geminiApiKey4 = "";

    // Documented Groq model IDs — override via env without code changes.
    // Default cloud target: openai/gpt-oss-120b (subject to account availability).
    private String groqModelFast = "openai/gpt-oss-20b";
    private String groqModelSmart = "openai/gpt-oss-120b";
    private String openrouterModelSmart = "meta-llama/llama-3.3-70b-instruct";
    /** Capable OpenRouter chat model verified live; deepseek-r1 has no endpoints on this account. */
    private String openrouterModelUltra = "deepseek/deepseek-chat";
    private String mistralModelSmart = "mistral-small-latest";
    private String mistralModelUltra = "mistral-large-latest";
    private String cloudflareModelFast = "@cf/meta/llama-3.1-8b-instruct";
    private String geminiModelSmart = "gemini-2.0-flash";
    private String geminiModelUltra = "gemini-2.5-pro";

    /** Prefer Groq ahead of OpenRouter for SMART when Groq is configured. */
    private boolean preferGroqForSmart = true;
    /**
     * When false (default), CV assist stays local unless the request explicitly sets allowCloud=true.
     * Personal CV content must not go to cloud without permission.
     */
    private boolean cvAssistCloudEnabled = false;
    /** Company public-source synthesis may use cloud when true (no personal CV dump). */
    private boolean companyAnalysisCloudEnabled = true;
    /** Interview features may use cloud when true; still honor request localOnly. */
    private boolean interviewCloudEnabled = true;

    public int getDailyUltraCredits() { return dailyUltraCredits; }
    public void setDailyUltraCredits(int dailyUltraCredits) { this.dailyUltraCredits = dailyUltraCredits; }
    public boolean isUltraEnabled() { return ultraEnabled; }
    public void setUltraEnabled(boolean ultraEnabled) { this.ultraEnabled = ultraEnabled; }
    public boolean isLiveProviderSmokeTest() { return liveProviderSmokeTest; }
    public void setLiveProviderSmokeTest(boolean liveProviderSmokeTest) { this.liveProviderSmokeTest = liveProviderSmokeTest; }
    public int getMaxProviderCallsPerTask() { return maxProviderCallsPerTask; }
    public void setMaxProviderCallsPerTask(int maxProviderCallsPerTask) { this.maxProviderCallsPerTask = maxProviderCallsPerTask; }
    public int getMaxTokensPerTask() { return maxTokensPerTask; }
    public void setMaxTokensPerTask(int maxTokensPerTask) { this.maxTokensPerTask = maxTokensPerTask; }
    public long getGlobalDailyBudgetUsdCents() { return globalDailyBudgetUsdCents; }
    public void setGlobalDailyBudgetUsdCents(long globalDailyBudgetUsdCents) { this.globalDailyBudgetUsdCents = globalDailyBudgetUsdCents; }
    public int getRequestTimeoutSeconds() { return requestTimeoutSeconds; }
    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) { this.requestTimeoutSeconds = requestTimeoutSeconds; }

    public String getGroqApiKey() { return groqApiKey; }
    public void setGroqApiKey(String groqApiKey) { this.groqApiKey = groqApiKey; }
    public String getOpenrouterApiKey1() { return openrouterApiKey1; }
    public void setOpenrouterApiKey1(String openrouterApiKey1) { this.openrouterApiKey1 = openrouterApiKey1; }
    public String getOpenrouterApiKey2() { return openrouterApiKey2; }
    public void setOpenrouterApiKey2(String openrouterApiKey2) { this.openrouterApiKey2 = openrouterApiKey2; }
    public String getMistralApiKey() { return mistralApiKey; }
    public void setMistralApiKey(String mistralApiKey) { this.mistralApiKey = mistralApiKey; }
    public String getCloudflareApiToken() { return cloudflareApiToken; }
    public void setCloudflareApiToken(String cloudflareApiToken) { this.cloudflareApiToken = cloudflareApiToken; }
    public String getCloudflareAccountId() { return cloudflareAccountId; }
    public void setCloudflareAccountId(String cloudflareAccountId) { this.cloudflareAccountId = cloudflareAccountId; }
    public String getGeminiApiKey1() { return geminiApiKey1; }
    public void setGeminiApiKey1(String geminiApiKey1) { this.geminiApiKey1 = geminiApiKey1; }
    public String getGeminiApiKey2() { return geminiApiKey2; }
    public void setGeminiApiKey2(String geminiApiKey2) { this.geminiApiKey2 = geminiApiKey2; }
    public String getGeminiApiKey3() { return geminiApiKey3; }
    public void setGeminiApiKey3(String geminiApiKey3) { this.geminiApiKey3 = geminiApiKey3; }
    public String getGeminiApiKey4() { return geminiApiKey4; }
    public void setGeminiApiKey4(String geminiApiKey4) { this.geminiApiKey4 = geminiApiKey4; }

    public String getGroqModelFast() { return groqModelFast; }
    public void setGroqModelFast(String groqModelFast) { this.groqModelFast = groqModelFast; }
    public String getGroqModelSmart() { return groqModelSmart; }
    public void setGroqModelSmart(String groqModelSmart) { this.groqModelSmart = groqModelSmart; }
    public String getOpenrouterModelSmart() { return openrouterModelSmart; }
    public void setOpenrouterModelSmart(String openrouterModelSmart) { this.openrouterModelSmart = openrouterModelSmart; }
    public String getOpenrouterModelUltra() { return openrouterModelUltra; }
    public void setOpenrouterModelUltra(String openrouterModelUltra) { this.openrouterModelUltra = openrouterModelUltra; }
    public String getMistralModelSmart() { return mistralModelSmart; }
    public void setMistralModelSmart(String mistralModelSmart) { this.mistralModelSmart = mistralModelSmart; }
    public String getMistralModelUltra() { return mistralModelUltra; }
    public void setMistralModelUltra(String mistralModelUltra) { this.mistralModelUltra = mistralModelUltra; }
    public String getCloudflareModelFast() { return cloudflareModelFast; }
    public void setCloudflareModelFast(String cloudflareModelFast) { this.cloudflareModelFast = cloudflareModelFast; }
    public String getGeminiModelSmart() { return geminiModelSmart; }
    public void setGeminiModelSmart(String geminiModelSmart) { this.geminiModelSmart = geminiModelSmart; }
    public String getGeminiModelUltra() { return geminiModelUltra; }
    public void setGeminiModelUltra(String geminiModelUltra) { this.geminiModelUltra = geminiModelUltra; }

    public boolean isPreferGroqForSmart() { return preferGroqForSmart; }
    public void setPreferGroqForSmart(boolean preferGroqForSmart) { this.preferGroqForSmart = preferGroqForSmart; }
    public boolean isCvAssistCloudEnabled() { return cvAssistCloudEnabled; }
    public void setCvAssistCloudEnabled(boolean cvAssistCloudEnabled) { this.cvAssistCloudEnabled = cvAssistCloudEnabled; }
    public boolean isCompanyAnalysisCloudEnabled() { return companyAnalysisCloudEnabled; }
    public void setCompanyAnalysisCloudEnabled(boolean companyAnalysisCloudEnabled) {
        this.companyAnalysisCloudEnabled = companyAnalysisCloudEnabled;
    }
    public boolean isInterviewCloudEnabled() { return interviewCloudEnabled; }
    public void setInterviewCloudEnabled(boolean interviewCloudEnabled) { this.interviewCloudEnabled = interviewCloudEnabled; }
}
