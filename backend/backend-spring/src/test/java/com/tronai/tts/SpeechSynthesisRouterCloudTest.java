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

    private MultilingualTtsProperties multilingualProperties;
    private SpeechSynthesisRouter router;

    @BeforeEach
    void setUp() {
        multilingualProperties = new MultilingualTtsProperties();
        multilingualProperties.setBaseUrl("");
        router = new SpeechSynthesisRouter(voicevox, multilingualProperties, groq);
    }

    @Test
    @DisplayName("Japanese without VOICEVOX → no server synthesis (browser fallback)")
    void japaneseWithoutVoicevox() {
        when(voicevox.isAvailable()).thenReturn(false);
        SpeechLanguageCapability cap = router.capability("ja");
        assertFalse(cap.speechSynthesis());
        assertTrue(cap.detail().toLowerCase().contains("browser"));
        assertEquals(Optional.empty(), router.synthesizeIfSupported("こんにちは", "ja"));
    }

    @Test
    @DisplayName("English with Groq Orpheus → server synthesis")
    void englishWithGroq() {
        when(groq.supports(ExperienceLanguage.EN)).thenReturn(true);
        when(groq.synthesize(anyString(), eq(ExperienceLanguage.EN))).thenReturn(new byte[]{1, 2, 3});

        SpeechLanguageCapability cap = router.capability("en");
        assertTrue(cap.speechSynthesis());
        assertEquals("groq-orpheus", cap.synthesisProvider());

        Optional<byte[]> audio = router.synthesizeIfSupported("Hello there", "en");
        assertTrue(audio.isPresent());
        assertArrayEquals(new byte[]{1, 2, 3}, audio.get());
        verify(voicevox, never()).synthesize(anyString());
    }
}
