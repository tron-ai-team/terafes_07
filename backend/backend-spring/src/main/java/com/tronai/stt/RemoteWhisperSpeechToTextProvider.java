package com.tronai.stt;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * Local Speech-to-Text via the standalone faster-whisper worker (:8091).
 * Supports profile-aware transcription (FAST vs QUALITY).
 * Not the primary Spring {@link SpeechToTextProvider} bean — see {@link RoutingSpeechToTextProvider}.
 */
@Component
public class RemoteWhisperSpeechToTextProvider {

    private static final Logger log = LoggerFactory.getLogger(RemoteWhisperSpeechToTextProvider.class);
    private static final int MAX_AUDIO_BYTES = 4 * 1024 * 1024;

    private final SttProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public RemoteWhisperSpeechToTextProvider(SttProperties properties) {
        this.properties = properties;
        this.objectMapper = new ObjectMapper();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()));

        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(factory)
                .build();
    }

    public SttTranscriptionResult transcribe(String filename, String contentType, byte[] data, String language) {
        return transcribe(filename, contentType, data, language, AiProfile.FAST);
    }

    public SttTranscriptionResult transcribe(String filename, String contentType, byte[] data, String language, AiProfile profile) {
        if (properties.getBaseUrl() == null || properties.getBaseUrl().isBlank()) {
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "STT service is unavailable");
        }
        if (data == null || data.length == 0) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "The audio file is empty");
        }
        if (data.length > MAX_AUDIO_BYTES) {
            throw new VoiceException(HttpStatus.PAYLOAD_TOO_LARGE, "Audio exceeds the 4MB limit");
        }

        String safeFilename = (filename != null && !filename.isBlank()) ? filename : "audio.wav";
        String safeLanguage = (language != null && !language.isBlank()) ? language : "ja";
        String profileName = (profile != null ? profile : AiProfile.FAST).name();

        ByteArrayResource resource = new ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return safeFilename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);
        body.add("language", safeLanguage);
        body.add("profile", profileName);

        try {
            String responseJson = restClient.post()
                    .uri("/v1/transcribe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            WorkerTranscriptionResponse response = objectMapper.readValue(responseJson, WorkerTranscriptionResponse.class);

            if (response == null || response.getText() == null || response.getText().isBlank()) {
                if ("ja".equalsIgnoreCase(safeLanguage)) {
                    throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No Japanese speech was recognized");
                }
                throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No speech was recognized");
            }

            return new SttTranscriptionResult(response.getText(), response.getDuration(), response.getLanguage());

        } catch (RestClientResponseException ex) {
            String detail = extractDetail(ex.getResponseBodyAsString(), "Speech transcription failed");
            HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.SERVICE_UNAVAILABLE;
            }
            log.warn("STT worker HTTP {}: {}", status, detail);
            throw new VoiceException(status, detail, ex);

        } catch (ResourceAccessException ex) {
            log.error("STT worker connection or timeout error: {}", ex.getMessage());
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "STT service is unavailable", ex);

        } catch (VoiceException ex) {
            throw ex;

        } catch (Exception ex) {
            log.error("STT provider unexpected error: {}", ex.getMessage(), ex);
            throw new VoiceException(HttpStatus.INTERNAL_SERVER_ERROR, "Speech transcription failed", ex);
        }
    }

    public boolean isAvailable() {
        if (properties.getBaseUrl() == null || properties.getBaseUrl().isBlank()) {
            return false;
        }
        try {
            SimpleClientHttpRequestFactory quickFactory = new SimpleClientHttpRequestFactory();
            quickFactory.setConnectTimeout(Duration.ofSeconds(2));
            quickFactory.setReadTimeout(Duration.ofSeconds(2));

            RestClient quickClient = RestClient.builder()
                    .baseUrl(properties.getBaseUrl())
                    .requestFactory(quickFactory)
                    .build();

            String json = quickClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(String.class);

            if (json == null || json.isBlank()) {
                return false;
            }
            JsonNode node = objectMapper.readTree(json);
            return node != null && "ok".equalsIgnoreCase(node.path("status").asText());
        } catch (Exception ex) {
            log.debug("STT health check failed: {}", ex.getMessage());
            return false;
        }
    }

    private String extractDetail(String responseBody, String defaultMsg) {
        if (responseBody == null || responseBody.isBlank()) {
            return defaultMsg;
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            if (node.has("detail") && !node.get("detail").isNull()) {
                return node.get("detail").asText();
            }
        } catch (Exception ignored) {
        }
        return defaultMsg;
    }

    public static class WorkerTranscriptionResponse {
        @JsonProperty("text")
        private String text;

        @JsonProperty("duration")
        private double duration;

        @JsonProperty("language")
        private String language;

        @JsonProperty("profile")
        private String profile;

        @JsonProperty("model_used")
        private String modelUsed;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public double getDuration() {
            return duration;
        }

        public void setDuration(double duration) {
            this.duration = duration;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public String getProfile() {
            return profile;
        }

        public void setProfile(String profile) {
            this.profile = profile;
        }

        public String getModelUsed() {
            return modelUsed;
        }

        public void setModelUsed(String modelUsed) {
            this.modelUsed = modelUsed;
        }
    }
}
