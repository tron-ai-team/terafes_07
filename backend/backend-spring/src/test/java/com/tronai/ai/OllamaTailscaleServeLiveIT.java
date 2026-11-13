package com.tronai.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Live Tailscale Serve path: MagicDNS HTTPS + DNS pin + Host: localhost:11434.
 * Skips unless OLLAMA_LIVE_TAILSCALE=true (does not hit production Spring/MySQL).
 */
@Tag("live")
class OllamaTailscaleServeLiveIT {

    @Test
    @DisplayName("Tailscale Serve health + Japanese inference via OllamaClient")
    void liveTailscaleServeJapanese() {
        Assumptions.assumeTrue(
                "true".equalsIgnoreCase(System.getenv().getOrDefault("OLLAMA_LIVE_TAILSCALE", "false")),
                "Set OLLAMA_LIVE_TAILSCALE=true to run");

        String baseUrl = System.getenv().getOrDefault(
                "OLLAMA_BASE_URL",
                "https://nayem-asus-tuf-gaming-a15-fa507nvr-fa507nvr.tail63f4de.ts.net");
        String connectIp = System.getenv().getOrDefault("OLLAMA_CONNECT_IP", "100.95.30.39");
        String model = System.getenv().getOrDefault("TRON_AI_RTX_SMART_MODEL", "qwen3.5:9b-q4_K_M");

        OllamaProperties props = new OllamaProperties();
        props.setBaseUrl(baseUrl);
        props.setConnectIp(connectIp);
        props.setOverrideHost("localhost:11434");
        props.setModel(model);
        props.setTimeoutSeconds(120);

        OllamaClient client = new OllamaClient(props, new ObjectMapper());
        Assumptions.assumeTrue(client.checkHealth(), "Tailscale Serve Ollama not reachable");

        var result = client.chat(ChatGenerationRequest.builder()
                .model(model)
                .messages(List.of(ChatMessage.builder()
                        .role("user")
                        .content("日本語で一言だけ自己紹介してください。")
                        .build()))
                .temperature(0.2)
                .numPredict(64)
                .build());

        assertThat(result.getText()).isNotBlank();
        assertThat(result.getText()).matches("(?s).*[\\u3040-\\u30ff\\u4e00-\\u9faf].*");
        assertThat(result.getActualModelId()).isEqualTo(model);
        System.out.println("Tailscale Serve reply: " + result.getText());
    }
}
