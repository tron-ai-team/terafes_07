package com.tronai.ai.research.search;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.EnumSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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
        ledger = tempDir.resolve("serper.ledger").toAbsolutePath();
        properties.getSerper().setBudgetLedgerPath(ledger.toString());
    }

    @Test
    @DisplayName("Budget survives process restart via durable absolute ledger")
    void survivesRestart() {
        SerperBudgetTracker first = new SerperBudgetTracker(properties, ledger);
        assertThat(first.tryConsume()).isTrue();
        assertThat(first.tryConsume()).isTrue();
        assertThat(first.usedToday()).isEqualTo(2);

        SerperBudgetTracker restarted = new SerperBudgetTracker(properties, ledger);
        assertThat(restarted.isFailClosed()).isFalse();
        assertThat(restarted.usedToday()).isEqualTo(2);
        assertThat(restarted.remaining()).isEqualTo(1);
        assertThat(restarted.tryConsume()).isTrue();
        assertThat(restarted.tryConsume()).isFalse();
    }

    @Test
    @DisplayName("Corrupt ledger fail-closes and never grants a fresh budget")
    void corruptLedgerFailClosed() throws Exception {
        Files.writeString(ledger, "not-a-valid-ledger");
        SerperBudgetTracker tracker = new SerperBudgetTracker(properties, ledger);
        assertThat(tracker.isFailClosed()).isTrue();
        assertThat(tracker.tryConsume()).isFalse();
        assertThat(tracker.acceptsPaidSearches()).isFalse();
        assertThat(tracker.remaining()).isZero();
    }

    @Test
    @DisplayName("Unreadable ledger fail-closes without resetting to zero budget")
    void unreadableLedgerFailClosed() throws Exception {
        Files.writeString(ledger, "2026-11-14|2");
        // Best-effort: make unreadable on POSIX; on Windows fall back to deleting after open via corrupt read.
        boolean madeUnreadable = false;
        try {
            Set<PosixFilePermission> perms = EnumSet.noneOf(PosixFilePermission.class);
            Files.setPosixFilePermissions(ledger, perms);
            madeUnreadable = true;
        } catch (UnsupportedOperationException ignored) {
            // Windows: simulate unreadable/corrupt by writing binary garbage after creating tracker path.
            Files.write(ledger, new byte[] {(byte) 0xFF, (byte) 0xFE, 0x00});
        }
        SerperBudgetTracker tracker = new SerperBudgetTracker(properties, ledger);
        assertThat(tracker.isFailClosed()).isTrue();
        assertThat(tracker.tryConsume()).isFalse();
        if (madeUnreadable) {
            try {
                Files.setPosixFilePermissions(ledger, EnumSet.of(
                        PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            } catch (Exception ignored) {
                // cleanup best-effort
            }
        }
    }

    @Test
    @DisplayName("Relative ledger path is rejected for paid searches")
    void relativePathRejected() {
        Path relative = Path.of("data", "serper-relative.ledger");
        properties.getSerper().setBudgetLedgerPath(relative.toString());
        assertThat(properties.getSerper().isReady()).isFalse();

        SerperBudgetTracker tracker = new SerperBudgetTracker(properties, relative);
        assertThat(tracker.isDurable()).isFalse();
        assertThat(tracker.acceptsPaidSearches()).isFalse();
        assertThat(tracker.tryConsume()).isFalse();
    }

    @Test
    @DisplayName("Ledger write failure blocks new paid searches")
    void writeFailureBlocksPaidSearches() throws Exception {
        Path blockedDir = tempDir.resolve("blocked").toAbsolutePath();
        Files.createDirectories(blockedDir);
        Path blockedLedger = blockedDir.resolve("serper.ledger");
        // Create a healthy tracker first, then replace parent with a non-directory file to break writes.
        SerperBudgetTracker tracker = new SerperBudgetTracker(properties, blockedLedger);
        assertThat(tracker.tryConsume()).isTrue();

        // Make parent unwritable by replacing the directory with a file (cross-platform).
        // Delete ledger and dir, create a file where the directory was so createDirectories/write fails.
        Files.deleteIfExists(blockedLedger);
        // Keep tracker pointing at a path whose parent becomes a file:
        Path parentAsFile = tempDir.resolve("not-a-dir").toAbsolutePath();
        Files.writeString(parentAsFile, "x");
        Path impossible = parentAsFile.resolve("serper.ledger");
        SerperBudgetTracker broken = new SerperBudgetTracker(properties, impossible);
        assertThat(broken.isFailClosed()).isTrue();
        assertThat(broken.tryConsume()).isFalse();
    }

    @Test
    @DisplayName("Concurrent tryConsume never exceeds daily max")
    void concurrentConsumeRespectsMax() throws Exception {
        properties.getSerper().setDailyMaxCalls(5);
        SerperBudgetTracker tracker = new SerperBudgetTracker(properties, ledger);
        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger successes = new AtomicInteger();
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    if (tracker.tryConsume()) {
                        successes.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertThat(done.await(10, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();
        assertThat(successes.get()).isEqualTo(5);
        assertThat(tracker.usedToday()).isEqualTo(5);
        assertThat(tracker.tryConsume()).isFalse();
    }

    @Test
    @DisplayName("Ambiguous timeout does not refund consumed budget")
    void timeoutKeepsBudget() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/search", exchange -> {
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

    @Test
    @DisplayName("Absolute ledger + key + max makes Serper ready; relative does not")
    void readyRequiresAbsoluteLedger() {
        assertThat(properties.getSerper().isReady()).isTrue();
        properties.getSerper().setBudgetLedgerPath("data/relative.ledger");
        assertThat(properties.getSerper().isReady()).isFalse();
    }
}
