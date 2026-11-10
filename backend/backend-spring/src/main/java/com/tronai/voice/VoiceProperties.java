package com.tronai.voice;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Voice-mode intelligence and history knobs. Isolated from Chat configuration.
 */
@Component
@ConfigurationProperties(prefix = "tron.voice")
public class VoiceProperties {

    /**
     * When true, cloud Voice FAST/AUTO routes use SMART (gpt-oss-120b class) instead of FAST
     * (gpt-oss-20b). Evidence: FAST cloud answers were vague/truncated on multi-turn Q&amp;A.
     * Chat routing is unaffected.
     */
    private boolean cloudPreferSmart = true;

    /** Max completion tokens for FAST voice replies. */
    private int maxTokensFast = 256;

    /** Max completion tokens for QUALITY / SMART / ULTRA voice replies. */
    private int maxTokensQuality = 512;

    /** In-memory dialogue turns retained per voice session (user+assistant pairs share this budget). */
    private int maxHistoryMessages = 24;

    public boolean isCloudPreferSmart() {
        return cloudPreferSmart;
    }

    public void setCloudPreferSmart(boolean cloudPreferSmart) {
        this.cloudPreferSmart = cloudPreferSmart;
    }

    public int getMaxTokensFast() {
        return maxTokensFast;
    }

    public void setMaxTokensFast(int maxTokensFast) {
        this.maxTokensFast = maxTokensFast;
    }

    public int getMaxTokensQuality() {
        return maxTokensQuality;
    }

    public void setMaxTokensQuality(int maxTokensQuality) {
        this.maxTokensQuality = maxTokensQuality;
    }

    public int getMaxHistoryMessages() {
        return maxHistoryMessages;
    }

    public void setMaxHistoryMessages(int maxHistoryMessages) {
        this.maxHistoryMessages = maxHistoryMessages;
    }
}
