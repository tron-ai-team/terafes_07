package com.tronai.ai.research.search;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Fail-closed daily Serper call counter with a durable ledger.
 * <p>
 * Safety rules:
 * <ul>
 *   <li>Unreadable / corrupt ledger never grants a fresh budget — paid searches stay blocked.</li>
 *   <li>Ledger write failures roll back the in-memory consume and lock the tracker closed.</li>
 *   <li>Relative ledger paths are rejected for paid use (container replacement would reset spend).</li>
 *   <li>Ambiguous timeouts must not refund; callers must keep consumed budget.</li>
 * </ul>
 * Serper remains disabled by default ({@code dailyMaxCalls=0}).
 */
@Component
public class SerperBudgetTracker {

    private static final Logger log = LoggerFactory.getLogger(SerperBudgetTracker.class);

    private final WebSearchProperties properties;
    private final AtomicReference<LocalDate> day = new AtomicReference<>(utcToday());
    private final AtomicInteger used = new AtomicInteger(0);
    private final Path ledgerPath;
    private final boolean durable;
    private final AtomicBoolean failClosed = new AtomicBoolean(false);
    private volatile String failClosedReason = "";

    @Autowired
    public SerperBudgetTracker(WebSearchProperties properties) {
        this(properties, resolveLedgerPath(properties));
    }

    /** Test helper: construct with an explicit ledger path. */
    SerperBudgetTracker(WebSearchProperties properties, Path ledgerPath) {
        this.properties = properties;
        this.ledgerPath = ledgerPath;
        this.durable = ledgerPath != null && ledgerPath.isAbsolute();
        if (ledgerPath != null && ledgerPath.isAbsolute()) {
            loadFromDisk();
        }
        // Relative / missing paths stay non-durable: tryConsume/acceptsPaidSearches refuse
        // without startup WARN spam while Serper remains disabled by default.
    }

    private static Path resolveLedgerPath(WebSearchProperties properties) {
        String configured = properties.getSerper().getBudgetLedgerPath();
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured.trim());
        }
        // Default remains relative for local/dev documentation only — fail-closed until absolute.
        return Path.of("data", "serper-daily-budget.ledger");
    }

    /**
     * Atomically reserve one paid call. Returns false when budget is exhausted, Serper is
     * disabled, the ledger is fail-closed, or persistence cannot be confirmed.
     */
    public synchronized boolean tryConsume() {
        if (failClosed.get()) {
            return false;
        }
        if (!durable || ledgerPath == null || !ledgerPath.isAbsolute()) {
            lockClosed("Serper budget ledger is not a durable absolute path");
            return false;
        }
        if (!rollDayIfNeeded()) {
            return false;
        }
        int max = properties.getSerper().getDailyMaxCalls();
        if (max <= 0) {
            return false;
        }
        if (used.get() >= max) {
            return false;
        }
        used.incrementAndGet();
        if (!persist()) {
            used.updateAndGet(v -> Math.max(0, v - 1));
            lockClosed("Serper budget ledger write failed; blocking further paid searches");
            return false;
        }
        return true;
    }

    /**
     * Refund only when the caller is certain the upstream request was not billed
     * (e.g. rejected credentials before search). Do not call for timeouts or ambiguous failures.
     * Persistence failure fail-closes the tracker.
     */
    public synchronized void releaseUnused() {
        if (failClosed.get()) {
            return;
        }
        if (!rollDayIfNeeded()) {
            return;
        }
        used.updateAndGet(v -> Math.max(0, v - 1));
        if (!persist()) {
            lockClosed("Serper budget ledger write failed during refund; blocking further paid searches");
        }
    }

    public synchronized int remaining() {
        if (failClosed.get()) {
            return 0;
        }
        if (!rollDayIfNeeded()) {
            return 0;
        }
        return Math.max(0, properties.getSerper().getDailyMaxCalls() - used.get());
    }

    public synchronized int usedToday() {
        if (!rollDayIfNeeded() && failClosed.get()) {
            return used.get();
        }
        return used.get();
    }

    public boolean isDurable() {
        return durable && ledgerPath != null && ledgerPath.isAbsolute() && !failClosed.get();
    }

    public boolean isFailClosed() {
        return failClosed.get();
    }

    public String failClosedReason() {
        return failClosedReason == null ? "" : failClosedReason;
    }

    /** True when paid Serper calls may be attempted under current ledger health. */
    public boolean acceptsPaidSearches() {
        return !failClosed.get()
                && durable
                && ledgerPath != null
                && ledgerPath.isAbsolute()
                && properties.getSerper().getDailyMaxCalls() > 0;
    }

    public Path ledgerPath() {
        return ledgerPath;
    }

    private boolean rollDayIfNeeded() {
        if (failClosed.get()) {
            return false;
        }
        LocalDate today = utcToday();
        LocalDate current = day.get();
        if (!today.equals(current)) {
            day.set(today);
            used.set(0);
            if (!persist()) {
                lockClosed("Serper budget ledger write failed while rolling UTC day");
                return false;
            }
        }
        return true;
    }

    private void loadFromDisk() {
        if (!durable || ledgerPath == null) {
            lockClosed("Serper budget ledger path is missing");
            return;
        }
        try {
            if (!Files.exists(ledgerPath)) {
                // First run: create an empty durable ledger at zero so restarts have a file.
                day.set(utcToday());
                used.set(0);
                if (!persist()) {
                    lockClosed("Serper budget ledger could not be created");
                }
                return;
            }
            if (!Files.isRegularFile(ledgerPath) || !Files.isReadable(ledgerPath)) {
                lockClosed("Serper budget ledger exists but is unreadable");
                used.set(Integer.MAX_VALUE / 4);
                return;
            }
            String raw = Files.readString(ledgerPath, StandardCharsets.UTF_8).trim();
            if (raw.isBlank()) {
                lockClosed("Serper budget ledger is empty/corrupt");
                used.set(Integer.MAX_VALUE / 4);
                return;
            }
            // Format: YYYY-MM-DD|used
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) {
                lockClosed("Serper budget ledger format is corrupt");
                used.set(Integer.MAX_VALUE / 4);
                return;
            }
            LocalDate storedDay = LocalDate.parse(parts[0].trim());
            int storedUsed = Integer.parseInt(parts[1].trim());
            if (storedUsed < 0) {
                lockClosed("Serper budget ledger has negative usage");
                used.set(Integer.MAX_VALUE / 4);
                return;
            }
            if (utcToday().equals(storedDay)) {
                day.set(storedDay);
                used.set(storedUsed);
            } else {
                day.set(utcToday());
                used.set(0);
                if (!persist()) {
                    lockClosed("Serper budget ledger write failed while rolling prior day");
                }
            }
        } catch (Exception e) {
            log.warn("Serper budget ledger unreadable; FAIL CLOSED (no fresh budget): {}",
                    e.getClass().getSimpleName());
            used.set(Integer.MAX_VALUE / 4);
            lockClosed("Serper budget ledger unreadable: " + e.getClass().getSimpleName());
        }
    }

    private boolean persist() {
        if (!durable || ledgerPath == null) {
            return false;
        }
        try {
            Path parent = ledgerPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String line = day.get() + "|" + used.get();
            Path tmp = ledgerPath.resolveSibling(ledgerPath.getFileName() + ".tmp");
            Files.writeString(tmp, line, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try {
                Files.move(tmp, ledgerPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException atomicUnsupported) {
                Files.move(tmp, ledgerPath, StandardCopyOption.REPLACE_EXISTING);
            }
            return true;
        } catch (IOException e) {
            log.warn("Serper budget ledger write failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    private void lockClosed(String reason) {
        failClosed.set(true);
        failClosedReason = reason == null ? "fail-closed" : reason;
        log.warn("Serper budget FAIL CLOSED: {}", failClosedReason);
    }

    private static LocalDate utcToday() {
        return LocalDate.now(ZoneOffset.UTC);
    }
}
