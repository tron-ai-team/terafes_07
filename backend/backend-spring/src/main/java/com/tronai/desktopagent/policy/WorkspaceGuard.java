package com.tronai.desktopagent.policy;

import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Keeps file and process paths inside the allowed workspace root.
 * Path containment is component-aware, so C:\Dev does not allow C:\DevEvil.
 * <p>
 * Desktop agents may send Windows drive-letter paths even when the Spring process
 * runs on Linux/macOS. Those paths must still be evaluated with Windows semantics;
 * otherwise {@code C:/Windows/win.ini} is treated as a relative path and incorrectly
 * resolves under the workspace.
 */
public final class WorkspaceGuard {

    private static final Pattern WINDOWS_ABSOLUTE = Pattern.compile("^[A-Za-z]:[\\\\/].*");

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

        if (isWindowsAbsolute(workspaceRoot) || isWindowsAbsolute(candidate)) {
            String rootNorm = normalizeWindowsPath(workspaceRoot);
            String resolved = resolveWindowsPath(rootNorm, candidate);
            if (!isInsideWindowsRoot(rootNorm, resolved)) {
                throw new WorkspaceViolation(label + " escapes the allowed workspace");
            }
            return Path.of(resolved);
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
        if (isWindowsAbsolute(workspaceRoot)) {
            return Path.of(normalizeWindowsPath(workspaceRoot));
        }
        return Path.of(workspaceRoot).toAbsolutePath().normalize();
    }

    static boolean isWindowsAbsolute(String path) {
        return path != null && WINDOWS_ABSOLUTE.matcher(path.trim()).matches();
    }

    static String normalizeWindowsPath(String path) {
        String normalized = path.trim().replace('\\', '/');
        if (normalized.length() >= 2 && normalized.charAt(1) == ':') {
            normalized = Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        }

        // Resolve . and .. without relying on the host OS Path implementation.
        String[] parts = normalized.split("/");
        java.util.ArrayList<String> stack = new java.util.ArrayList<>();
        for (String part : parts) {
            if (part.isEmpty() || ".".equals(part)) {
                continue;
            }
            if ("..".equals(part)) {
                if (stack.size() > 1) { // keep drive root (e.g. "C:")
                    stack.remove(stack.size() - 1);
                }
                continue;
            }
            stack.add(part);
        }
        if (stack.isEmpty()) {
            return normalized;
        }
        return String.join("/", stack);
    }

    static String resolveWindowsPath(String normalizedRoot, String candidate) {
        String trimmed = candidate.trim().replace('\\', '/');
        if (isWindowsAbsolute(trimmed)) {
            return normalizeWindowsPath(trimmed);
        }
        String relative = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
        return normalizeWindowsPath(normalizedRoot + "/" + relative);
    }

    static boolean isInsideWindowsRoot(String normalizedRoot, String normalizedCandidate) {
        String root = normalizedRoot;
        String candidate = normalizedCandidate;
        // Case-insensitive compare for Windows drive paths.
        String rootKey = root.toLowerCase(Locale.ROOT);
        String candidateKey = candidate.toLowerCase(Locale.ROOT);
        if (candidateKey.equals(rootKey)) {
            return true;
        }
        String prefix = rootKey.endsWith("/") ? rootKey : rootKey + "/";
        return candidateKey.startsWith(prefix);
    }

    public static final class WorkspaceViolation extends RuntimeException {
        public WorkspaceViolation(String message) {
            super(message);
        }
    }
}
