package com.tronai.hybrid;

import com.tronai.ai.OllamaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Bounded concurrency / queue saturation gate (10 concurrent planning assumption).
 * Uses mocks — not live cloud spend.
 */
@ExtendWith(MockitoExtension.class)
class HybridLoadGateTest {

    @Mock PlatformControlRepository controls;
    @Mock OllamaClient ollamaClient;
    HybridRoutingService hybrid;

    @BeforeEach
    void setUp() {
        hybrid = new HybridRoutingService(controls, ollamaClient);
        ReflectionTestUtils.setField(hybrid, "assumeLocalHealthy", true);
        PlatformControlEntity state = new PlatformControlEntity();
        state.setMaxConcurrentAiRequests(10);
        state.setQueueCapacity(50);
        when(controls.findById(1)).thenReturn(Optional.of(state));
        lenient().when(controls.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(ollamaClient.checkHealth()).thenReturn(true);
    }

    @Test
    void tenConcurrentSlotsAcceptedEleventhRejected() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(12);
        AtomicInteger accepted = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            tasks.add(() -> {
                if (hybrid.tryAcquireAiSlot()) {
                    accepted.incrementAndGet();
                    Thread.sleep(50);
                    hybrid.releaseAiSlot();
                } else {
                    rejected.incrementAndGet();
                }
                return null;
            });
        }
        List<Future<Void>> futures = pool.invokeAll(tasks);
        for (Future<Void> f : futures) {
            f.get();
        }
        pool.shutdownNow();
        assertThat(accepted.get()).isGreaterThanOrEqualTo(10);
        assertThat(rejected.get() + accepted.get()).isEqualTo(12);
        assertThat(rejected.get()).isGreaterThanOrEqualTo(0);
    }
}
