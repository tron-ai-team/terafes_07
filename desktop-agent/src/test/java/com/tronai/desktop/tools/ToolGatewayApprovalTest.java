package com.tronai.desktop.tools;

import com.tronai.desktop.browser.PlaywrightController;
import com.tronai.desktop.filesystem.FileTools;
import com.tronai.desktop.policy.ApprovalTokens;
import com.tronai.desktop.policy.Fingerprints;
import com.tronai.desktop.process.ProcessRegistry;
import com.tronai.desktop.protocol.ProtocolMessage;
import com.tronai.desktop.terminal.OsProcessRunner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ToolGatewayApprovalTest {

    @Test
    void deleteWaitsForAMatchingApproval(@TempDir Path workspace) throws Exception {
        Path file = workspace.resolve("hello.txt");
        Files.writeString(file, "TRON Desktop Agent works\n");
        ToolGateway gateway = new ToolGateway(new FileTools(1_048_576), new OsProcessRunner(),
                new ProcessRegistry(), new PlaywrightController(), (stream, chunk) -> { });
        String key = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]);
        ProtocolMessage denied = deleteMessage(workspace, file, key, "device-1", false);
        ProtocolMessage.Result blocked = gateway.execute("device-1", key, workspace.toString(), denied);
        assertThat(blocked.isSuccess()).isFalse();
        assertThat(Files.exists(file)).isTrue();

        ProtocolMessage approved = deleteMessage(workspace, file, key, "device-1", true);
        ProtocolMessage.Result deleted = gateway.execute("device-1", key, workspace.toString(), approved);
        assertThat(deleted.isSuccess()).isTrue();
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void gitStatusIsAllowedAndForcePushIsBlocked(@TempDir Path workspace) throws Exception {
        new ProcessBuilder("git", "init").directory(workspace.toFile()).start().waitFor();
        ToolGateway gateway = new ToolGateway(new FileTools(1_048_576), new OsProcessRunner(),
                new ProcessRegistry(), new PlaywrightController(), (stream, chunk) -> { });
        ProtocolMessage status = new ProtocolMessage();
        status.setTaskId("task");
        status.setActionId("action");
        ProtocolMessage.Action action = new ProtocolMessage.Action();
        action.setTool("TERMINAL");
        action.setOperation("RUN");
        action.setWorkingDirectory(workspace.toString());
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setArgv(List.of("git", "status"));
        action.setArguments(args);
        status.setAction(action);
        ProtocolMessage.Result result = gateway.execute("device", "key", workspace.toString(), status);
        assertThat(result.getStdout() + result.getStderr()).containsIgnoringCase("branch").containsIgnoringCase("");

        ProtocolMessage force = new ProtocolMessage();
        ProtocolMessage.Action push = new ProtocolMessage.Action();
        push.setTool("TERMINAL");
        push.setOperation("RUN");
        push.setWorkingDirectory(workspace.toString());
        ProtocolMessage.Arguments pushArgs = new ProtocolMessage.Arguments();
        pushArgs.setArgv(List.of("git", "push", "--force", "origin", "main"));
        push.setArguments(pushArgs);
        force.setAction(push);
        ProtocolMessage.Result blocked = gateway.execute("device", "key", workspace.toString(), force);
        assertThat(blocked.isSuccess()).isFalse();
        assertThat(blocked.getSummary()).containsIgnoringCase("blocked");
    }

    private static ProtocolMessage deleteMessage(Path workspace, Path file, String key, String device, boolean sign) {
        ProtocolMessage message = new ProtocolMessage();
        message.setDeviceId(device);
        message.setTaskId("task-1");
        message.setActionId("action-1");
        ProtocolMessage.Action action = new ProtocolMessage.Action();
        action.setTool("FILE");
        action.setOperation("DELETE_FILE");
        action.setWorkingDirectory(workspace.toString());
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(file.toString());
        action.setArguments(args);
        String fingerprint = Fingerprints.of("FILE", "DELETE_FILE", workspace.toString(), file.toString(), null, null, null, null);
        action.setFingerprint(fingerprint);
        if (sign) {
            String expires = Long.toString(Instant.now().plusSeconds(60).toEpochMilli());
            action.setApprovalId("approval-1");
            action.setApprovalExpiresAt(expires);
            action.setApprovalMac(ApprovalTokens.mac(key, device, "task-1", "action-1", fingerprint, expires));
        }
        message.setAction(action);
        return message;
    }
}
