package com.tronai.stt;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.profile.AiProfile;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

class GroqWhisperSpeechToTextProviderTest {

    private SttProperties sttProperties;
    private AiGatewayProperties gatewayProperties;
    private GroqWhisperSpeechToTextProvider provider;

    @BeforeEach
    void setUp() {
        sttProperties = new SttProperties();
        sttProperties.setGroqEnabled(true);
        sttProperties.setGroqModel("whisper-large-v3-turbo");
        sttProperties.setGroqTimeoutSeconds(5);
        gatewayProperties = new AiGatewayProperties();
        provider = new GroqWhisperSpeechToTextProvider(sttProperties, gatewayProperties);
    }

    @Test
    @DisplayName("isConfigured is false without GROQ_API_KEY")
    void notConfiguredWithoutKey() {
        gatewayProperties.setGroqApiKey("");
        assertFalse(provider.isConfigured());
        assertFalse(provider.isAvailable());
    }

    @Test
    @DisplayName("isConfigured is true when key and groq-enabled")
    void configuredWithKey() {
        gatewayProperties.setGroqApiKey("gsk_test_not_a_real_key");
        assertTrue(provider.isConfigured());
    }

    @Test
    @DisplayName("Transcribe rejects empty audio")
    void rejectsEmptyAudio() {
        gatewayProperties.setGroqApiKey("gsk_test_not_a_real_key");
        VoiceException ex = assertThrows(VoiceException.class, () ->
                provider.transcribe("a.wav", "audio/wav", new byte[0], "ja", AiProfile.FAST));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Transcribe rejects oversized audio over 25MB")
    void rejectsOversizedAudio() {
        gatewayProperties.setGroqApiKey("gsk_test_not_a_real_key");
        byte[] oversized = new byte[25 * 1024 * 1024 + 1];
        VoiceException ex = assertThrows(VoiceException.class, () ->
                provider.transcribe("a.wav", "audio/wav", oversized, "en", AiProfile.FAST));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, ex.getStatus());
    }

    @Test
    @DisplayName("Transcribe throws 503 when Groq is not configured")
    void throwsWhenNotConfigured() {
        gatewayProperties.setGroqApiKey("");
        VoiceException ex = assertThrows(VoiceException.class, () ->
                provider.transcribe("a.wav", "audio/wav", new byte[]{1, 2}, "ja", AiProfile.FAST));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
    }
}
