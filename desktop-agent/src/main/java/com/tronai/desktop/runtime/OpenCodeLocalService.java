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
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
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
