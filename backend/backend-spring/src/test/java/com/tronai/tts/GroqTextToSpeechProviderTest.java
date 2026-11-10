package com.tronai.tts;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

class GroqTextToSpeechProviderTest {

    private GroqTtsProperties properties;
    private AiGatewayProperties gatewayProperties;
    private GroqTextToSpeechProvider provider;

    @BeforeEach
    void setUp() {
        properties = new GroqTtsProperties();
        properties.setEnabled(true);
        properties.setMaxInputChars(200);
        gatewayProperties = new AiGatewayProperties();
        gatewayProperties.setGroqApiKey("gsk_test_not_a_real_key");
        provider = new GroqTextToSpeechProvider(properties, gatewayProperties);
    }

    @Test
    @DisplayName("Supports English only — not Japanese")
    void supportsEnglishNotJapanese() {
        assertTrue(provider.supports(ExperienceLanguage.EN));
        assertFalse(provider.supports(ExperienceLanguage.JA));
        assertFalse(provider.supports(ExperienceLanguage.BN));
    }

    @Test
    @DisplayName("Japanese synthesize throws with clear message")
    void japaneseThrows() {
        VoiceException ex = assertThrows(VoiceException.class, () ->
                provider.synthesize("こんにちは", ExperienceLanguage.JA));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
        assertTrue(ex.getMessage().toLowerCase().contains("japanese")
                || ex.getMessage().contains("ja"));
    }

    @Test
    @DisplayName("Truncates input to Groq 200-character limit")
    void truncatesLongInput() {
        String longText = "a".repeat(250);
        String truncated = provider.truncateForGroq(longText);
        assertTrue(truncated.length() <= 200);
    }

    @Test
    @DisplayName("Not configured without API key")
    void notConfiguredWithoutKey() {
        gatewayProperties.setGroqApiKey("");
        GroqTextToSpeechProvider bare = new GroqTextToSpeechProvider(properties, gatewayProperties);
        assertFalse(bare.isConfigured());
        assertFalse(bare.supports(ExperienceLanguage.EN));
    }
}
