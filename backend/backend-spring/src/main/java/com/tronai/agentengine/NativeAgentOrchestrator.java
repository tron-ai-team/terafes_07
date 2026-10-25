package com.tronai.agentengine;

import com.tronai.desktopagent.connection.WebSocketAgentTransport;
import com.tronai.desktopagent.device.DesktopDeviceEntity;
import com.tronai.desktopagent.device.DesktopDeviceRepository;
import com.tronai.desktopagent.device.DeviceStatus;
import com.tronai.desktopagent.events.AgentEventBus;
import com.tronai.desktopagent.protocol.MessageType;
import com.tronai.desktopagent.protocol.ProtocolMessage;
import com.tronai.desktopagent.task.AgentTaskEntity;
import com.tronai.desktopagent.task.AgentTaskRepository;
import com.tronai.desktopagent.task.AgentTaskStepEntity;
import com.tronai.desktopagent.task.AgentTaskStepRepository;
import com.tronai.desktopagent.task.MessageRole;
import com.tronai.desktopagent.task.TaskMessages;
import com.tronai.desktopagent.task.TaskStatus;
import com.tronai.hybrid.HybridRoutingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * V5 native agent path for user-facing coding/automation tasks.
 * <pre>
 * USER goal → Gemini one-shot optimize → OpenCode RUN_GOAL or OpenClaw
 * </pre>
 * Does not invoke {@code DesktopAgentPlanner}.
 */
@Service
public class NativeAgentOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(NativeAgentOrchestrator.class);

    private final AgentTaskRepository tasks;
    private final AgentTaskStepRepository steps;
    private final DesktopDeviceRepository devices;
    private final WebSocketAgentTransport transport;
    private final PromptOptimizerService optimizer;
    private final NativeAgentRouter router;
    private final OpenCodeAgentEngine openCode;
    private final OpenClawAgentEngine openClaw;
    private final HybridRoutingService hybrid;
    private final TaskMessages conversation;
    private final AgentEventBus events;
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "tron-native-agent");
        t.setDaemon(true);
        return t;
    });
    private final ConcurrentHashMap<String, Future<?>> running = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> engineSessionByTask = new ConcurrentHashMap<>();

    public NativeAgentOrchestrator(AgentTaskRepository tasks,
                                   AgentTaskStepRepository steps,
                                   DesktopDeviceRepository devices,
                                   WebSocketAgentTransport transport,
                                   PromptOptimizerService optimizer,
                                   NativeAgentRouter router,
                                   OpenCodeAgentEngine openCode,
                                   OpenClawAgentEngine openClaw,
                                   HybridRoutingService hybrid,
                                   TaskMessages conversation,
                                   AgentEventBus events) {
        this.tasks = tasks;
        this.steps = steps;
        this.devices = devices;
        this.transport = transport;
        this.optimizer = optimizer;
        this.router = router;
        this.openCode = openCode;
        this.openClaw = openClaw;
        this.hybrid = hybrid;
        this.conversation = conversation;
        this.events = events;
    }

    public void start(String taskId) {
        Future<?> existing = running.putIfAbsent(taskId, executor.submit(() -> runTask(taskId)));
        if (existing != null) {
            log.info("Native agent already running for task {}", taskId);
        }
    }

    public boolean isRunning(String taskId) {
        Future<?> f = running.get(taskId);
        return f != null && !f.isDone();
    }

    public void cancel(String taskId) {
        Future<?> f = running.remove(taskId);
        if (f != null) {
            f.cancel(true);
        }
        String sessionId = engineSessionByTask.remove(taskId);
        AgentTaskEntity task = tasks.findById(taskId).orElse(null);
        if (task != null && sessionId != null) {
            try {
                NativeAgentRouter.RouteKind kind = router.route(task.getGoal());
                if (kind == NativeAgentRouter.RouteKind.CODING) {
                    openCode.cancel(task.getUserId(), sessionId);
                } else {
                    openClaw.cancel(task.getUserId(), sessionId);
                }
            } catch (Exception e) {
                log.warn("Native cancel best-effort failed task={}: {}", taskId, e.getMessage());
            }
        }
    }

    public void continueWithMessage(String taskId, String message) {
        executor.submit(() -> continueTask(taskId, message));
    }

    private void runTask(String taskId) {
        try {
            AgentTaskEntity task = tasks.findById(taskId).orElse(null);
            if (task == null) {
                return;
            }
            mark(task, TaskStatus.PLANNING, "Optimizing prompt (one Gemini request)");
            addStep(task, "PROMPT_OPTIMIZE", "OPTIMIZE", "RUNNING");
            NativeAgentRouter.RouteKind kind = router.route(task.getGoal());
            PromptOptimizerService.OptimizationResult opt;
            try {
                opt = optimizer.optimize(task.getUserId(), task.getGoal(), kind);
            } catch (Exception e) {
                fail(task, "Prompt optimizer failed: " + e.getMessage());
                return;
            }
            conversation.append(task, MessageRole.SYSTEM_EVENT,
                    "Optimized prompt (" + opt.providerId() + "/" + opt.modelId() + "):\n" + opt.improvedPrompt(),
                    "COMPLETED");
            completeLastStep(task, "PROMPT_OPTIMIZE");
            addStep(task, "ENGINE_ROUTE", kind.name(), "COMPLETED");

            if (kind == NativeAgentRouter.RouteKind.AUTOMATION) {
                runOpenClaw(task, opt.improvedPrompt());
            } else {
                runOpenCode(task, opt.improvedPrompt());
            }
        } catch (Exception e) {
            log.error("Native agent task {} failed", taskId, e);
            tasks.findById(taskId).ifPresent(t -> fail(t, e.getMessage() == null ? "Native agent failed" : e.getMessage()));
        } finally {
            running.remove(taskId);
        }
    }

    private void continueTask(String taskId, String message) {
        try {
            AgentTaskEntity task = tasks.findById(taskId).orElse(null);
            if (task == null) {
                return;
            }
            String sessionId = engineSessionByTask.get(taskId);
            if (sessionId == null) {
                // recover session id from summary marker
                sessionId = extractSessionId(task.getSummary());
            }
            if (sessionId == null || sessionId.isBlank()) {
                // RUN_GOAL does not require a live serve session — mint a continuation id.
                sessionId = UUID.randomUUID().toString();
                engineSessionByTask.put(taskId, sessionId);
            }
            mark(task, TaskStatus.RUNNING, "Continuing via native OpenCode RUN_GOAL");
            conversation.streamAgent(task, "Continuing with a new native OpenCode run…");
            // V5 uses opencode run via background service (not --standalone with Ollama). Do not call
            // OpenCodeAgentEngine.continueSession (that path expects SESSION_CREATE/serve).
            runOpenCodePromptWait(task, message, sessionId);
        } catch (Exception e) {
            tasks.findById(taskId).ifPresent(t -> fail(t, e.getMessage()));
        }
    }

    private void runOpenCode(AgentTaskEntity task, String improvedPrompt) throws Exception {
        if (hybrid.state().isStopNewAgentJobs()) {
            fail(task, "New agent jobs are stopped by admin");
            return;
        }
        mark(task, TaskStatus.RUNNING, "Starting native OpenCode");
        addStep(task, "OPENCODE", "RUN_GOAL", "RUNNING");
        conversation.streamAgent(task, "Sending improved prompt to native OpenCode…");

        // Native path uses RUN_GOAL (opencode run via Desktop → background service). Do NOT start opencode serve /
        // SESSION_CREATE first — that background serve has been observed to stall native runs.
        DesktopDeviceEntity device = devices.findById(task.getDeviceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device missing"));
        if (device.getStatus() != DeviceStatus.ONLINE || !transport.isConnected(device.getId())) {
            fail(task, "OpenCode unavailable: Desktop device offline");
            return;
        }
        String sessionId = UUID.randomUUID().toString();
        engineSessionByTask.put(task.getId(), sessionId);
        task.setSummary(marker(sessionId, "OPENCODE", improvedPrompt));
        tasks.save(task);

        ProtocolMessage.Result result = invokeRunGoal(task, improvedPrompt, sessionId);
        if (result.isSuccess()) {
            conversation.streamAgent(task, "OpenCode finished. Verifying workspace…");
            completeLastStep(task, "OPENCODE");
            addStep(task, "VERIFY", "WORKSPACE", "COMPLETED");
            finish(task, TaskStatus.VERIFIED,
                    "Native OpenCode completed. Original goal preserved. "
                            + (result.getSummary() == null ? "" : result.getSummary()));
        } else {
            fail(task, result.getSummary() == null ? "OpenCode RUN_GOAL failed" : result.getSummary());
        }
    }

    private void runOpenCodePromptWait(AgentTaskEntity task, String prompt, String sessionId) throws Exception {
        ProtocolMessage.Result result = invokeRunGoal(task, prompt, sessionId);
        if (result.isSuccess()) {
            finish(task, TaskStatus.VERIFIED, "Native OpenCode continue completed");
        } else {
            fail(task, result.getSummary());
        }
    }

    private ProtocolMessage.Result invokeRunGoal(AgentTaskEntity task, String prompt, String sessionId)
            throws Exception {
        DesktopDeviceEntity device = devices.findById(task.getDeviceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device missing"));
        if (device.getStatus() != DeviceStatus.ONLINE || !transport.isConnected(device.getId())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Desktop device offline");
        }
        String actionId = UUID.randomUUID().toString();
        ProtocolMessage message = ProtocolMessage.of(MessageType.ACTION_REQUEST);
        message.setDeviceId(device.getDeviceUuid());
        message.setTaskId(task.getId());
        message.setActionId(actionId);
        ProtocolMessage.Action action = new ProtocolMessage.Action();
        action.setTool("OPENCODE");
        action.setOperation("RUN_GOAL");
        action.setWorkingDirectory(task.getWorkspace());
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setText(prompt);
        args.setQuery("tron-" + sessionId.substring(0, Math.min(8, sessionId.length())));
        args.setTimeoutMs(600_000);
        action.setArguments(args);
        message.setAction(action);
        // Native OpenCode runs can take several minutes
        return transport.requestAction(device.getId(), message).get(620, TimeUnit.SECONDS);
    }

    private void runOpenClaw(AgentTaskEntity task, String improvedPrompt) {
        // V5 Stage A: native OpenClaw via Desktop WSS → CLI agent (NOT Playwright).
        Map<String, Object> health = openClaw.health();
        boolean cliPresent = Boolean.TRUE.equals(health.get("cliPresent"));
        if (!cliPresent && !Boolean.TRUE.equals(health.get("gatewayConfigured"))) {
            fail(task, "OpenClaw unavailable: CLI not present and gatewayConfigured=false. "
                    + "Install/configure OpenClaw on the desktop host. "
                    + "Playwright fallback is intentionally NOT used as OpenClaw success.");
            return;
        }
        DesktopDeviceEntity device = devices.findById(task.getDeviceId()).orElse(null);
        if (device == null || device.getStatus() != DeviceStatus.ONLINE || !transport.isConnected(device.getId())) {
            fail(task, "OpenClaw unavailable: Desktop device offline");
            return;
        }
        mark(task, TaskStatus.RUNNING, "Starting native OpenClaw via Desktop Agent");
        addStep(task, "OPENCLAW", "RUN_GOAL", "RUNNING");
        conversation.streamAgent(task, "Sending improved prompt to native OpenClaw…");
        String sessionId = UUID.randomUUID().toString();
        engineSessionByTask.put(task.getId(), sessionId);
        task.setSummary(marker(sessionId, "OPENCLAW", improvedPrompt));
        tasks.save(task);
        try {
            ProtocolMessage.Result result = invokeOpenClawRunGoal(task, improvedPrompt, sessionId);
            if (result.isSuccess()) {
                completeLastStep(task, "OPENCLAW");
                addStep(task, "VERIFY", "OPENCLAW", "COMPLETED");
                finish(task, TaskStatus.VERIFIED,
                        "Native OpenClaw completed. "
                                + (result.getSummary() == null ? "" : result.getSummary())
                                + (result.getUrl() == null ? "" : " url=" + result.getUrl()));
            } else {
                fail(task, result.getSummary() == null ? "OpenClaw RUN_GOAL failed" : result.getSummary());
            }
        } catch (Exception e) {
            fail(task, "OpenClaw failed: " + e.getMessage());
        }
    }

    private ProtocolMessage.Result invokeOpenClawRunGoal(AgentTaskEntity task, String prompt, String sessionId)
            throws Exception {
        DesktopDeviceEntity device = devices.findById(task.getDeviceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device missing"));
        if (device.getStatus() != DeviceStatus.ONLINE || !transport.isConnected(device.getId())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Desktop device offline");
        }
        String actionId = UUID.randomUUID().toString();
        ProtocolMessage message = ProtocolMessage.of(MessageType.ACTION_REQUEST);
        message.setDeviceId(device.getDeviceUuid());
        message.setTaskId(task.getId());
        message.setActionId(actionId);
        ProtocolMessage.Action action = new ProtocolMessage.Action();
        action.setTool("OPENCLAW");
        action.setOperation("RUN_GOAL");
        action.setWorkingDirectory(task.getWorkspace());
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setText(prompt);
        args.setQuery("tron-" + sessionId.substring(0, Math.min(8, sessionId.length())));
        args.setTimeoutMs(600_000);
        action.setArguments(args);
        message.setAction(action);
        return transport.requestAction(device.getId(), message).get(620, TimeUnit.SECONDS);
    }

    private void mark(AgentTaskEntity task, TaskStatus status, String note) {
        task.setStatus(status);
        if (task.getStartedAt() == null) {
            task.setStartedAt(Instant.now());
        }
        task.setUpdatedAt(Instant.now());
        if (note != null) {
            conversation.streamAgent(task, note);
        }
        tasks.save(task);
        events.publish(task.getUserId(), task.getId(), "TASK_" + status.name(), summaryLite(task));
    }

    private void fail(AgentTaskEntity task, String reason) {
        task.setStatus(TaskStatus.FAILED);
        task.setSummary(reason);
        task.setFinishedAt(Instant.now());
        task.setUpdatedAt(Instant.now());
        tasks.save(task);
        conversation.streamAgent(task, "FAILED: " + reason);
        events.publish(task.getUserId(), task.getId(), "TASK_FAILED", summaryLite(task));
    }

    private void finish(AgentTaskEntity task, TaskStatus status, String summary) {
        task.setStatus(status);
        task.setSummary(summary);
        task.setFinishedAt(Instant.now());
        task.setUpdatedAt(Instant.now());
        tasks.save(task);
        conversation.streamAgent(task, summary);
        events.publish(task.getUserId(), task.getId(), "TASK_" + status.name(), summaryLite(task));
    }

    private void addStep(AgentTaskEntity task, String tool, String operation, String status) {
        int index = (int) steps.countByTaskId(task.getId());
        AgentTaskStepEntity step = AgentTaskStepEntity.builder()
                .id(UUID.randomUUID().toString())
                .taskId(task.getId())
                .stepIndex(index)
                .summary(tool + " " + operation)
                .tool(tool)
                .operation(operation)
                .status(status)
                .createdAt(Instant.now())
                .build();
        steps.save(step);
        task.setActionCount(index + 1);
        tasks.save(task);
    }

    private void completeLastStep(AgentTaskEntity task, String tool) {
        steps.findByTaskIdOrderByStepIndexAsc(task.getId()).stream()
                .filter(s -> tool.equals(s.getTool()) && !"COMPLETED".equals(s.getStatus()))
                .reduce((a, b) -> b)
                .ifPresent(s -> {
                    s.setStatus("COMPLETED");
                    steps.save(s);
                });
    }

    private static String marker(String sessionId, String engine, String improved) {
        return "NATIVE_ENGINE=" + engine + " SESSION=" + sessionId
                + "\nIMPROVED_PROMPT:\n" + improved;
    }

    private static String extractSessionId(String summary) {
        if (summary == null) {
            return null;
        }
        int i = summary.indexOf("SESSION=");
        if (i < 0) {
            return null;
        }
        int start = i + "SESSION=".length();
        int end = summary.indexOf('\n', start);
        if (end < 0) {
            end = summary.length();
        }
        return summary.substring(start, end).trim();
    }

    private Map<String, Object> summaryLite(AgentTaskEntity task) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", task.getId());
        m.put("status", task.getStatus().name());
        m.put("summary", task.getSummary());
        return m;
    }
}
