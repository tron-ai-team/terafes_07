package com.tronai.desktop.filesystem;

import com.tronai.desktop.policy.WorkspaceGuard;
import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileToolsTest {

    private final FileTools files = new FileTools(1_048_576);

    @Test
    void createsReadsAndEditsARealFile(@TempDir Path workspace) throws Exception {
        ProtocolMessage.Arguments create = new ProtocolMessage.Arguments();
        create.setPath(workspace.resolve("hello.txt").toString());
        create.setContent("TRON Desktop Agent works\n");
        ProtocolMessage.Result created = files.execute("CREATE_FILE", workspace.toString(), create);
        assertThat(created.isSuccess()).isTrue();
        assertThat(Files.readString(workspace.resolve("hello.txt"))).isEqualTo("TRON Desktop Agent works\n");

        ProtocolMessage.Arguments edit = new ProtocolMessage.Arguments();
        edit.setPath(workspace.resolve("hello.txt").toString());
        edit.setContent("TRON Desktop Agent works\nEdited by TRON\n");
        assertThat(files.execute("WRITE_FILE", workspace.toString(), edit).isSuccess()).isTrue();
        assertThat(Files.readString(workspace.resolve("hello.txt"))).contains("Edited by TRON");

        ProtocolMessage.Arguments read = new ProtocolMessage.Arguments();
        read.setPath(workspace.resolve("hello.txt").toString());
        ProtocolMessage.Result body = files.execute("READ_FILE", workspace.toString(), read);
        assertThat(body.getStdout()).contains("TRON Desktop Agent works");
    }

    @Test
    void rejectsPathsOutsideTheWorkspace(@TempDir Path workspace) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(Path.of("C:/Windows/win.ini").toString());
        ProtocolMessage.Result result = null;
        try {
            result = files.execute("READ_FILE", workspace.toString(), args);
        } catch (Exception e) {
            assertThat(e).isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
            return;
        }
        assertThat(result.isSuccess()).isFalse();
    }

    @Test
    void deleteRemovesTheFileOnlyAfterTheToolIsInvoked(@TempDir Path workspace) throws Exception {
        Path file = workspace.resolve("hello.txt");
        Files.writeString(file, "keep");
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(file.toString());
        assertThat(Files.exists(file)).isTrue();
        ProtocolMessage.Result deleted = files.execute("DELETE_FILE", workspace.toString(), args);
        assertThat(deleted.isSuccess()).isTrue();
        assertThat(Files.exists(file)).isFalse();
    }

    @Test
    void traversalIsRejected(@TempDir Path workspace) {
        assertThatThrownBy(() -> WorkspaceGuard.requireInside(workspace.toString(), workspace + "/../../Windows", "Path"))
                .isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
    }
}
