package com.tronai.language;

import com.tronai.tts.GroqTextToSpeechProvider;
import com.tronai.tts.MultilingualTtsProperties;
import com.tronai.tts.SpeechSynthesisRouter;
import com.tronai.tts.TextToSpeechProvider;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExperienceLanguageTest {

    @Test
    void parsesTheGlobalLanguageSetAndLegacyNames() {
        assertThat(ExperienceLanguage.parse("ne").code()).isEqualTo("ne");
        assertThat(ExperienceLanguage.parse("my").englishName()).isEqualTo("Myanmar");
        assertThat(ExperienceLanguage.parse("japanese")).isEqualTo(ExperienceLanguage.JA);
        assertThat(ExperienceLanguage.parse("english")).isEqualTo(ExperienceLanguage.EN);
        assertThat(ExperienceLanguage.parse("fr")).isNull();
    }

    @Test
    void voicevoxIsNotUsedForNonJapaneseWhenNoMultilingualProviderExists() {
        TextToSpeechProvider voicevox = mock(TextToSpeechProvider.class);
        GroqTextToSpeechProvider groq = mock(GroqTextToSpeechProvider.class);
        when(voicevox.isAvailable()).thenReturn(true);
        when(groq.supports(ExperienceLanguage.EN)).thenReturn(false);
        SpeechSynthesisRouter router = new SpeechSynthesisRouter(voicevox, new MultilingualTtsProperties(), groq);

        assertThat(router.capability("ja").speechSynthesis()).isTrue();
        assertThat(router.capability("ja").synthesisProvider()).isEqualTo("voicevox");
        assertThat(router.capability("si").speechSynthesis()).isFalse();
        assertThat(router.synthesizeIfSupported("ආයුබෝවන්", "si")).isEmpty();
        verify(voicevox, never()).synthesize(org.mockito.ArgumentMatchers.anyString());
    }
}
