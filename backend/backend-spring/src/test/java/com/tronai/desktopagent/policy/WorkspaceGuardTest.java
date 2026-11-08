package com.tronai.desktopagent.policy;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkspaceGuardTest {

    @Test
    void windowsAbsolutePathsAreRejectedOutsideWorkspaceEvenOnNonWindowsHosts() {
        assertThatThrownBy(() -> WorkspaceGuard.requireInside("C:/Dev", "C:/Windows/win.ini", "Path"))
                .isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
        assertThatThrownBy(() -> WorkspaceGuard.requireInside("C:/Dev", "C:/DevEvil/secret.txt", "Path"))
                .isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
    }

    @Test
    void windowsPathsInsideWorkspaceAreAllowed() {
        assertThat(WorkspaceGuard.requireInside("C:/Dev", "C:/Dev/hello.txt", "Path").toString().replace('\\', '/'))
                .isEqualToIgnoringCase("C:/Dev/hello.txt");
        assertThat(WorkspaceGuard.requireInside("C:/Dev", "subdir/file.txt", "Path").toString().replace('\\', '/'))
                .endsWith("C:/Dev/subdir/file.txt");
    }

    @Test
    void siblingPrefixDoesNotMatch() {
        assertThat(WorkspaceGuard.isInsideWindowsRoot("C:/Dev", "C:/DevEvil/secret.txt")).isFalse();
        assertThat(WorkspaceGuard.isInsideWindowsRoot("C:/Dev", "C:/Dev/hello.txt")).isTrue();
    }

    @Test
    void parentTraversalEscapesWorkspace() {
        assertThatThrownBy(() -> WorkspaceGuard.requireInside("C:/Dev", "C:/Dev/../Windows", "Path"))
                .isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
        assertThat(WorkspaceGuard.normalizeWindowsPath("C:/Dev/../Windows")).isEqualTo("C:/Windows");
    }
}
