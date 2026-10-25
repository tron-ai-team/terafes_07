package com.tronai.desktop.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.desktop.browser.PlaywrightController;
import com.tronai.desktop.filesystem.FileTools;
import com.tronai.desktop.policy.SecretRedactor;
import com.tronai.desktop.process.ProcessRegistry;
import com.tronai.desktop.protocol.MessageType;
import com.tronai.desktop.protocol.ProtocolMessage;
import com.tronai.desktop.security.CredentialStore;
import com.tronai.desktop.terminal.OsProcessRunner;
import com.tronai.desktop.tools.ToolGateway;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Consumer;

/**
 * Outbound desktop agent runtime.
 * Connects securely to TRON Core, supports offline startup with background retry,
 * handles pairing lifecycle, executes structured actions, and notifies UI of live state.
 */
public final class AgentRuntime {

    public static final String AGENT_VERSION = "0.1.0";

    private final CredentialStore store;
    private final AgentUi ui;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final OsProcessRunner processes = new OsProcessRunner();
    private final PlaywrightController browser = new PlaywrightController();
    private final ToolGateway tools;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicBoolean paused = new AtomicBoolean(false);
    private final AtomicBoolean refreshPairingRequested = new AtomicBoolean(false);
    private final AtomicBoolean pairingCodeRequested = new AtomicBoolean(false);
    private final AtomicBoolean browserLinkInProgress = new AtomicBoolean(false);
    private final AtomicBoolean cancelBrowserLinkRequested = new AtomicBoolean(false);
    private volatile String currentAuthUrl;
    private volatile String currentLinkRequestId;

    private final ReentrantLock retryLock = new ReentrantLock();
    private final Condition retryCondition = retryLock.newCondition();

    private volatile WebSocket socket;
    private volatile boolean connected;
    private volatile boolean coreOnline;

    private volatile String activeTask;
    private volatile String activeTaskStatus = "IDLE";
    private volatile String activeTaskGoal;
    private volatile String activeTaskControlMode = "AGENT";
    private volatile String activeTaskStep;
    private volatile boolean waitingUser;

    private volatile String activeAction;

    public AgentRuntime(CredentialStore store, AgentUi ui) {
        this.store = store;
        this.ui = ui == null ? AgentUi.silent() : ui;
        this.tools = new ToolGateway(new FileTools(1_048_576), processes, new ProcessRegistry(), browser, this::streamOutput);
    }

    public CredentialStore getStore() {
        return store;
    }

    public PlaywrightController getBrowser() {
        return browser;
    }

    public ToolGateway getTools() {
        return tools;
    }

    public boolean isConnected() {
        return connected;
    }

    public boolean isCoreOnline() {
        return coreOnline;
    }

    public boolean isPaired() {
        return store.isPaired();
    }

    public boolean isRunning() {
        return running.get();
    }

    public String activeTask() {
        return activeTask;
    }

    public String activeTaskStatus() {
        return activeTaskStatus;
    }

    public String activeTaskGoal() {
        return activeTaskGoal;
    }

    public String activeTaskControlMode() {
        return activeTaskControlMode;
    }

    public String activeTaskStep() {
        return activeTaskStep;
    }

    public boolean isWaitingUser() {
        return waitingUser;
    }

    public String deviceUuid() {
        return store.deviceUuid();
    }

    public String shortDeviceUuid() {
        String uuid = store.deviceUuid();
        if (uuid == null) return "Unknown";
        if (uuid.length() <= 12) return uuid;
        return uuid.substring(0, 8) + "..." + uuid.substring(uuid.length() - 4);
    }

    public void start() throws Exception {
        store.loadOrCreate();
        String envWorkspace = System.getenv("TRON_WORKSPACE");
        if (envWorkspace != null && !envWorkspace.isBlank()) {
            store.putSecret("allowedWorkspace", envWorkspace);
        }
        String envCore = System.getenv("TRON_CORE_URL");
        if (envCore != null && !envCore.isBlank()) {
            store.putSecret("coreUrl", envCore);
        } else if (store.coreUrl() == null || store.coreUrl().isBlank()) {
            store.putSecret("coreUrl", "ws://localhost:8080/api/v1/desktop-agent/ws");
        }
        browser.setProfileDirectory(browserProfile(store.deviceUuid()));

        // Non-daemon: HeadlessMain must keep the JVM alive for long native OpenCode runs.
        Thread lifecycleThread = new Thread(this::lifecycleLoop, "tron-agent-lifecycle");
        lifecycleThread.setDaemon(false);
        lifecycleThread.start();
    }

    public void retryNow() {
        retryLock.lock();
        try {
            retryCondition.signalAll();
        } finally {
            retryLock.unlock();
        }
    }

    public void refreshPairingCode() {
        refreshPairingRequested.set(true);
        retryNow();
    }

    public void startBrowserLinkFlow() {
        cancelBrowserLinkRequested.set(false);
        refreshPairingRequested.set(false);
        Thread linkThread = new Thread(() -> {
            try {
                runBrowserLinkWorkflow();
            } catch (Exception e) {
                // error reported inside workflow
            }
        }, "tron-browser-link-flow");
        linkThread.setDaemon(true);
        linkThread.start();
    }

    public void openBrowserAgain() {
        if (currentAuthUrl != null && !currentAuthUrl.isBlank()) {
            try {
                if (java.awt.Desktop.isDesktopSupported() && java.awt.Desktop.getDesktop().isSupported(java.awt.Desktop.Action.BROWSE)) {
                    java.awt.Desktop.getDesktop().browse(new URI(currentAuthUrl));
                }
            } catch (Exception ex) {
                ui.logEvent("Could not open browser: " + ex.getMessage());
            }
        }
    }

    public void cancelBrowserLink() {
        cancelBrowserLinkRequested.set(true);
        browserLinkInProgress.set(false);
        pairingCodeRequested.set(false);
        refreshPairingRequested.set(false);
        ui.pairingStateChanged(PairingUiState.UNCONNECTED, null, 0, null);
    }

    public void startPairingCodeFlow() {
        cancelBrowserLinkRequested.set(true);
        browserLinkInProgress.set(false);
        pairingCodeRequested.set(true);
        refreshPairingRequested.set(true);
        retryNow();
    }

    public void reconnectWithUrl(String newCoreUrl) throws Exception {
        store.putSecret("coreUrl", newCoreUrl);
        disconnect();
        running.set(true);
        ui.logEvent("TRON Core URL changed to: " + newCoreUrl);
        retryNow();
    }

    public void unpair() throws Exception {
        cancelBrowserLink();
        store.clearPairing();
        disconnect();
        running.set(true);
        ui.status("Offline", "Device unpaired");
        ui.logEvent("Device unpaired locally. Ready for new connection.");
        ui.pairingStateChanged(PairingUiState.UNCONNECTED, null, 0, null);
    }

    public void resetLocalIdentity() throws Exception {
        cancelBrowserLink();
        store.resetLocalIdentity();
        disconnect();
        running.set(true);
        ui.status("Offline", "Local identity reset");
        ui.logEvent("Local device identity was reset.");
        ui.pairingStateChanged(PairingUiState.UNCONNECTED, null, 0, null);
    }

    public void disconnect() {
        connected = false;
        coreOnline = false;
        WebSocket current = socket;
        if (current != null) {
            try {
                current.sendClose(WebSocket.NORMAL_CLOSURE, "disconnect");
            } catch (Exception ignored) {
            }
            socket = null;
        }
        ui.status("Offline", "Disconnected");
    }

    public void shutdown() {
        running.set(false);
        retryNow();
        disconnect();
        browser.stop();
        processes.cancelCurrent();
    }

    public void updateWorkspace(String workspace) throws Exception {
        store.putSecret("allowedWorkspace", workspace);
        sendHeartbeat();
        ui.status(connected ? "Connected" : "Offline", workspace);
        ui.logEvent("Allowed workspace set to: " + workspace);
    }

    public String workspace() {
        return store.allowedWorkspace();
    }

    public String coreUrl() {
        return store.coreUrl();
    }

    void setActiveTaskForTesting(String taskId, String status) {
        this.activeTask = taskId;
        this.activeTaskStatus = status;
    }

    public void resumeTask() {
        if (activeTask == null || activeTask.isBlank()) {
            ui.logEvent("No active task to resume.");
            return;
        }
        paused.set(false);
        waitingUser = false;
        activeTaskStatus = "RUNNING";
        activeTaskControlMode = "AGENT";
        activeTaskStep = "Resumed by user";
        browser.setControl("AGENT");
        String bState = browser.isAlive() ? "AGENT_CONTROLLED" : "CLOSED";
        ui.browserUpdated(bState, browser.currentUrl(), browser.currentTitle());
        ui.taskUpdated(activeTask, activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, false);
        ui.logEvent("Resumed agent control for task " + shortId(activeTask));

        if (connected) {
            ProtocolMessage resumeMsg = ProtocolMessage.of(MessageType.TASK_RESUME);
            resumeMsg.setDeviceId(store.deviceUuid());
            resumeMsg.setTaskId(activeTask);
            send(resumeMsg);
        }
    }

    /** Local pause + notify Core so orchestration actually waits. */
    public void pauseActiveTask() {
        if (activeTask == null || activeTask.isBlank()) {
            ui.logEvent("No active task to pause.");
            return;
        }
        paused.set(true);
        activeTaskStatus = "PAUSED";
        activeTaskStep = "Paused from Desktop Agent";
        ui.taskUpdated(activeTask, activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, false);
        ui.logEvent("Paused task " + shortId(activeTask));
        if (connected) {
            ProtocolMessage msg = ProtocolMessage.of(MessageType.TASK_PAUSE);
            msg.setDeviceId(store.deviceUuid());
            msg.setTaskId(activeTask);
            ProtocolMessage.TaskSignal task = new ProtocolMessage.TaskSignal();
            task.setReason("Paused from Desktop Agent");
            msg.setTask(task);
            send(msg);
        }
    }

    /** Stop local tools and ask Core to mark the task STOPPED. */
    public void stopActiveTask() {
        if (activeTask == null || activeTask.isBlank()) {
            ui.logEvent("No active task to stop.");
            return;
        }
        String taskId = activeTask;
        tools.stopTask(taskId);
        paused.set(false);
        waitingUser = false;
        activeTask = null;
        activeTaskStatus = "IDLE";
        activeTaskGoal = null;
        activeTaskStep = null;
        ui.taskUpdated(null, "IDLE", "—", "AGENT", "—", false);
        ui.logEvent("Stopped task " + shortId(taskId));
        if (connected) {
            ProtocolMessage msg = ProtocolMessage.of(MessageType.TASK_CANCEL);
            msg.setDeviceId(store.deviceUuid());
            msg.setTaskId(taskId);
            send(msg);
        }
    }

    /** Surrender browser control to the human and pause agent actions. */
    public void takeControlActiveTask() {
        if (activeTask == null || activeTask.isBlank()) {
            openBrowser(null);
            ui.logEvent("Opened browser (no active task).");
            return;
        }
        paused.set(true);
        waitingUser = true;
        activeTaskStatus = "WAITING USER";
        activeTaskControlMode = "MANUAL";
        activeTaskStep = "Manual control active";
        tools.releaseBrowser();
        browser.setControl("USER");
        ui.browserUpdated("USER_CONTROLLED", browser.currentUrl(), browser.currentTitle());
        ui.taskUpdated(activeTask, activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, true);
        ui.logEvent("Took manual control of task " + shortId(activeTask));
        if (connected) {
            ProtocolMessage msg = ProtocolMessage.of(MessageType.TAKE_CONTROL);
            msg.setDeviceId(store.deviceUuid());
            msg.setTaskId(activeTask);
            ProtocolMessage.TaskSignal task = new ProtocolMessage.TaskSignal();
            task.setReleaseBrowser(true);
            task.setReason("Take control from Desktop Agent");
            msg.setTask(task);
            send(msg);
        }
        openBrowser(browser.currentUrl());
    }

    public void openBrowser(String url) {
        String targetUrl = url != null && !url.isBlank() ? url : (browser.currentUrl() != null ? browser.currentUrl() : "https://www.google.com");
        ui.logEvent("Opening managed browser: " + targetUrl);
        Thread launcher = new Thread(() -> {
            try {
                ProtocolMessage.Result res = browser.openHeaded(targetUrl);
                ui.browserUpdated(browser.isAlive() ? "USER_CONTROLLED" : "CLOSED", browser.currentUrl(), browser.currentTitle());
                if (res != null && !res.isSuccess()) {
                    ui.logEvent("Browser open warning: " + res.getSummary());
                }
            } catch (Exception e) {
                ui.logEvent("Could not open browser: " + e.getMessage());
            }
        }, "open-browser-action");
        launcher.setDaemon(true);
        launcher.start();
    }

    public void closeBrowser() {
        ui.logEvent("Closing managed browser");
        Thread closer = new Thread(() -> {
            try {
                browser.closeBrowser();
                ui.browserUpdated("CLOSED", null, null);
            } catch (Exception e) {
                ui.logEvent("Could not close browser: " + e.getMessage());
            }
        }, "close-browser-action");
        closer.setDaemon(true);
        closer.start();
    }

    private void lifecycleLoop() {
        int backoff = 2;
        while (running.get()) {
            if (!store.isPaired()) {
                if (pairingCodeRequested.get() || refreshPairingRequested.get()) {
                    boolean paired = false;
                    try {
                        paired = runPairingWorkflow();
                        backoff = 2;
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    } catch (Exception e) {
                        coreOnline = false;
                        connected = false;
                        String msg = e.getMessage() == null ? "Core offline" : e.getMessage();
                        ui.status("Offline", "TRON Core: Offline");
                        if (msg.contains("HTTP 401")) {
                            ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "TRON Core returned HTTP 401.");
                        } else if (msg.contains("HTTP")) {
                            ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Could not request pairing code (" + msg + ").");
                        } else {
                            ui.pairingStateChanged(PairingUiState.CORE_OFFLINE, null, 0, "TRON Core is offline (" + msg + ").");
                        }
                        ui.pairingWaitingForCore("TRON Core is currently offline (" + msg + "). Retrying...");
                    }
                    if (!paired && running.get()) {
                        sleepWithRetryLock(backoff);
                        backoff = Math.min(backoff * 2, 15);
                    }
                } else if (!browserLinkInProgress.get()) {
                    ui.status("Offline", "Not connected");
                    ui.pairingStateChanged(PairingUiState.UNCONNECTED, null, 0, null);
                    sleepWithRetryLock(2);
                } else {
                    sleepWithRetryLock(1);
                }
            } else {
                try {
                    connectOnce();
                    backoff = 2;
                    while (running.get() && connected) {
                        Thread.sleep(1000);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                } catch (Exception e) {
                    connected = false;
                    coreOnline = false;
                    String message = e.getMessage() == null ? "Connection failed" : e.getMessage();
                    Throwable root = e;
                    while (root.getCause() != null && root.getCause() != root) {
                        root = root.getCause();
                    }
                    String rootMsg = root.getMessage() == null ? root.getClass().getSimpleName() : root.getMessage();
                    ui.status("Offline", "TRON Core: Offline (" + message + ")");
                    ui.logEvent("Desktop WSS connect failed: " + message + " root=" + rootMsg);
                    if (message.toLowerCase().contains("401") || message.toLowerCase().contains("revoked")
                            || rootMsg.toLowerCase().contains("401")) {
                        ui.status("Offline", "Device credential was rejected by TRON Core");
                        ui.logEvent("Device credential was rejected by TRON Core.");
                        sleepWithRetryLock(10);
                        continue;
                    }
                }
                if (!running.get()) {
                    return;
                }
                sleepWithRetryLock(backoff);
                backoff = Math.min(backoff * 2, 20);
            }
        }
    }

    private boolean runBrowserLinkWorkflow() throws Exception {
        browserLinkInProgress.set(true);
        String uuid = store.deviceUuid();
        if (uuid == null || uuid.isBlank()) {
            store.loadOrCreate();
            uuid = store.deviceUuid();
        }
        if (uuid == null || uuid.isBlank()) {
            ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Device identity is not initialized.");
            browserLinkInProgress.set(false);
            return false;
        }

        ui.pairingStateChanged(PairingUiState.REQUESTING, null, 0, "Requesting authorization from TRON Core...");
        ui.status("Offline", "Connecting to TRON Core...");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("deviceUuid", uuid);
        body.put("publicKey", store.publicKeyPem());
        body.put("os", System.getProperty("os.name"));
        body.put("hostname", hostname());
        body.put("agentVersion", AGENT_VERSION);
        body.put("displayName", hostname());
        body.put("requestedWorkspace", store.allowedWorkspace());

        JsonNode created;
        try {
            created = post("/api/v1/desktop-agents/link-requests", body);
        } catch (Exception e) {
            coreOnline = false;
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("HTTP 401")) {
                ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "TRON Core returned HTTP 401.");
            } else if (msg.contains("HTTP")) {
                ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Could not request link authorization: " + msg);
            } else {
                ui.pairingStateChanged(PairingUiState.CORE_OFFLINE, null, 0, "TRON Core is offline.");
            }
            browserLinkInProgress.set(false);
            return false;
        }

        coreOnline = true;
        String requestId = created.path("linkRequestId").asText();
        String authUrl = created.path("authorizationUrl").asText();
        String pollSecret = created.path("pollSecret").asText();
        int ttl = created.has("expiresInSeconds") ? created.path("expiresInSeconds").asInt(600) : 600;

        currentLinkRequestId = requestId;
        currentAuthUrl = authUrl;

        // Open default system browser (Requirements 11, 24)
        try {
            if (java.awt.Desktop.isDesktopSupported() && java.awt.Desktop.getDesktop().isSupported(java.awt.Desktop.Action.BROWSE)) {
                java.awt.Desktop.getDesktop().browse(new URI(authUrl));
            }
        } catch (Exception ex) {
            ui.logEvent("Could not open system browser automatically: " + ex.getMessage());
        }

        ui.pairingStateChanged(PairingUiState.BROWSER_WAITING, authUrl, ttl, null);
        ui.browserLinkWaiting(requestId, authUrl, ttl);
        ui.logEvent("Browser authorization started: " + authUrl);

        long deadline = System.currentTimeMillis() + Duration.ofSeconds(ttl).toMillis();
        while (running.get() && System.currentTimeMillis() < deadline && !cancelBrowserLinkRequested.get()) {
            try {
                Thread.sleep(2000);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                browserLinkInProgress.set(false);
                return false;
            }

            if (cancelBrowserLinkRequested.get() || !running.get()) {
                browserLinkInProgress.set(false);
                return false;
            }

            JsonNode polled;
            try {
                polled = get("/api/v1/desktop-agents/link-requests/" + requestId + "/poll", pollSecret);
            } catch (Exception e) {
                continue;
            }

            String status = polled.path("status").asText();
            String deliveredCredential = firstText(polled, "deviceCredential", "credential");
            if (("AUTHORIZED".equals(status) || "PAIRED".equals(status)) && deliveredCredential != null) {
                if (!ui.confirmSignedInAccount()) {
                    ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Connection cancelled.");
                    browserLinkInProgress.set(false);
                    return false;
                }
                store.putSecret("credential", deliveredCredential);
                store.putSecret("approvalKey", polled.path("approvalKey").asText());
                store.putSecret("deviceId", polled.path("deviceId").asText());
                if (polled.hasNonNull("allowedWorkspace") && !polled.path("allowedWorkspace").asText().isBlank()) {
                    store.putSecret("allowedWorkspace", polled.path("allowedWorkspace").asText());
                }
                ui.pairingStateChanged(PairingUiState.PAIRED, null, 0, null);
                ui.paired(store.deviceUuid());
                ui.logEvent("Computer successfully authorized and connected to TRON account.");
                ui.status("Offline", "Authorized. Connecting securely...");
                browserLinkInProgress.set(false);
                retryNow();
                return true;
            }
            if ("CONFLICT".equals(status)) {
                String detail = polled.path("detail").asText("This connection request was not started by this computer.");
                ui.pairingStateChanged(PairingUiState.FAILED, null, 0, detail);
                ui.logEvent(detail);
                browserLinkInProgress.set(false);
                return false;
            }
            if ("EXPIRED".equals(status)) {
                ui.pairingStateChanged(PairingUiState.BROWSER_EXPIRED, null, 0, "Authorization expired.");
                ui.logEvent("Browser authorization request expired.");
                browserLinkInProgress.set(false);
                return false;
            }
        }

        if (System.currentTimeMillis() >= deadline) {
            ui.pairingStateChanged(PairingUiState.BROWSER_EXPIRED, null, 0, "Authorization expired.");
        }
        browserLinkInProgress.set(false);
        return false;
    }

    private void sleepWithRetryLock(int seconds) {
        retryLock.lock();
        try {
            retryCondition.await(seconds, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            retryLock.unlock();
        }
    }

    private boolean runPairingWorkflow() throws Exception {
        refreshPairingRequested.set(false);
        String uuid = store.deviceUuid();
        if (uuid == null || uuid.isBlank()) {
            store.loadOrCreate();
            uuid = store.deviceUuid();
        }
        if (uuid == null || uuid.isBlank()) {
            ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Device identity is not initialized.");
            return false;
        }

        ui.pairingStateChanged(PairingUiState.REQUESTING, null, 0, "Requesting pairing code from Core...");
        ui.status("Offline", "Requesting pairing code...");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("deviceUuid", uuid);
        body.put("publicKey", store.publicKeyPem());
        body.put("os", System.getProperty("os.name"));
        body.put("hostname", hostname());
        body.put("agentVersion", AGENT_VERSION);
        body.put("displayName", hostname());

        JsonNode created;
        try {
            created = post("/api/v1/desktop-agents/pairing-requests", body);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("HTTP 401")) {
                ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "TRON Core returned HTTP 401.");
            } else if (msg.contains("HTTP")) {
                ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Could not request pairing code: " + msg);
            } else {
                ui.pairingStateChanged(PairingUiState.CORE_OFFLINE, null, 0, "TRON Core is offline.");
            }
            throw e;
        }

        coreOnline = true;
        String code = created.path("pairingCode").asText();
        String requestId = created.path("pairingRequestId").asText();
        String pollSecret = created.path("pollSecret").asText();
        int ttl = created.has("expiresInSeconds") ? created.path("expiresInSeconds").asInt(600) : 600;
        boolean repairRequired = "DEVICE_REPAIR_REQUIRED".equals(created.path("reconciliation").asText());
        String repairDetail = "TRON Core already knows this device, but this installation no longer has a valid device credential.";

        if (repairRequired) {
            ui.pairingStateChanged(PairingUiState.REPAIR_REQUIRED, code, ttl, repairDetail);
            ui.logEvent("TRON Core already knows this device. Repair pairing with the same account.");
        } else {
            ui.pairingStateChanged(PairingUiState.READY, code, ttl, null);
            ui.pairingCode(code, ttl);
            ui.logEvent("New pairing code generated: " + code);
        }

        long deadline = System.currentTimeMillis() + Duration.ofSeconds(ttl).toMillis();
        while (running.get() && System.currentTimeMillis() < deadline && !refreshPairingRequested.get()) {
            retryLock.lock();
            try {
                retryCondition.await(2000, TimeUnit.MILLISECONDS);
            } finally {
                retryLock.unlock();
            }
            if (refreshPairingRequested.get() || !running.get()) {
                return false;
            }

            JsonNode polled;
            try {
                polled = get("/api/v1/desktop-agents/pairing-requests/" + requestId, pollSecret);
            } catch (Exception e) {
                continue;
            }
            String status = polled.path("status").asText();
            String deliveredCredential = firstText(polled, "deviceCredential", "credential");
            if ("PAIRED".equals(status) && deliveredCredential != null) {
                if (!ui.confirmSignedInAccount()) {
                    ui.pairingStateChanged(PairingUiState.FAILED, null, 0, "Connection cancelled.");
                    return false;
                }
                store.putSecret("credential", deliveredCredential);
                store.putSecret("approvalKey", polled.path("approvalKey").asText());
                store.putSecret("deviceId", polled.path("deviceId").asText());
                // Same as browser-link flow: Core delivers allowedWorkspace on PAIRED poll.
                if (polled.hasNonNull("allowedWorkspace") && !polled.path("allowedWorkspace").asText().isBlank()) {
                    store.putSecret("allowedWorkspace", polled.path("allowedWorkspace").asText());
                }
                pairingCodeRequested.set(false);
                refreshPairingRequested.set(false);
                ui.pairingStateChanged(PairingUiState.PAIRED, null, 0, null);
                ui.paired(store.deviceUuid());
                ui.logEvent("Device successfully paired to TRON account.");
                ui.status("Offline", "Paired. Connecting securely...");
                return true;
            }
            if ("CONFLICT".equals(status)) {
                String detail = polled.path("detail").asText("");
                if (detail.isBlank()) {
                    detail = "This connection request was not started by this computer.";
                }
                ui.pairingStateChanged(PairingUiState.REPAIR_REQUIRED, code, remainingTtlSeconds(deadline), detail);
                ui.logEvent(detail);
                continue;
            }
            if ("EXPIRED".equals(status)) {
                ui.pairingStateChanged(PairingUiState.EXPIRED, null, 0, "Pairing code expired.");
                ui.logEvent("Pairing code expired.");
                return false;
            }
        }
        if (System.currentTimeMillis() >= deadline) {
            ui.pairingStateChanged(PairingUiState.EXPIRED, null, 0, "Pairing code expired.");
        }
        return false;
    }

    private void connectOnce() throws Exception {
        CountDownLatch opened = new CountDownLatch(1);
        StringBuilder partial = new StringBuilder();
        ui.status("Offline", "Connecting to TRON Core...");
        WebSocket webSocket = http.newWebSocketBuilder()
                .header("Authorization", "Device " + store.credential())
                .connectTimeout(Duration.ofSeconds(10))
                .buildAsync(URI.create(wsUrl()), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(1);
                        opened.countDown();
                    }

                    @Override
                    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                        partial.append(data);
                        if (last) {
                            String json = partial.toString();
                            partial.setLength(0);
                            handleIncoming(json);
                        }
                        webSocket.request(1);
                        return null;
                    }

                    @Override
                    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                        connected = false;
                        ui.status("Offline", "Connection closed (" + statusCode + ")");
                        ui.logEvent("WebSocket connection closed (" + statusCode + ")");
                        return null;
                    }

                    @Override
                    public void onError(WebSocket webSocket, Throwable error) {
                        connected = false;
                        ui.status("Offline", "Connection error");
                        ui.logEvent("WebSocket connection error: " + (error != null ? error.getMessage() : "unknown"));
                    }
                }).join();

        socket = webSocket;
        if (!opened.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("WebSocket connection timed out");
        }
        send(hello());
        connected = true;
        coreOnline = true;
        ui.status("Connected", "Connected securely");
        ui.logEvent("Connected securely to TRON Core.");

        Thread heartbeat = new Thread(this::heartbeatLoop, "tron-heartbeat");
        heartbeat.setDaemon(true);
        heartbeat.start();
    }

    private void heartbeatLoop() {
        while (running.get() && connected) {
            try {
                sendHeartbeat();
                Thread.sleep(15000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                connected = false;
            }
        }
    }

    private void handleIncoming(String json) {
        try {
            ProtocolMessage message = mapper.readValue(json, ProtocolMessage.class);
            MessageType type = MessageType.valueOf(message.getType());
            switch (type) {
                case DEVICE_WELCOME -> {
                    connected = true;
                    coreOnline = true;
                    ui.status("Connected", "Connected securely");
                    ui.logEvent("TRON Core welcomed device.");
                }
                case TASK_START -> {
                    activeTask = message.getTaskId();
                    activeTaskStatus = "RUNNING";
                    activeTaskGoal = message.getTask() != null ? message.getTask().getGoal() : message.getSummary();
                    activeTaskControlMode = "AGENT";
                    activeTaskStep = "Task started";
                    waitingUser = false;
                    ui.taskUpdated(activeTask, activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, false);
                    ui.logEvent("Task started: " + shortId(activeTask));
                }
                case ACTION_REQUEST -> {
                    activeTask = message.getTaskId();
                    activeTaskStatus = "RUNNING";
                    String stepDesc = message.getSummary() != null ? message.getSummary() :
                            (message.getAction() != null ? message.getAction().getTool() + " " + message.getAction().getOperation() : "Action");
                    activeTaskStep = stepDesc;
                    ui.taskUpdated(activeTask, activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, waitingUser);
                    // Non-daemon so long RUN_GOAL / OpenCode work is not killed if the main wait loop wobbles.
                    Thread worker = new Thread(() -> handleAction(message), "desktop-action");
                    worker.setDaemon(false);
                    worker.start();
                }
                case APPROVAL_REQUIRED -> handleApprovalPrompt(message);
                case TASK_CANCEL -> {
                    tools.stopTask(message.getTaskId());
                    paused.set(false);
                    waitingUser = false;
                    activeTask = null;
                    activeTaskStatus = "IDLE";
                    activeTaskGoal = null;
                    activeTaskStep = null;
                    ui.taskUpdated(null, "IDLE", "—", "AGENT", "—", false);
                    ui.logEvent("Task cancelled: " + shortId(message.getTaskId()));
                }
                case TASK_PAUSE -> {
                    paused.set(true);
                    if (message.getTask() != null && Boolean.TRUE.equals(message.getTask().getReleaseBrowser())) {
                        tools.releaseBrowser();
                        ui.browserUpdated("USER_CONTROLLED", browser.currentUrl(), browser.currentTitle());
                    }
                    String reason = message.getTask() != null ? message.getTask().getReason() : "Paused";
                    boolean isWaiting = "WAITING_USER".equalsIgnoreCase(reason);
                    waitingUser = isWaiting;
                    activeTaskStatus = isWaiting ? "WAITING USER" : "PAUSED";
                    activeTaskControlMode = isWaiting ? "MANUAL" : activeTaskControlMode;
                    activeTaskStep = isWaiting ? "User action required in browser" : "Task paused";
                    ui.taskUpdated(message.getTaskId(), activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, waitingUser);
                    ui.logEvent(isWaiting ? "Task waiting for user interaction" : "Task paused");
                }
                case TAKE_CONTROL -> {
                    paused.set(true);
                    waitingUser = true;
                    activeTaskStatus = "WAITING USER";
                    activeTaskControlMode = "MANUAL";
                    activeTaskStep = "Manual control active";
                    if (message.getTask() != null && Boolean.TRUE.equals(message.getTask().getReleaseBrowser())) {
                        tools.releaseBrowser();
                        ui.browserUpdated("USER_CONTROLLED", browser.currentUrl(), browser.currentTitle());
                    }
                    ui.taskUpdated(message.getTaskId(), activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, true);
                    ui.logEvent("Control surrendered to user for task: " + shortId(message.getTaskId()));
                }
                case TASK_RESUME -> {
                    paused.set(false);
                    waitingUser = false;
                    activeTask = message.getTaskId();
                    activeTaskStatus = "RUNNING";
                    activeTaskControlMode = "AGENT";
                    activeTaskStep = "Task resumed";
                    browser.setControl("AGENT");
                    String bState = browser.isAlive() ? "AGENT_CONTROLLED" : "CLOSED";
                    ui.browserUpdated(bState, browser.currentUrl(), browser.currentTitle());
                    ui.taskUpdated(message.getTaskId(), activeTaskStatus, activeTaskGoal, activeTaskControlMode, activeTaskStep, false);
                    ui.logEvent("Task resumed: " + shortId(message.getTaskId()));
                }
                case TASK_COMPLETED -> {
                    paused.set(false);
                    waitingUser = false;
                    activeTask = null;
                    activeTaskStatus = "IDLE";
                    activeTaskGoal = null;
                    activeTaskStep = null;
                    ui.taskUpdated(null, "IDLE", "—", "AGENT", "—", false);
                    ui.logEvent("Task completed: " + shortId(message.getTaskId()));
                }
                case TASK_FAILED -> {
                    paused.set(false);
                    waitingUser = false;
                    activeTask = null;
                    activeTaskStatus = "IDLE";
                    activeTaskGoal = null;
                    activeTaskStep = null;
                    ui.taskUpdated(null, "IDLE", "—", "AGENT", "—", false);
                    ui.logEvent("Task failed: " + shortId(message.getTaskId()));
                }
                default -> {
                }
            }
        } catch (Exception e) {
            ui.status(connected ? "Connected" : "Offline", "A protocol message could not be processed");
        }
    }

    private void handleAction(ProtocolMessage message) {
        activeTask = message.getTaskId();
        activeAction = message.getActionId();
        ProtocolMessage.Result result;
        if (paused.get()) {
            result = new ProtocolMessage.Result();
            result.setSuccess(false);
            result.setSummary("Task is paused");
        } else if (store.allowedWorkspace() == null || store.allowedWorkspace().isBlank()) {
            result = new ProtocolMessage.Result();
            result.setSuccess(false);
            result.setSummary("Allowed workspace is not set");
        } else {
            result = tools.execute(store.deviceUuid(), store.approvalKey(), store.allowedWorkspace(), message);
        }
        result.setStdout(SecretRedactor.truncate(result.getStdout(), 64000));
        result.setStderr(SecretRedactor.truncate(result.getStderr(), 64000));
        ProtocolMessage response = ProtocolMessage.of(MessageType.ACTION_RESULT);
        response.setDeviceId(store.deviceUuid());
        response.setTaskId(message.getTaskId());
        response.setActionId(message.getActionId());
        response.setResult(result);
        response.setSummary(result.getSummary());
        send(response);

        if (result.getPath() != null && message.getAction() != null) {
            ProtocolMessage changed = ProtocolMessage.of(MessageType.FILE_CHANGED);
            changed.setDeviceId(store.deviceUuid());
            changed.setTaskId(message.getTaskId());
            changed.setActionId(message.getActionId());
            ProtocolMessage.FileChanged file = new ProtocolMessage.FileChanged();
            file.setPath(result.getPath());
            file.setChangeType(message.getAction().getOperation());
            file.setSha256(result.getSha256());
            file.setSizeBytes(result.getSizeBytes());
            changed.setFileChanged(file);
            send(changed);
            ui.logEvent("File modified: " + result.getPath());
        }

        if (message.getAction() != null && "BROWSER".equalsIgnoreCase(message.getAction().getTool())) {
            ProtocolMessage event = ProtocolMessage.of(MessageType.BROWSER_EVENT);
            event.setDeviceId(store.deviceUuid());
            event.setTaskId(message.getTaskId());
            event.setActionId(message.getActionId());
            ProtocolMessage.Browser browserEvent = new ProtocolMessage.Browser();
            browserEvent.setEvent(message.getAction().getOperation());
            browserEvent.setTitle(result.getTitle() != null ? result.getTitle() : result.getSummary());
            browserEvent.setDetail(result.getStdout());
            String pageUrl = result.getUrl();
            if (pageUrl == null && message.getAction().getArguments() != null) {
                pageUrl = message.getAction().getArguments().getUrl();
            }
            browserEvent.setUrl(pageUrl);
            if ("SCREENSHOT".equalsIgnoreCase(message.getAction().getOperation())) {
                String shot = result.getScreenshotBase64();
                if (shot != null && shot.startsWith("iVBORw0KGgo")) {
                    browserEvent.setScreenshotBase64(shot);
                } else {
                    browserEvent.setTitle("Screenshot failed");
                    browserEvent.setDetail("Screenshot failed");
                    browserEvent.setScreenshotBase64(null);
                }
            } else {
                browserEvent.setScreenshotBase64(result.getScreenshotBase64());
            }
            event.setBrowser(browserEvent);
            send(event);

            String browserStatus = browser.isAlive() ? (browser.userControlled() ? "USER_CONTROLLED" : "AGENT_CONTROLLED") : "CLOSED";
            ui.browserUpdated(browserStatus, pageUrl, result.getTitle());
            ui.logEvent("Browser action: " + message.getAction().getOperation() + (pageUrl != null ? " on " + pageUrl : ""));
        }
        activeAction = null;
    }

    private void handleApprovalPrompt(ProtocolMessage message) {
        if (ui == null) {
            return;
        }
        ProtocolMessage.Approval approval = message.getApproval();
        String summary = approval == null ? "Dangerous action" : approval.getSummary();
        String risk = approval == null ? "REQUIRES_APPROVAL" : approval.getRisk();
        String cmdPreview = approval == null ? null : approval.getCommandPreview();
        String pathPreview = approval == null ? null : approval.getPathPreview();

        ui.taskUpdated(message.getTaskId(), "WAITING APPROVAL", activeTaskGoal, activeTaskControlMode, "Approval required for " + summary, false);
        ui.logEvent("Local approval prompt opened for: " + summary);

        ui.approval(message.getTaskId(), summary, risk, cmdPreview, pathPreview, approved -> {
            ProtocolMessage decision = ProtocolMessage.of(approved ? MessageType.APPROVAL_GRANTED : MessageType.APPROVAL_DENIED);
            decision.setDeviceId(store.deviceUuid());
            decision.setTaskId(message.getTaskId());
            decision.setActionId(message.getActionId());
            ProtocolMessage.Approval body = new ProtocolMessage.Approval();
            body.setApprovalId(approval == null ? null : approval.getApprovalId());
            body.setFingerprint(approval == null ? null : approval.getFingerprint());
            body.setDecision(approved ? "APPROVE" : "DENY");
            decision.setApproval(body);
            send(decision);
            ui.logEvent("Local approval decision: " + (approved ? "APPROVED" : "DENIED"));
        });
    }

    private void streamOutput(String stream, String chunk) {
        if (activeAction == null) {
            return;
        }
        ProtocolMessage message = ProtocolMessage.of(MessageType.TERMINAL_OUTPUT);
        message.setDeviceId(store.deviceUuid());
        message.setTaskId(activeTask);
        message.setActionId(activeAction);
        ProtocolMessage.Terminal terminal = new ProtocolMessage.Terminal();
        terminal.setStream(stream);
        terminal.setChunk(SecretRedactor.truncate(chunk, 4000));
        message.setTerminal(terminal);
        send(message);
    }

    private ProtocolMessage hello() {
        ProtocolMessage message = ProtocolMessage.of(MessageType.DEVICE_HELLO);
        message.setDeviceId(store.deviceUuid());
        ProtocolMessage.Hello hello = new ProtocolMessage.Hello();
        hello.setDeviceUuid(store.deviceUuid());
        hello.setAgentVersion(AGENT_VERSION);
        hello.setOs(System.getProperty("os.name"));
        hello.setHostname(hostname());
        hello.setAllowedWorkspace(store.allowedWorkspace());
        message.setHello(hello);
        return message;
    }

    private void sendHeartbeat() {
        ProtocolMessage message = ProtocolMessage.of(MessageType.DEVICE_HEARTBEAT);
        message.setDeviceId(store.deviceUuid());
        message.setHello(hello().getHello());
        send(message);
        ui.heartbeat(Instant.now());
    }

    private void send(ProtocolMessage message) {
        WebSocket current = socket;
        if (current == null || !messageReady(current)) {
            return;
        }
        // Java WebSocket allows only one outstanding sendText; serialize heartbeats vs ACTION_RESULT.
        synchronized (this) {
            current = socket;
            if (current == null || !messageReady(current)) {
                return;
            }
            try {
                message.setTimestamp(Instant.now().toString());
                current.sendText(mapper.writeValueAsString(message), true).join();
            } catch (Exception e) {
                ui.logEvent("WebSocket send failed: " + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
                connected = false;
            }
        }
    }

    private static boolean messageReady(WebSocket socket) {
        return !socket.isOutputClosed();
    }

    private static String firstText(JsonNode node, String primary, String fallback) {
        if (node != null && node.hasNonNull(primary) && !node.path(primary).asText().isBlank()) {
            return node.path(primary).asText();
        }
        if (node != null && node.hasNonNull(fallback) && !node.path(fallback).asText().isBlank()) {
            return node.path(fallback).asText();
        }
        return null;
    }

    private JsonNode post(String path, Map<String, Object> body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(httpBase() + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 300) {
            throw new IllegalStateException("Core returned HTTP " + response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    private JsonNode get(String path, String pollSecret) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(httpBase() + path))
                .timeout(Duration.ofSeconds(15))
                .header("X-Tron-Poll-Secret", pollSecret)
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 300) {
            throw new IllegalStateException("Core returned HTTP " + response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    public String httpBase() {
        String core = store.coreUrl();
        if (core == null || core.isBlank()) {
            core = "http://localhost:8080";
        }
        String trimmed = core.trim();
        if (!trimmed.contains("://")) {
            trimmed = "http://" + trimmed;
        }
        String httpUrl = trimmed.replaceFirst("^(?i)ws://", "http://").replaceFirst("^(?i)wss://", "https://");
        int apiIndex = httpUrl.indexOf("/api/");
        String base = apiIndex > 0 ? httpUrl.substring(0, apiIndex) : httpUrl;
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    public String wsUrl() {
        String core = store.coreUrl();
        if (core == null || core.isBlank()) {
            core = "ws://localhost:8080/api/v1/desktop-agent/ws";
        }
        String trimmed = core.trim();
        if (!trimmed.contains("://")) {
            trimmed = "ws://" + trimmed;
        }
        String wsUrl = trimmed.replaceFirst("^(?i)http://", "ws://").replaceFirst("^(?i)https://", "wss://");
        int apiIndex = wsUrl.indexOf("/api/");
        if (apiIndex > 0) {
            wsUrl = wsUrl.substring(0, apiIndex) + "/api/v1/desktop-agent/ws";
        } else {
            while (wsUrl.endsWith("/")) {
                wsUrl = wsUrl.substring(0, wsUrl.length() - 1);
            }
            wsUrl = wsUrl + "/api/v1/desktop-agent/ws";
        }
        return wsUrl;
    }

    private static Path browserProfile(String deviceUuid) {
        String safe = deviceUuid == null ? "device" : deviceUuid.replaceAll("[^a-zA-Z0-9-]", "");
        String os = System.getProperty("os.name", "").toLowerCase();
        Path base;
        if (os.contains("win")) {
            String local = System.getenv("LOCALAPPDATA");
            base = local == null || local.isBlank()
                    ? Path.of(System.getProperty("user.home"), "AppData", "Local")
                    : Path.of(local);
        } else {
            base = Path.of(System.getProperty("user.home"), ".config");
        }
        return base.resolve("TRON").resolve("browser-profile").resolve(safe);
    }

    public static String hostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "desktop";
        }
    }

    private static int remainingTtlSeconds(long deadlineMillis) {
        long remaining = deadlineMillis - System.currentTimeMillis();
        if (remaining <= 0) {
            return 0;
        }
        return (int) Math.min(Integer.MAX_VALUE, remaining / 1000L);
    }

    private static String shortId(String id) {
        if (id == null) return "unknown";
        return id.length() <= 8 ? id : id.substring(0, 8);
    }

    public enum PairingUiState {
        UNCONNECTED,
        REQUESTING,
        READY,
        REPAIR_REQUIRED,
        CORE_OFFLINE,
        FAILED,
        EXPIRED,
        PAIRED,
        BROWSER_WAITING,
        BROWSER_EXPIRED
    }

    public interface AgentUi {
        default void status(String connection, String detail) {}

        default void pairingStateChanged(PairingUiState state, String code, int expiresInSeconds, String safeDetail) {}

        default void browserLinkWaiting(String linkRequestId, String authorizationUrl, int expiresInSeconds) {}

        default void pairingCode(String code) {}

        default void pairingCode(String code, int expiresInSeconds) {
            pairingCode(code);
        }

        default void pairingWaitingForCore(String reason) {}

        default void paired(String deviceUuid) {}

        /**
         * Shown after the signed-in user authorizes this computer.
         * Headless callers accept the connection.
         */
        default boolean confirmSignedInAccount() {
            return true;
        }

        default void taskUpdated(String taskId, String status, String goal, String controlMode, String step, boolean waitingUser) {}

        default void browserUpdated(String state, String url, String title) {}

        default void heartbeat(Instant timestamp) {}

        default void logEvent(String event) {}

        default void approval(String taskId, String action, String risk, Consumer<Boolean> decision) {}

        default void approval(String taskId, String action, String risk, String commandPreview, String pathPreview, Consumer<Boolean> decision) {
            approval(taskId, action, risk, decision);
        }

        static AgentUi silent() {
            return new AgentUi() {};
        }
    }
}
