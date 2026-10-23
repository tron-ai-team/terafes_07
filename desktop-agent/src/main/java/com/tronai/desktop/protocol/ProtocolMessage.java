package com.tronai.desktop.protocol;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Typed desktop-agent protocol message. Unused payloads stay null and are omitted.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProtocolMessage {

    public static final String VERSION = "1.0";

    private String protocolVersion = VERSION;
    private String type;
    private String deviceId;
    private String taskId;
    private String actionId;
    private String timestamp;
    private Hello hello;
    private Action action;
    private Result result;
    private Approval approval;
    private Terminal terminal;
    private FileChanged fileChanged;
    private Browser browser;
    private TaskSignal task;
    private String summary;
    private String error;

    public static ProtocolMessage of(MessageType type) {
        ProtocolMessage message = new ProtocolMessage();
        message.type = type.name();
        message.timestamp = java.time.Instant.now().toString();
        return message;
    }

    public String getProtocolVersion() {
        return protocolVersion;
    }

    public void setProtocolVersion(String protocolVersion) {
        this.protocolVersion = protocolVersion;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getActionId() {
        return actionId;
    }

    public void setActionId(String actionId) {
        this.actionId = actionId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public Hello getHello() {
        return hello;
    }

    public void setHello(Hello hello) {
        this.hello = hello;
    }

    public Action getAction() {
        return action;
    }

    public void setAction(Action action) {
        this.action = action;
    }

    public Result getResult() {
        return result;
    }

    public void setResult(Result result) {
        this.result = result;
    }

    public Approval getApproval() {
        return approval;
    }

    public void setApproval(Approval approval) {
        this.approval = approval;
    }

    public Terminal getTerminal() {
        return terminal;
    }

    public void setTerminal(Terminal terminal) {
        this.terminal = terminal;
    }

    public FileChanged getFileChanged() {
        return fileChanged;
    }

    public void setFileChanged(FileChanged fileChanged) {
        this.fileChanged = fileChanged;
    }

    public Browser getBrowser() {
        return browser;
    }

    public void setBrowser(Browser browser) {
        this.browser = browser;
    }

    public TaskSignal getTask() {
        return task;
    }

    public void setTask(TaskSignal task) {
        this.task = task;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Hello {
        private String deviceUuid;
        private String agentVersion;
        private String os;
        private String hostname;
        private String allowedWorkspace;

        public String getDeviceUuid() { return deviceUuid; }
        public void setDeviceUuid(String deviceUuid) { this.deviceUuid = deviceUuid; }
        public String getAgentVersion() { return agentVersion; }
        public void setAgentVersion(String agentVersion) { this.agentVersion = agentVersion; }
        public String getOs() { return os; }
        public void setOs(String os) { this.os = os; }
        public String getHostname() { return hostname; }
        public void setHostname(String hostname) { this.hostname = hostname; }
        public String getAllowedWorkspace() { return allowedWorkspace; }
        public void setAllowedWorkspace(String allowedWorkspace) { this.allowedWorkspace = allowedWorkspace; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Action {
        private String tool;
        private String operation;
        private String workingDirectory;
        private Arguments arguments;
        private String approvalId;
        private String fingerprint;
        private String approvalMac;
        private String approvalExpiresAt;

        public String getTool() { return tool; }
        public void setTool(String tool) { this.tool = tool; }
        public String getOperation() { return operation; }
        public void setOperation(String operation) { this.operation = operation; }
        public String getWorkingDirectory() { return workingDirectory; }
        public void setWorkingDirectory(String workingDirectory) { this.workingDirectory = workingDirectory; }
        public Arguments getArguments() { return arguments; }
        public void setArguments(Arguments arguments) { this.arguments = arguments; }
        public String getApprovalId() { return approvalId; }
        public void setApprovalId(String approvalId) { this.approvalId = approvalId; }
        public String getFingerprint() { return fingerprint; }
        public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }
        public String getApprovalMac() { return approvalMac; }
        public void setApprovalMac(String approvalMac) { this.approvalMac = approvalMac; }
        public String getApprovalExpiresAt() { return approvalExpiresAt; }
        public void setApprovalExpiresAt(String approvalExpiresAt) { this.approvalExpiresAt = approvalExpiresAt; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Arguments {
        private java.util.List<String> argv;
        private String command;
        private String path;
        private String destinationPath;
        private String content;
        private String find;
        private String replace;
        private String query;
        private String url;
        private String selector;
        private String text;
        private Integer timeoutMs;
        private Long processId;
        private Boolean recursive;
        private Integer maxDepth;
        private Boolean headed;
        private Boolean persistent;
        private String browserControl;

        public java.util.List<String> getArgv() { return argv; }
        public void setArgv(java.util.List<String> argv) { this.argv = argv; }
        public String getCommand() { return command; }
        public void setCommand(String command) { this.command = command; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getDestinationPath() { return destinationPath; }
        public void setDestinationPath(String destinationPath) { this.destinationPath = destinationPath; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getFind() { return find; }
        public void setFind(String find) { this.find = find; }
        public String getReplace() { return replace; }
        public void setReplace(String replace) { this.replace = replace; }
        public String getQuery() { return query; }
        public void setQuery(String query) { this.query = query; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getSelector() { return selector; }
        public void setSelector(String selector) { this.selector = selector; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public Integer getTimeoutMs() { return timeoutMs; }
        public void setTimeoutMs(Integer timeoutMs) { this.timeoutMs = timeoutMs; }
        public Long getProcessId() { return processId; }
        public void setProcessId(Long processId) { this.processId = processId; }
        public Boolean getRecursive() { return recursive; }
        public void setRecursive(Boolean recursive) { this.recursive = recursive; }
        public Integer getMaxDepth() { return maxDepth; }
        public void setMaxDepth(Integer maxDepth) { this.maxDepth = maxDepth; }
        public Boolean getHeaded() { return headed; }
        public void setHeaded(Boolean headed) { this.headed = headed; }
        public Boolean getPersistent() { return persistent; }
        public void setPersistent(Boolean persistent) { this.persistent = persistent; }
        public String getBrowserControl() { return browserControl; }
        public void setBrowserControl(String browserControl) { this.browserControl = browserControl; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Result {
        private boolean success;
        private String summary;
        private Integer exitCode;
        private Long durationMs;
        private String stdout;
        private String stderr;
        private Boolean timedOut;
        private Boolean cancelled;
        private String path;
        private String sha256;
        private Long sizeBytes;
        private java.util.List<FileEntry> entries;
        private java.util.List<SearchHit> hits;
        private Long processId;
        private String screenshotBase64;
        private String mimeType;
        private String url;
        private String title;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public Integer getExitCode() { return exitCode; }
        public void setExitCode(Integer exitCode) { this.exitCode = exitCode; }
        public Long getDurationMs() { return durationMs; }
        public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }
        public String getStdout() { return stdout; }
        public void setStdout(String stdout) { this.stdout = stdout; }
        public String getStderr() { return stderr; }
        public void setStderr(String stderr) { this.stderr = stderr; }
        public Boolean getTimedOut() { return timedOut; }
        public void setTimedOut(Boolean timedOut) { this.timedOut = timedOut; }
        public Boolean getCancelled() { return cancelled; }
        public void setCancelled(Boolean cancelled) { this.cancelled = cancelled; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getSha256() { return sha256; }
        public void setSha256(String sha256) { this.sha256 = sha256; }
        public Long getSizeBytes() { return sizeBytes; }
        public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
        public java.util.List<FileEntry> getEntries() { return entries; }
        public void setEntries(java.util.List<FileEntry> entries) { this.entries = entries; }
        public java.util.List<SearchHit> getHits() { return hits; }
        public void setHits(java.util.List<SearchHit> hits) { this.hits = hits; }
        public Long getProcessId() { return processId; }
        public void setProcessId(Long processId) { this.processId = processId; }
        public String getScreenshotBase64() { return screenshotBase64; }
        public void setScreenshotBase64(String screenshotBase64) { this.screenshotBase64 = screenshotBase64; }
        public String getMimeType() { return mimeType; }
        public void setMimeType(String mimeType) { this.mimeType = mimeType; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FileEntry {
        private String name;
        private String path;
        private boolean directory;
        private long sizeBytes;
        private boolean symlink;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public boolean isDirectory() { return directory; }
        public void setDirectory(boolean directory) { this.directory = directory; }
        public long getSizeBytes() { return sizeBytes; }
        public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }
        public boolean isSymlink() { return symlink; }
        public void setSymlink(boolean symlink) { this.symlink = symlink; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SearchHit {
        private String path;
        private int line;
        private String text;

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public int getLine() { return line; }
        public void setLine(int line) { this.line = line; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Approval {
        private String approvalId;
        private String fingerprint;
        private String risk;
        private String summary;
        private String commandPreview;
        private String pathPreview;
        private String expiresAt;
        private String decision;

        public String getApprovalId() { return approvalId; }
        public void setApprovalId(String approvalId) { this.approvalId = approvalId; }
        public String getFingerprint() { return fingerprint; }
        public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }
        public String getRisk() { return risk; }
        public void setRisk(String risk) { this.risk = risk; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public String getCommandPreview() { return commandPreview; }
        public void setCommandPreview(String commandPreview) { this.commandPreview = commandPreview; }
        public String getPathPreview() { return pathPreview; }
        public void setPathPreview(String pathPreview) { this.pathPreview = pathPreview; }
        public String getExpiresAt() { return expiresAt; }
        public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
        public String getDecision() { return decision; }
        public void setDecision(String decision) { this.decision = decision; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Terminal {
        private String stream;
        private String chunk;

        public String getStream() { return stream; }
        public void setStream(String stream) { this.stream = stream; }
        public String getChunk() { return chunk; }
        public void setChunk(String chunk) { this.chunk = chunk; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class FileChanged {
        private String path;
        private String changeType;
        private String sha256;
        private Long sizeBytes;

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getChangeType() { return changeType; }
        public void setChangeType(String changeType) { this.changeType = changeType; }
        public String getSha256() { return sha256; }
        public void setSha256(String sha256) { this.sha256 = sha256; }
        public Long getSizeBytes() { return sizeBytes; }
        public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Browser {
        private String event;
        private String url;
        private String title;
        private String screenshotBase64;
        private String detail;

        public String getEvent() { return event; }
        public void setEvent(String event) { this.event = event; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getScreenshotBase64() { return screenshotBase64; }
        public void setScreenshotBase64(String screenshotBase64) { this.screenshotBase64 = screenshotBase64; }
        public String getDetail() { return detail; }
        public void setDetail(String detail) { this.detail = detail; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TaskSignal {
        private String reason;
        private Boolean releaseBrowser;
        private String goal;

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public Boolean getReleaseBrowser() { return releaseBrowser; }
        public void setReleaseBrowser(Boolean releaseBrowser) { this.releaseBrowser = releaseBrowser; }
        public String getGoal() { return goal; }
        public void setGoal(String goal) { this.goal = goal; }
    }
}

