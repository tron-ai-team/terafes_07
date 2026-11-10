package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ElevenLabsTextToSpeechProviderTest {

    private ElevenLabsTtsProperties properties;
    private ElevenLabsTextToSpeechProvider provider;

    @BeforeEach
    void setUp() {
        properties = new ElevenLabsTtsProperties();
        properties.setEnabled(true);
        properties.setApiKey("");
        properties.setVoiceId("pNInz6obpgDQGcFmaJgB");
        provider = new ElevenLabsTextToSpeechProvider(properties, new RoboticVoiceProcessor(false, 0, 0));
    }

    @Test
    @DisplayName("Without API key ElevenLabs is not configured")
    void requiresApiKey() {
        assertThat(provider.isConfigured()).isFalse();
        assertThat(provider.supports(ExperienceLanguage.EN)).isFalse();
        assertThat(provider.supports(ExperienceLanguage.JA)).isFalse();
    }

    @Test
    @DisplayName("With API key ElevenLabs supports English and Japanese")
    void supportsEnAndJaWhenConfigured() {
        properties.setApiKey("test-key-not-real");
        assertThat(provider.isConfigured()).isTrue();
        assertThat(provider.supports(ExperienceLanguage.EN)).isTrue();
        assertThat(provider.supports(ExperienceLanguage.JA)).isTrue();
        assertThat(provider.supports(ExperienceLanguage.BN)).isFalse();
    }

    @Test
    @DisplayName("PCM payload is wrapped into RIFF WAV for audio store")
    void wrapsPcmToWav() {
        properties.setApiKey("test-key-not-real");
        byte[] pcm = new byte[]{0, 0, 10, 0, -10, 0};
        byte[] wav = provider.toWav(pcm, "pcm_24000");
        assertThat(WavAudioSupport.isRiffWav(wav)).isTrue();
    }

    @Test
    @DisplayName("Oversize spoken text fails instead of silent truncation")
    void rejectsSilentTruncation() {
        properties.setApiKey("test-key-not-real");
        properties.setMaxInputChars(20);
        assertThat(provider.truncate("Short text")).isEqualTo("Short text");
        assertThatThrownBy(() -> provider.truncate("This sentence is intentionally longer than twenty characters"))
                .isInstanceOf(VoiceException.class)
                .hasMessageContaining("exceeds ElevenLabs max length");
    }
}
