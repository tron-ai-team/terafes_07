package com.tronai.desktop.policy;

import java.nio.file.Path;

/**
 * Keeps file and process paths inside the allowed workspace root.
 * Path.startsWith is component-aware, so C:\Dev does not allow C:\DevEvil.
 */
public final class WorkspaceGuard {

    private WorkspaceGuard() {
    }

    public static Path requireInside(String workspaceRoot, String candidate, String label) {
        if (workspaceRoot == null || workspaceRoot.isBlank()) {
            throw new WorkspaceViolation(label + " has no allowed workspace");
        }
        if (candidate == null || candidate.isBlank()) {
            throw new WorkspaceViolation(label + " is required");
        }
        if (candidate.indexOf('\0') >= 0) {
            throw new WorkspaceViolation(label + " contains a null character");
        }
        Path root = Path.of(workspaceRoot).toAbsolutePath().normalize();
        Path raw = Path.of(candidate);
        Path resolved = raw.isAbsolute() ? raw.normalize() : root.resolve(raw).normalize();
        if (!resolved.startsWith(root)) {
            throw new WorkspaceViolation(label + " escapes the allowed workspace");
        }
        return resolved;
    }

    public static Path workspace(String workspaceRoot) {
        if (workspaceRoot == null || workspaceRoot.isBlank()) {
            throw new WorkspaceViolation("Allowed workspace is required");
        }
        return Path.of(workspaceRoot).toAbsolutePath().normalize();
    }

    public static final class WorkspaceViolation extends RuntimeException {
        public WorkspaceViolation(String message) {
            super(message);
        }
    }
}

