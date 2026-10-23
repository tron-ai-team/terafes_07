package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AgentRuntimeOfflineTest {

    @Test
    void testAppOpensWhileCoreOfflineWithoutCrash(@TempDir Path tempDir) throws Exception {
        Path identityFile = tempDir.resolve("identity.json");
        CredentialStore store = new CredentialStore(identityFile);

        // Configure a local unreachable port
        store.loadOrCreate();
        store.putSecret("coreUrl", "ws://127.0.0.1:59999/api/v1/desktop-agent/ws");

        CountDownLatch statusLatch = new CountDownLatch(1);
        AtomicReference<String> lastStatus = new AtomicReference<>();
        AtomicReference<String> lastDetail = new AtomicReference<>();
        List<String> eventLogs = Collections.synchronizedList(new ArrayList<>());

        AgentRuntime runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public void status(String connection, String detail) {
                lastStatus.set(connection);
                lastDetail.set(detail);
                statusLatch.countDown();
            }

            @Override
            public void logEvent(String event) {
                eventLogs.add(event);
            }
        });

        // App should start without throwing fatal crash
        runtime.start();

        // Verify status was dispatched as Offline
        boolean statusReceived = statusLatch.await(6, TimeUnit.SECONDS);
        assertThat(statusReceived).isTrue();
        assertThat(lastStatus.get()).isEqualTo("Offline");
        assertThat(runtime.isConnected()).isFalse();

        // Calling retryNow should not crash
        runtime.retryNow();

        // Verify no secrets or sensitive keys leaked into event logs
        for (String log : eventLogs) {
            assertThat(log).doesNotContain("privateKey");
            assertThat(log).doesNotContain("approvalKey");
            assertThat(log).doesNotContain("credential");
        }

        // Clean shutdown
        runtime.shutdown();
        assertThat(runtime.isConnected()).isFalse();
    }

    @Test
    void testTaskStateAndWaitingUserTransitions(@TempDir Path tempDir) throws Exception {
        Path identityFile = tempDir.resolve("identity.json");
        CredentialStore store = new CredentialStore(identityFile);
        store.loadOrCreate();

        AtomicBoolean waitingReceived = new AtomicBoolean(false);
        AtomicReference<String> currentStatus = new AtomicReference<>("IDLE");

        AgentRuntime runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public void taskUpdated(String taskId, String status, String goal, String controlMode, String step, boolean waitingUser) {
                currentStatus.set(status);
                if (waitingUser) {
                    waitingReceived.set(true);
                }
            }
        });

        // When no task is active, resumeTask must remain IDLE and not create a ghost RUNNING state
        runtime.resumeTask();
        assertThat(runtime.activeTaskStatus()).isEqualTo("IDLE");

        // When a task is active, resumeTask updates state to RUNNING and clears waitingUser
        runtime.setActiveTaskForTesting("task-123", "PAUSED");
        runtime.resumeTask();
        assertThat(runtime.isWaitingUser()).isFalse();
        assertThat(runtime.activeTaskStatus()).isEqualTo("RUNNING");
        assertThat(runtime.activeTaskControlMode()).isEqualTo("AGENT");

        runtime.shutdown();
    }

    @Test
    void testBrowserLinkWorkflowCancellation(@TempDir Path tempDir) throws Exception {
        Path identityFile = tempDir.resolve("identity.json");
        CredentialStore store = new CredentialStore(identityFile);
        store.loadOrCreate();

        AtomicReference<AgentRuntime.PairingUiState> lastState = new AtomicReference<>(AgentRuntime.PairingUiState.UNCONNECTED);

        AgentRuntime runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public void pairingStateChanged(AgentRuntime.PairingUiState state, String code, int expiresInSeconds, String safeDetail) {
                lastState.set(state);
            }
        });

        // Trigger browser link workflow
        runtime.startBrowserLinkFlow();

        // Cancel browser link
        runtime.cancelBrowserLink();

        // Verify pairing state can be queried safely without throwing
        assertThat(runtime.isPaired()).isFalse();
        runtime.shutdown();
    }
}

