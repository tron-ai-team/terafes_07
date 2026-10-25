package com.tronai.desktop.app;

import javafx.application.Platform;
import javafx.stage.Stage;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class DesktopVisualReviewTest {

    private static final AtomicBoolean jfxStarted = new AtomicBoolean(false);

    private static void initJavaFX() {
        if (!jfxStarted.getAndSet(true)) {
            try {
                Platform.startup(() -> {});
            } catch (IllegalStateException ignored) {
                // Toolkit already initialized
            }
        }
    }

    @Test
    void captureDesktopVisualStates() throws Exception {
        initJavaFX();

        Path artifactDir = Paths.get("C:\\Users\\engrm\\.gemini\\antigravity-ide\\brain\\b89ef296-62f9-4817-98f7-961d5f13816f");

        CountDownLatch latch = new CountDownLatch(1);

        Platform.runLater(() -> {
            try {
                DesktopAgentApp app = new DesktopAgentApp();
                Stage stage = new Stage();
                app.start(stage);

                // State 1: Unconnected
                app.testSetState(
                        AgentRuntime.PairingUiState.UNCONNECTED,
                        "Offline",
                        null,
                        null,
                        null,
                        null,
                        false,
                        "CLOSED",
                        null,
                        null
                );
                stage.getScene().getRoot().applyCss();
                stage.getScene().getRoot().layout();
                app.captureSnapshot(artifactDir.resolve("desktop_agent_unconnected.png"));

                // State 2: Waiting for browser authorization
                app.testSetState(
                        AgentRuntime.PairingUiState.BROWSER_WAITING,
                        "Offline",
                        null,
                        null,
                        null,
                        null,
                        false,
                        "CLOSED",
                        null,
                        null
                );
                stage.getScene().getRoot().applyCss();
                stage.getScene().getRoot().layout();
                app.captureSnapshot(artifactDir.resolve("desktop_agent_waiting_authorization.png"));

                // State 3: Online (connected)
                app.testSetState(
                        AgentRuntime.PairingUiState.PAIRED,
                        "Connected",
                        null,
                        null,
                        null,
                        null,
                        false,
                        "CLOSED",
                        null,
                        null
                );
                stage.getScene().getRoot().applyCss();
                stage.getScene().getRoot().layout();
                app.captureSnapshot(artifactDir.resolve("desktop_agent_online.png"));

                // State 4: Active task running
                app.testSetState(
                        AgentRuntime.PairingUiState.PAIRED,
                        "Connected",
                        "task-spring-build-492",
                        "RUNNING",
                        "Fix Spring Boot build and Maven dependencies",
                        "Running unit tests in desktop-agent...",
                        false,
                        "AGENT_CONTROLLED",
                        "http://localhost:5174/workspace/agent",
                        "TRON AI Coding Agent"
                );
                stage.getScene().getRoot().applyCss();
                stage.getScene().getRoot().layout();
                app.captureSnapshot(artifactDir.resolve("desktop_agent_active_task.png"));

                stage.close();
                latch.countDown();
            } catch (Exception e) {
                e.printStackTrace();
                latch.countDown();
            }
        });

        boolean completed = latch.await(15, TimeUnit.SECONDS);
        assertThat(completed).isTrue();
    }
}
