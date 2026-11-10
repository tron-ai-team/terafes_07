package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Routes TTS by language:
 * <ul>
 *   <li>Japanese → local VOICEVOX when available (future RTX); otherwise no server audio</li>
 *   <li>English → Groq Orpheus when GROQ_API_KEY is set; else optional MULTILINGUAL_TTS_BASE_URL</li>
 *   <li>Other languages → MULTILINGUAL_TTS_BASE_URL only</li>
 * </ul>
 * Groq TTS does <strong>not</strong> support Japanese (verified). When server TTS is unavailable,
 * the API returns text and {@code browserSpeechFallback=true} so the SPA can use Web Speech API.
 */
@Component
public class SpeechSynthesisRouter {

    private final TextToSpeechProvider japaneseProvider;
    private final MultilingualTtsProvider multilingualProvider;
    private final GroqTextToSpeechProvider groqProvider;

    public SpeechSynthesisRouter(
            TextToSpeechProvider japaneseProvider,
            MultilingualTtsProperties multilingualProperties,
            GroqTextToSpeechProvider groqProvider) {
        this.japaneseProvider = japaneseProvider;
        this.multilingualProvider = new MultilingualTtsProvider(multilingualProperties);
        this.groqProvider = groqProvider;
    }

    public SpeechLanguageCapability capability(String requestedLanguage) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(requestedLanguage, ExperienceLanguage.JA);

        if (language == ExperienceLanguage.JA && japaneseProvider.isAvailable()) {
            return new SpeechLanguageCapability(language.code(), true, true, "voicevox",
                    "Japanese speech from local VOICEVOX");
        }
        if (language == ExperienceLanguage.JA) {
            return new SpeechLanguageCapability(language.code(), true, false, null,
                    "Server TTS unavailable for Japanese (Groq TTS has no Japanese voices; VOICEVOX offline). "
                            + "Browser speech fallback can be used.");
        }

        if (language == ExperienceLanguage.EN && groqProvider.supports(language)) {
            return new SpeechLanguageCapability(language.code(), true, true, "groq-orpheus",
                    "English speech from Groq Orpheus TTS");
        }

        if (multilingualProvider.supports(language)) {
            return new SpeechLanguageCapability(language.code(), true, true, "multilingual",
                    "Speech from the configured multilingual TTS provider");
        }

        if (language == ExperienceLanguage.EN) {
            return new SpeechLanguageCapability(language.code(), true, false, null,
                    "Server TTS unavailable for English. Browser speech fallback can be used.");
        }

        return new SpeechLanguageCapability(language.code(), true, false, null,
                "No server TTS for this language. Browser speech fallback can be used.");
    }

    public Optional<byte[]> synthesizeIfSupported(String text, String requestedLanguage) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(requestedLanguage, ExperienceLanguage.JA);
        SpeechLanguageCapability capability = capability(language.code());
        if (!capability.speechSynthesis()) {
            return Optional.empty();
        }
        if ("voicevox".equals(capability.synthesisProvider())) {
            return Optional.of(japaneseProvider.synthesize(text));
        }
        if ("groq-orpheus".equals(capability.synthesisProvider())) {
            return Optional.of(groqProvider.synthesize(text, language));
        }
        return Optional.of(multilingualProvider.synthesize(text, language));
    }

    public byte[] synthesizeRequired(String text, String requestedLanguage) {
        return synthesizeIfSupported(text, requestedLanguage).orElseThrow(() ->
                new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, capability(requestedLanguage).detail()));
    }
}
