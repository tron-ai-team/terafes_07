package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Routes TTS by language (no RTX required):
 * <ol>
 *   <li>Gemini Algenib robotic (EN + JA) when {@code TTS_GEMINI_ENABLED} + {@code GEMINI_API_KEY}</li>
 *   <li>Local Supertonic M5 (EN + JA) when explicitly enabled</li>
 *   <li>ElevenLabs multilingual (EN + JA) when {@code ELEVENLABS_API_KEY} is configured</li>
 *   <li>Japanese local VOICEVOX when available (future RTX)</li>
 *   <li>English Groq Orpheus when {@code GROQ_API_KEY} is set</li>
 *   <li>Optional {@code MULTILINGUAL_TTS_BASE_URL}</li>
 * </ol>
 * Provider failures cascade to the next configured option. When server TTS is unavailable,
 * the API returns text and {@code browserSpeechFallback=true}.
 */
@Component
public class SpeechSynthesisRouter {

    private static final Logger log = LoggerFactory.getLogger(SpeechSynthesisRouter.class);

    private final TextToSpeechProvider japaneseProvider;
    private final MultilingualTtsProvider multilingualProvider;
    private final GroqTextToSpeechProvider groqProvider;
    private final ElevenLabsTextToSpeechProvider elevenLabsProvider;
    private final SupertonicTextToSpeechProvider supertonicProvider;
    private final GeminiTextToSpeechProvider geminiProvider;
    private final RoboticVoiceProcessor roboticVoiceProcessor;

    public SpeechSynthesisRouter(
            TextToSpeechProvider japaneseProvider,
            MultilingualTtsProperties multilingualProperties,
            GroqTextToSpeechProvider groqProvider,
            ElevenLabsTextToSpeechProvider elevenLabsProvider,
            SupertonicTextToSpeechProvider supertonicProvider,
            GeminiTextToSpeechProvider geminiProvider,
            RoboticVoiceProcessor roboticVoiceProcessor) {
        this.japaneseProvider = japaneseProvider;
        this.multilingualProvider = new MultilingualTtsProvider(multilingualProperties);
        this.groqProvider = groqProvider;
        this.elevenLabsProvider = elevenLabsProvider;
        this.supertonicProvider = supertonicProvider;
        this.geminiProvider = geminiProvider;
        this.roboticVoiceProcessor = roboticVoiceProcessor;
    }

    public SpeechLanguageCapability capability(String requestedLanguage) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(requestedLanguage, ExperienceLanguage.JA);

        if (geminiProvider.supports(language)) {
            return new SpeechLanguageCapability(language.code(), true, true, GeminiTextToSpeechProvider.ID,
                    "TRON approved Gemini Algenib robotic voice (" + language.code() + ")");
        }

        if (supertonicProvider.supports(language)) {
            return new SpeechLanguageCapability(language.code(), true, true, SupertonicTextToSpeechProvider.ID,
                    "Local Supertonic M5 (" + language.code() + ")");
        }

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
                    "Server TTS unavailable for Japanese (enable TTS_GEMINI_ENABLED + GEMINI_API_KEY for Algenib, "
                            + "or set ELEVENLABS_API_KEY / VOICEVOX). Browser speech fallback can be used.");
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

    /**
     * Synthesize with cascading fallbacks. Returns the provider that actually succeeded.
     */
    public Optional<SynthesisOutcome> synthesizeBest(String text, String requestedLanguage) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(requestedLanguage, ExperienceLanguage.JA);

        Optional<SynthesisOutcome> gemini = tryProvider(GeminiTextToSpeechProvider.ID, language,
                () -> geminiProvider.supports(language),
                () -> geminiProvider.synthesize(text, language),
                false);
        if (gemini.isPresent()) {
            return gemini;
        }

        Optional<SynthesisOutcome> supertonic = tryProvider(SupertonicTextToSpeechProvider.ID, language,
                () -> supertonicProvider.supports(language),
                () -> supertonicProvider.synthesize(text, language),
                false);
        if (supertonic.isPresent()) {
            return supertonic;
        }

        Optional<SynthesisOutcome> eleven = tryProvider("elevenlabs", language,
                () -> elevenLabsProvider.supports(language),
                () -> elevenLabsProvider.synthesize(text, language),
                false);
        if (eleven.isPresent()) {
            return eleven;
        }

        if (language == ExperienceLanguage.JA && japaneseProvider.isAvailable()) {
            Optional<SynthesisOutcome> voicevox = tryProvider("voicevox", language,
                    () -> true,
                    () -> roboticVoiceProcessor.process(japaneseProvider.synthesize(text)),
                    true);
            if (voicevox.isPresent()) {
                return voicevox;
            }
        }

        if (language == ExperienceLanguage.EN && groqProvider.supports(language)) {
            Optional<SynthesisOutcome> groq = tryProvider("groq-orpheus", language,
                    () -> true,
                    () -> roboticVoiceProcessor.process(groqProvider.synthesize(text, language)),
                    true);
            if (groq.isPresent()) {
                return groq;
            }
        }

        if (multilingualProvider.supports(language)) {
            return tryProvider("multilingual", language,
                    () -> true,
                    () -> roboticVoiceProcessor.process(multilingualProvider.synthesize(text, language)),
                    true);
        }

        return Optional.empty();
    }

    public Optional<byte[]> synthesizeIfSupported(String text, String requestedLanguage) {
        return synthesizeBest(text, requestedLanguage).map(SynthesisOutcome::audio);
    }

    public byte[] synthesizeRequired(String text, String requestedLanguage) {
        return synthesizeBest(text, requestedLanguage)
                .map(SynthesisOutcome::audio)
                .orElseThrow(() ->
                        new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, capability(requestedLanguage).detail()));
    }

    private Optional<SynthesisOutcome> tryProvider(
            String providerId,
            ExperienceLanguage language,
            BooleanSupplier supported,
            AudioSupplier synthesize,
            boolean alreadyProcessed) {
        if (!supported.getAsBoolean()) {
            return Optional.empty();
        }
        try {
            byte[] audio = synthesize.get();
            if (audio == null || audio.length == 0) {
                log.warn("TTS provider {} returned empty audio for {}", providerId, language.code());
                return Optional.empty();
            }
            // Gemini and ElevenLabs already apply their approved robotic identity.
            byte[] wav = alreadyProcessed || GeminiTextToSpeechProvider.ID.equals(providerId)
                    || "elevenlabs".equals(providerId)
                    || SupertonicTextToSpeechProvider.ID.equals(providerId)
                    ? audio
                    : roboticVoiceProcessor.process(audio);
            return Optional.of(new SynthesisOutcome(wav, providerId));
        } catch (VoiceException failure) {
            log.warn("TTS provider {} failed for {}; trying next fallback: {}",
                    providerId, language.code(), failure.getMessage());
            return Optional.empty();
        } catch (RuntimeException failure) {
            log.warn("TTS provider {} unexpected failure for {}; trying next fallback: {}",
                    providerId, language.code(), failure.getMessage());
            return Optional.empty();
        }
    }

    @FunctionalInterface
    private interface BooleanSupplier {
        boolean getAsBoolean();
    }

    @FunctionalInterface
    private interface AudioSupplier {
        byte[] get();
    }
}
