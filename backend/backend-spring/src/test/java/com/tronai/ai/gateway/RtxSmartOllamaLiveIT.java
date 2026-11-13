package com.tronai.ai.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.OllamaClient;
import com.tronai.ai.OllamaProperties;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Optional live check against RTX Ollama via local SSH tunnel (11435) or direct URL.
 * Skips automatically when Ollama is unreachable. Enable with: -Dtest=RtxSmartOllamaLiveIT
 */
@Tag("live")
class RtxSmartOllamaLiveIT {

    @Test
    @DisplayName("Live RTX Ollama returns Japanese for SMART model")
    void liveJapaneseInference() {
        String baseUrl = System.getenv().getOrDefault("OLLAMA_BASE_URL", "http://127.0.0.1:11435");
        String model = System.getenv().getOrDefault("TRON_AI_RTX_SMART_MODEL", "qwen3.5:9b-q4_K_M");

        OllamaProperties props = new OllamaProperties();
        props.setBaseUrl(baseUrl);
        props.setModel(model);
        props.setTimeoutSeconds(120);

        OllamaClient client = new OllamaClient(props, new ObjectMapper());
        Assumptions.assumeTrue(client.checkHealth(), "RTX Ollama not reachable at " + baseUrl);

        var result = client.chat(ChatGenerationRequest.builder()
                .model(model)
                .messages(List.of(ChatMessage.builder()
                        .role("user")
                        .content("日本語で一言だけ自己紹介してください。")
                        .build()))
                .temperature(0.3)
                .numPredict(80)
                .build());

        assertThat(result.getText()).isNotBlank();
        assertThat(result.getText()).matches("(?s).*[\\u3040-\\u30ff\\u4e00-\\u9faf].*");
        System.out.println("RTX live reply (" + model + "): " + result.getText());
    }
}
