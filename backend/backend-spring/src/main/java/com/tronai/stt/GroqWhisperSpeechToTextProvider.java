package com.tronai.stt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.profile.AiProfile;
import com.tronai.voice.VoiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * Cloud Speech-to-Text via Groq Whisper ({@code /openai/v1/audio/transcriptions}).
 * Uses the existing {@code GROQ_API_KEY}. Multilingual (JA/EN and more).
 * Does not replace the local faster-whisper worker — see {@link RoutingSpeechToTextProvider}.
 */
@Component
public class GroqWhisperSpeechToTextProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqWhisperSpeechToTextProvider.class);
    private static final String BASE_URL = "https://api.groq.com/openai/v1";
    private static final int MAX_AUDIO_BYTES = 25 * 1024 * 1024;

    private final SttProperties sttProperties;
    private final AiGatewayProperties gatewayProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GroqWhisperSpeechToTextProvider(SttProperties sttProperties, AiGatewayProperties gatewayProperties) {
        this.sttProperties = sttProperties;
        this.gatewayProperties = gatewayProperties;
        this.objectMapper = new ObjectMapper();

        int timeoutSeconds = Math.max(sttProperties.getGroqTimeoutSeconds(), 5);
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(factory)
                .build();
    }

    public boolean isConfigured() {
        return sttProperties.isGroqEnabled() && hasText(gatewayProperties.getGroqApiKey());
    }

    public boolean isAvailable() {
        return isConfigured();
    }

    public SttTranscriptionResult transcribe(
            String filename,
            String contentType,
            byte[] data,
            String language,
            AiProfile profile) {
        if (!isConfigured()) {
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Cloud STT (Groq Whisper) is not configured");
        }
        if (data == null || data.length == 0) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "The audio file is empty");
        }
        if (data.length > MAX_AUDIO_BYTES) {
            throw new VoiceException(HttpStatus.PAYLOAD_TOO_LARGE, "Audio exceeds the 25MB Groq STT limit");
        }

        String safeFilename = (filename != null && !filename.isBlank()) ? filename : "audio.wav";
        String safeLanguage = normalizeLanguage(language);
        String model = sttProperties.getGroqModel();
        if (!hasText(model)) {
            model = "whisper-large-v3-turbo";
        }

        ByteArrayResource resource = new ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return safeFilename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);
        body.add("model", model);
        body.add("response_format", "verbose_json");
        if (hasText(safeLanguage)) {
            body.add("language", safeLanguage);
        }
        // profile is accepted for API symmetry with local STT; Groq Whisper has one cloud model.
        if (profile != null) {
            log.debug("Groq Whisper STT profile hint ignored for model selection: {}", profile.name());
        }

        try {
            String responseJson = restClient.post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .header("Authorization", "Bearer " + gatewayProperties.getGroqApiKey().trim())
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseJson == null ? "{}" : responseJson);
            String text = root.path("text").asText("").trim();
            if (text.isBlank()) {
                if ("ja".equalsIgnoreCase(safeLanguage)) {
                    throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No Japanese speech was recognized");
                }
                throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No speech was recognized");
            }

            double duration = root.path("duration").asDouble(0.0);
            String detected = root.path("language").asText(safeLanguage);
            if (!hasText(detected)) {
                detected = safeLanguage;
            }
            return new SttTranscriptionResult(text, duration, detected);

        } catch (VoiceException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            String detail = extractDetail(ex.getResponseBodyAsString(), "Speech transcription failed");
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.SERVICE_UNAVAILABLE;
            }
            log.warn("Groq Whisper HTTP {}: {}", status.value(), detail);
            throw new VoiceException(status, detail, ex);
        } catch (ResourceAccessException ex) {
            log.error("Groq Whisper connection or timeout: {}", ex.getMessage());
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "STT service is unavailable", ex);
        } catch (Exception ex) {
            log.error("Groq Whisper unexpected error: {}", ex.getMessage(), ex);
            throw new VoiceException(HttpStatus.INTERNAL_SERVER_ERROR, "Speech transcription failed", ex);
        }
    }

    private static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return "ja";
        }
        String code = language.trim().toLowerCase();
        // Whisper expects ISO-639-1; map common aliases.
        return switch (code) {
            case "jp", "japanese" -> "ja";
            case "english" -> "en";
            default -> code.length() > 2 ? code.substring(0, 2) : code;
        };
    }

    private String extractDetail(String responseBody, String defaultMsg) {
        if (responseBody == null || responseBody.isBlank()) {
            return defaultMsg;
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("error") && node.get("error").has("message")) {
                return node.get("error").get("message").asText(defaultMsg);
            }
            if (node.has("detail") && !node.get("detail").isNull()) {
                return node.get("detail").asText(defaultMsg);
            }
        } catch (Exception ignored) {
        }
        return defaultMsg;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
