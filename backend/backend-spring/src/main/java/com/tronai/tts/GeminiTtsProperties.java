package com.tronai.tts;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Gemini TTS (Interactions API) — approved TRON Algenib robotic voice.
 * Requires {@code GEMINI_API_KEY}. Disabled by default until opted in.
 */
@Component
@ConfigurationProperties(prefix = "tts.gemini")
public class GeminiTtsProperties {

    /**
     * Exact style string used to generate the approved Algenib robotic samples.
     * Do not invent a different robotic prompt.
     */
    public static final String APPROVED_ROBOTIC_STYLE =
            "Low, resonant pitch; calm cinematic AI with subtle synthetic resonance, "
                    + "crisp diction and natural conversational pacing.";

    /** Master switch. Still requires a non-blank API key. */
    private boolean enabled = false;

    /** Injected from env; never hardcode. Prefer {@code GEMINI_API_KEY}. */
    private String apiKey = "";

    /** Interactions API URL. Override only in hermetic tests. */
    private String endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";

    private String model = "gemini-3.8-flash-lite-tts";

    /** Approved voice preset for both English and Japanese. */
    private String voice = "Algenib";

    private String style = APPROVED_ROBOTIC_STYLE;

    private int sampleRate = 24000;

    /** Match the audition pipeline (SSE PCM chunks → WAV). */
    private boolean stream = true;

    private int timeoutSeconds = 45;

    private int maxInputChars = 1200;

    /**
     * After a Gemini TTS failure, skip Gemini for this many seconds and use fallbacks
     * to avoid hammering a failing endpoint.
     */
    private int failureCooldownSeconds = 30;

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
        this.apiKey = apiKey;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getVoice() {
        return voice;
    }

    public void setVoice(String voice) {
        this.voice = voice;
    }

    public String getStyle() {
        return style;
    }

    public void setStyle(String style) {
        this.style = style;
    }

    public int getSampleRate() {
        return sampleRate;
    }

    public void setSampleRate(int sampleRate) {
        this.sampleRate = sampleRate;
    }

    public boolean isStream() {
        return stream;
    }

    public void setStream(boolean stream) {
        this.stream = stream;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public int getMaxInputChars() {
        return maxInputChars;
    }

    public void setMaxInputChars(int maxInputChars) {
        this.maxInputChars = maxInputChars;
    }

    public int getFailureCooldownSeconds() {
        return failureCooldownSeconds;
    }

    public void setFailureCooldownSeconds(int failureCooldownSeconds) {
        this.failureCooldownSeconds = failureCooldownSeconds;
    }
}
