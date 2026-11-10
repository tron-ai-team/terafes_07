package com.tronai.tts;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Groq Orpheus TTS (English + Arabic only — not Japanese).
 * Verified against Groq docs: canopylabs/orpheus-v1-english and orpheus-arabic-saudi.
 */
@Component
@ConfigurationProperties(prefix = "tts.groq")
public class GroqTtsProperties {

    private boolean enabled = true;
    /** English Orpheus model. Groq does not offer Japanese TTS. */
    private String modelEnglish = "canopylabs/orpheus-v1-english";
    private String voiceEnglish = "autumn";
    private int timeoutSeconds = 30;
    /** Groq Orpheus hard limit is 200 characters per request. */
    private int maxInputChars = 200;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getModelEnglish() {
        return modelEnglish;
    }

    public void setModelEnglish(String modelEnglish) {
        this.modelEnglish = modelEnglish;
    }

    public String getVoiceEnglish() {
        return voiceEnglish;
    }

    public void setVoiceEnglish(String voiceEnglish) {
        this.voiceEnglish = voiceEnglish;
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
}
