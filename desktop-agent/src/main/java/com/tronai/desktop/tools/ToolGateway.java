package com.tronai.desktop.tools;

import com.tronai.desktop.browser.PlaywrightController;
import com.tronai.desktop.filesystem.FileTools;
import com.tronai.desktop.policy.ApprovalTokens;
import com.tronai.desktop.policy.CommandPolicyEngine;
import com.tronai.desktop.policy.CommandTokenizer;
import com.tronai.desktop.policy.Fingerprints;
import com.tronai.desktop.policy.PolicyDecision;
import com.tronai.desktop.policy.PolicyRequest;
import com.tronai.desktop.policy.RiskLevel;
import com.tronai.desktop.policy.WorkspaceGuard;
import com.tronai.desktop.process.ProcessRegistry;
import com.tronai.desktop.protocol.ProtocolMessage;
import com.tronai.desktop.runtime.OpenCodeLocalService;
import com.tronai.desktop.terminal.OsProcessRunner;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;

/**
 * Enforces workspace and approval policy, then performs the requested tool action.
 */
public final class ToolGateway {

    private final CommandPolicyEngine policy = new CommandPolicyEngine();
    private final FileTools files;
    private final OsProcessRunner processes;
    private final ProcessRegistry registry;
    private final PlaywrightController browser;
    private final OpenCodeLocalService openCode;
    private final BiConsumer<String, String> output;

    public ToolGateway(FileTools files, OsProcessRunner processes, ProcessRegistry registry,
                       PlaywrightController browser, BiConsumer<String, String> output) {
        this.files = files;
        this.processes = processes;
        this.registry = registry;
        this.browser = browser;
        this.openCode = new OpenCodeLocalService();
        this.output = output;
    }

    public ProtocolMessage.Result execute(String deviceUuid, String approvalKey, String workspace, ProtocolMessage message) {
        ProtocolMessage.Action action = message.getAction();
        if (action == null) {
            return failure("Action is missing");
        }
        ProtocolMessage.Arguments args = action.getArguments() == null ? new ProtocolMessage.Arguments() : action.getArguments();
        String tool = action.getTool() == null ? "" : action.getTool().toUpperCase();
        String operation = action.getOperation() == null ? "" : action.getOperation().toUpperCase();
        try {
            if ("GIT".equals(tool)) {
                args.setArgv(gitArgv(operation, args));
                args.setCommand(String.join(" ", args.getArgv()));
            }
            PolicyDecision decision = policy.evaluate(new PolicyRequest(
                    tool, operation, workspace, action.getWorkingDirectory(), args.getPath(),
                    args.getDestinationPath(), args.getArgv(), args.getCommand(), args.getUrl()));
            if (decision.risk() == RiskLevel.BLOCKED) {
                return failure(decision.reason());
            }
            String fingerprint = Fingerprints.of(tool, operation, action.getWorkingDirectory(), args.getPath(),
                    args.getDestinationPath(), args.getArgv(), args.getContent(), args.getUrl());
            if (decision.risk() == RiskLevel.REQUIRES_APPROVAL) {
                String denial = verifyApproval(deviceUuid, approvalKey, message, fingerprint);
                if (denial != null) {
                    return failure(denial);
                }
            }
            return switch (tool) {
                case "FILE" -> files.execute(operation, workspace, args);
                case "TERMINAL", "GIT" -> runCommand(workspace, action, args);
                case "PROCESS" -> process(workspace, message.getTaskId(), operation, action, args);
                case "BROWSER" -> browser.execute(operation, args);
                case "OPENCODE" -> openCode.execute(workspace, operation, args);
                default -> failure("Unknown tool");
            };
        } catch (WorkspaceGuard.WorkspaceViolation violation) {
            return failure(violation.getMessage());
        } catch (Exception e) {
            return failure(e.getMessage() == null ? "Tool failed" : e.getMessage());
        }
    }

    public void stopTask(String taskId) {
        processes.cancelCurrent();
        registry.stopTask(taskId);
        browser.stop();
    }

    public void releaseBrowser() {
        browser.stop();
    }

    private ProtocolMessage.Result runCommand(String workspace, ProtocolMessage.Action action, ProtocolMessage.Arguments args) {
        List<String> argv = args.getArgv();
        if (argv == null || argv.isEmpty()) {
            CommandTokenizer.Tokens tokens = CommandTokenizer.tokenize(args.getCommand());
            if (tokens.rejected()) {
                return failure(tokens.rejectedReason());
            }
            argv = tokens.argv();
        }
        Path cwd = WorkspaceGuard.requireInside(workspace,
                action.getWorkingDirectory() == null ? workspace : action.getWorkingDirectory(), "Working directory");
        int timeout = args.getTimeoutMs() == null ? 180_000 : args.getTimeoutMs();
        return processes.run(argv, cwd, timeout, output);
    }

    private ProtocolMessage.Result process(String workspace, String taskId, String operation,
                                           ProtocolMessage.Action action, ProtocolMessage.Arguments args) throws Exception {
        if ("STOP_OWNED_PROCESS".equals(operation)) {
            if (args.getProcessId() == null) {
                return failure("processId is required");
            }
            boolean stopped = registry.stop(args.getProcessId(), taskId);
            ProtocolMessage.Result result = new ProtocolMessage.Result();
            result.setSuccess(stopped);
            result.setSummary(stopped ? "Stopped owned process" : "Process is not owned by this task");
            result.setProcessId(args.getProcessId());
            return result;
        }
        if (!"START_PROCESS".equals(operation)) {
            return failure("Unknown process operation");
        }
        List<String> argv = args.getArgv() == null ? List.of() : args.getArgv();
        Path cwd = WorkspaceGuard.requireInside(workspace,
                action.getWorkingDirectory() == null ? workspace : action.getWorkingDirectory(), "Working directory");
        OsProcessRunner.Owned owned = processes.startDetached(argv, cwd, taskId);
        registry.track(owned);
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(true);
        result.setProcessId(owned.process().pid());
        result.setSummary("Started process " + owned.process().pid());
        return result;
    }

    private static List<String> gitArgv(String operation, ProtocolMessage.Arguments args) {
        List<String> argv = new ArrayList<>();
        argv.add("git");
        switch (operation) {
            case "STATUS" -> argv.add("status");
            case "DIFF" -> argv.add("diff");
            case "LOG" -> argv.addAll(List.of("log", "-n", "20", "--oneline"));
            case "BRANCH" -> argv.add("branch");
            case "COMMIT" -> {
                argv.add("commit");
                argv.add("-m");
                argv.add(args.getText() == null ? "TRON desktop agent commit" : args.getText());
            }
            case "PUSH" -> {
                argv.add("push");
                if (args.getArgv() != null) {
                    for (String arg : args.getArgv()) {
                        if ("--force".equals(arg) || "-f".equals(arg) || "--force-with-lease".equals(arg)) {
                            throw new IllegalArgumentException("Force push is blocked");
                        }
                        if (!"git".equals(arg) && !"push".equals(arg)) {
                            argv.add(arg);
                        }
                    }
                }
            }
            default -> throw new IllegalArgumentException("Unknown git operation");
        }
        return argv;
    }

    private static String verifyApproval(String deviceUuid, String approvalKey, ProtocolMessage message, String fingerprint) {
        ProtocolMessage.Action action = message.getAction();
        if (action.getApprovalId() == null || action.getApprovalMac() == null || action.getApprovalExpiresAt() == null) {
            return "Dangerous action is waiting for approval";
        }
        if (action.getFingerprint() != null && !action.getFingerprint().equals(fingerprint)) {
            return "Approval does not match this action";
        }
        long expires;
        try {
            expires = Long.parseLong(action.getApprovalExpiresAt());
        } catch (NumberFormatException e) {
            return "Approval expiry is invalid";
        }
        if (expires < Instant.now().toEpochMilli()) {
            return "Approval has expired";
        }
        if (approvalKey == null || approvalKey.isBlank()) {
            return "Device approval key is missing";
        }
        String expected = ApprovalTokens.mac(approvalKey, deviceUuid, message.getTaskId(), message.getActionId(),
                fingerprint, action.getApprovalExpiresAt());
        if (!ApprovalTokens.matches(expected, action.getApprovalMac())) {
            return "Approval signature is invalid";
        }
        return null;
    }

    private static ProtocolMessage.Result failure(String summary) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(false);
        result.setSummary(summary);
        return result;
    }
}
