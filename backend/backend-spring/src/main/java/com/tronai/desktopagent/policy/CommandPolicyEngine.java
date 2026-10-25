package com.tronai.desktopagent.policy;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Deterministic command and tool policy. Risk is never taken from an LLM label.
 */
public final class CommandPolicyEngine {

    private static final Set<String> READ_ONLY_GIT = Set.of(
            "status", "diff", "log", "show", "branch", "rev-parse", "remote", "ls-files", "describe");
    private static final Set<String> SAFE_MVN_GOALS = Set.of(
            "test", "package", "compile", "verify", "-version", "--version", "help:evaluate", "dependency:tree");
    private static final Set<String> SAFE_GRADLE_TASKS = Set.of(
            "test", "build", "check", "assemble", "classes", "-version", "--version", "projects", "tasks");
    private static final Set<String> SAFE_DIR = Set.of(
            "dir", "ls", "pwd", "echo", "type", "cat", "get-childitem", "get-location", "where", "which", "whoami");

    public PolicyDecision evaluate(PolicyRequest request) {
        String tool = upper(request.tool());
        String operation = upper(request.operation());
        try {
            if (!"BROWSER".equals(tool)) {
                checkPaths(request);
            }
        } catch (WorkspaceGuard.WorkspaceViolation violation) {
            return PolicyDecision.of(RiskLevel.BLOCKED, violation.getMessage());
        }

        return switch (tool) {
            case "FILE" -> filePolicy(operation);
            case "GIT" -> gitPolicy(operation, request.argv());
            case "TERMINAL", "PROCESS" -> commandPolicy(request);
            case "BROWSER" -> browserPolicy(normalizeBrowserOperation(operation), request.url());
            case "OPENCODE" -> openCodePolicy(operation);
            case "OPENCLAW" -> openClawPolicy(operation);
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown tool");
        };
    }

    private static PolicyDecision openCodePolicy(String operation) {
        return switch (operation) {
            case "HEALTH", "STOP_SERVE" ->
                    PolicyDecision.of(RiskLevel.SAFE, "OpenCode control plane");
            case "ENSURE_SERVE", "SESSION_CREATE", "PROMPT", "RUN_GOAL", "VERIFY_FILE" ->
                    PolicyDecision.of(RiskLevel.NORMAL, "OpenCode workspace-bound execution");
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown OpenCode operation");
        };
    }

    private static PolicyDecision openClawPolicy(String operation) {
        return switch (operation) {
            case "HEALTH", "CANCEL" ->
                    PolicyDecision.of(RiskLevel.SAFE, "OpenClaw control plane");
            case "RUN_GOAL" ->
                    PolicyDecision.of(RiskLevel.NORMAL, "OpenClaw native agent execution");
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown OpenClaw operation");
        };
    }

    /**
     * Maps natural-language / alias browser operations to the canonical protocol set.
     */
    public static String normalizeBrowserOperation(String operation) {
        String op = upper(operation);
        if (op.isBlank()) {
            return op;
        }
        return switch (op) {
            case "OPEN", "OPENURL", "OPEN_URL", "NAVIGATE", "GOTO", "GO_TO", "VISIT", "LOAD", "BROWSE" -> "OPEN_URL";
            case "CLICK", "CLICK_ELEMENT", "PRESS", "TAP" -> "CLICK";
            case "TYPE", "TYPE_TEXT", "FILL", "INPUT", "ENTER_TEXT" -> "TYPE";
            case "GET_TEXT", "GETTEXT", "READ", "READ_TEXT", "EXTRACT_TEXT" -> "GET_TEXT";
            case "WAIT", "WAIT_FOR", "SLEEP", "PAUSE" -> "WAIT";
            case "SCREENSHOT", "CAPTURE", "CAPTURE_SCREENSHOT", "TAKE_SCREENSHOT", "SNAP" -> "SCREENSHOT";
            case "CHECK_VISIBLE", "VISIBLE", "IS_VISIBLE" -> "CHECK_VISIBLE";
            case "INSPECT", "INSPECT_PAGE", "DOM", "PAGE_INFO" -> "INSPECT";
            case "SET_CONTROL", "HANDOFF", "GIVE_CONTROL", "USER_CONTROL" -> "SET_CONTROL";
            case "CLOSE", "CLOSE_BROWSER", "QUIT" -> "CLOSE";
            default -> op;
        };
    }

    private static void checkPaths(PolicyRequest request) {
        if (request.workspaceRoot() == null || request.workspaceRoot().isBlank()) {
            throw new WorkspaceGuard.WorkspaceViolation("Allowed workspace is required");
        }
        if (request.workingDirectory() != null && !request.workingDirectory().isBlank()) {
            WorkspaceGuard.requireInside(request.workspaceRoot(), request.workingDirectory(), "Working directory");
        }
        if (request.path() != null && !request.path().isBlank()) {
            WorkspaceGuard.requireInside(request.workspaceRoot(), request.path(), "Path");
        }
        if (request.destinationPath() != null && !request.destinationPath().isBlank()) {
            WorkspaceGuard.requireInside(request.workspaceRoot(), request.destinationPath(), "Destination");
        }
    }

    private static PolicyDecision filePolicy(String operation) {
        return switch (operation) {
            case "LIST_FILES", "READ_FILE", "SEARCH_TEXT" ->
                    PolicyDecision.of(RiskLevel.SAFE, "Read-only file access");
            case "CREATE_FILE", "WRITE_FILE", "PATCH_FILE", "MOVE_FILE" ->
                    PolicyDecision.of(RiskLevel.NORMAL, "Workspace file edit");
            case "DELETE_FILE" ->
                    PolicyDecision.of(RiskLevel.REQUIRES_APPROVAL, "Deleting a file requires approval");
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown file operation");
        };
    }

    private static PolicyDecision gitPolicy(String operation, List<String> argv) {
        if (argv != null && containsForcePush(argv)) {
            return PolicyDecision.of(RiskLevel.BLOCKED, "Force push is blocked");
        }
        if (argv != null && containsHardReset(argv)) {
            return PolicyDecision.of(RiskLevel.BLOCKED, "git reset --hard is blocked");
        }
        return switch (operation) {
            case "STATUS", "DIFF", "LOG", "BRANCH" ->
                    PolicyDecision.of(RiskLevel.SAFE, "Read-only git");
            case "COMMIT" ->
                    PolicyDecision.of(RiskLevel.REQUIRES_APPROVAL, "git commit requires approval");
            case "PUSH" ->
                    PolicyDecision.of(RiskLevel.REQUIRES_APPROVAL, "git push requires approval");
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown git operation");
        };
    }

    private static PolicyDecision browserPolicy(String operation, String url) {
        if ("CLOSE".equals(operation)) {
            return PolicyDecision.of(RiskLevel.SAFE, "Close browser");
        }
        if (url != null && !url.isBlank() && !isHttp(url)) {
            return PolicyDecision.of(RiskLevel.BLOCKED, "Only http and https URLs are allowed");
        }
        return switch (operation) {
            case "OPEN_URL", "CLICK", "TYPE", "GET_TEXT", "WAIT", "SCREENSHOT", "CHECK_VISIBLE", "INSPECT", "SET_CONTROL" ->
                    PolicyDecision.of(RiskLevel.NORMAL, "Requested browser action");
            default -> PolicyDecision.of(RiskLevel.BLOCKED, "Unknown browser operation");
        };
    }

    private static PolicyDecision commandPolicy(PolicyRequest request) {
        if ("STOP_OWNED_PROCESS".equals(upper(request.operation()))) {
            return PolicyDecision.of(RiskLevel.SAFE, "Stop a process this agent started");
        }
        List<String> argv = request.argv() == null ? new ArrayList<>() : new ArrayList<>(request.argv());
        if (argv.isEmpty() && request.command() != null) {
            CommandTokenizer.Tokens tokens = CommandTokenizer.tokenize(request.command());
            if (tokens.rejected()) {
                return PolicyDecision.of(RiskLevel.BLOCKED, tokens.rejectedReason());
            }
            argv.addAll(tokens.argv());
        }
        if (argv.isEmpty()) {
            return PolicyDecision.of(RiskLevel.BLOCKED, "Command is empty");
        }
        for (String arg : argv) {
            if (arg != null && (arg.contains("&") || arg.contains("|") || arg.contains(";") || arg.contains("`"))) {
                return PolicyDecision.of(RiskLevel.BLOCKED, "Shell operators are not allowed");
            }
        }
        String exe = CommandTokenizer.executableName(argv.get(0));
        String joined = String.join(" ", argv).toLowerCase(Locale.ROOT);

        if (isBlockedExecutable(exe, argv, joined)) {
            return PolicyDecision.of(RiskLevel.BLOCKED, "Destructive or shell command is blocked");
        }
        if (isApprovalExecutable(exe, argv, joined)) {
            return PolicyDecision.of(RiskLevel.REQUIRES_APPROVAL, "This command changes remote state, credentials, or the system");
        }
        if (isSafeExecutable(exe, argv)) {
            return PolicyDecision.of(RiskLevel.SAFE, "Read-only or test command");
        }
        return PolicyDecision.of(RiskLevel.NORMAL, "Command inside the allowed workspace");
    }

    private static boolean isBlockedExecutable(String exe, List<String> argv, String joined) {
        if (Set.of("format", "diskpart", "mkfs", "fdisk", "parted", "dd", "shutdown", "reboot", "bcdedit").contains(exe)) {
            return true;
        }
        if (Set.of("cmd", "cmd.exe", "bash", "sh", "zsh", "fish").contains(exe)) {
            return true;
        }
        if (Set.of("powershell", "pwsh").contains(exe)) {
            if (joined.contains("-enc") || joined.contains("encodedcommand") || joined.contains("-executionpolicy bypass")
                    || joined.contains("disablerealtime") || joined.contains("set-mppreference")) {
                return true;
            }
        }
        if (containsHardReset(argv) || containsForcePush(argv)) {
            return true;
        }
        if (joined.contains("rm -rf /") || joined.contains("rm -rf ~") || joined.contains(":(){")) {
            return true;
        }
        if (exe.equals("cipher") && joined.contains("/w")) {
            return true;
        }
        if (exe.equals("reg") && hasArg(argv, "delete")) {
            return true;
        }
        return joined.contains("disablerealtime") || joined.contains("set-mppreference");
    }

    private static boolean isApprovalExecutable(String exe, List<String> argv, String joined) {
        if (Set.of("sudo", "su", "runas", "apt", "apt-get", "dnf", "yum", "pacman", "winget", "choco", "brew").contains(exe)) {
            return true;
        }
        if (Set.of("taskkill", "kill", "pkill", "stop-process", "tskill").contains(exe)) {
            return true;
        }
        if (Set.of("del", "erase", "rm", "rmdir", "remove-item", "rd").contains(exe)) {
            return true;
        }
        if (Set.of("curl", "wget", "invoke-webrequest", "iwr").contains(exe)) {
            return true;
        }
        if (exe.equals("npm") || exe.equals("pnpm") || exe.equals("yarn")) {
            if (hasAnyArg(argv, "install", "i", "add", "ci")) {
                return true;
            }
        }
        if (exe.equals("pip") || exe.equals("pip3")) {
            return hasArg(argv, "install");
        }
        if (exe.equals("git")) {
            if (hasArg(argv, "commit") || hasArg(argv, "push") || hasArg(argv, "clean") || hasArg(argv, "config")) {
                return true;
            }
        }
        if (exe.equals("mvn") || exe.equals("mvnw")) {
            return hasAnyArg(argv, "deploy", "release:perform");
        }
        if (exe.equals("reg") || exe.equals("setx") || exe.equals("schtasks") || exe.equals("net")) {
            return true;
        }
        if (Set.of("powershell", "pwsh").contains(exe)) {
            return true;
        }
        return joined.contains("sudo ");
    }

    private static boolean isSafeExecutable(String exe, List<String> argv) {
        if (SAFE_DIR.contains(exe)) {
            return true;
        }
        if (exe.equals("java") || exe.equals("javac") || exe.equals("node")) {
            return hasAnyArg(argv, "-version", "--version", "-v");
        }
        if (exe.equals("git")) {
            String sub = subcommand(argv);
            if (sub == null) {
                return false;
            }
            if (sub.equals("remote")) {
                return hasArg(argv, "-v") && !hasAnyArg(argv, "add", "remove", "set-url", "rename");
            }
            return READ_ONLY_GIT.contains(sub) && !hasArg(argv, "commit") && !hasArg(argv, "push");
        }
        if (exe.equals("mvn") || exe.equals("mvnw")) {
            return argv.stream().map(a -> a.toLowerCase(Locale.ROOT)).anyMatch(SAFE_MVN_GOALS::contains)
                    && argv.stream().noneMatch(a -> a.equalsIgnoreCase("deploy"));
        }
        if (exe.equals("gradle") || exe.equals("gradlew")) {
            return argv.stream().map(a -> a.toLowerCase(Locale.ROOT)).anyMatch(SAFE_GRADLE_TASKS::contains);
        }
        if (exe.equals("npm")) {
            if (hasArg(argv, "test") || hasArg(argv, "-v") || hasArg(argv, "-version")) {
                return true;
            }
            int run = indexOfArg(argv, "run");
            if (run >= 0 && run + 1 < argv.size()) {
                String script = argv.get(run + 1).toLowerCase(Locale.ROOT);
                return script.equals("build") || script.equals("test");
            }
        }
        return false;
    }

    private static boolean containsForcePush(List<String> argv) {
        if (!hasArg(argv, "push")) {
            return false;
        }
        return hasAnyArg(argv, "--force", "-f", "--force-with-lease");
    }

    private static boolean containsHardReset(List<String> argv) {
        return hasArg(argv, "reset") && hasArg(argv, "--hard");
    }

    private static String subcommand(List<String> argv) {
        for (int i = 1; i < argv.size(); i++) {
            String arg = argv.get(i);
            if (!arg.startsWith("-")) {
                return arg.toLowerCase(Locale.ROOT);
            }
        }
        return null;
    }

    private static boolean hasArg(List<String> argv, String expected) {
        for (String arg : argv) {
            if (arg != null && arg.equalsIgnoreCase(expected)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasAnyArg(List<String> argv, String... expected) {
        for (String item : expected) {
            if (hasArg(argv, item)) {
                return true;
            }
        }
        return false;
    }

    private static int indexOfArg(List<String> argv, String expected) {
        for (int i = 0; i < argv.size(); i++) {
            if (argv.get(i) != null && argv.get(i).equalsIgnoreCase(expected)) {
                return i;
            }
        }
        return -1;
    }

    private static boolean isHttp(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.startsWith("https://") || lower.startsWith("http://");
    }

    private static String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
