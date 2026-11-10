package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

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

    @Mock
    private SupertonicTextToSpeechProvider supertonic;

    @Mock
    private GeminiTextToSpeechProvider gemini;

    private MultilingualTtsProperties multilingualProperties;
    private SpeechSynthesisRouter router;

    @BeforeEach
    void setUp() {
        multilingualProperties = new MultilingualTtsProperties();
        multilingualProperties.setBaseUrl("");
        RoboticVoiceProcessor robotic = new RoboticVoiceProcessor(false, 0.0, 0.0);
        router = new SpeechSynthesisRouter(
                voicevox, multilingualProperties, groq, elevenLabs, supertonic, gemini, robotic);
    }

    @Test
    @DisplayName("Japanese without Gemini/ElevenLabs/VOICEVOX → no server synthesis (browser fallback)")
    void japaneseWithoutVoicevox() {
        when(gemini.supports(ExperienceLanguage.JA)).thenReturn(false);
        when(supertonic.supports(ExperienceLanguage.JA)).thenReturn(false);
        when(elevenLabs.supports(ExperienceLanguage.JA)).thenReturn(false);
        when(voicevox.isAvailable()).thenReturn(false);
        SpeechLanguageCapability cap = router.capability("ja");
        assertFalse(cap.speechSynthesis());
        assertTrue(cap.detail().toLowerCase().contains("browser"));
        assertEquals(Optional.empty(), router.synthesizeIfSupported("こんにちは", "ja"));
    }

    @Test
    @DisplayName("English with Groq Orpheus → server synthesis when Gemini/ElevenLabs off")
    void englishWithGroq() {
        when(gemini.supports(ExperienceLanguage.EN)).thenReturn(false);
        when(supertonic.supports(ExperienceLanguage.EN)).thenReturn(false);
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
    @DisplayName("Gemini Algenib preferred for both English and Japanese when configured")
    void geminiPreferredBilingual() {
        when(gemini.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(gemini.supports(ExperienceLanguage.JA)).thenReturn(true);
        when(gemini.synthesize(anyString(), eq(ExperienceLanguage.EN))).thenReturn(minimalWav());
        when(gemini.synthesize(anyString(), eq(ExperienceLanguage.JA))).thenReturn(minimalWav());

        assertEquals(GeminiTextToSpeechProvider.ID, router.capability("en").synthesisProvider());
        assertEquals(GeminiTextToSpeechProvider.ID, router.capability("ja").synthesisProvider());
        assertTrue(router.synthesizeIfSupported("Hello", "en").isPresent());
        assertTrue(router.synthesizeIfSupported("こんにちは", "ja").isPresent());
        verify(elevenLabs, never()).synthesize(anyString(), any());
        verify(groq, never()).synthesize(anyString(), any());
        verify(voicevox, never()).synthesize(anyString());
        verify(supertonic, never()).synthesize(anyString(), any());
    }

    @Test
    @DisplayName("ElevenLabs preferred when Gemini off for both English and Japanese")
    void elevenLabsPreferredBilingual() {
        when(gemini.supports(any())).thenReturn(false);
        when(supertonic.supports(any())).thenReturn(false);
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

    @Test
    void optedInM5TakesPrecedenceWhenGeminiOff() {
        when(gemini.supports(any())).thenReturn(false);
        for (ExperienceLanguage language : new ExperienceLanguage[]{ExperienceLanguage.EN, ExperienceLanguage.JA}) {
            when(supertonic.supports(language)).thenReturn(true);
            when(supertonic.synthesize("TRON AI", language)).thenReturn(minimalWav());
            assertEquals("supertonic-m5", router.capability(language.code()).synthesisProvider());
            assertArrayEquals(minimalWav(), router.synthesizeRequired("TRON AI", language.code()));
        }
        verifyNoInteractions(elevenLabs, groq, voicevox);
    }

    @Test
    @DisplayName("Gemini failure cascades to ElevenLabs without destroying synthesis")
    void geminiFailureFallsBackToElevenLabs() {
        when(gemini.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(gemini.synthesize(anyString(), eq(ExperienceLanguage.EN)))
                .thenThrow(new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini unavailable"));
        when(supertonic.supports(ExperienceLanguage.EN)).thenReturn(false);
        when(elevenLabs.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(elevenLabs.synthesize(anyString(), eq(ExperienceLanguage.EN))).thenReturn(minimalWav());

        Optional<SynthesisOutcome> outcome = router.synthesizeBest("Hello", "en");
        assertTrue(outcome.isPresent());
        assertEquals("elevenlabs", outcome.get().providerId());
        assertArrayEquals(minimalWav(), outcome.get().audio());
    }

    @Test
    void unavailableM5FallsBackInsteadOfBlocking() {
        when(gemini.supports(ExperienceLanguage.JA)).thenReturn(false);
        when(supertonic.supports(ExperienceLanguage.JA)).thenReturn(true);
        when(supertonic.synthesize(anyString(), eq(ExperienceLanguage.JA)))
                .thenThrow(new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Local Supertonic M5 is unavailable"));
        when(elevenLabs.supports(ExperienceLanguage.JA)).thenReturn(true);
        when(elevenLabs.synthesize(anyString(), eq(ExperienceLanguage.JA))).thenReturn(minimalWav());

        Optional<SynthesisOutcome> outcome = router.synthesizeBest("こんにちは", "ja");
        assertTrue(outcome.isPresent());
        assertEquals("elevenlabs", outcome.get().providerId());
    }

    private static byte[] minimalWav() {
        return WavAudioSupport.wrapPcm16LeMono(new byte[]{0, 0, 10, 0, -10, 0, 0, 0}, 24000);
    }
}
