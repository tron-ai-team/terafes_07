package com.tronai.desktop.app;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class SingleInstanceManagerTest {

    @Test
    void testSingleInstancePrimaryAndSecondaryBehavior(@TempDir Path tempDir) throws Exception {
        CountDownLatch showRequestedLatch = new CountDownLatch(1);
        AtomicBoolean showTriggered = new AtomicBoolean(false);

        // Primary instance
        try (SingleInstanceManager primary = new SingleInstanceManager(tempDir)) {
            primary.setOnShowRequested(() -> {
                showTriggered.set(true);
                showRequestedLatch.countDown();
            });

            boolean primaryAcquired = primary.acquireOrSignal();
            assertThat(primaryAcquired).isTrue();

            // Secondary instance attempts to acquire on same directory
            try (SingleInstanceManager secondary = new SingleInstanceManager(tempDir)) {
                boolean secondaryAcquired = secondary.acquireOrSignal();
                assertThat(secondaryAcquired).isFalse();
            }

            // Verify that secondary signaled the primary instance
            boolean signaled = showRequestedLatch.await(5, TimeUnit.SECONDS);
            assertThat(signaled).isTrue();
            assertThat(showTriggered.get()).isTrue();
        }

        // After primary closes, a subsequent instance should now succeed
        try (SingleInstanceManager subsequent = new SingleInstanceManager(tempDir)) {
            boolean acquired = subsequent.acquireOrSignal();
            assertThat(acquired).isTrue();
        }
    }
}
