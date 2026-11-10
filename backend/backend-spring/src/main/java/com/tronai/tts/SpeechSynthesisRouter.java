package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Routes TTS by language for cloud-first Voice (no RTX required):
 * <ol>
 *   <li>ElevenLabs multilingual (EN + JA) when {@code ELEVENLABS_API_KEY} is configured</li>
 *   <li>Japanese local VOICEVOX when available (future RTX)</li>
 *   <li>English Groq Orpheus when {@code GROQ_API_KEY} is set</li>
 *   <li>Optional {@code MULTILINGUAL_TTS_BASE_URL}</li>
 * </ol>
 * When server TTS is unavailable, the API returns text and {@code browserSpeechFallback=true}.
 */
@Component
public class SpeechSynthesisRouter {

    private final TextToSpeechProvider japaneseProvider;
    private final MultilingualTtsProvider multilingualProvider;
    private final GroqTextToSpeechProvider groqProvider;
    private final ElevenLabsTextToSpeechProvider elevenLabsProvider;
    private final RoboticVoiceProcessor roboticVoiceProcessor;

    public SpeechSynthesisRouter(
            TextToSpeechProvider japaneseProvider,
            MultilingualTtsProperties multilingualProperties,
            GroqTextToSpeechProvider groqProvider,
            ElevenLabsTextToSpeechProvider elevenLabsProvider,
            RoboticVoiceProcessor roboticVoiceProcessor) {
        this.japaneseProvider = japaneseProvider;
        this.multilingualProvider = new MultilingualTtsProvider(multilingualProperties);
        this.groqProvider = groqProvider;
        this.elevenLabsProvider = elevenLabsProvider;
        this.roboticVoiceProcessor = roboticVoiceProcessor;
    }

    public SpeechLanguageCapability capability(String requestedLanguage) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(requestedLanguage, ExperienceLanguage.JA);

        if (elevenLabsProvider.supports(language)) {
            return new SpeechLanguageCapability(language.code(), true, true, "elevenlabs",
                    "TRON premium robotic voice via ElevenLabs (" + language.code() + ")");
        }

        if (language == ExperienceLanguage.JA && japaneseProvider.isAvailable()) {
            return new SpeechLanguageCapability(language.code(), true, true, "voicevox",
                    "Japanese speech from local VOICEVOX");
        }
        if (language == ExperienceLanguage.JA) {
            return new SpeechLanguageCapability(language.code(), true, false, null,
                    "Server TTS unavailable for Japanese (set ELEVENLABS_API_KEY for premium voice, "
                            + "or VOICEVOX for local). Browser speech fallback can be used.");
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
        String provider = capability.synthesisProvider();
        byte[] audio;
        if ("elevenlabs".equals(provider)) {
            // ElevenLabs provider already applies robotic processing.
            audio = elevenLabsProvider.synthesize(text, language);
            return Optional.of(audio);
        }
        if ("voicevox".equals(provider)) {
            audio = japaneseProvider.synthesize(text);
        } else if ("groq-orpheus".equals(provider)) {
            audio = groqProvider.synthesize(text, language);
        } else {
            audio = multilingualProvider.synthesize(text, language);
        }
        return Optional.of(roboticVoiceProcessor.process(audio));
    }

    public byte[] synthesizeRequired(String text, String requestedLanguage) {
        return synthesizeIfSupported(text, requestedLanguage).orElseThrow(() ->
                new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, capability(requestedLanguage).detail()));
    }
}
