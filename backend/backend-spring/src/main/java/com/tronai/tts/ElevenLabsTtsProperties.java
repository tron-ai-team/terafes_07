package com.tronai.tts;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * ElevenLabs multilingual TTS (English + Japanese).
 * Requires {@code ELEVENLABS_API_KEY}. Disabled by default until a key is provisioned.
 */
@Component
@ConfigurationProperties(prefix = "tts.elevenlabs")
public class ElevenLabsTtsProperties {

    /** Master switch. Still requires a non-blank API key. */
    private boolean enabled = false;

    /** Injected from env; never hardcode. */
    private String apiKey = "";

    /**
     * Default public library voice with deep/monotone robotic character (Danny).
     * Override with a custom/cloned TRON voice id after approval.
     */
    private String voiceId = "Nagtyt9MktF8AWSgjotJ";

    /** Multilingual model with verified Japanese + English support. */
    private String modelId = "eleven_multilingual_v2";

    /**
     * Prefer WAV-compatible PCM so AudioStore and robotic post-processing can run.
     * ElevenLabs accepts formats like pcm_24000 / wav_24000 / mp3_44100_128.
     */
    private String outputFormat = "pcm_24000";

    private int timeoutSeconds = 45;
    private int maxInputChars = 1200;

    /** Stability 0–1: higher = more consistent robotic delivery. */
    private double stability = 0.55;

    /** Similarity boost 0–1. */
    private double similarityBoost = 0.75;

    /** Style exaggeration 0–1 (keep low for intelligibility). */
    private double style = 0.15;

    private boolean useSpeakerBoost = true;

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

    public String getVoiceId() {
        return voiceId;
    }

    public void setVoiceId(String voiceId) {
        this.voiceId = voiceId;
    }

    public String getModelId() {
        return modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
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

    public double getStability() {
        return stability;
    }

    public void setStability(double stability) {
        this.stability = stability;
    }

    public double getSimilarityBoost() {
        return similarityBoost;
    }

    public void setSimilarityBoost(double similarityBoost) {
        this.similarityBoost = similarityBoost;
    }

    public double getStyle() {
        return style;
    }

    public void setStyle(double style) {
        this.style = style;
    }

    public boolean isUseSpeakerBoost() {
        return useSpeakerBoost;
    }

    public void setUseSpeakerBoost(boolean useSpeakerBoost) {
        this.useSpeakerBoost = useSpeakerBoost;
    }
}
