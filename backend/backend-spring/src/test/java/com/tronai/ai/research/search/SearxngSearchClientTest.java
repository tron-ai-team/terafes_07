package com.tronai.ai.research.search;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class SearxngSearchClientTest {

    private HttpServer server;
    private WebSearchProperties properties;
    private SearxngSearchClient client;
    private final AtomicInteger hits = new AtomicInteger();
    private final AtomicReference<String> lastQuery = new AtomicReference<>("");

    @BeforeEach
    void setUp() throws Exception {
        hits.set(0);
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/search", exchange -> {
            hits.incrementAndGet();
            lastQuery.set(exchange.getRequestURI().getRawQuery());
            String pathQuery = exchange.getRequestURI().getRawQuery();
            byte[] body;
            int code;
            if (pathQuery != null && pathQuery.contains("force403=1")) {
                code = 403;
                body = "Forbidden".getBytes(StandardCharsets.UTF_8);
            } else {
                code = 200;
                body = """
                        {"results":[
                          {"title":"Example","url":"https://example.org/a","content":"Hello","engine":"google"},
                          {"title":"Bad","url":"file:///etc/passwd","content":"nope","engine":"google"}
                        ]}
                        """.getBytes(StandardCharsets.UTF_8);
            }
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(code, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();

        properties = new WebSearchProperties();
        properties.getSearxng().setEnabled(true);
        properties.getSearxng().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.getSearxng().setConnectTimeoutMs(1000);
        properties.getSearxng().setReadTimeoutMs(2000);
        client = new SearxngSearchClient(properties, new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    @DisplayName("Parses JSON results and requests format=json")
    void parsesJsonResults() {
        ProviderSearchOutcome out = client.search("tron ai", "en", 5);
        assertThat(out.hasHits()).isTrue();
        assertThat(out.results()).hasSize(1);
        assertThat(out.results().get(0).url()).isEqualTo("https://example.org/a");
        assertThat(out.provider()).isEqualTo("SEARXNG");
        assertThat(lastQuery.get()).contains("format=json");
        assertThat(lastQuery.get()).contains("q=");
    }

    @Test
    @DisplayName("HTTP 403 JSON-disabled returns unavailable with guidance")
    void jsonDisabled403() {
        // Force 403 by temporarily pointing at a dedicated path handler
        server.createContext("/blocked/search", exchange -> {
            byte[] body = "Forbidden".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(403, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        properties.getSearxng().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/blocked");
        ProviderSearchOutcome out = client.search("q", "en", 3);
        assertThat(out.status()).isEqualTo("unavailable");
        assertThat(out.detail()).containsIgnoringCase("JSON");
        assertThat(out.hasHits()).isFalse();
    }

    @Test
    @DisplayName("Disabled client never calls network")
    void disabledNoNetwork() {
        int before = hits.get();
        properties.getSearxng().setEnabled(false);
        ProviderSearchOutcome out = client.search("q", "en", 3);
        assertThat(out.status()).isEqualTo("unavailable");
        assertThat(hits.get()).isEqualTo(before);
    }
}
