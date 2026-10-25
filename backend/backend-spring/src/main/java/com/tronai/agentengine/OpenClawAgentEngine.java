package com.tronai.agentengine;

import com.tronai.desktopagent.connection.WebSocketAgentTransport;
import com.tronai.desktopagent.device.DesktopDeviceEntity;
import com.tronai.desktopagent.device.DesktopDeviceRepository;
import com.tronai.desktopagent.device.DeviceStatus;
import com.tronai.desktopagent.policy.WorkspaceGuard;
import com.tronai.desktopagent.protocol.MessageType;
import com.tronai.desktopagent.protocol.ProtocolMessage;
import com.tronai.hybrid.HybridRoutingService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Browser agent engine.
 * <p>
 * Prefers a configured OpenClaw gateway when available. Until gateway auth is configured,
 * executes real browser actions through the paired desktop Playwright tool over WSS
 * (OPEN_URL / INSPECT / SCREENSHOT) — never invents browser events.
 */
@Component
public class OpenClawAgentEngine implements AgentEngine {

    private final AgentEngineSessionRepository sessions;
    private final HybridRoutingService hybrid;
    private final DesktopDeviceRepository devices;
    private final WebSocketAgentTransport transport;

    @Value("${tron.agent.openclaw.enabled:true}")
    private boolean enabled;

    @Value("${tron.agent.openclaw.gateway-url:}")
    private String gatewayUrl;

    @Value("${tron.agent.openclaw.gateway-token:}")
    private String gatewayToken;

    public OpenClawAgentEngine(AgentEngineSessionRepository sessions,
                               HybridRoutingService hybrid,
                               DesktopDeviceRepository devices,
                               WebSocketAgentTransport transport) {
        this.sessions = sessions;
        this.hybrid = hybrid;
        this.devices = devices;
        this.transport = transport;
    }

    @Override
    public AgentEngineType type() {
        return AgentEngineType.OPENCLAW;
    }

    @Override
    public Map<String, Object> health() {
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("engine", type().name());
        h.put("enabled", enabled);
        boolean cli = probeCli();
        boolean gateway = gatewayConfigured();
        h.put("cliPresent", cli);
        h.put("gatewayConfigured", gateway);
        h.put("gatewayUrlSet", gatewayUrl != null && !gatewayUrl.isBlank());
        h.put("playwrightFallback", true);
        // V5 Stage A: agent-tasks automation uses Desktop WSS → OpenClaw CLI (not Playwright).
        h.put("executionModel", cli ? "DESKTOP_OPENCLAW_CLI"
                : gateway ? "OPENCLAW_GATEWAY" : "DESKTOP_PLAYWRIGHT_WSS");
        h.put("status", cli ? "CLI_PRESENT"
                : gateway ? "GATEWAY_CONFIGURED"
                : "PLAYWRIGHT_AVAILABLE_NOT_OPENCLAW");
        h.put("note", cli
                ? "Native automation via Desktop OPENCLAW RUN_GOAL (CLI). Playwright remains a separate deterministic tool."
                : gateway
                ? "OpenClaw gateway URL configured — prefer desktop CLI path for agent-tasks."
                : "OpenClaw CLI missing. Playwright exists but is NOT counted as OpenClaw success.");
        return h;
    }

    @Override
    public Map<String, Object> createSession(Long userId, String goal, String workspacePath, String planId) {
        return createSession(userId, goal, workspacePath, planId, null);
    }

    @Override
    public Map<String, Object> createSession(Long userId, String goal, String workspacePath, String planId, Long deviceId) {
        if (hybrid.state().isStopNewAgentJobs()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "New agent jobs are stopped by admin");
        }
        DesktopDeviceEntity device = requireOnlineDevice(userId, deviceId);
        String workspace = bindWorkspace(device, workspacePath);

        AgentEngineSessionEntity s = new AgentEngineSessionEntity();
        s.setId(UUID.randomUUID().toString());
        s.setUserId(userId);
        s.setDeviceId(device.getId());
        s.setPlanId(planId);
        s.setEngineType(AgentEngineType.OPENCLAW);
        s.setGoal(goal);
        s.setWorkspacePath(workspace);
        s.setStatus(gatewayConfigured() ? "READY_GATEWAY" : "READY_PLAYWRIGHT");
        s.setCreatedAt(Instant.now());
        s.setUpdatedAt(Instant.now());
        sessions.save(s);
        Map<String, Object> out = view(s);
        out.put("health", health());
        return out;
    }

    @Override
    public Map<String, Object> startTask(Long userId, String sessionId, String prompt) {
        return runBrowser(userId, sessionId, prompt, true);
    }

    @Override
    public Map<String, Object> continueSession(Long userId, String sessionId, String prompt) {
        return runBrowser(userId, sessionId, prompt, false);
    }

    @Override
    public Map<String, Object> status(Long userId, String sessionId) {
        Map<String, Object> out = view(require(userId, sessionId));
        out.put("health", health());
        return out;
    }

    @Override
    public Map<String, Object> cancel(Long userId, String sessionId) {
        AgentEngineSessionEntity s = require(userId, sessionId);
        if (s.getDeviceId() != null) {
            devices.findById(s.getDeviceId()).ifPresent(device -> {
                if (transport.isConnected(device.getId())) {
                    try {
                        browserAction(device, s.getId(), s.getWorkspacePath(), "CLOSE", new ProtocolMessage.Arguments());
                    } catch (Exception ignored) {
                        // best-effort
                    }
                }
            });
        }
        s.setStatus("CANCELLED");
        s.setUpdatedAt(Instant.now());
        sessions.save(s);
        return view(s);
    }

    private Map<String, Object> runBrowser(Long userId, String sessionId, String prompt, boolean start) {
        AgentEngineSessionEntity s = require(userId, sessionId);
        DesktopDeviceEntity device = requireOnlineDevice(userId, s.getDeviceId());

        if (gatewayConfigured()) {
            // Gateway path reserved: do not invent events. Surface explicit status until client lands.
            s.setStatus("GATEWAY_PENDING");
            s.setLastError("OpenClaw gateway URL/token present but live gateway RPC client is not yet wired. "
                    + "Use Playwright fallback by clearing tron.agent.openclaw.gateway-url.");
            s.setUpdatedAt(Instant.now());
            sessions.save(s);
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                    "OpenClaw gateway client pending — clear gateway-url to use Playwright WSS fallback");
        }

        String url = extractUrl(prompt);
        if (url == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Browser prompt must include an http(s) URL");
        }
        try {
            ProtocolMessage.Arguments openArgs = new ProtocolMessage.Arguments();
            openArgs.setUrl(url);
            ProtocolMessage.Result opened = browserAction(device, s.getId(), s.getWorkspacePath(), "OPEN_URL", openArgs);
            if (!opened.isSuccess()) {
                s.setStatus("FAILED");
                s.setLastError(opened.getSummary());
                sessions.save(s);
                return failView(s, opened);
            }
            ProtocolMessage.Result inspect = browserAction(device, s.getId(), s.getWorkspacePath(),
                    "INSPECT", new ProtocolMessage.Arguments());
            ProtocolMessage.Result shot = browserAction(device, s.getId(), s.getWorkspacePath(),
                    "SCREENSHOT", new ProtocolMessage.Arguments());
            boolean ok = inspect.isSuccess() && shot.isSuccess()
                    && shot.getScreenshotBase64() != null && !shot.getScreenshotBase64().isBlank();
            s.setStatus(ok ? (start ? "RUNNING" : "CONTINUED") : "FAILED");
            if (!ok) {
                s.setLastError("Missing real title/screenshot evidence");
            }
            s.setUpdatedAt(Instant.now());
            sessions.save(s);
            Map<String, Object> out = view(s);
            out.put("url", opened.getUrl() != null ? opened.getUrl() : url);
            out.put("title", inspect.getSummary());
            out.put("inspectStdout", inspect.getStdout());
            out.put("screenshotPresent", shot.getScreenshotBase64() != null && !shot.getScreenshotBase64().isBlank());
            out.put("screenshotBytesApprox", shot.getScreenshotBase64() == null ? 0 : shot.getScreenshotBase64().length());
            out.put("executionModel", "DESKTOP_PLAYWRIGHT_WSS");
            out.put("note", "Evidence from desktop Playwright — not invented.");
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            s.setStatus("FAILED");
            s.setLastError(e.getMessage());
            s.setUpdatedAt(Instant.now());
            sessions.save(s);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Browser execution failed: " + e.getMessage());
        }
    }

    private Map<String, Object> failView(AgentEngineSessionEntity s, ProtocolMessage.Result opened) {
        Map<String, Object> out = view(s);
        out.put("desktopSuccess", false);
        out.put("summary", opened.getSummary());
        return out;
    }

    private ProtocolMessage.Result browserAction(DesktopDeviceEntity device,
                                                 String sessionId,
                                                 String workspace,
                                                 String operation,
                                                 ProtocolMessage.Arguments args) throws Exception {
        String actionId = UUID.randomUUID().toString();
        ProtocolMessage message = ProtocolMessage.of(MessageType.ACTION_REQUEST);
        message.setDeviceId(device.getDeviceUuid());
        message.setTaskId("engine-" + sessionId);
        message.setActionId(actionId);
        ProtocolMessage.Action action = new ProtocolMessage.Action();
        action.setTool("BROWSER");
        action.setOperation(operation);
        action.setWorkingDirectory(workspace);
        action.setArguments(args);
        message.setAction(action);
        return transport.requestAction(device.getId(), message).get(120, TimeUnit.SECONDS);
    }

    private DesktopDeviceEntity requireOnlineDevice(Long userId, Long deviceId) {
        DesktopDeviceEntity device;
        if (deviceId == null) {
            device = devices.findAll().stream()
                    .filter(d -> userId.equals(d.getUserId()))
                    .filter(d -> d.getStatus() == DeviceStatus.ONLINE || d.getStatus() == DeviceStatus.BUSY)
                    .filter(d -> transport.isConnected(d.getId()))
                    .filter(d -> d.getRevokedAt() == null)
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "deviceId required — OpenClaw/browser runs on paired desktop via WSS"));
        } else {
            device = devices.findByIdAndUserId(deviceId, userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
        }
        if (device.getRevokedAt() != null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Device credential revoked");
        }
        if (!transport.isConnected(device.getId())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Device not connected");
        }
        return device;
    }

    private String bindWorkspace(DesktopDeviceEntity device, String workspacePath) {
        String selected = workspacePath == null || workspacePath.isBlank()
                ? device.getAllowedWorkspace() : workspacePath;
        if (device.getAllowedWorkspace() == null || device.getAllowedWorkspace().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Device has no allowedWorkspace");
        }
        try {
            return WorkspaceGuard.requireInside(device.getAllowedWorkspace(), selected, "Browser workspace")
                    .toString();
        } catch (WorkspaceGuard.WorkspaceViolation v) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, v.getMessage());
        }
    }

    private boolean gatewayConfigured() {
        return gatewayUrl != null && !gatewayUrl.isBlank()
                && gatewayToken != null && !gatewayToken.isBlank();
    }

    private boolean probeCli() {
        try {
            String cli = System.getenv("TRON_OPENCLAW_CLI");
            ProcessBuilder pb = cli != null && !cli.isBlank()
                    ? new ProcessBuilder(cli, "--version")
                    : new ProcessBuilder("openclaw", "--version");
            Process p = pb.redirectErrorStream(true).start();
            boolean finished = p.waitFor(5, TimeUnit.SECONDS);
            return finished && p.exitValue() == 0;
        } catch (Exception e) {
            String home = System.getenv("USERPROFILE");
            if (home == null) {
                home = System.getProperty("user.home");
            }
            if (home != null) {
                try {
                    Process p = new ProcessBuilder(
                            home + "\\AppData\\Roaming\\npm\\openclaw.cmd", "--version")
                            .redirectErrorStream(true).start();
                    return p.waitFor(5, TimeUnit.SECONDS) && p.exitValue() == 0;
                } catch (Exception ignored) {
                    return false;
                }
            }
            return false;
        }
    }

    private static String extractUrl(String prompt) {
        if (prompt == null) {
            return null;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(https?://[^\\s\\]\\)>;,\"']+)").matcher(prompt);
        if (!m.find()) {
            return null;
        }
        // Strip trailing punctuation commonly glued onto URLs in prose prompts.
        return m.group(1).replaceAll("[)\\],.;:!?]+$", "");
    }

    private AgentEngineSessionEntity require(Long userId, String sessionId) {
        return sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
    }

    private Map<String, Object> view(AgentEngineSessionEntity s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("engine", s.getEngineType().name());
        m.put("status", s.getStatus());
        m.put("deviceId", s.getDeviceId());
        m.put("goal", s.getGoal());
        m.put("workspacePath", s.getWorkspacePath());
        m.put("lastError", s.getLastError());
        m.put("createdAt", s.getCreatedAt());
        m.put("updatedAt", s.getUpdatedAt());
        return m;
    }
}
