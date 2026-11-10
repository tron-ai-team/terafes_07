package com.tronai.tts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Primary TRON AI TTS: Google Gemini Interactions API with approved Algenib robotic style.
 * <p>
 * Reuses the exact audition settings from {@code voice-samples/gemini-tests}:
 * model {@code gemini-3.8-flash-lite-tts}, voice {@code Algenib}, 24 kHz L16 PCM over SSE,
 * speech_metadata style annotation (no post-synthesis metallic DSP).
 */
@Component
public class GeminiTextToSpeechProvider {

    public static final String ID = "gemini-algenib";

    private static final Logger log = LoggerFactory.getLogger(GeminiTextToSpeechProvider.class);
    private static final String DEFAULT_ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/interactions";
    private static final Set<ExperienceLanguage> SUPPORTED = Set.of(
            ExperienceLanguage.EN, ExperienceLanguage.JA);

    private final GeminiTtsProperties properties;
    private final ObjectMapper objectMapper;
    private final AtomicLong cooldownUntilMs = new AtomicLong(0L);

    public GeminiTextToSpeechProvider(GeminiTtsProperties properties) {
        this.properties = properties;
        this.objectMapper = new ObjectMapper();
    }

    public boolean isConfigured() {
        return properties.isEnabled() && hasText(properties.getApiKey())
                && hasText(properties.getModel()) && hasText(properties.getVoice());
    }

    public boolean supports(ExperienceLanguage language) {
        return isConfigured()
                && language != null
                && SUPPORTED.contains(language)
                && !isCoolingDown();
    }

    public boolean isCoolingDown() {
        return System.currentTimeMillis() < cooldownUntilMs.get();
    }

    public byte[] synthesize(String text, ExperienceLanguage language) {
        if (!isConfigured() || language == null || !SUPPORTED.contains(language)) {
            throw new VoiceException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Gemini Algenib TTS is not configured or does not support language '"
                            + (language == null ? "?" : language.code()) + "'");
        }
        if (isCoolingDown()) {
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini Algenib TTS is temporarily skipped after a recent failure");
        }

        String spoken = normalize(text);
        if (spoken.isBlank()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Text to synthesize cannot be empty");
        }

        long started = System.nanoTime();
        try {
            byte[] wav = synthesizeStreaming(spoken);
            long totalMs = (System.nanoTime() - started) / 1_000_000L;
            log.info("Gemini Algenib TTS ok lang={} bytes={} totalMs={}",
                    language.code(), wav.length, totalMs);
            return wav;
        } catch (VoiceException ex) {
            markFailure();
            throw ex;
        } catch (Exception ex) {
            markFailure();
            log.warn("Gemini Algenib TTS failed: {}", ex.getMessage());
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini Algenib TTS is unavailable", ex);
        }
    }

    private byte[] synthesizeStreaming(String spoken) throws IOException {
        Map<String, Object> textPart = new LinkedHashMap<>();
        textPart.put("type", "text");
        textPart.put("text", spoken);
        String style = properties.getStyle() == null || properties.getStyle().isBlank()
                ? GeminiTtsProperties.APPROVED_ROBOTIC_STYLE
                : properties.getStyle().trim();
        List<Map<String, Object>> annotations = new ArrayList<>();
        Map<String, Object> styleAnnotation = new LinkedHashMap<>();
        styleAnnotation.put("type", "speech_metadata");
        styleAnnotation.put("style", style);
        annotations.add(styleAnnotation);
        textPart.put("annotations", annotations);

        Map<String, Object> userInput = new LinkedHashMap<>();
        userInput.put("type", "user_input");
        userInput.put("content", List.of(textPart));

        Map<String, Object> responseFormat = new LinkedHashMap<>();
        responseFormat.put("type", "audio");
        responseFormat.put("mime_type", "audio/l16");
        responseFormat.put("sample_rate", Math.max(8000, properties.getSampleRate()));

        Map<String, Object> speechConfig = new LinkedHashMap<>();
        speechConfig.put("voice", properties.getVoice().trim());

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("speech_config", List.of(speechConfig));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel().trim());
        body.put("input", List.of(userInput));
        body.put("response_format", responseFormat);
        body.put("generation_config", generationConfig);
        body.put("stream", properties.isStream());
        body.put("store", false);

        byte[] payload = objectMapper.writeValueAsBytes(body);
        String endpoint = hasText(properties.getEndpoint()) ? properties.getEndpoint().trim() : DEFAULT_ENDPOINT;
        URL url = URI.create(endpoint).toURL();
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setUseCaches(false);
        connection.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        connection.setReadTimeout((int) Duration.ofSeconds(Math.max(5, properties.getTimeoutSeconds())).toMillis());
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "text/event-stream");
        connection.setRequestProperty("x-goog-api-key", properties.getApiKey().trim());
        connection.setRequestProperty("Connection", "keep-alive");

        try (OutputStream out = connection.getOutputStream()) {
            out.write(payload);
        }

        int status = connection.getResponseCode();
        InputStream raw = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        if (raw == null) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY, "Gemini TTS returned empty response body");
        }

        if (status != 200) {
            String errBody = readLimited(raw, 65536);
            throw new VoiceException(resolveStatus(status), extractErrorMessage(errBody));
        }

        String contentType = connection.getContentType() == null ? "" : connection.getContentType();
        if (!contentType.contains("text/event-stream") && properties.isStream()) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY, "Gemini TTS did not return an SSE stream");
        }

        byte[] pcm = readPcmFromSse(raw);
        int sampleRate = Math.max(8000, properties.getSampleRate());
        // Require at least ~50 ms of 16-bit mono PCM (short spoken replies are valid).
        int minBytes = Math.max(2, (sampleRate / 20) * 2);
        if (pcm.length < minBytes) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY, "Gemini TTS returned insufficient PCM audio");
        }
        if (pcm.length % 2 != 0) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY, "Gemini TTS returned misaligned PCM audio");
        }
        return WavAudioSupport.wrapPcm16LeMono(pcm, sampleRate);
    }

    private byte[] readPcmFromSse(InputStream raw) throws IOException {
        ByteAccumulator audio = new ByteAccumulator();
        Long firstAudioAt = null;
        boolean completed = false;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(raw, StandardCharsets.UTF_8))) {
            StringBuilder data = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isEmpty()) {
                    if (data.length() == 0) {
                        continue;
                    }
                    String event = data.toString();
                    data.setLength(0);
                    if ("[DONE]".equals(event)) {
                        continue;
                    }
                    JsonNode payload = objectMapper.readTree(event);
                    String kind = textOrEmpty(payload, "event_type");
                    if ("error".equals(kind) || "interaction.failed".equals(kind)
                            || "interaction.incomplete".equals(kind) || payload.has("error")) {
                        throw new VoiceException(HttpStatus.BAD_GATEWAY,
                                "Gemini TTS stream failed: " + kind);
                    }
                    JsonNode delta = payload.get("delta");
                    if ("step.delta".equals(kind) && delta != null
                            && "audio".equals(textOrEmpty(delta, "type"))
                            && delta.hasNonNull("data")) {
                        byte[] chunk = Base64.getDecoder().decode(delta.get("data").asText());
                        if (chunk.length > 0) {
                            if (firstAudioAt == null) {
                                firstAudioAt = System.nanoTime();
                            }
                            audio.write(chunk);
                        }
                    }
                    if ("interaction.completed".equals(kind)) {
                        JsonNode interaction = payload.get("interaction");
                        String status = interaction == null ? "completed"
                                : textOrEmpty(interaction, "status");
                        if (!status.isBlank() && !"completed".equals(status)) {
                            throw new VoiceException(HttpStatus.BAD_GATEWAY,
                                    "Gemini TTS interaction status=" + status);
                        }
                        completed = true;
                    }
                } else if (line.startsWith("data:")) {
                    if (data.length() > 0) {
                        data.append('\n');
                    }
                    data.append(line.substring(5).stripLeading());
                }
            }
        }
        if (!completed || audio.size() == 0) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY,
                    "Gemini TTS stream ended without completed audio");
        }
        if (firstAudioAt != null) {
            log.debug("Gemini Algenib first audio chunk received");
        }
        return audio.toByteArray();
    }

    private void markFailure() {
        int cooldownSec = Math.max(0, properties.getFailureCooldownSeconds());
        if (cooldownSec > 0) {
            cooldownUntilMs.set(System.currentTimeMillis() + cooldownSec * 1000L);
            log.warn("Gemini Algenib TTS cooldown active for {}s", cooldownSec);
        }
    }

    String normalize(String text) {
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
                "Text to synthesize exceeds Gemini max length (" + max + " chars). "
                        + "Split the reply instead of truncating spoken content.");
    }

    private String extractErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "Gemini TTS request failed";
        }
        try {
            JsonNode node = objectMapper.readTree(responseBody);
            JsonNode error = node.get("error");
            if (error != null && error.has("message")) {
                return error.get("message").asText("Gemini TTS request failed");
            }
            if (node.has("message")) {
                return node.get("message").asText("Gemini TTS request failed");
            }
        } catch (Exception ignored) {
        }
        return "Gemini TTS request failed";
    }

    private static HttpStatus resolveStatus(int status) {
        HttpStatus resolved = HttpStatus.resolve(status);
        return resolved != null ? resolved : HttpStatus.SERVICE_UNAVAILABLE;
    }

    private static String readLimited(InputStream in, int limit) throws IOException {
        byte[] buf = in.readNBytes(Math.max(1, limit));
        return new String(buf, StandardCharsets.UTF_8);
    }

    private static String textOrEmpty(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return "";
        }
        return node.get(field).asText("");
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /** Small growable byte buffer to avoid ByteArrayOutputStream sync overhead. */
    private static final class ByteAccumulator {
        private byte[] buf = new byte[8192];
        private int size;

        void write(byte[] chunk) {
            ensure(size + chunk.length);
            System.arraycopy(chunk, 0, buf, size, chunk.length);
            size += chunk.length;
        }

        int size() {
            return size;
        }

        byte[] toByteArray() {
            byte[] out = new byte[size];
            System.arraycopy(buf, 0, out, 0, size);
            return out;
        }

        private void ensure(int needed) {
            if (needed <= buf.length) {
                return;
            }
            int next = buf.length;
            while (next < needed) {
                next *= 2;
            }
            byte[] grown = new byte[next];
            System.arraycopy(buf, 0, grown, 0, size);
            buf = grown;
        }
    }
}
