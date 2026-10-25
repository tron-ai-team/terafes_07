package com.tronai.desktop.browser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.desktop.protocol.ProtocolMessage;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Java controls a local Node Playwright helper. The helper is started only when a browser action is requested.
 */
public final class PlaywrightController {

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private Process process;
    private int port = -1;
    private Path profileDirectory;
    private boolean userControlled;
    private volatile String lastUrl;
    private volatile String lastTitle;

    public void setProfileDirectory(Path profileDirectory) {
        this.profileDirectory = profileDirectory;
    }

    public String currentUrl() {
        return lastUrl;
    }

    public String currentTitle() {
        return lastTitle;
    }

    public int helperPort() {
        return port;
    }

    public boolean userControlled() {
        return userControlled;
    }

    public boolean isAlive() {
        return process != null && process.isAlive() && port > 0;
    }

    public ProtocolMessage.Result focus() {
        try {
            if (!isAlive()) {
                return failure("Browser is not currently running");
            }
            return post("/focus", Map.of());
        } catch (Exception e) {
            return failure("Could not focus browser: " + e.getMessage());
        }
    }

    public ProtocolMessage.Result setControl(String mode) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setBrowserControl(mode);
        return execute("SET_CONTROL", args);
    }

    public ProtocolMessage.Result closeBrowser() {
        return execute("CLOSE", null);
    }

    public ProtocolMessage.Result openHeaded(String url) {
        if (isAlive()) {
            focus();
            if (url != null && !url.isBlank()) {
                ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
                args.setUrl(url);
                args.setHeaded(true);
                args.setPersistent(true);
                args.setBrowserControl("USER");
                return execute("OPEN_URL", args);
            }
            return setControl("USER");
        }
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setUrl(url != null && !url.isBlank() ? url : "about:blank");
        args.setHeaded(true);
        args.setPersistent(true);
        args.setBrowserControl("USER");
        return execute("OPEN_URL", args);
    }

    public ProtocolMessage.Result execute(String operation, ProtocolMessage.Arguments args) {
        try {
            if ("CLOSE".equals(operation)) {
                ProtocolMessage.Result closed = post("/close", Map.of());
                stop();
                userControlled = false;
                return closed;
            }
            if (userControlled && ("CLICK".equals(operation) || "TYPE".equals(operation) || "OPEN_URL".equals(operation))) {
                return failure("Browser is under user control");
            }
            ensureStarted();
            Map<String, Object> body = new LinkedHashMap<>();
            if (args != null) {
                body.put("url", args.getUrl());
                body.put("selector", args.getSelector());
                if (args.getSelector() == null || !args.getSelector().toLowerCase(java.util.Locale.ROOT).contains("password")) {
                    body.put("text", args.getText());
                }
                body.put("timeoutMs", args.getTimeoutMs());
                body.put("headed", args.getHeaded());
                body.put("persistent", args.getPersistent());
                body.put("mode", args.getBrowserControl());
            }
            if (profileDirectory != null) {
                body.put("profileDir", profileDirectory.toString());
            }
            String route = switch (operation) {
                case "OPEN_URL" -> "/open";
                case "CLICK" -> "/click";
                case "TYPE" -> "/type";
                case "GET_TEXT" -> "/text";
                case "WAIT" -> "/wait";
                case "SCREENSHOT" -> "/screenshot";
                case "CHECK_VISIBLE" -> "/visible";
                case "INSPECT" -> "/inspect";
                case "SET_CONTROL" -> "/control";
                default -> null;
            };
            if (route == null) {
                return failure("Unknown browser operation");
            }
            return post(route, body);
        } catch (Exception e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            if (message.toLowerCase(Locale.ROOT).contains("dependency_missing") || message.toLowerCase(Locale.ROOT).contains("playwright")) {
                return failure("Playwright dependency is missing. Install Node.js and run npm install playwright in desktop-agent/playwright-helper, then npx playwright install chromium.");
            }
            return failure(message);
        }
    }

    public void stop() {
        if (process != null) {
            process.descendants().forEach(ProcessHandle::destroyForcibly);
            process.destroyForcibly();
            process = null;
            port = -1;
            userControlled = false;
            lastUrl = null;
            lastTitle = null;
        }
    }

    private void ensureStarted() throws Exception {
        if (process != null && process.isAlive() && port > 0) {
            return;
        }
        Path helper = locateHelper();
        if (helper == null) {
            throw new IllegalStateException("DEPENDENCY_MISSING playwright helper");
        }
        ProcessBuilder builder = new ProcessBuilder("node", helper.resolve("server.js").toString());
        builder.directory(helper.toFile());
        builder.redirectErrorStream(true);
        if (profileDirectory != null) {
            builder.environment().put("TRON_BROWSER_PROFILE", profileDirectory.toString());
        }
        process = builder.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
        long deadline = System.currentTimeMillis() + 45000;
        String line;
        while (System.currentTimeMillis() < deadline && (line = reader.readLine()) != null) {
            if (line.startsWith("DEPENDENCY_MISSING")) {
                throw new IllegalStateException("DEPENDENCY_MISSING playwright");
            }
            if (line.startsWith("LISTENING ")) {
                port = Integer.parseInt(line.substring("LISTENING ".length()).trim());
                String portFile = System.getenv("TRON_BROWSER_PORT_FILE");
                if (portFile != null && !portFile.isBlank()) {
                    Files.writeString(Path.of(portFile), Integer.toString(port));
                }
                Thread drain = new Thread(() -> {
                    try {
                        while (reader.readLine() != null) {
                            // Keep the helper output stream drained. Do not log it.
                        }
                    } catch (Exception ignored) {
                        // The helper stopped.
                    }
                }, "tron-playwright-log");
                drain.setDaemon(true);
                drain.start();
                return;
            }
        }
        throw new IllegalStateException("Playwright helper did not start");
    }

    private ProtocolMessage.Result post(String route, Map<String, Object> body) throws Exception {
        if (port < 0 && "/close".equals(route)) {
            ProtocolMessage.Result result = new ProtocolMessage.Result();
            result.setSuccess(true);
            result.setSummary("Browser was not running");
            return result;
        }
        byte[] json = mapper.writeValueAsBytes(body);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + route))
                .timeout(Duration.ofSeconds(40))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(json))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        JsonNode node = mapper.readTree(response.body());
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(node.path("ok").asBoolean(false) && response.statusCode() < 400);
        result.setSummary(result.isSuccess() ? "Browser action finished" : node.path("error").asText("Browser action failed"));
        result.setStdout(node.path("text").asText(null));
        result.setStderr(node.path("error").isMissingNode() ? null : node.path("error").asText());
        if (node.hasNonNull("url")) {
            String u = node.path("url").asText();
            result.setUrl(u);
            lastUrl = u;
        }
        if (node.hasNonNull("title")) {
            String t = node.path("title").asText();
            result.setTitle(t);
            lastTitle = t;
            if ("Browser action finished".equals(result.getSummary())) {
                result.setSummary(result.getTitle());
            }
        }
        if (node.has("visible")) {
            result.setStdout(Boolean.toString(node.path("visible").asBoolean()));
        }
        if (node.has("control")) {
            userControlled = "USER".equalsIgnoreCase(node.path("control").asText());
            result.setStdout(node.path("control").asText());
        }
        if (node.has("screenshotBase64")) {
            String shot = node.path("screenshotBase64").asText("");
            if (shot.startsWith("iVBORw0KGgo")) {
                result.setScreenshotBase64(shot);
                result.setMimeType("image/png");
                result.setSummary("Screenshot captured");
            } else {
                result.setSuccess(false);
                result.setScreenshotBase64(null);
                result.setSummary("Screenshot failed");
            }
        }
        if ("/screenshot".equals(route) && (result.getScreenshotBase64() == null || result.getScreenshotBase64().isBlank())) {
            result.setSuccess(false);
            result.setSummary("Screenshot failed");
        }
        return result;
    }

    private static ProtocolMessage.Result failure(String summary) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(false);
        result.setSummary(summary);
        return result;
    }

    static Path locateHelper() {
        java.util.List<Path> candidates = new java.util.ArrayList<>();
        candidates.add(Path.of("playwright-helper"));
        candidates.add(Path.of("desktop-agent", "playwright-helper"));
        try {
            Path code = Path.of(PlaywrightController.class.getProtectionDomain().getCodeSource().getLocation().toURI());
            if (Files.isDirectory(code)) {
                Path project = code.getParent() == null ? null : code.getParent().getParent();
                if (project != null) {
                    candidates.add(project.resolve("playwright-helper"));
                }
            }
        } catch (Exception ignored) {
            // The helper can still be found from the working directory.
        }
        Path directory = Path.of("").toAbsolutePath();
        for (int i = 0; i < 4 && directory != null; i++) {
            candidates.add(directory.resolve("playwright-helper"));
            candidates.add(directory.resolve("desktop-agent").resolve("playwright-helper"));
            directory = directory.getParent();
        }
        for (Path candidate : candidates) {
            if (Files.exists(candidate.resolve("server.js"))) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }
}
