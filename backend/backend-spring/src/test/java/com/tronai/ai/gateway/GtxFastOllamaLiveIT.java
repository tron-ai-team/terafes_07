package com.tronai.ai.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.GtxOllamaClient;
import com.tronai.ai.GtxOllamaProperties;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Optional live check against GTX Ollama via Tailscale Serve or direct URL.
 * Skips automatically when Ollama is unreachable.
 * Enable with: -Dtest=GtxFastOllamaLiveIT and optional GTX_OLLAMA_LIVE_TAILSCALE=true.
 */
@Tag("live")
class GtxFastOllamaLiveIT {

    @Test
    @DisplayName("Live GTX Ollama returns text for FAST model qwen3:8b")
    void liveGtxFastInference() {
        boolean forceTailscale = "true".equalsIgnoreCase(
                System.getenv().getOrDefault("GTX_OLLAMA_LIVE_TAILSCALE", "false"));

        String baseUrl = System.getenv().getOrDefault(
                "GTX_OLLAMA_BASE_URL",
                forceTailscale
                        ? "https://thushan-ai.tail63f4de.ts.net"
                        : "http://127.0.0.1:11434");
        String model = System.getenv().getOrDefault("TRON_AI_GTX_FAST_MODEL", "qwen3:8b");

        GtxOllamaProperties props = new GtxOllamaProperties();
        props.setBaseUrl(baseUrl);
        props.setModel(model);
        props.setTimeoutSeconds(120);
        if (forceTailscale || baseUrl.startsWith("https://")) {
            props.setConnectIp(System.getenv().getOrDefault("GTX_OLLAMA_CONNECT_IP", "100.109.33.81"));
            props.setTlsServerName(System.getenv().getOrDefault(
                    "GTX_OLLAMA_TLS_SERVER_NAME", "thushan-ai.tail63f4de.ts.net"));
            props.setOverrideHost(System.getenv().getOrDefault("GTX_OLLAMA_OVERRIDE_HOST", "localhost:11434"));
        }

        GtxOllamaClient client = new GtxOllamaClient(props, new ObjectMapper());
        Assumptions.assumeTrue(client.checkHealth(), "GTX Ollama not reachable at " + baseUrl);

        var result = client.chat(ChatGenerationRequest.builder()
                .model(model)
                .messages(List.of(ChatMessage.builder()
                        .role("user")
                        .content("Reply with exactly: GTX_OK")
                        .build()))
                .temperature(0.1)
                .numPredict(32)
                .build());

        assertThat(result.getText()).isNotBlank();
        assertThat(result.getActualModelId()).isEqualTo(model);
        System.out.println("GTX live reply (" + model + "): " + result.getText());
    }
}
