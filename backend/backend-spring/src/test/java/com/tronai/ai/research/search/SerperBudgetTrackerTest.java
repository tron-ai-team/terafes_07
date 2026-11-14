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

class SerperBudgetTrackerTest {

    @TempDir
    Path tempDir;

    private WebSearchProperties properties;
    private Path ledger;

    @BeforeEach
    void setUp() {
        properties = new WebSearchProperties();
        properties.getSerper().setEnabled(true);
        properties.getSerper().setApiKey("test-key");
        properties.getSerper().setDailyMaxCalls(3);
        ledger = tempDir.resolve("serper.ledger");
        properties.getSerper().setBudgetLedgerPath(ledger.toString());
    }

    @Test
    @DisplayName("Budget survives process restart via durable ledger")
    void survivesRestart() {
        SerperBudgetTracker first = new SerperBudgetTracker(properties, ledger);
        assertThat(first.tryConsume()).isTrue();
        assertThat(first.tryConsume()).isTrue();
        assertThat(first.usedToday()).isEqualTo(2);

        SerperBudgetTracker restarted = new SerperBudgetTracker(properties, ledger);
        assertThat(restarted.usedToday()).isEqualTo(2);
        assertThat(restarted.remaining()).isEqualTo(1);
        assertThat(restarted.tryConsume()).isTrue();
        assertThat(restarted.tryConsume()).isFalse();
    }

    @Test
    @DisplayName("Ambiguous timeout does not refund consumed budget")
    void timeoutKeepsBudget() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger hits = new AtomicInteger();
        server.createContext("/search", exchange -> {
            hits.incrementAndGet();
            // Never respond — client will time out.
            try {
                Thread.sleep(3000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            exchange.sendResponseHeaders(500, -1);
            exchange.close();
        });
        server.start();
        try {
            properties.getSerper().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
            properties.getSerper().setConnectTimeoutMs(200);
            properties.getSerper().setReadTimeoutMs(200);
            properties.getSerper().setDailyMaxCalls(2);

            SerperBudgetTracker budget = new SerperBudgetTracker(properties, ledger);
            SerperSearchClient client = new SerperSearchClient(properties, new ObjectMapper(), budget);

            ProviderSearchOutcome outcome = client.search("q", 3);
            assertThat(outcome.hasHits()).isFalse();
            assertThat(outcome.status()).isIn("timeout", "unavailable");
            assertThat(budget.usedToday()).isEqualTo(1);

            SerperBudgetTracker after = new SerperBudgetTracker(properties, ledger);
            assertThat(after.usedToday()).isEqualTo(1);
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Invalid credentials may refund; ambiguous failures must not")
    void invalidCredentialsRefundOnly() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/search", exchange -> {
            byte[] body = "unauthorized".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(401, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();
        try {
            properties.getSerper().setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
            SerperBudgetTracker budget = new SerperBudgetTracker(properties, ledger);
            SerperSearchClient client = new SerperSearchClient(properties, new ObjectMapper(), budget);
            assertThat(client.search("q", 3).status()).isEqualTo("unavailable");
            assertThat(budget.usedToday()).isZero();
        } finally {
            server.stop(0);
        }
    }
}
