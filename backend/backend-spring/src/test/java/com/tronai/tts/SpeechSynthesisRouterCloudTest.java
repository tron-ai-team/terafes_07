package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpeechSynthesisRouterCloudTest {

    @Mock
    private TextToSpeechProvider voicevox;

    @Mock
    private GroqTextToSpeechProvider groq;

    @Mock
    private ElevenLabsTextToSpeechProvider elevenLabs;

    private MultilingualTtsProperties multilingualProperties;
    private SpeechSynthesisRouter router;

    @BeforeEach
    void setUp() {
        multilingualProperties = new MultilingualTtsProperties();
        multilingualProperties.setBaseUrl("");
        RoboticVoiceProcessor robotic = new RoboticVoiceProcessor(false, 0.0, 0.0);
        router = new SpeechSynthesisRouter(voicevox, multilingualProperties, groq, elevenLabs, robotic);
    }

    @Test
    @DisplayName("Japanese without ElevenLabs/VOICEVOX → no server synthesis (browser fallback)")
    void japaneseWithoutVoicevox() {
        when(elevenLabs.supports(ExperienceLanguage.JA)).thenReturn(false);
        when(voicevox.isAvailable()).thenReturn(false);
        SpeechLanguageCapability cap = router.capability("ja");
        assertFalse(cap.speechSynthesis());
        assertTrue(cap.detail().toLowerCase().contains("browser"));
        assertEquals(Optional.empty(), router.synthesizeIfSupported("こんにちは", "ja"));
    }

    @Test
    @DisplayName("English with Groq Orpheus → server synthesis when ElevenLabs off")
    void englishWithGroq() {
        when(elevenLabs.supports(ExperienceLanguage.EN)).thenReturn(false);
        when(groq.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(groq.synthesize(anyString(), eq(ExperienceLanguage.EN))).thenReturn(minimalWav());

        SpeechLanguageCapability cap = router.capability("en");
        assertTrue(cap.speechSynthesis());
        assertEquals("groq-orpheus", cap.synthesisProvider());

        Optional<byte[]> audio = router.synthesizeIfSupported("Hello there", "en");
        assertTrue(audio.isPresent());
        assertTrue(WavAudioSupport.isRiffWav(audio.get()));
        verify(voicevox, never()).synthesize(anyString());
    }

    @Test
    @DisplayName("ElevenLabs preferred for both English and Japanese when configured")
    void elevenLabsPreferredBilingual() {
        when(elevenLabs.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(elevenLabs.supports(ExperienceLanguage.JA)).thenReturn(true);
        when(elevenLabs.synthesize(anyString(), eq(ExperienceLanguage.EN))).thenReturn(minimalWav());
        when(elevenLabs.synthesize(anyString(), eq(ExperienceLanguage.JA))).thenReturn(minimalWav());

        assertEquals("elevenlabs", router.capability("en").synthesisProvider());
        assertEquals("elevenlabs", router.capability("ja").synthesisProvider());
        assertTrue(router.synthesizeIfSupported("Hello", "en").isPresent());
        assertTrue(router.synthesizeIfSupported("こんにちは", "ja").isPresent());
        verify(groq, never()).synthesize(anyString(), any());
        verify(voicevox, never()).synthesize(anyString());
    }

    private static byte[] minimalWav() {
        return WavAudioSupport.wrapPcm16LeMono(new byte[]{0, 0, 10, 0, -10, 0, 0, 0}, 24000);
    }
}
