package com.tronai.ai.research.search;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class SerperSearchClientTest {

    @TempDir
    Path tempDir;

    private HttpServer server;
    private WebSearchProperties properties;
    private SerperBudgetTracker budget;
    private SerperSearchClient client;
    private final AtomicInteger hits = new AtomicInteger();

    @BeforeEach
    void setUp() throws Exception {
        hits.set(0);
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/search", exchange -> {
            hits.incrementAndGet();
            byte[] body = """
                    {"organic":[{"title":"A","link":"https://a.example","snippet":"s"}]}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();

        properties = new WebSearchProperties();
        properties.getSerper().setEnabled(true);
        properties.getSerper().setApiKey("test-key");
        properties.getSerper().setDailyMaxCalls(2);
        properties.getSerper().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.getSerper().setBudgetLedgerPath(tempDir.resolve("serper.ledger").toString());
        budget = new SerperBudgetTracker(properties, tempDir.resolve("serper.ledger"));
        client = new SerperSearchClient(properties, new ObjectMapper(), budget);
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    @DisplayName("Disabled or zero budget means zero calls")
    void disabledZeroCalls() {
        properties.getSerper().setEnabled(false);
        assertThat(client.search("q", 3).status()).isEqualTo("unavailable");
        assertThat(hits.get()).isZero();

        properties.getSerper().setEnabled(true);
        properties.getSerper().setDailyMaxCalls(0);
        assertThat(client.isConfigured()).isFalse();
        assertThat(client.search("q", 3).hasHits()).isFalse();
        assertThat(hits.get()).isZero();
    }

    @Test
    @DisplayName("Budget exhaustion stops further Serper calls")
    void budgetExhaustion() {
        assertThat(client.search("q1", 3).hasHits()).isTrue();
        assertThat(client.search("q2", 3).hasHits()).isTrue();
        ProviderSearchOutcome blocked = client.search("q3", 3);
        assertThat(blocked.hasHits()).isFalse();
        assertThat(blocked.detail()).containsIgnoringCase("budget");
        assertThat(hits.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("Missing API key is not configured")
    void missingKey() {
        properties.getSerper().setApiKey("");
        assertThat(client.isConfigured()).isFalse();
        assertThat(client.search("q", 3).status()).isEqualTo("unavailable");
        assertThat(hits.get()).isZero();
    }
}
