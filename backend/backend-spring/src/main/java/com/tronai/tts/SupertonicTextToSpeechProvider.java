package com.tronai.tts;

import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

/** Local Supertonic 3 M5 synthesis. Both languages use the same voice preset. */
@Component
public class SupertonicTextToSpeechProvider {

    static final String ID = "supertonic-m5";
    private static final MediaType WAV = MediaType.parseMediaType("audio/wav");
    private static final int MAX_INPUT_CHARS = 600;
    private static final Pattern ENGLISH_BRAND =
            Pattern.compile("(?i)\\bTRON\\s+AI\\b");
    private static final Pattern JAPANESE_AI =
            Pattern.compile("(?<![A-Za-z0-9_Ａ-Ｚａ-ｚ０-９])[AaＡａ][IiＩｉ](?![A-Za-z0-9_Ａ-Ｚａ-ｚ０-９])");

    private final boolean enabled;
    private final RestClient client;

    public SupertonicTextToSpeechProvider(
            @Value("${tts.supertonic.enabled:false}") boolean enabled,
            @Value("${tts.supertonic.port:7788}") int port,
            @Value("${tts.supertonic.timeout-seconds:15}") int timeoutSeconds) {
        this.enabled = enabled;
        if (!enabled) {
            this.client = null;
            return;
        }
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(1));
        factory.setReadTimeout(Duration.ofSeconds(Math.max(1, timeoutSeconds)));
        this.client = RestClient.builder()
                .baseUrl("http://127.0.0.1:" + port)
                .requestFactory(factory)
                .build();
    }

    public boolean supports(ExperienceLanguage language) {
        return enabled && (language == ExperienceLanguage.EN || language == ExperienceLanguage.JA);
    }

    public byte[] synthesize(String text, ExperienceLanguage language) {
        if (!supports(language)) {
            throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "Supertonic M5 is not enabled for this language");
        }
        if (text == null || text.isBlank()) {
            throw new VoiceException(HttpStatus.BAD_REQUEST, "Text to synthesize cannot be empty");
        }
        if (text.length() > MAX_INPUT_CHARS) {
            throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Supertonic M5 accepts up to " + MAX_INPUT_CHARS + " characters per request");
        }

        // Normalize speech only. The displayed reply keeps its original spelling.
        String spoken = language == ExperienceLanguage.JA
                ? JAPANESE_AI.matcher(text).replaceAll("エーアイ")
                : ENGLISH_BRAND.matcher(text).replaceAll("Tron ay eye");
        byte[] audio;
        try {
            audio = client.post()
                    .uri("/v1/tts")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(WAV)
                    .body(Map.of("text", spoken, "voice", "M5", "lang", language.code(),
                            "response_format", "wav", "speed", 1.0, "steps", 8))
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientException failure) {
            throw new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "Local Supertonic M5 is unavailable", failure);
        }
        if (!WavAudioSupport.isRiffWav(audio) || audio.length <= 44) {
            throw new VoiceException(HttpStatus.BAD_GATEWAY, "Local Supertonic M5 returned no playable WAV");
        }
        return audio;
    }
}
