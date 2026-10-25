package com.tronai.desktop.terminal;

import com.tronai.desktop.process.ProcessRegistry;
import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class TerminalAndProcessTest {

    @Test
    void runsARealCommandAndTimesOut(@TempDir Path workspace) throws Exception {
        OsProcessRunner runner = new OsProcessRunner();
        List<String> version = runner.windows() ? List.of("cmd") : List.of("echo", "tron");
        if (runner.windows()) {
            ProtocolMessage.Result blockedShell = runner.run(List.of("where", "git"), workspace, 15000, null);
            assertThat(blockedShell.getStdout() + blockedShell.getStderr()).isNotBlank();
        } else {
            ProtocolMessage.Result echo = runner.run(version, workspace, 15000, null);
            assertThat(echo.isSuccess()).isTrue();
            assertThat(echo.getStdout()).contains("tron");
        }

        List<String> slow = runner.windows()
                ? List.of("ping", "127.0.0.1", "-n", "8")
                : List.of("sleep", "5");
        ProtocolMessage.Result timedOut = runner.run(slow, workspace, 800, null);
        assertThat(timedOut.isSuccess()).isFalse();
        assertThat(timedOut.getTimedOut()).isTrue();
    }

    @Test
    void onlyOwnedProcessesCanBeStopped(@TempDir Path workspace) throws Exception {
        OsProcessRunner runner = new OsProcessRunner();
        ProcessRegistry registry = new ProcessRegistry();
        List<String> argv = runner.windows()
                ? List.of("ping", "127.0.0.1", "-n", "6")
                : List.of("sleep", "4");
        OsProcessRunner.Owned owned = runner.startDetached(argv, workspace, "task-1");
        registry.track(owned);
        AtomicBoolean foreign = new AtomicBoolean(registry.stop(owned.process().pid(), "other-task"));
        assertThat(foreign.get()).isFalse();
        assertThat(owned.process().isAlive()).isTrue();
        assertThat(registry.stop(owned.process().pid(), "task-1")).isTrue();
        owned.process().waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
        assertThat(owned.process().isAlive()).isFalse();
    }
}
