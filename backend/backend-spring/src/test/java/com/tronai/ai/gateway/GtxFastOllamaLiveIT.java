package com.tronai.ai.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.GtxOllamaClient;
import com.tronai.ai.GtxOllamaProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Live check against GTX Ollama via Tailscale Serve HTTPS.
 * Uses {@link GtxOllamaClient} with TLS verification enabled (DNS pin + Host override).
 *
 * <p>When {@code GTX_OLLAMA_LIVE_TAILSCALE=true}, this test <strong>fails</strong> (does not skip)
 * if GTX is unreachable or {@code qwen3:8b} is missing from {@code /api/tags}.
 */
@Tag("live")
class GtxFastOllamaLiveIT {

    @Test
    @DisplayName("Live GTX Tailscale HTTPS: tags has qwen3:8b + Japanese inference")
    void liveGtxFastInference() {
        boolean requireLive = "true".equalsIgnoreCase(
                System.getenv().getOrDefault("GTX_OLLAMA_LIVE_TAILSCALE", "false"));

        String baseUrl = System.getenv().getOrDefault(
                "GTX_OLLAMA_BASE_URL",
                "https://thushan-ai.tail63f4de.ts.net");
        String model = System.getenv().getOrDefault("TRON_AI_GTX_FAST_MODEL", "qwen3:8b");

        GtxOllamaProperties props = new GtxOllamaProperties();
        props.setBaseUrl(baseUrl);
        props.setModel(model);
        props.setTimeoutSeconds(180);
        props.setConnectIp(System.getenv().getOrDefault("GTX_OLLAMA_CONNECT_IP", "100.109.33.81"));
        props.setTlsServerName(System.getenv().getOrDefault(
                "GTX_OLLAMA_TLS_SERVER_NAME", "thushan-ai.tail63f4de.ts.net"));
        props.setOverrideHost(System.getenv().getOrDefault("GTX_OLLAMA_OVERRIDE_HOST", "localhost:11434"));

        GtxOllamaClient client = new GtxOllamaClient(props, new ObjectMapper());

        boolean healthy = client.checkHealth();
        boolean modelPresent = client.isModelAvailable(model);
        if (requireLive) {
            assertThat(healthy)
                    .as("GTX Ollama must be reachable over Tailscale HTTPS at %s (TLS verified)", baseUrl)
                    .isTrue();
            assertThat(modelPresent)
                    .as("Configured FAST model must appear in /api/tags: %s", model)
                    .isTrue();
        } else if (!healthy || !modelPresent) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false,
                    "GTX Ollama not ready at " + baseUrl + " (set GTX_OLLAMA_LIVE_TAILSCALE=true to fail hard)");
        }

        long started = System.nanoTime();
        var result = client.chat(ChatGenerationRequest.builder()
                .model(model)
                .messages(List.of(ChatMessage.builder()
                        .role("user")
                        .content("日本語で一言だけ自己紹介してください。")
                        .build()))
                .temperature(0.2)
                .numPredict(80)
                .build());
        long elapsedMs = (System.nanoTime() - started) / 1_000_000L;

        assertThat(result.getText()).isNotBlank();
        assertThat(result.getText()).matches("(?s).*[\\u3040-\\u30ff\\u4e00-\\u9faf].*");
        assertThat(result.getActualModelId()).isEqualTo(model);

        System.out.println("GTX_LIVE_PASS");
        System.out.println("model=" + model);
        System.out.println("baseUrl=" + baseUrl);
        System.out.println("connectIp=" + props.getConnectIp());
        System.out.println("elapsedMs=" + elapsedMs);
        System.out.println("response=" + result.getText());
    }
}
