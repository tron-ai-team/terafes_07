package com.tronai.desktop.runtime;

import com.tronai.desktop.policy.WorkspaceGuard;
import com.tronai.desktop.protocol.ProtocolMessage;

import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs OpenCode on the USER DESKTOP loopback, bound to an authorized workspace directory.
 * Spring Core never talks to this service directly — only via ACTION_REQUEST over WSS.
 */
public final class OpenCodeLocalService {

    private static final Pattern PASSWORD = Pattern.compile("server password\\s+(\\S+)", Pattern.CASE_INSENSITIVE);
    private static final int DEFAULT_PORT = 4096;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final Map<String, ServeHandle> byWorkspace = new ConcurrentHashMap<>();

    public ProtocolMessage.Result execute(String workspaceRoot, String operation, ProtocolMessage.Arguments args) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        try {
            Path workspace = WorkspaceGuard.requireInside(workspaceRoot, workspaceRoot, "Workspace");
            String op = operation == null ? "" : operation.toUpperCase(Locale.ROOT);
            return switch (op) {
                case "ENSURE_SERVE" -> ensureServe(workspace, result);
                case "HEALTH" -> health(workspace, result);
                case "SESSION_CREATE" -> sessionCreate(workspace, args, result);
                case "PROMPT" -> prompt(workspace, args, result);
                case "RUN_GOAL" -> runGoal(workspace, args, result);
                case "VERIFY_FILE" -> verifyFile(workspace, args, result);
                case "STOP_SERVE" -> stopServe(workspace, result);
                default -> fail(result, "Unknown OPENCODE operation: " + operation);
            };
        } catch (WorkspaceGuard.WorkspaceViolation v) {
            return fail(result, v.getMessage());
        } catch (Exception e) {
            return fail(result, e.getMessage() == null ? "OpenCode failed" : e.getMessage());
        }
    }

    private ProtocolMessage.Result ensureServe(Path workspace, ProtocolMessage.Result result) throws Exception {
        Files.createDirectories(workspace);
        String key = workspace.toAbsolutePath().normalize().toString();
        ServeHandle existing = byWorkspace.get(key);
        if (existing != null && existing.alive() && probeOk(existing)) {
            result.setSuccess(true);
            result.setSummary("OpenCode already serving workspace");
            result.setStdout("{\"port\":" + existing.port + ",\"workspaceBound\":true,\"reachable\":true}");
            return result;
        }
        if (existing != null) {
            existing.destroy();
            byWorkspace.remove(key);
        }

        int port = allocateLoopbackPort();
        Path bootLog = Files.createTempFile("tron-opencode-", ".log");
        ProcessBuilder pb = new ProcessBuilder(
                resolveOpencodeCli(),
                "serve",
                "--hostname", "127.0.0.1",
                "--port", String.valueOf(port));
        pb.directory(workspace.toFile());
        pb.redirectErrorStream(true);
        pb.redirectOutput(bootLog.toFile());
        Process process = pb.start();

        String password = null;
        String boot = "";
        long deadline = System.currentTimeMillis() + 25_000;
        while (System.currentTimeMillis() < deadline) {
            boot = Files.readString(bootLog, StandardCharsets.UTF_8);
            Matcher m = PASSWORD.matcher(boot);
            if (m.find()) {
                password = m.group(1);
            }
            if (password != null && boot.toLowerCase(Locale.ROOT).contains("listening")) {
                break;
            }
            if (!process.isAlive()) {
                break;
            }
            Thread.sleep(100);
        }

        if (password == null || password.isBlank()) {
            process.destroyForcibly();
            return fail(result, "OpenCode serve did not print a server password. Boot log: "
                    + truncate(boot, 400));
        }

        ServeHandle handle = new ServeHandle(process, port, password, workspace);
        byWorkspace.put(key, handle);
        if (!probeOk(handle)) {
            handle.destroy();
            byWorkspace.remove(key);
            return fail(result, "OpenCode serve started but /api/session not reachable on loopback");
        }
        result.setSuccess(true);
        result.setSummary("OpenCode serving on 127.0.0.1:" + port + " cwd=" + workspace);
        result.setStdout("{\"port\":" + port + ",\"workspaceBound\":true,\"reachable\":true}");
        // Never return the server password to Spring / logs via protocol.
        return result;
    }

    private ProtocolMessage.Result health(Path workspace, ProtocolMessage.Result result) throws Exception {
        ServeHandle handle = requireHandle(workspace);
        boolean ok = probeOk(handle);
        result.setSuccess(ok);
        result.setSummary(ok ? "OpenCode healthy" : "OpenCode unreachable");
        result.setStdout("{\"reachable\":" + ok + ",\"port\":" + handle.port + ",\"workspaceBound\":true}");
        return result;
    }

    private ProtocolMessage.Result sessionCreate(Path workspace, ProtocolMessage.Arguments args,
                                                 ProtocolMessage.Result result) throws Exception {
        ServeHandle handle = requireHandle(workspace);
        String title = args != null && args.getText() != null && !args.getText().isBlank()
                ? args.getText() : "tron-desktop";
        String body = "{\"title\":" + jsonString(title) + "}";
        HttpResponse<String> res = send(handle, "POST", "/api/session", body);
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            return fail(result, "SESSION_CREATE HTTP " + res.statusCode() + " " + truncate(res.body(), 400));
        }
        String id = extractJsonField(res.body(), "id");
        if (id == null || id.isBlank()) {
            return fail(result, "SESSION_CREATE missing id in response");
        }
        result.setSuccess(true);
        result.setSummary("session=" + id);
        result.setStdout(id);
        return result;
    }

    private ProtocolMessage.Result prompt(Path workspace, ProtocolMessage.Arguments args,
                                          ProtocolMessage.Result result) throws Exception {
        ServeHandle handle = requireHandle(workspace);
        if (args == null || args.getQuery() == null || args.getQuery().isBlank()) {
            return fail(result, "query (external session id) is required");
        }
        String prompt = args.getText() == null ? "" : args.getText();
        String body = "{\"text\":" + jsonString(prompt) + "}";
        HttpResponse<String> res = send(handle, "POST",
                "/api/session/" + args.getQuery() + "/prompt", body);
        if (res.statusCode() >= 400) {
            res = send(handle, "POST", "/api/session/" + args.getQuery() + "/message", body);
        }
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            return fail(result, "PROMPT HTTP " + res.statusCode() + " " + truncate(res.body(), 400));
        }
        result.setSuccess(true);
        result.setSummary("prompt accepted");
        result.setStdout(truncate(res.body(), 2000));
        return result;
    }

    /**
     * Native OpenCode agent loop: {@code opencode run --auto} against the background service.
     * <p>
     * OpenCode v2.1.1 + local Ollama: {@code --standalone} fails with
     * {@code provider.no-route / Model unavailable} because the private stdio server does not
     * finish Ollama provider routing in time (and explicit provider model overrides can clear
     * the package binding). The long-lived {@code opencode service} already has discovery.
     * Process exit means the agent finished (success or failure) — not merely "prompt accepted".
     */
    private ProtocolMessage.Result runGoal(Path workspace, ProtocolMessage.Arguments args,
                                           ProtocolMessage.Result result) throws Exception {
        if (args == null || args.getText() == null || args.getText().isBlank()) {
            return fail(result, "text (improved goal prompt) is required for RUN_GOAL");
        }
        Files.createDirectories(workspace);
        ensureOpencodeBackgroundService();
        String title = sanitizeTitle(args.getQuery() != null && !args.getQuery().isBlank()
                ? args.getQuery() : "tron-native");
        int timeoutSec = args.getTimeoutMs() != null && args.getTimeoutMs() > 0
                ? Math.max(60, args.getTimeoutMs() / 1000)
                : 600;
        // Long optimized prompts break Windows argv quoting; write goal to a non-dot file
        // (OpenCode glob ignores dotfiles) and pass a short message.
        Path goalFile = workspace.resolve("TRON_NATIVE_GOAL.txt");
        Files.writeString(goalFile, args.getText(), StandardCharsets.UTF_8);
        // Inline a quote-safe summary so the agent does not depend on reading the goal file first.
        String inline = args.getText().replace('"', '\'').replace('\r', ' ').replace('\n', ' ').trim();
        if (inline.length() > 1200) {
            inline = inline.substring(0, 1200);
        }
        // Prefer inline goal (works with native agent). Goal file is a backup for long prompts.
        // Keep under ~1200 chars to avoid Windows CreateProcess quoting breakage.
        String shortMessage = inline
                + " Full instructions are also in TRON_NATIVE_GOAL.txt. "
                + "TRON_NATIVE_GOAL.txt is a TRON helper file — create the requested deliverables. "
                + "Use native tools: write for new files; edit with path+oldString+newString for existing files; "
                + "if edit fails, write the complete file. Never invent <line> markers. "
                + "Do not ask questions. Execute now.";
        List<String> command = new ArrayList<>();
        command.add(resolveOpencodeCli());
        command.add("run");
        command.add("--auto");
        // Optional escape hatch only — default MUST NOT use --standalone with Ollama (see class javadoc).
        if (useStandaloneRun()) {
            command.add("--standalone");
        }
        // Prefer local Ollama by default — OpenCode Go free tier returns 429 after quota.
        String model = resolveOpencodeModel();
        if (model != null && !model.isBlank()) {
            command.add("--model");
            command.add(model);
        }
        command.add("--title");
        command.add(title);
        command.add("--format");
        command.add("json");
        command.add(shortMessage);
        Set<String> ignoreNames = new HashSet<>();
        ignoreNames.add(goalFile.getFileName().toString());
        ignoreNames.add("TRON_NATIVE_GOAL.txt");
        ignoreNames.add("TRON_OPENCODE_RUN.out.log");
        ignoreNames.add("TRON_OPENCODE_RUN.err.log");
        // Snapshot BEFORE start so exit≠0 cannot falsely succeed on pre-existing files.
        Map<String, Long> baseline = snapshotWorkspaceFiles(workspace, ignoreNames);
        long startedAtMs = System.currentTimeMillis();
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workspace.toFile());
        // CRITICAL (Windows + opencode.exe):
        // - PIPE and file redirects hang at `serve --stdio`
        // - inheritIO works ONLY if the parent process does NOT redirect its own stdout/stderr
        // Headless must be started without RedirectStandardOutput/Error (see start-headless.cmd).
        pb.inheritIO();
        Process process;
        try {
            process = pb.start();
        } catch (Exception e) {
            return fail(result, "Could not start OpenCode CLI: " + e.getMessage());
        }
        boolean finished = process.waitFor(timeoutSec, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            return fail(result, "OpenCode RUN_GOAL timed out after " + timeoutSec + "s");
        }
        int exit = process.exitValue();
        List<String> created = listChangedWorkspaceFiles(workspace, baseline, ignoreNames, startedAtMs);
        boolean diskOk = !created.isEmpty();
        result.setExitCode(exit);
        // Exit 0 alone is NOT success — OpenCode can exit cleanly after refusing/no-op.
        // Accept non-zero exit only when real workspace files were created/changed.
        result.setSuccess(diskOk);
        if (diskOk && exit == 0) {
            result.setSummary("OpenCode native run completed files=" + created);
        } else if (diskOk) {
            result.setSummary("OpenCode exited " + exit + " but workspace files were written: " + created);
        } else {
            result.setSummary("OpenCode native run exited " + exit + " with no new workspace files (not verified)");
        }
        result.setStdout("goalFile=" + goalFile.getFileName() + " exit=" + exit + " created=" + created);
        return result;
    }

    /** Relative path → lastModifiedMillis for regular files under the workspace (recursive). */
    private static Map<String, Long> snapshotWorkspaceFiles(Path workspace, Set<String> ignoreNames) {
        Map<String, Long> snap = new HashMap<>();
        try (var stream = Files.walk(workspace, 8)) {
            stream.filter(Files::isRegularFile).forEach(p -> {
                if (shouldIgnoreWorkspacePath(workspace, p, ignoreNames)) {
                    return;
                }
                String rel = workspace.relativize(p).toString().replace('\\', '/');
                try {
                    snap.put(rel, Files.getLastModifiedTime(p).toMillis());
                } catch (Exception ignored) {
                    snap.put(rel, 0L);
                }
            });
        } catch (Exception ignored) {
            // best-effort
        }
        return snap;
    }

    /**
     * Files created after baseline, or whose mtime advanced during the run.
     * Pre-existing untouched files must NOT count as success evidence.
     */
    private static List<String> listChangedWorkspaceFiles(Path workspace,
                                                          Map<String, Long> baseline,
                                                          Set<String> ignoreNames,
                                                          long startedAtMs) {
        List<String> out = new ArrayList<>();
        try (var stream = Files.walk(workspace, 8)) {
            stream.filter(Files::isRegularFile).forEach(p -> {
                if (shouldIgnoreWorkspacePath(workspace, p, ignoreNames)) {
                    return;
                }
                String rel = workspace.relativize(p).toString().replace('\\', '/');
                try {
                    long mtime = Files.getLastModifiedTime(p).toMillis();
                    Long prev = baseline.get(rel);
                    boolean isNew = prev == null;
                    boolean modified = prev != null && mtime > prev && mtime >= (startedAtMs - 2000L);
                    if (isNew || modified) {
                        out.add(rel);
                    }
                } catch (Exception ignored) {
                    // skip
                }
            });
        } catch (Exception ignored) {
            // best-effort
        }
        out.sort(String::compareTo);
        if (out.size() > 40) {
            return new ArrayList<>(out.subList(0, 40));
        }
        return out;
    }

    private static boolean shouldIgnoreWorkspacePath(Path workspace, Path file, Set<String> ignoreNames) {
        String name = file.getFileName().toString();
        if (ignoreNames.contains(name) || name.endsWith(".log") || name.endsWith(".err")) {
            return true;
        }
        Path rel;
        try {
            rel = workspace.relativize(file);
        } catch (Exception e) {
            return true;
        }
        for (Path part : rel) {
            String s = part.toString();
            if ("node_modules".equalsIgnoreCase(s)
                    || "target".equalsIgnoreCase(s)
                    || ".git".equalsIgnoreCase(s)
                    || ".opencode".equalsIgnoreCase(s)
                    || "dist".equalsIgnoreCase(s)) {
                // Allow dist/target as success evidence when newly created — only skip deep vendor trees
                if ("node_modules".equalsIgnoreCase(s) || ".git".equalsIgnoreCase(s) || ".opencode".equalsIgnoreCase(s)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String sanitizeTitle(String title) {
        String t = title == null ? "tron-native" : title.trim();
        if (t.isEmpty()) {
            return "tron-native";
        }
        // Keep titles shell/CLI safe (no spaces/metacharacters).
        return t.replaceAll("[^A-Za-z0-9._-]", "-");
    }

    private ProtocolMessage.Result verifyFile(Path workspace, ProtocolMessage.Arguments args,
                                              ProtocolMessage.Result result) throws Exception {
        if (args == null || args.getPath() == null || args.getPath().isBlank()) {
            return fail(result, "path is required");
        }
        Path target = WorkspaceGuard.requireInside(workspace.toString(), args.getPath(), "Verify path");
        if (!Files.isRegularFile(target)) {
            result.setSuccess(false);
            result.setSummary("File not found: " + target);
            return result;
        }
        String content = Files.readString(target, StandardCharsets.UTF_8);
        result.setSuccess(true);
        result.setPath(target.toAbsolutePath().toString());
        result.setSizeBytes(Files.size(target));
        result.setSummary("verified");
        result.setStdout(content);
        return result;
    }

    private ProtocolMessage.Result stopServe(Path workspace, ProtocolMessage.Result result) {
        String key = workspace.toAbsolutePath().normalize().toString();
        ServeHandle handle = byWorkspace.remove(key);
        if (handle != null) {
            handle.destroy();
        }
        result.setSuccess(true);
        result.setSummary("OpenCode serve stopped for workspace");
        return result;
    }

    private ServeHandle requireHandle(Path workspace) {
        String key = workspace.toAbsolutePath().normalize().toString();
        ServeHandle handle = byWorkspace.get(key);
        if (handle == null || !handle.alive()) {
            throw new IllegalStateException("OpenCode not serving this workspace — call ENSURE_SERVE first");
        }
        return handle;
    }

    private boolean probeOk(ServeHandle handle) {
        try {
            HttpResponse<String> res = send(handle, "GET", "/api/session", null);
            return res.statusCode() >= 200 && res.statusCode() < 300
                    && res.body() != null
                    && !res.body().toLowerCase(Locale.ROOT).contains("<!doctype");
        } catch (Exception e) {
            return false;
        }
    }

    private HttpResponse<String> send(ServeHandle handle, String method, String path, String jsonBody)
            throws Exception {
        String token = Base64.getEncoder().encodeToString(
                ("opencode:" + handle.password).getBytes(StandardCharsets.UTF_8));
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + handle.port + path))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Basic " + token)
                .header("Accept", "application/json");
        if ("GET".equals(method)) {
            b.GET();
        } else {
            b.header("Content-Type", "application/json");
            b.method(method, HttpRequest.BodyPublishers.ofString(jsonBody == null ? "{}" : jsonBody));
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    /** Prefer default 4096; if busy, bind an ephemeral loopback port. */
    private static int allocateLoopbackPort() throws Exception {
        try (ServerSocket probe = new ServerSocket()) {
            probe.setReuseAddress(true);
            probe.bind(new java.net.InetSocketAddress("127.0.0.1", DEFAULT_PORT));
            return DEFAULT_PORT;
        } catch (Exception defaultBusy) {
            try (ServerSocket ephemeral = new ServerSocket()) {
                ephemeral.bind(new java.net.InetSocketAddress("127.0.0.1", 0));
                return ephemeral.getLocalPort();
            }
        }
    }

    /**
     * Model pin for {@code opencode run -m}.
     * Default {@code ollama/qwen3:8b} (tool-capable local model that routes via the OpenCode
     * background service). Override with {@code TRON_OPENCODE_MODEL} (empty string disables the
     * flag). Optional higher-context tag {@code ollama/qwen3-64k:8b} (same weights, num_ctx=65536)
     * can be selected via env when VRAM allows — useful for edit-heavy goals.
     */
    private static String resolveOpencodeModel() {
        String fromEnv = System.getenv("TRON_OPENCODE_MODEL");
        if (fromEnv != null) {
            return fromEnv.trim();
        }
        return "ollama/qwen3:8b";
    }

    /** {@code TRON_OPENCODE_STANDALONE=1} restores legacy private-server mode (broken for Ollama). */
    private static boolean useStandaloneRun() {
        String v = System.getenv("TRON_OPENCODE_STANDALONE");
        if (v == null || v.isBlank()) {
            return false;
        }
        return "1".equals(v.trim()) || "true".equalsIgnoreCase(v.trim());
    }

    /**
     * Ensure the shared OpenCode background service is up so Ollama discovery/routing works.
     * Best-effort: a failed start still attempts {@code opencode run} (CLI may auto-start).
     */
    private static void ensureOpencodeBackgroundService() {
        String cli = resolveOpencodeCli();
        try {
            ProcessBuilder status = new ProcessBuilder(cli, "service", "status");
            status.redirectErrorStream(true);
            Process sp = status.start();
            boolean finished = sp.waitFor(8, TimeUnit.SECONDS);
            String out = finished ? new String(sp.getInputStream().readAllBytes(), StandardCharsets.UTF_8) : "";
            if (finished && sp.exitValue() == 0 && out != null
                    && out.toLowerCase(Locale.ROOT).contains("http://")) {
                return;
            }
        } catch (Exception ignored) {
            // fall through to start
        }
        try {
            ProcessBuilder start = new ProcessBuilder(cli, "service", "start");
            start.redirectErrorStream(true);
            Process p = start.start();
            p.waitFor(20, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // RUN_GOAL will surface model/routing errors if the service cannot start
        }
    }

    private static String resolveOpencodeCli() {
        String fromEnv = System.getenv("TRON_OPENCODE_CLI");
        if (fromEnv != null && !fromEnv.isBlank() && Files.isRegularFile(Path.of(fromEnv))) {
            return fromEnv;
        }
        String home = System.getenv("USERPROFILE");
        if (home == null || home.isBlank()) {
            home = System.getProperty("user.home");
        }
        if (home != null) {
            // Prefer the native Windows binary under the npm package (avoids .cmd quirks).
            Path exe = Path.of(home, "AppData", "Roaming", "npm", "node_modules",
                    "@opencode", "cli", "bin", "opencode.exe");
            if (Files.isRegularFile(exe)) {
                return exe.toString();
            }
            Path cmd = Path.of(home, "AppData", "Roaming", "npm", "opencode.cmd");
            if (Files.isRegularFile(cmd)) {
                return cmd.toString();
            }
        }
        return "opencode";
    }

    private static ProtocolMessage.Result fail(ProtocolMessage.Result result, String msg) {
        result.setSuccess(false);
        result.setSummary(msg);
        return result;
    }

    private static String extractJsonField(String json, String field) {
        if (json == null) {
            return null;
        }
        Pattern p = Pattern.compile("\"" + field + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher m = p.matcher(json);
        return m.find() ? m.group(1) : null;
    }

    private static String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r") + "\"";
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static final class ServeHandle {
        private final Process process;
        private final int port;
        private final String password;
        private final Path workspace;

        private ServeHandle(Process process, int port, String password, Path workspace) {
            this.process = process;
            this.port = port;
            this.password = password;
            this.workspace = workspace;
        }

        private boolean alive() {
            return process != null && process.isAlive();
        }

        private void destroy() {
            try {
                process.destroy();
                process.waitFor(3, TimeUnit.SECONDS);
            } catch (Exception ignored) {
                process.destroyForcibly();
            }
        }
    }
}
