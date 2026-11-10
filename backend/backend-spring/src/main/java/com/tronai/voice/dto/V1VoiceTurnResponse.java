package com.tronai.voice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class V1VoiceTurnResponse {

    @JsonProperty("sessionId")
    private String sessionId;

    @JsonProperty("transcript")
    private String transcript;

    @JsonProperty("reply")
    private String reply;

    @JsonProperty("content")
    private String content;

    @JsonProperty("language")
    private String language;

    @JsonProperty("audio_url")
    private String audioUrl;

    @JsonProperty("audioContentType")
    private String audioContentType = "audio/wav";

    @JsonProperty("speechSupported")
    private boolean speechSupported;

    @JsonProperty("speechDetail")
    private String speechDetail;

    /**
     * When true, the SPA should play the reply with the browser Web Speech API
     * because server-side TTS is unavailable for this language.
     */
    @JsonProperty("browserSpeechFallback")
    private boolean browserSpeechFallback;

    @JsonProperty("latency_ms")
    private VoiceLatencyDto latencyMs;

    @JsonProperty("aiProfile")
    private String aiProfile = "FAST";

    @JsonProperty("model")
    private String model = "tron-fast";

    /**
     * Actual engine/model identifier when known (e.g. openai/gpt-oss-120b).
     * Never invent — leave null/blank when unknown.
     */
    @JsonProperty("engineModel")
    private String engineModel;

    /** Actual provider when known (e.g. GROQ, OLLAMA, ELEVENLABS). */
    @JsonProperty("provider")
    private String provider;

    /** TTS engine that produced audio, when known (elevenlabs, groq-orpheus, voicevox, browser). */
    @JsonProperty("ttsProvider")
    private String ttsProvider;

    @JsonProperty("locked")
    private boolean locked = true;

    public V1VoiceTurnResponse() {
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getAudioUrl() {
        return audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getAudioContentType() {
        return audioContentType;
    }

    public void setAudioContentType(String audioContentType) {
        this.audioContentType = audioContentType;
    }

    public boolean isSpeechSupported() {
        return speechSupported;
    }

    public void setSpeechSupported(boolean speechSupported) {
        this.speechSupported = speechSupported;
    }

    public String getSpeechDetail() {
        return speechDetail;
    }

    public void setSpeechDetail(String speechDetail) {
        this.speechDetail = speechDetail;
    }

    public boolean isBrowserSpeechFallback() {
        return browserSpeechFallback;
    }

    public void setBrowserSpeechFallback(boolean browserSpeechFallback) {
        this.browserSpeechFallback = browserSpeechFallback;
    }

    public VoiceLatencyDto getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(VoiceLatencyDto latencyMs) {
        this.latencyMs = latencyMs;
    }

    public String getAiProfile() {
        return aiProfile;
    }

    public void setAiProfile(String aiProfile) {
        this.aiProfile = aiProfile;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getEngineModel() {
        return engineModel;
    }

    public void setEngineModel(String engineModel) {
        this.engineModel = engineModel;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getTtsProvider() {
        return ttsProvider;
    }

    public void setTtsProvider(String ttsProvider) {
        this.ttsProvider = ttsProvider;
    }

    public boolean isLocked() {
        return locked;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }
}
