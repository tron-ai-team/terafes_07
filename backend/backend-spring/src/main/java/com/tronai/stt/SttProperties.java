package com.tronai.stt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "stt")
public class SttProperties {

    /** Local faster-whisper worker. Empty in production until the RTX AI node exists. */
    private String baseUrl = "http://127.0.0.1:8091";
    private int timeoutSeconds = 30;

    /** When true and {@code baseUrl} is set, try local STT before Groq Whisper. */
    private boolean preferLocal = true;

    /** Cloud STT via existing GROQ_API_KEY (Groq Whisper). */
    private boolean groqEnabled = true;
    private String groqModel = "whisper-large-v3-turbo";
    private int groqTimeoutSeconds = 60;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public boolean isPreferLocal() {
        return preferLocal;
    }

    public void setPreferLocal(boolean preferLocal) {
        this.preferLocal = preferLocal;
    }

    public boolean isGroqEnabled() {
        return groqEnabled;
    }

    public void setGroqEnabled(boolean groqEnabled) {
        this.groqEnabled = groqEnabled;
    }

    public String getGroqModel() {
        return groqModel;
    }

    public void setGroqModel(String groqModel) {
        this.groqModel = groqModel;
    }

    public int getGroqTimeoutSeconds() {
        return groqTimeoutSeconds;
    }

    public void setGroqTimeoutSeconds(int groqTimeoutSeconds) {
        this.groqTimeoutSeconds = groqTimeoutSeconds;
    }
}
