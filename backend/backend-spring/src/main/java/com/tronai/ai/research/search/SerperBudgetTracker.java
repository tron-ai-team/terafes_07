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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Daily Serper call counter with optional durable ledger so restarts do not reset spend.
 * Serper remains disabled by default ({@code dailyMaxCalls=0}); this tracker only matters
 * when the owner explicitly enables Serper with a positive daily max.
 */
@Component
public class SerperBudgetTracker {

    private static final Logger log = LoggerFactory.getLogger(SerperBudgetTracker.class);

    private final WebSearchProperties properties;
    private final AtomicReference<LocalDate> day = new AtomicReference<>(utcToday());
    private final AtomicInteger used = new AtomicInteger(0);
    private final Path ledgerPath;
    private final boolean durable;

    @Autowired
    public SerperBudgetTracker(WebSearchProperties properties) {
        this(properties, resolveLedgerPath(properties));
    }

    /** Test helper: construct with an explicit ledger path. */
    SerperBudgetTracker(WebSearchProperties properties, Path ledgerPath) {
        this.properties = properties;
        this.ledgerPath = ledgerPath;
        this.durable = ledgerPath != null;
        loadFromDisk();
    }

    private static Path resolveLedgerPath(WebSearchProperties properties) {
        String configured = properties.getSerper().getBudgetLedgerPath();
        if (configured != null && !configured.isBlank()) {
            return Path.of(configured.trim());
        }
        return Path.of("data", "serper-daily-budget.ledger");
    }

    public synchronized boolean tryConsume() {
        rollDayIfNeeded();
        int max = properties.getSerper().getDailyMaxCalls();
        if (max <= 0) {
            return false;
        }
        if (used.get() >= max) {
            return false;
        }
        used.incrementAndGet();
        persist();
        return true;
    }

    /**
     * Refund only when the caller is certain the upstream request was not billed
     * (e.g. rejected credentials before search). Do not call for timeouts or ambiguous failures.
     */
    public synchronized void releaseUnused() {
        rollDayIfNeeded();
        used.updateAndGet(v -> Math.max(0, v - 1));
        persist();
    }

    public synchronized int remaining() {
        rollDayIfNeeded();
        return Math.max(0, properties.getSerper().getDailyMaxCalls() - used.get());
    }

    public synchronized int usedToday() {
        rollDayIfNeeded();
        return used.get();
    }

    public boolean isDurable() {
        return durable;
    }

    public Path ledgerPath() {
        return ledgerPath;
    }

    private void rollDayIfNeeded() {
        LocalDate today = utcToday();
        LocalDate current = day.get();
        if (!today.equals(current)) {
            day.set(today);
            used.set(0);
            persist();
        }
    }

    private void loadFromDisk() {
        if (!durable || ledgerPath == null) {
            return;
        }
        try {
            if (!Files.isRegularFile(ledgerPath)) {
                return;
            }
            String raw = Files.readString(ledgerPath, StandardCharsets.UTF_8).trim();
            if (raw.isBlank()) {
                return;
            }
            // Format: YYYY-MM-DD|used
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) {
                return;
            }
            LocalDate storedDay = LocalDate.parse(parts[0].trim());
            int storedUsed = Integer.parseInt(parts[1].trim());
            if (utcToday().equals(storedDay)) {
                day.set(storedDay);
                used.set(Math.max(0, storedUsed));
            } else {
                day.set(utcToday());
                used.set(0);
                persist();
            }
        } catch (Exception e) {
            log.warn("Serper budget ledger unreadable; starting from zero for safety: {}",
                    e.getClass().getSimpleName());
            day.set(utcToday());
            used.set(0);
        }
    }

    private void persist() {
        if (!durable || ledgerPath == null) {
            return;
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
            Files.move(tmp, ledgerPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            // Fall back to non-atomic replace if ATOMIC_MOVE unsupported.
            try {
                Path tmp = ledgerPath.resolveSibling(ledgerPath.getFileName() + ".tmp");
                Files.writeString(tmp, day.get() + "|" + used.get(), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
                Files.move(tmp, ledgerPath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException nested) {
                log.warn("Serper budget ledger write failed: {}", nested.getClass().getSimpleName());
            }
        }
    }

    private static LocalDate utcToday() {
        return LocalDate.now(ZoneOffset.UTC);
    }
}
