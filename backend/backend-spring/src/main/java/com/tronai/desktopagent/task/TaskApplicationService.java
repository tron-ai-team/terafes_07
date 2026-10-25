package com.tronai.desktopagent.task;

import com.tronai.desktopagent.DesktopAgentException;
import com.tronai.desktopagent.approval.AgentApprovalEntity;
import com.tronai.desktopagent.approval.AgentApprovalRepository;
import com.tronai.desktopagent.approval.ApprovalService;
import com.tronai.agentengine.NativeAgentOrchestrator;
import com.tronai.desktopagent.connection.WebSocketAgentTransport;
import com.tronai.desktopagent.device.DesktopDeviceEntity;
import com.tronai.desktopagent.device.DeviceService;
import com.tronai.desktopagent.device.DeviceStatus;
import com.tronai.desktopagent.events.AgentEventBus;
import com.tronai.desktopagent.policy.SecretRedactor;
import com.tronai.desktopagent.policy.WorkspaceGuard;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class TaskApplicationService {

    private final AgentTaskRepository tasks;
    private final AgentTaskStepRepository steps;
    private final AgentActionExecutionRepository executions;
    private final AgentFileChangeRepository fileChanges;
    private final AgentApprovalRepository approvals;
    private final DeviceService devices;
    private final WebSocketAgentTransport transport;
    private final TaskOrchestrator orchestrator;
    private final NativeAgentOrchestrator nativeOrchestrator;
    private final TaskControl control;
    private final ApprovalService approvalService;
    private final AgentEventBus events;
    private final TaskMessages conversation;
    private final AgentBrowserSessionRepository browserSessions;
    private final com.tronai.ai.profile.AiProfileResolver aiProfileResolver;

    public TaskApplicationService(AgentTaskRepository tasks,
                                  AgentTaskStepRepository steps,
                                  AgentActionExecutionRepository executions,
                                  AgentFileChangeRepository fileChanges,
                                  AgentApprovalRepository approvals,
                                  DeviceService devices,
                                  WebSocketAgentTransport transport,
                                  TaskOrchestrator orchestrator,
                                  NativeAgentOrchestrator nativeOrchestrator,
                                  TaskControl control,
                                  ApprovalService approvalService,
                                  AgentEventBus events,
                                  TaskMessages conversation,
                                  AgentBrowserSessionRepository browserSessions,
                                  com.tronai.ai.profile.AiProfileResolver aiProfileResolver) {
        this.tasks = tasks;
        this.steps = steps;
        this.executions = executions;
        this.fileChanges = fileChanges;
        this.approvals = approvals;
        this.devices = devices;
        this.transport = transport;
        this.orchestrator = orchestrator;
        this.nativeOrchestrator = nativeOrchestrator;
        this.control = control;
        this.approvalService = approvalService;
        this.events = events;
        this.conversation = conversation;
        this.browserSessions = browserSessions;
        this.aiProfileResolver = aiProfileResolver;
    }

    @Transactional
    public Map<String, Object> create(Long userId, Long deviceId, String goal, String workspace) {
        return create(userId, deviceId, goal, workspace, null);
    }

    @Transactional
    public Map<String, Object> create(Long userId, Long deviceId, String goal, String workspace, String aiProfile) {
        if (goal == null || goal.isBlank()) {
            throw new DesktopAgentException(HttpStatus.BAD_REQUEST, "goal is required");
        }
        DesktopDeviceEntity device = devices.requireOwned(userId, deviceId);
        if (device.getStatus() == DeviceStatus.REVOKED) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Device is revoked");
        }
        if (!transport.isConnected(device.getId())) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Device is offline");
        }
        if (device.getAllowedWorkspace() == null || device.getAllowedWorkspace().isBlank()) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Device has no allowed workspace");
        }
        String selected = workspace == null || workspace.isBlank() ? device.getAllowedWorkspace() : workspace;
        try {
            selected = WorkspaceGuard.requireInside(device.getAllowedWorkspace(), selected, "Task workspace").toString();
        } catch (WorkspaceGuard.WorkspaceViolation violation) {
            throw new DesktopAgentException(HttpStatus.FORBIDDEN, violation.getMessage());
        }
        long active = tasks.countByDeviceIdAndStatusIn(device.getId(), List.of(
                TaskStatus.QUEUED, TaskStatus.PLANNING, TaskStatus.RUNNING, TaskStatus.WAITING_APPROVAL,
                TaskStatus.WAITING_USER, TaskStatus.PAUSED));
        if (active > 0) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Device already has an active task");
        }
        String resolvedProfile = aiProfileResolver.resolveForUser(userId, aiProfile).name();
        AgentTaskEntity task = AgentTaskEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .deviceId(device.getId())
                .goal(goal.trim())
                .aiProfile(resolvedProfile)
                .status(TaskStatus.QUEUED)
                .controlMode(ControlMode.AGENT)
                .workspace(selected)
                .actionCount(0)
                .needsReinspect(false)
                .build();
        tasks.save(task);
        conversation.append(task, MessageRole.USER, task.getGoal(), "ACCEPTED");
        String taskId = task.getId();
        // V5: coding/automation uses native OpenCode/OpenClaw — never DesktopAgentPlanner.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    nativeOrchestrator.start(taskId);
                }
            });
        } else {
            nativeOrchestrator.start(taskId);
        }
        return detail(userId, task.getId());
    }

    public List<Map<String, Object>> list(Long userId) {
        return tasks.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::summary).toList();
    }

    public Map<String, Object> detail(Long userId, String taskId) {
        AgentTaskEntity task = require(userId, taskId);
        Map<String, Object> body = summary(task);
        body.put("steps", steps.findByTaskIdOrderByStepIndexAsc(taskId).stream().map(step -> {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("id", step.getId());
            view.put("index", step.getStepIndex());
            view.put("summary", step.getSummary());
            view.put("tool", step.getTool());
            view.put("operation", step.getOperation());
            view.put("status", step.getStatus());
            view.put("createdAt", step.getCreatedAt() == null ? null : step.getCreatedAt().toString());
            return view;
        }).toList());
        body.put("executions", executions.findByTaskIdOrderByCreatedAtAsc(taskId).stream().map(execution -> {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("id", execution.getId());
            view.put("actionId", execution.getActionId());
            view.put("tool", execution.getTool());
            view.put("operation", execution.getOperation());
            view.put("risk", execution.getRisk());
            view.put("status", execution.getStatus());
            view.put("exitCode", execution.getExitCode());
            view.put("durationMs", execution.getDurationMs());
            view.put("stdout", SecretRedactor.truncate(execution.getStdoutText(), 8000));
            view.put("stderr", SecretRedactor.truncate(execution.getStderrText(), 8000));
            view.put("fingerprint", execution.getFingerprint());
            return view;
        }).toList());
        body.put("approvals", approvals.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(approvalService::toView).toList());
        body.put("messages", conversation.list(taskId).stream().map(message -> {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("id", message.getId());
            view.put("role", message.getRole().name());
            view.put("content", message.getContent());
            view.put("status", message.getStatus());
            view.put("createdAt", message.getCreatedAt() == null ? null : message.getCreatedAt().toString());
            return view;
        }).toList());
        browserSessions.findFirstByTaskIdOrderByCreatedAtDesc(taskId).ifPresent(session -> body.put("browser", browserView(session)));
        body.put("fileChanges", fileChanges.findByTaskIdOrderByCreatedAtAsc(taskId).stream().map(change -> {
            Map<String, Object> view = new LinkedHashMap<>();
            view.put("path", change.getPath());
            view.put("changeType", change.getChangeType());
            view.put("sha256", change.getSha256());
            view.put("sizeBytes", change.getSizeBytes());
            return view;
        }).toList());
        return body;
    }

    @Transactional
    public Map<String, Object> pause(Long userId, String taskId) {
        AgentTaskEntity task = requireActive(userId, taskId);
        task.setStatus(TaskStatus.PAUSED);
        tasks.save(task);
        control.pause(taskId);
        orchestrator.notifyPaused(taskId, false);
        publish(task);
        return summary(task);
    }

    @Transactional
    public Map<String, Object> postMessage(Long userId, String taskId, String message) {
        AgentTaskEntity task = require(userId, taskId);
        if (message == null || message.isBlank()) {
            throw new DesktopAgentException(HttpStatus.BAD_REQUEST, "message is required");
        }
        if (message.length() > 4000) {
            throw new DesktopAgentException(HttpStatus.BAD_REQUEST, "message is too long");
        }
        TaskStatus status = task.getStatus();
        if (status == TaskStatus.STOPPED || status == TaskStatus.QUEUED || status == TaskStatus.PLANNING
                || status == TaskStatus.RUNNING || status == TaskStatus.WAITING_APPROVAL) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Task cannot accept a message in its current state");
        }
        if (!transport.isConnected(task.getDeviceId())) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Device is offline");
        }
        AgentTaskMessageEntity saved = conversation.append(task, MessageRole.USER, message, "ACCEPTED");
        task.setStatus(TaskStatus.RUNNING);
        task.setControlMode(ControlMode.AGENT);
        task.setFinishedAt(null);
        tasks.save(task);
        String resumedId = task.getId();
        String msg = message;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                nativeOrchestrator.continueWithMessage(resumedId, msg);
            }
        });
        publish(task);
        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("taskId", task.getId());
        ack.put("messageId", saved.getId());
        ack.put("role", MessageRole.USER.name());
        ack.put("status", "ACCEPTED");
        ack.put("taskStatus", task.getStatus().name());
        ack.put("executionModel", "NATIVE_OPENCODE_CONTINUE");
        return ack;
    }

    @Transactional
    public Map<String, Object> resume(Long userId, String taskId) {
        AgentTaskEntity task = require(userId, taskId);
        if (task.getStatus() == TaskStatus.WAITING_USER) {
            postMessage(userId, taskId, "continue");
            return summary(tasks.findByIdAndUserId(taskId, userId).orElseThrow());
        }
        if (task.getStatus() != TaskStatus.PAUSED) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Task is not paused");
        }
        task.setStatus(TaskStatus.RUNNING);
        task.setControlMode(ControlMode.AGENT);
        task.setNeedsReinspect(true);
        tasks.save(task);
        String resumedId = task.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                control.resume(resumedId);
                orchestrator.notifyResumed(resumedId);
            }
        });
        publish(task);
        return summary(task);
    }

    @Transactional
    public Map<String, Object> stop(Long userId, String taskId) {
        AgentTaskEntity task = require(userId, taskId);
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.VERIFIED
                || task.getStatus() == TaskStatus.FAILED || task.getStatus() == TaskStatus.STOPPED) {
            orchestrator.releaseBrowser(taskId);
            return summary(task);
        }
        task.setStatus(TaskStatus.STOPPED);
        task.setSummary("Task stopped");
        tasks.save(task);
        control.stop(taskId);
        nativeOrchestrator.cancel(taskId);
        orchestrator.notifyStopped(taskId);
        publish(task);
        return summary(task);
    }

    @Transactional
    public Map<String, Object> takeControl(Long userId, String taskId) {
        AgentTaskEntity task = requireActive(userId, taskId);
        task.setStatus(TaskStatus.PAUSED);
        task.setControlMode(ControlMode.MANUAL);
        task.setSummary("Manual control");
        tasks.save(task);
        control.pause(taskId);
        orchestrator.notifyPaused(taskId, true);
        publish(task);
        return summary(task);
    }

    /** Device-initiated pause (JavaFX Pause button). Verifies device ownership. */
    @Transactional
    public void pauseFromDevice(Long deviceId, Long userId, String taskId) {
        AgentTaskEntity task = requireOwnedByDevice(deviceId, userId, taskId);
        if (isTerminal(task.getStatus())) {
            return;
        }
        pause(userId, taskId);
    }

    @Transactional
    public void stopFromDevice(Long deviceId, Long userId, String taskId) {
        AgentTaskEntity task = requireOwnedByDevice(deviceId, userId, taskId);
        if (isTerminal(task.getStatus())) {
            return;
        }
        stop(userId, taskId);
    }

    @Transactional
    public void takeControlFromDevice(Long deviceId, Long userId, String taskId) {
        requireOwnedByDevice(deviceId, userId, taskId);
        takeControl(userId, taskId);
    }

    @Transactional
    public void resumeFromDevice(Long deviceId, Long userId, String taskId) {
        requireOwnedByDevice(deviceId, userId, taskId);
        resume(userId, taskId);
    }

    private AgentTaskEntity requireOwnedByDevice(Long deviceId, Long userId, String taskId) {
        AgentTaskEntity task = require(userId, taskId);
        if (!Objects.equals(task.getDeviceId(), deviceId)) {
            throw new DesktopAgentException(HttpStatus.FORBIDDEN, "Task is not owned by this device");
        }
        return task;
    }

    private static boolean isTerminal(TaskStatus status) {
        return status == TaskStatus.COMPLETED || status == TaskStatus.VERIFIED
                || status == TaskStatus.FAILED || status == TaskStatus.STOPPED;
    }

    public Map<String, Object> approve(Long userId, String taskId, String approvalId) {
        AgentApprovalEntity approval = approvalService.decide(userId, taskId, approvalId, true);
        return approvalService.toView(approval);
    }

    public Map<String, Object> deny(Long userId, String taskId, String approvalId) {
        AgentApprovalEntity approval = approvalService.decide(userId, taskId, approvalId, false);
        return approvalService.toView(approval);
    }

    private AgentTaskEntity require(Long userId, String taskId) {
        return tasks.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new DesktopAgentException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    private AgentTaskEntity requireActive(Long userId, String taskId) {
        AgentTaskEntity task = require(userId, taskId);
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.VERIFIED
                || task.getStatus() == TaskStatus.FAILED || task.getStatus() == TaskStatus.STOPPED) {
            throw new DesktopAgentException(HttpStatus.CONFLICT, "Task is already finished");
        }
        return task;
    }

    private Map<String, Object> summary(AgentTaskEntity task) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", task.getId());
        view.put("deviceId", task.getDeviceId());
        view.put("goal", task.getGoal());
        view.put("aiProfile", task.getAiProfile());
        view.put("status", task.getStatus().name());
        view.put("controlMode", task.getControlMode().name());
        view.put("summary", task.getSummary());
        view.put("workspace", task.getWorkspace());
        view.put("actionCount", task.getActionCount());
        view.put("createdAt", task.getCreatedAt() == null ? null : task.getCreatedAt().toString());
        view.put("startedAt", task.getStartedAt() == null ? null : task.getStartedAt().toString());
        view.put("finishedAt", task.getFinishedAt() == null ? null : task.getFinishedAt().toString());
        return view;
    }

    private void publish(AgentTaskEntity task) {
        events.publish(task.getUserId(), task.getId(), "TASK_STATUS", summary(task));
    }

    private static Map<String, Object> browserView(AgentBrowserSessionEntity session) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", session.getId());
        view.put("taskId", session.getTaskId());
        view.put("deviceId", session.getDeviceId());
        view.put("state", session.getState().name());
        view.put("currentUrl", session.getCurrentUrl());
        view.put("title", session.getTitle());
        view.put("createdAt", session.getCreatedAt() == null ? null : session.getCreatedAt().toString());
        view.put("lastActivity", session.getLastActivity() == null ? null : session.getLastActivity().toString());
        return view;
    }
}
