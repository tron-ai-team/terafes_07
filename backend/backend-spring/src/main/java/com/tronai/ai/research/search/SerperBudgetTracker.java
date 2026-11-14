package com.tronai.ai.research.search;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * In-process daily Serper call counter. Hard-stops when the configured daily max is reached.
 */
@Component
public class SerperBudgetTracker {

    private final WebSearchProperties properties;
    private final AtomicReference<LocalDate> day = new AtomicReference<>(utcToday());
    private final AtomicInteger used = new AtomicInteger(0);

    public SerperBudgetTracker(WebSearchProperties properties) {
        this.properties = properties;
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
        return true;
    }

    public synchronized void releaseUnused() {
        rollDayIfNeeded();
        used.updateAndGet(v -> Math.max(0, v - 1));
    }

    public synchronized int remaining() {
        rollDayIfNeeded();
        return Math.max(0, properties.getSerper().getDailyMaxCalls() - used.get());
    }

    public synchronized int usedToday() {
        rollDayIfNeeded();
        return used.get();
    }

    private void rollDayIfNeeded() {
        LocalDate today = utcToday();
        LocalDate current = day.get();
        if (!today.equals(current)) {
            day.set(today);
            used.set(0);
        }
    }

    private static LocalDate utcToday() {
        return LocalDate.now(ZoneOffset.UTC);
    }
}
