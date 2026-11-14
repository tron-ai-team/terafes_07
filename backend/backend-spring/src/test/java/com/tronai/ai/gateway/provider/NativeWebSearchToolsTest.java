package com.tronai.ai.gateway.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.research.search.CloudNativeSearchSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class NativeWebSearchToolsTest {

    private HttpServer server;
    private OpenAiCompatibleClient client;
    private final AtomicReference<String> lastBody = new AtomicReference<>("");

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/chat/completions", exchange -> {
            lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = """
                    {"choices":[{"message":{"content":"ok"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1}}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();
        client = new OpenAiCompatibleClient(new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @Test
    @DisplayName("Tools are omitted when native web search tools list is null")
    void toolsOmittedWhenOff() {
        client.generate(baseUrl(), "key", "openai/gpt-oss-20b",
                List.of(ChatMessage.builder().role("user").content("hi").build()),
                0.2, 64, false, Map.of(), 5, null);
        assertThat(lastBody.get()).doesNotContain("browser_search");
    }

    @Test
    @DisplayName("Groq browser_search tool is attached only for compatible models")
    void groqBrowserToolCompatibleOnly() {
        assertThat(CloudNativeSearchSupport.isGroqBrowserCompatibleModel("openai/gpt-oss-20b")).isTrue();
        assertThat(CloudNativeSearchSupport.isGroqBrowserCompatibleModel("openai/gpt-oss-120b")).isTrue();
        assertThat(CloudNativeSearchSupport.isGroqBrowserCompatibleModel("llama-3.3-70b")).isFalse();

        client.generate(baseUrl(), "k", "openai/gpt-oss-120b",
                List.of(ChatMessage.builder().role("user").content("news").build()),
                0.2, 64, false, Map.of(), 5,
                List.of(Map.of("type", "browser_search")));
        assertThat(lastBody.get()).contains("browser_search");

        AiGatewayProperties props = new AiGatewayProperties();
        props.setGroqApiKey("k");
        GroqGatewayProvider provider = new GroqGatewayProvider(props, client);
        AiRequestContext off = AiRequestContext.builder()
                .mode(AiMode.CLOUD)
                .enableNativeWebSearch(false)
                .messages(List.of(ChatMessage.builder().role("user").content("x").build()))
                .build();
        assertThat(off.isEnableNativeWebSearch()).isFalse();
        assertThat(provider.isConfigured()).isTrue();
    }

    @Test
    @DisplayName("OpenRouter uses openrouter:web_search server tool type")
    void openRouterServerTool() {
        client.generate(baseUrl(), "k", "meta-llama/llama-3.3-70b-instruct",
                List.of(ChatMessage.builder().role("user").content("news").build()),
                0.2, 64, false, Map.of(), 5,
                List.of(Map.of("type", "openrouter:web_search")));
        assertThat(lastBody.get()).contains("openrouter:web_search");
        assertThat(lastBody.get()).doesNotContain("web-search-plugin");
    }
}
