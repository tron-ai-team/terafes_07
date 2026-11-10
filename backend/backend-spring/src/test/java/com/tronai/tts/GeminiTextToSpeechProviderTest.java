package com.tronai.tts;

import com.sun.net.httpserver.HttpServer;
import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiTextToSpeechProviderTest {

    private HttpServer server;
    private GeminiTtsProperties properties;
    private GeminiTextToSpeechProvider provider;
    private final AtomicReference<String> lastRequestBody = new AtomicReference<>("");

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/v1beta/interactions", exchange -> {
            lastRequestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] pcm = new byte[4800];
            for (int i = 0; i < pcm.length; i += 2) {
                short sample = (short) ((i * 17) % 2000);
                pcm[i] = (byte) (sample & 0xFF);
                pcm[i + 1] = (byte) ((sample >> 8) & 0xFF);
            }
            String chunk = Base64.getEncoder().encodeToString(pcm);
            String sse = "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"audio\",\"data\":\""
                    + chunk + "\"}}\n\n"
                    + "data: {\"event_type\":\"interaction.completed\",\"interaction\":{\"status\":\"completed\"}}\n\n";
            byte[] body = sse.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();

        properties = new GeminiTtsProperties();
        properties.setEnabled(true);
        properties.setApiKey("test-key");
        properties.setEndpoint("http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/interactions");
        properties.setModel("gemini-3.8-flash-lite-tts");
        properties.setVoice("Algenib");
        properties.setStyle(GeminiTtsProperties.APPROVED_ROBOTIC_STYLE);
        properties.setSampleRate(24000);
        properties.setStream(true);
        properties.setTimeoutSeconds(10);
        properties.setFailureCooldownSeconds(0);
        provider = new GeminiTextToSpeechProvider(properties);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Without API key Gemini is not configured")
    void notConfiguredWithoutKey() {
        properties.setApiKey("");
        GeminiTextToSpeechProvider bare = new GeminiTextToSpeechProvider(properties);
        assertThat(bare.isConfigured()).isFalse();
        assertThat(bare.supports(ExperienceLanguage.EN)).isFalse();
    }

    @Test
    @DisplayName("With key Gemini supports English and Japanese Algenib")
    void supportsEnglishAndJapanese() {
        assertThat(provider.isConfigured()).isTrue();
        assertThat(provider.supports(ExperienceLanguage.EN)).isTrue();
        assertThat(provider.supports(ExperienceLanguage.JA)).isTrue();
        assertThat(provider.supports(ExperienceLanguage.SI)).isFalse();
    }

    @Test
    @DisplayName("English synthesis returns RIFF WAV and uses approved Algenib robotic settings")
    void englishSynthesisReturnsWav() {
        byte[] wav = provider.synthesize("Hello, I am TRON AI.", ExperienceLanguage.EN);
        assertThat(WavAudioSupport.isRiffWav(wav)).isTrue();
        assertThat(wav.length).isGreaterThan(44);
        String body = lastRequestBody.get();
        assertThat(body).contains("\"voice\":\"Algenib\"");
        assertThat(body).contains("gemini-3.8-flash-lite-tts");
        assertThat(body).contains("speech_metadata");
        assertThat(body).contains("synthetic resonance");
        assertThat(body).contains("\"stream\":true");
        assertThat(body).contains("audio/l16");
    }

    @Test
    @DisplayName("Japanese synthesis returns RIFF WAV")
    void japaneseSynthesisReturnsWav() {
        byte[] wav = provider.synthesize("こんにちは。私はトロンAIです。", ExperienceLanguage.JA);
        assertThat(WavAudioSupport.isRiffWav(wav)).isTrue();
        assertThat(lastRequestBody.get()).contains("Algenib");
    }

    @Test
    @DisplayName("HTTP errors map to VoiceException")
    void httpErrorHandling() {
        server.removeContext("/v1beta/interactions");
        server.createContext("/v1beta/interactions", exchange -> {
            byte[] err = "{\"error\":{\"message\":\"quota exceeded\"}}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(429, err.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(err);
            }
        });
        assertThatThrownBy(() -> provider.synthesize("Hello", ExperienceLanguage.EN))
                .isInstanceOf(VoiceException.class)
                .hasMessageContaining("quota exceeded");
    }

    @Test
    @DisplayName("Oversize text fails loudly instead of truncating")
    void oversizeTextRejected() {
        properties.setMaxInputChars(8);
        assertThatThrownBy(() -> provider.normalize("this is definitely too long"))
                .isInstanceOf(VoiceException.class)
                .hasMessageContaining("exceeds Gemini max length");
    }

    @Test
    @DisplayName("Approved robotic style constant matches audition samples")
    void approvedStyleConstant() {
        assertThat(GeminiTtsProperties.APPROVED_ROBOTIC_STYLE)
                .isEqualTo("Low, resonant pitch; calm cinematic AI with subtle synthetic resonance, "
                        + "crisp diction and natural conversational pacing.");
        assertThat(properties.getVoice()).isEqualTo("Algenib");
        assertThat(properties.getModel()).isEqualTo("gemini-3.8-flash-lite-tts");
    }
}
