package com.tronai.desktop.runtime;

import com.tronai.desktop.policy.WorkspaceGuard;
import com.tronai.desktop.protocol.ProtocolMessage;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs OpenClaw on the USER DESKTOP via the installed CLI.
 * Spring Core reaches this only through ACTION_REQUEST over WSS — never Playwright.
 */
public final class OpenClawLocalService {

    private static final Pattern TITLE = Pattern.compile("\"title\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern URL = Pattern.compile("\"url\"\\s*:\\s*\"(https?://[^\"]+)\"");

    private final ConcurrentHashMap<String, Process> running = new ConcurrentHashMap<>();

    public ProtocolMessage.Result execute(String workspaceRoot, String operation, ProtocolMessage.Arguments args) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        try {
            Path workspace = WorkspaceGuard.requireInside(workspaceRoot, workspaceRoot, "Workspace");
            String op = operation == null ? "" : operation.toUpperCase(Locale.ROOT);
            return switch (op) {
                case "HEALTH" -> health(result);
                case "RUN_GOAL" -> runGoal(workspace, args, result);
                case "CANCEL" -> cancel(args, result);
                default -> fail(result, "Unknown OPENCLAW operation: " + operation);
            };
        } catch (WorkspaceGuard.WorkspaceViolation v) {
            return fail(result, v.getMessage());
        } catch (Exception e) {
            return fail(result, e.getMessage() == null ? "OpenClaw failed" : e.getMessage());
        }
    }

    private ProtocolMessage.Result health(ProtocolMessage.Result result) {
        String cli = resolveOpenclawCli();
        boolean present = cli != null && Files.isRegularFile(Path.of(cli));
        result.setSuccess(present);
        result.setSummary(present
                ? "OpenClaw CLI present at " + cli
                : "OpenClaw CLI not found (set TRON_OPENCLAW_CLI)");
        result.setStdout("cliPresent=" + present + " cli=" + cli);
        return result;
    }

    private ProtocolMessage.Result runGoal(Path workspace, ProtocolMessage.Arguments args,
                                           ProtocolMessage.Result result) throws Exception {
        if (args == null || args.getText() == null || args.getText().isBlank()) {
            return fail(result, "text (improved automation prompt) is required for RUN_GOAL");
        }
        Files.createDirectories(workspace);
        Path goalFile = workspace.resolve("TRON_OPENCLAW_GOAL.txt");
        Files.writeString(goalFile, args.getText(), StandardCharsets.UTF_8);
        String sessionId = args.getQuery() == null || args.getQuery().isBlank()
                ? "tron-" + System.currentTimeMillis()
                : args.getQuery().replaceAll("[^A-Za-z0-9._-]", "-");
        int timeoutSec = args.getTimeoutMs() != null && args.getTimeoutMs() > 0
                ? Math.max(60, args.getTimeoutMs() / 1000)
                : 600;

        String cli = resolveOpenclawCli();
        if (cli == null) {
            return fail(result, "OpenClaw CLI not found. Install openclaw or set TRON_OPENCLAW_CLI.");
        }

        List<String> command = new ArrayList<>();
        command.add(cli);
        command.add("agent");
        // Prefer gateway-backed turn when gateway is up; --local embeds without gateway.
        boolean forceLocal = "true".equalsIgnoreCase(System.getenv("TRON_OPENCLAW_FORCE_LOCAL"));
        if (forceLocal) {
            command.add("--local");
        }
        command.add("--json");
        command.add("--agent");
        command.add(resolveAgentId());
        command.add("--session-id");
        command.add(sessionId);
        command.add("--timeout");
        command.add(String.valueOf(timeoutSec));
        String model = resolveModel();
        if (model != null && !model.isBlank()) {
            command.add("--model");
            command.add(model);
        }
        command.add("--message-file");
        command.add(goalFile.toAbsolutePath().toString());

        Path outLog = workspace.resolve("TRON_OPENCLAW_RUN.out.log");
        Path errLog = workspace.resolve("TRON_OPENCLAW_RUN.err.log");
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workspace.toFile());
        // Pass gateway token to CLI when present (never logged).
        String gwToken = resolveGatewayToken();
        if (gwToken != null && !gwToken.isBlank()) {
            pb.environment().put("OPENCLAW_GATEWAY_TOKEN", gwToken);
        }
        String gwUrl = System.getenv("TRON_OPENCLAW_GATEWAY_URL");
        if (gwUrl != null && !gwUrl.isBlank()) {
            pb.environment().put("OPENCLAW_GATEWAY_URL", gwUrl);
        }
        // Capture CLI JSON evidence to workspace logs (do not inheritIO — that discards title/url).
        pb.redirectOutput(outLog.toFile());
        pb.redirectError(errLog.toFile());
        Process process = pb.start();
        running.put(sessionId, process);
        boolean finished;
        try {
            finished = process.waitFor(timeoutSec + 30L, TimeUnit.SECONDS);
        } finally {
            running.remove(sessionId, process);
        }
        if (!finished) {
            process.destroyForcibly();
            return fail(result, "OpenClaw RUN_GOAL timed out after " + timeoutSec + "s");
        }
        int exit = process.exitValue();
        // Best-effort parse from goal-adjacent log if present
        String combined = readOptional(outLog) + "\n" + readOptional(errLog);
        String title = firstMatch(TITLE, combined);
        String url = firstMatch(URL, combined);
        boolean diskShot = Files.list(workspace)
                .anyMatch(p -> {
                    String n = p.getFileName().toString().toLowerCase(Locale.ROOT);
                    return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".webp");
                });
        result.setExitCode(exit);
        result.setUrl(url);
        String goalText = args.getText() == null ? "" : args.getText().toLowerCase(Locale.ROOT);
        boolean wantsBrowser = goalText.contains("http://") || goalText.contains("https://")
                || goalText.contains("browser") || goalText.contains("screenshot")
                || goalText.contains("page title");
        boolean refused = combined.toLowerCase(Locale.ROOT).contains("cannot perform")
                || combined.toLowerCase(Locale.ROOT).contains("can't browse")
                || combined.toLowerCase(Locale.ROOT).contains("unable to open");
        boolean browserEvidence = (title != null && !title.isBlank())
                || (url != null && !url.isBlank())
                || diskShot;
        if (title != null) {
            result.setSummary("OpenClaw native run exit=" + exit
                    + (url != null ? " url=" + url : "")
                    + " title=" + title
                    + (diskShot ? " screenshot=present" : " screenshot=absent"));
        } else {
            result.setSummary(exit == 0
                    ? (wantsBrowser && !browserEvidence
                    ? "OpenClaw exited 0 but browser evidence missing (title/url/screenshot); Playwright was NOT used"
                    : "OpenClaw native run completed")
                    : "OpenClaw native run exited " + exit
                    + " (check model auth / gateway; Playwright was NOT used)");
        }
        // Exit 0 alone is not enough for browser automation goals — require real evidence.
        result.setSuccess(exit == 0 && !refused && (!wantsBrowser || browserEvidence));
        result.setStdout("sessionId=" + sessionId + " exit=" + exit
                + " title=" + title + " url=" + url + " screenshotOnDisk=" + diskShot);
        return result;
    }

    private ProtocolMessage.Result cancel(ProtocolMessage.Arguments args, ProtocolMessage.Result result) {
        String sessionId = args == null ? null : args.getQuery();
        if (sessionId == null || sessionId.isBlank()) {
            running.values().forEach(Process::destroyForcibly);
            running.clear();
            result.setSuccess(true);
            result.setSummary("OpenClaw: destroyed all tracked processes");
            return result;
        }
        Process p = running.remove(sessionId);
        if (p != null) {
            p.destroyForcibly();
        }
        result.setSuccess(true);
        result.setSummary("OpenClaw cancel session=" + sessionId);
        return result;
    }

    private static String resolveGatewayToken() {
        String gwToken = System.getenv("TRON_OPENCLAW_GATEWAY_TOKEN");
        if (gwToken == null || gwToken.isBlank()) {
            gwToken = System.getenv("OPENCLAW_GATEWAY_TOKEN");
        }
        if (gwToken != null && !gwToken.isBlank()) {
            return gwToken.trim();
        }
        String tokenFile = System.getenv("TRON_OPENCLAW_GATEWAY_TOKEN_FILE");
        if (tokenFile != null && !tokenFile.isBlank()) {
            try {
                Path p = Path.of(tokenFile);
                if (Files.isRegularFile(p)) {
                    return Files.readString(p, StandardCharsets.UTF_8).trim();
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static String resolveOpenclawCli() {
        String fromEnv = System.getenv("TRON_OPENCLAW_CLI");
        if (fromEnv != null && !fromEnv.isBlank() && Files.isRegularFile(Path.of(fromEnv))) {
            return fromEnv;
        }
        String home = System.getenv("USERPROFILE");
        if (home == null || home.isBlank()) {
            home = System.getProperty("user.home");
        }
        if (home != null) {
            Path cmd = Path.of(home, "AppData", "Roaming", "npm", "openclaw.cmd");
            if (Files.isRegularFile(cmd)) {
                return cmd.toString();
            }
        }
        return null;
    }

    private static String resolveAgentId() {
        String env = System.getenv("TRON_OPENCLAW_AGENT");
        return env == null || env.isBlank() ? "main" : env.trim();
    }

    private static String resolveModel() {
        String env = System.getenv("TRON_OPENCLAW_MODEL");
        if (env != null) {
            return env.trim();
        }
        // Prefer local Ollama — OpenClaw defaults to openai which needs user API keys.
        return "ollama/qwen3:8b";
    }

    private static String readOptional(Path path) {
        try {
            if (Files.isRegularFile(path)) {
                return Files.readString(path, StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private static String firstMatch(Pattern pattern, String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = pattern.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static ProtocolMessage.Result fail(ProtocolMessage.Result result, String msg) {
        result.setSuccess(false);
        result.setSummary(msg);
        return result;
    }
}
