package com.tronai.tts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Premium bilingual TTS via ElevenLabs Multilingual v2 (English + Japanese).
 * Returns RIFF WAV so {@link AudioStoreService} and {@link RoboticVoiceProcessor} can process it.
 */
@Component
public class ElevenLabsTextToSpeechProvider {

    private static final Logger log = LoggerFactory.getLogger(ElevenLabsTextToSpeechProvider.class);
    private static final String BASE_URL = "https://api.elevenlabs.io";
    private static final Set<ExperienceLanguage> SUPPORTED = Set.of(
            ExperienceLanguage.EN, ExperienceLanguage.JA);

    private final ElevenLabsTtsProperties properties;
    private final RoboticVoiceProcessor roboticVoiceProcessor;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public ElevenLabsTextToSpeechProvider(
            ElevenLabsTtsProperties properties,
            RoboticVoiceProcessor roboticVoiceProcessor) {
        this.properties = properties;
        this.roboticVoiceProcessor = roboticVoiceProcessor;
        this.objectMapper = new ObjectMapper();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(properties.getTimeoutSeconds(), 5)));
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(factory)
                .build();
    }

    public boolean isConfigured() {
        return properties.isEnabled() && hasText(properties.getApiKey()) && hasText(properties.getVoiceId());
    }

    public boolean supports(ExperienceLanguage language) {
        return isConfigured() && language != null && SUPPORTED.contains(language);
    }

    public byte[] synthesize(String text, ExperienceLanguage language) {
        if (!supports(language)) {
            throw new VoiceException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "ElevenLabs TTS is not configured or does not support language '"
                            + (language == null ? "?" : language.code()) + "'");
        }
        String spoken = truncate(text);
        if (spoken.isBlank()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Text to synthesize cannot be empty");
        }

        Map<String, Object> voiceSettings = new LinkedHashMap<>();
        voiceSettings.put("stability", properties.getStability());
        voiceSettings.put("similarity_boost", properties.getSimilarityBoost());
        voiceSettings.put("style", properties.getStyle());
        voiceSettings.put("use_speaker_boost", properties.isUseSpeakerBoost());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", spoken);
        body.put("model_id", properties.getModelId());
        body.put("voice_settings", voiceSettings);

        String format = properties.getOutputFormat() == null || properties.getOutputFormat().isBlank()
                ? "pcm_24000"
                : properties.getOutputFormat().trim();
        String uri = "/v1/text-to-speech/" + properties.getVoiceId().trim()
                + "?output_format=" + format;

        try {
            byte[] audio = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("xi-api-key", properties.getApiKey().trim())
                    .header("Accept", "audio/wav, application/octet-stream, */*")
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
            if (audio == null || audio.length == 0) {
                throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "ElevenLabs TTS returned no audio");
            }
            byte[] wav = toWav(audio, format);
            // Optional robotic coloration for TRON identity (disabled when tts.robotic.enabled=false).
            return roboticVoiceProcessor.process(wav);
        } catch (VoiceException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            String detail = extractDetail(ex.getResponseBodyAsString(), "ElevenLabs TTS failed");
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.SERVICE_UNAVAILABLE;
            }
            log.warn("ElevenLabs TTS HTTP {}: {}", status.value(), detail);
            throw new VoiceException(status, detail, ex);
        } catch (ResourceAccessException ex) {
            log.error("ElevenLabs TTS connection or timeout: {}", ex.getMessage());
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "ElevenLabs TTS is unavailable", ex);
        } catch (Exception ex) {
            log.error("ElevenLabs TTS unexpected error: {}", ex.getMessage(), ex);
            throw new VoiceException(HttpStatus.INTERNAL_SERVER_ERROR, "ElevenLabs TTS failed", ex);
        }
    }

    byte[] toWav(byte[] audio, String format) {
        if (WavAudioSupport.isRiffWav(audio)) {
            return audio;
        }
        String f = format == null ? "" : format.toLowerCase();
        if (f.startsWith("pcm_") || f.startsWith("wav_")) {
            int sampleRate = WavAudioSupport.parseSampleRateHz(f);
            return WavAudioSupport.wrapPcm16LeMono(audio, sampleRate);
        }
        throw new VoiceException(
                HttpStatus.BAD_GATEWAY,
                "ElevenLabs returned non-WAV audio. Configure tts.elevenlabs.output-format=pcm_24000");
    }

    /**
     * Normalize whitespace. Never silently truncate spoken content — oversize text fails loudly
     * so callers can split turns instead of dropping meaning.
     */
    String truncate(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.replaceAll("\\s+", " ").trim();
        int max = Math.max(1, properties.getMaxInputChars());
        if (cleaned.length() <= max) {
            return cleaned;
        }
        throw new VoiceException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Text to synthesize exceeds ElevenLabs max length (" + max + " chars). "
                        + "Split the reply instead of truncating spoken content.");
    }

    private String extractDetail(String responseBody, String defaultMsg) {
        if (responseBody == null || responseBody.isBlank()) {
            return defaultMsg;
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("detail") && node.get("detail").isObject() && node.get("detail").has("message")) {
                return node.get("detail").get("message").asText(defaultMsg);
            }
            if (node.has("detail") && node.get("detail").isTextual()) {
                return node.get("detail").asText(defaultMsg);
            }
            if (node.has("message")) {
                return node.get("message").asText(defaultMsg);
            }
        } catch (Exception ignored) {
        }
        return defaultMsg;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
