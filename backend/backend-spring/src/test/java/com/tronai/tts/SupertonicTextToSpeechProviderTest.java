package com.tronai.tts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.tronai.language.ExperienceLanguage;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SupertonicTextToSpeechProviderTest {

    private static final byte[] WAV = WavAudioSupport.wrapPcm16LeMono(new byte[]{1, 0, 2, 0}, 44100);
    private final ObjectMapper mapper = new ObjectMapper();
    private final BlockingQueue<JsonNode> requests = new LinkedBlockingQueue<>();
    private final AtomicReference<byte[]> response = new AtomicReference<>(WAV);
    private HttpServer server;
    private SupertonicTextToSpeechProvider provider;

    @BeforeEach
    void startWorkerStub() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/tts", exchange -> {
            try (exchange) {
                requests.add(mapper.readTree(exchange.getRequestBody()));
                byte[] body = response.get();
                if (body == null) {
                    exchange.sendResponseHeaders(503, -1);
                    return;
                }
                exchange.getResponseHeaders().add("Content-Type", "audio/wav");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            }
        });
        server.start();
        provider = new SupertonicTextToSpeechProvider(true, server.getAddress().getPort(), 3);
    }

    @AfterEach
    void stopWorkerStub() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendsTheSameM5VoiceForEnglishAndJapanese() {
        assertThat(provider.synthesize("Hello, I am TRON AI. Welcome.", ExperienceLanguage.EN)).isEqualTo(WAV);
        assertThat(provider.synthesize("私はトロンAIです。生成ＡＩとRAID。", ExperienceLanguage.JA)).isEqualTo(WAV);

        JsonNode english = requests.remove();
        JsonNode japanese = requests.remove();
        for (JsonNode request : new JsonNode[]{english, japanese}) {
            assertThat(request.path("voice").asText()).isEqualTo("M5");
            assertThat(request.path("response_format").asText()).isEqualTo("wav");
        }
        assertThat(english.path("lang").asText()).isEqualTo("en");
        assertThat(english.path("text").asText()).isEqualTo("Hello, I am Tron ay eye. Welcome.");
        assertThat(japanese.path("lang").asText()).isEqualTo("ja");
        assertThat(japanese.path("text").asText()).isEqualTo("私はトロンエーアイです。生成エーアイとRAID。");
    }

    @Test
    void reportsWorkerErrorsAndInvalidAudioForFallback() {
        response.set(null);
        assertThat(assertThrows(VoiceException.class,
                () -> provider.synthesize("Hello", ExperienceLanguage.EN)).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);

        response.set(new byte[]{1, 2, 3});
        assertThat(assertThrows(VoiceException.class,
                () -> provider.synthesize("Hello", ExperienceLanguage.EN)).getStatus())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }
}
