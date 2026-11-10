package com.tronai.tts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGatewayProperties;
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

/**
 * Cloud TTS via Groq Orpheus ({@code /openai/v1/audio/speech}).
 * <p>
 * Language support (verified from Groq docs): English and Saudi Arabic only.
 * Japanese is <strong>not</strong> supported — callers must use VOICEVOX or browser speech fallback.
 */
@Component
public class GroqTextToSpeechProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqTextToSpeechProvider.class);
    private static final String BASE_URL = "https://api.groq.com/openai/v1";

    private final GroqTtsProperties properties;
    private final AiGatewayProperties gatewayProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GroqTextToSpeechProvider(GroqTtsProperties properties, AiGatewayProperties gatewayProperties) {
        this.properties = properties;
        this.gatewayProperties = gatewayProperties;
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
        return properties.isEnabled() && hasText(gatewayProperties.getGroqApiKey());
    }

    /**
     * Groq Orpheus currently supports English (and Arabic). Not Japanese or other TRON languages.
     */
    public boolean supports(ExperienceLanguage language) {
        return isConfigured() && language == ExperienceLanguage.EN;
    }

    public byte[] synthesize(String text, ExperienceLanguage language) {
        if (!supports(language)) {
            throw new VoiceException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Groq TTS does not support language '" + (language == null ? "?" : language.code())
                            + "'. Use VOICEVOX for Japanese or browser speech fallback.");
        }
        String spoken = truncateForGroq(text);
        if (spoken.isBlank()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Text to synthesize cannot be empty");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModelEnglish());
        body.put("input", spoken);
        body.put("voice", properties.getVoiceEnglish());
        body.put("response_format", "wav");

        try {
            byte[] audio = restClient.post()
                    .uri("/audio/speech")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + gatewayProperties.getGroqApiKey().trim())
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
            if (audio == null || audio.length == 0) {
                throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Groq TTS returned no audio");
            }
            return audio;
        } catch (VoiceException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            String detail = extractDetail(ex.getResponseBodyAsString(), "Cloud TTS failed");
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.SERVICE_UNAVAILABLE;
            }
            log.warn("Groq TTS HTTP {}: {}", status.value(), detail);
            throw new VoiceException(status, detail, ex);
        } catch (ResourceAccessException ex) {
            log.error("Groq TTS connection or timeout: {}", ex.getMessage());
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Cloud TTS is unavailable", ex);
        } catch (Exception ex) {
            log.error("Groq TTS unexpected error: {}", ex.getMessage(), ex);
            throw new VoiceException(HttpStatus.INTERNAL_SERVER_ERROR, "Cloud TTS failed", ex);
        }
    }

    String truncateForGroq(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.replaceAll("\\s+", " ").trim();
        int max = Math.max(1, properties.getMaxInputChars());
        if (cleaned.length() <= max) {
            return cleaned;
        }
        String truncated = cleaned.substring(0, max);
        int lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > max / 2) {
            truncated = truncated.substring(0, lastSpace);
        }
        return truncated.trim();
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
