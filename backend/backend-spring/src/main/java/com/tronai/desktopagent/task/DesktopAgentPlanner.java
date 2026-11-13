package com.tronai.desktopagent.task;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.desktopagent.protocol.ProtocolMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Plans one next desktop action. Known missions use a deterministic sequence.
 * Open goals may ask the shared AI gateway (or local ModelManager fallback) for one JSON action.
 * Hidden reasoning is not stored.
 */
@Component
public class DesktopAgentPlanner {

    private static final Logger log = LoggerFactory.getLogger(DesktopAgentPlanner.class);
    private static final Pattern URL = Pattern.compile("https?://[^\\s\"']+");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ModelManager modelManager;
    private final AiGateway aiGateway;

    public DesktopAgentPlanner(ModelManager modelManager,
                               @Autowired(required = false) AiGateway aiGateway) {
        this.modelManager = modelManager;
        this.aiGateway = aiGateway;
    }

    public PlannedAction plan(TaskContext context) {
        if (context.actionCount() >= context.maxActions()) {
            return PlannedAction.fail("Maximum action limit reached");
        }
        if (context.repeatedFailure()) {
            return PlannedAction.fail("Repeated failing action stopped");
        }
        if (context.needsReinspect() && context.browserOpen() && !done(context, "Checking the open page")) {
            return inspectPage(context);
        }
        if (context.needsReinspect() && !context.browserOpen()) {
            return list("Re-inspecting workspace");
        }
        Mission mission = detect(effectiveGoal(context));
        if (mission == Mission.LLM) {
            PlannedAction llm = planWithModel(context);
            return llm == null ? PlannedAction.fail("The planner could not determine a safe next action") : llm;
        }
        return deterministic(mission, context);
    }

    private PlannedAction deterministic(Mission mission, TaskContext context) {
        if (context.lastDenied()) {
            return switch (mission) {
                case GIT_PUSH -> PlannedAction.finish("Push was denied. Nothing was pushed.");
                case DELETE -> PlannedAction.finish("Delete was denied. The file was not removed.");
                default -> PlannedAction.finish("The action was denied.");
            };
        }
        return switch (mission) {
            case INSPECT -> inspect(context);
            case MAVEN_TEST -> mavenTest(context);
            case HELLO -> hello(context);
            case EDIT -> edit(context);
            case DELETE -> delete(context);
            case GIT_PUSH -> push(context);
            case MAVEN_PROJECT -> mavenProject(context);
            case TOMCAT -> tomcat(context);
            case ORACLE -> PlannedAction.finish("Oracle was not contacted and no deployment was attempted. Oracle availability is not assumed.");
            case BROWSER -> browser(context);
            case LONG_PING -> longPing(context);
            case LLM -> PlannedAction.fail("The planner could not determine a safe next action");
        };
    }

    private PlannedAction inspect(TaskContext context) {
        if (!done(context, "Inspecting workspace")) {
            return list("Inspecting workspace");
        }
        if (!done(context, "Running git status")) {
            return terminal(context, "Running git status", "git", "status");
        }
        String observed = context.lastObservation() == null ? "" : context.lastObservation();
        return PlannedAction.finish(trim("Workspace inspected. git status: " + oneLine(observed)));
    }

    private PlannedAction mavenTest(TaskContext context) {
        if (!done(context, "Running Maven tests")) {
            return terminal(context, "Running Maven tests", "mvn", "test");
        }
        if (context.lastFailed()) {
            return PlannedAction.fail(trim("Maven tests failed. " + oneLine(context.lastObservation())));
        }
        return PlannedAction.finish("Maven tests finished.");
    }

    private PlannedAction hello(TaskContext context) {
        if (!done(context, "Creating hello.txt")) {
            return write(context, "Creating hello.txt", "CREATE_FILE", "hello.txt", "TRON Desktop Agent works\n");
        }
        if (!done(context, "Reading hello.txt")) {
            return read(context, "Reading hello.txt", "hello.txt");
        }
        return PlannedAction.finish("Created hello.txt.");
    }

    private PlannedAction edit(TaskContext context) {
        if (!done(context, "Updating hello.txt")) {
            return write(context, "Updating hello.txt", "WRITE_FILE", "hello.txt", "TRON Desktop Agent works\nEdited by TRON\n");
        }
        if (!done(context, "Reading hello.txt")) {
            return read(context, "Reading hello.txt", "hello.txt");
        }
        return PlannedAction.finish("Updated hello.txt.");
    }

    private PlannedAction delete(TaskContext context) {
        if (!done(context, "Deleting hello.txt")) {
            ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
            args.setPath(path(context, "hello.txt"));
            return new PlannedAction(PlannedAction.Kind.ACTION, "Deleting hello.txt", "FILE", "DELETE_FILE", context.workspace(), args);
        }
        return PlannedAction.finish("Deleted hello.txt.");
    }

    private PlannedAction push(TaskContext context) {
        if (!done(context, "Requesting git push")) {
            return terminal(context, "Requesting git push", "git", "push", "origin", "main");
        }
        return PlannedAction.finish("git push finished.");
    }

    private PlannedAction mavenProject(TaskContext context) {
        if (!done(context, "Inspecting workspace")) {
            return list("Inspecting workspace");
        }
        if (!done(context, "Creating pom.xml")) {
            return write(context, "Creating pom.xml", "CREATE_FILE", "pom.xml", SAMPLE_POM);
        }
        if (!done(context, "Creating App.java")) {
            return write(context, "Creating App.java", "CREATE_FILE", "src/main/java/com/tronai/sample/App.java", SAMPLE_APP);
        }
        if (!done(context, "Creating AppTest.java")) {
            return write(context, "Creating AppTest.java", "CREATE_FILE", "src/test/java/com/tronai/sample/AppTest.java", SAMPLE_TEST);
        }
        int builds = count(context, "Running Maven tests");
        if (builds == 0) {
            return terminal(context, "Running Maven tests", "mvn", "test");
        }
        boolean repaired = done(context, "Updating App.java");
        if (context.lastFailed() && !repaired) {
            return write(context, "Updating App.java", "WRITE_FILE", "src/main/java/com/tronai/sample/App.java", SAMPLE_APP);
        }
        boolean lastWasRepair = !context.steps().isEmpty()
                && context.steps().get(context.steps().size() - 1).summary().contains("Updating App.java");
        if (lastWasRepair && builds < 2) {
            return terminal(context, "Running Maven tests", "mvn", "test");
        }
        if (context.lastFailed()) {
            return PlannedAction.fail(trim("Maven project build failed. " + oneLine(context.lastObservation())));
        }
        return PlannedAction.finish("Maven project was created and tests ran.");
    }

    private PlannedAction tomcat(TaskContext context) {
        if (!done(context, "Inspecting workspace")) {
            return list("Inspecting workspace");
        }
        if (!done(context, "Creating web pom.xml")) {
            return write(context, "Creating web pom.xml", "CREATE_FILE", "pom.xml", WAR_POM);
        }
        if (!done(context, "Creating HelloServlet.java")) {
            return write(context, "Creating HelloServlet.java", "CREATE_FILE",
                    "src/main/java/com/tronai/sample/HelloServlet.java", HELLO_SERVLET);
        }
        if (!done(context, "Creating index.jsp")) {
            return write(context, "Creating index.jsp", "CREATE_FILE", "src/main/webapp/index.jsp", INDEX_JSP);
        }
        if (!done(context, "Packaging WAR")) {
            return terminal(context, "Packaging WAR", "mvn", "package");
        }
        if (context.lastFailed()) {
            return PlannedAction.fail(trim("WAR build failed. Deployment was not attempted. " + oneLine(context.lastObservation())));
        }
        return PlannedAction.finish("WAR packaging finished. Deployment to Tomcat was not performed.");
    }

    private PlannedAction browser(TaskContext context) {
        boolean interactive = interactive(context);
        String url = targetUrlOrNull(context);
        boolean keepOpen = interactive && context.browserOpen() && isContinue(context.latestUserMessage());
        if (closeRequested(context)) {
            if (!done(context, "Closing browser")) {
                return new PlannedAction(PlannedAction.Kind.ACTION, "Closing browser", "BROWSER", "CLOSE", context.workspace(), new ProtocolMessage.Arguments());
            }
            return PlannedAction.finish("Browser closed.");
        }
        if (url == null && !keepOpen && !context.browserOpen()) {
            return PlannedAction.waitUser("Please provide the exact https URL to open. I will not guess a destination.");
        }
        if (!done(context, "Opening browser page") && !keepOpen) {
            ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
            args.setUrl(url != null ? url : context.browserUrl());
            args.setHeaded(interactive);
            args.setPersistent(interactive);
            return new PlannedAction(PlannedAction.Kind.ACTION, "Opening browser page", "BROWSER", "OPEN_URL", context.workspace(), args);
        }
        boolean openedThisTurn = done(context, "Opening browser page");
        boolean checkedThisTurn = done(context, "Checking the open page");
        String boundUrl = boundBrowserUrl(context, url);
        if (!done(context, "Reading page text") && !(checkedThisTurn && !openedThisTurn)) {
            ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
            args.setUrl(boundUrl);
            args.setSelector("body");
            return new PlannedAction(PlannedAction.Kind.ACTION, "Reading page text", "BROWSER", "GET_TEXT", context.workspace(), args);
        }
        String page = pageText(context);
        if (interactive && needsLogin(page)) {
            if (!done(context, "Handing the browser to you")) {
                ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
                args.setBrowserControl("USER");
                return new PlannedAction(PlannedAction.Kind.ACTION, "Handing the browser to you", "BROWSER", "SET_CONTROL", context.workspace(), args);
            }
            return PlannedAction.waitUser("This site requires login. I opened the browser. Please log in manually. Do not type your password into TRON chat.");
        }
        if (!done(context, "Capturing screenshot")) {
            ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
            args.setUrl(boundUrl);
            return new PlannedAction(PlannedAction.Kind.ACTION, "Capturing screenshot", "BROWSER", "SCREENSHOT", context.workspace(), args);
        }
        if (!hasScreenshotEvidence(context)) {
            return PlannedAction.fail("Screenshot evidence was missing. The page was not verified.");
        }
        if (!interactive && !done(context, "Closing browser")) {
            return new PlannedAction(PlannedAction.Kind.ACTION, "Closing browser", "BROWSER", "CLOSE", context.workspace(), new ProtocolMessage.Arguments());
        }
        if (interactive && page.toLowerCase(Locale.ROOT).contains("tron logged in")) {
            return PlannedAction.finish(verifiedFinish(context, "Account page is available."));
        }
        if (interactive && page.toLowerCase(Locale.ROOT).contains("tron settings")) {
            return PlannedAction.finish(verifiedFinish(context, "Settings page is open in the same browser session."));
        }
        if (!goalLooksVerified(context, page, boundUrl)) {
            return PlannedAction.waitUser("I opened the browser but could not verify the requested goal from the page. Tell me what to check next, or provide another URL.");
        }
        return PlannedAction.finish(verifiedFinish(context,
                interactive ? "Browser session is still open at " + oneLine(boundUrl) + "."
                        : "Browser check finished at " + oneLine(boundUrl) + "."));
    }

    private static PlannedAction inspectPage(TaskContext context) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setSelector("body");
        return new PlannedAction(PlannedAction.Kind.ACTION, "Checking the open page", "BROWSER", "INSPECT", context.workspace(), args);
    }

    private PlannedAction longPing(TaskContext context) {
        if (!done(context, "Running long ping")) {
            boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
            if (windows) {
                return terminal(context, "Running long ping", "ping", "127.0.0.1", "-n", "12");
            }
            return terminal(context, "Running long ping", "ping", "127.0.0.1", "-c", "12");
        }
        if (!done(context, "Running git status")) {
            return terminal(context, "Running git status", "git", "status");
        }
        return PlannedAction.finish("Long ping finished.");
    }

    private PlannedAction planWithModel(TaskContext context) {
        try {
            String system = """
                    You are the TRON desktop agent planner.
                    Choose the NEXT SINGLE action as JSON only.
                    Allowed tools: FILE, TERMINAL, GIT, PROCESS, BROWSER.
                    Allowed FILE operations: LIST_FILES, READ_FILE, SEARCH_TEXT, CREATE_FILE, WRITE_FILE, PATCH_FILE, MOVE_FILE, DELETE_FILE.
                    Allowed GIT operations: STATUS, DIFF, LOG, BRANCH, COMMIT, PUSH.
                    Allowed BROWSER operations: OPEN_URL, CLICK, TYPE, GET_TEXT, WAIT, SCREENSHOT, CHECK_VISIBLE, INSPECT, SET_CONTROL, CLOSE.
                    Prefer WRITE_FILE to create or update real source files with full content in arguments.content.
                    Do not create empty placeholder files. Do not repeat LIST_FILES or the same failed action.
                    SEARCH_TEXT requires arguments.query. PATCH_FILE requires arguments.find and arguments.replace.
                    Never type a password or secret. If a site needs login, MFA, or CAPTCHA, finish is false and summary asks the human to log in manually.
                    Do not submit job applications.
                    TERMINAL operation is RUN and arguments.argv is a string array. Do not use shell operators.
                    Set finish:true only when the goal is already satisfied by listed changed files / observations.
                    Do not emit chain-of-thought. Reply with JSON:
                    {"finish":false,"summary":"short user-visible summary","tool":"FILE","operation":"WRITE_FILE","arguments":{"path":"index.html","content":"..."}}
                    or {"finish":true,"summary":"short result"}
                    """;
            String user = "Goal: " + context.goal()
                    + "\nLatest user message: " + oneLine(context.latestUserMessage())
                    + "\nWorkspace: " + context.workspace()
                    + "\nTask status: " + oneLine(context.taskStatus())
                    + "\nCurrent steps: " + context.stepCount()
                    + "\nPrevious summaries: " + oneLine(join(context.historySummaries()))
                    + "\nChanged files: " + oneLine(join(context.changedFiles()))
                    + "\nRecent results: " + oneLine(context.recentResults())
                    + "\nBrowser: " + oneLine(context.browserState() + " " + context.browserUrl() + " " + context.browserTitle())
                    + "\nLast observation: " + oneLine(context.lastObservation())
                    + "\nRemaining: create any goal files that are still missing, then READ_FILE to verify, then finish.";
            List<ChatMessage> messages = List.of(new ChatMessage("system", system), new ChatMessage("user", user));
            ChatGenerationResult result = generatePlannerText(context, messages);
            return parseModelAction(context, result.getText());
        } catch (RuntimeException e) {
            log.info("Desktop planner model unavailable: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Package-visible for contract tests. Maps LLM JSON → PlannedAction including all tool arguments.
     */
    PlannedAction parseModelAction(TaskContext context, String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String json = text.trim();
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(json.substring(start, end + 1));
            String summary = safeSummary(node.path("summary").asText(null), "Planning the next action");
            if (node.path("finish").asBoolean(false)) {
                if (!AgentGoalVerifier.canAcceptFinish(context)) {
                    return list("Goal not verified yet — listing workspace before finishing");
                }
                return PlannedAction.finish(summary);
            }
            String tool = node.path("tool").asText("").toUpperCase(Locale.ROOT);
            String operation = node.path("operation").asText("").toUpperCase(Locale.ROOT);
            if (!List.of("FILE", "TERMINAL", "GIT", "PROCESS", "BROWSER").contains(tool)) {
                return null;
            }
            if ("BROWSER".equals(tool)) {
                operation = com.tronai.desktopagent.policy.CommandPolicyEngine.normalizeBrowserOperation(operation);
            }
            // Prefer WRITE_FILE for contentful creates so retries are idempotent.
            if ("FILE".equals(tool) && "CREATE_FILE".equals(operation)) {
                operation = "WRITE_FILE";
            }
            ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
            JsonNode arguments = node.path("arguments");
            if (arguments.has("path")) {
                args.setPath(path(context, arguments.get("path").asText()));
            }
            if (arguments.has("destinationPath")) {
                args.setDestinationPath(path(context, arguments.get("destinationPath").asText()));
            }
            if (arguments.has("content")) {
                args.setContent(arguments.get("content").asText());
            }
            if (arguments.has("query")) {
                args.setQuery(arguments.get("query").asText());
            }
            if (arguments.has("find")) {
                args.setFind(arguments.get("find").asText());
            }
            if (arguments.has("replace")) {
                args.setReplace(arguments.get("replace").asText());
            }
            if (arguments.has("url")) {
                args.setUrl(arguments.get("url").asText());
            } else if ("BROWSER".equals(tool) && "OPEN_URL".equals(operation)) {
                String inferred = targetUrlOrNull(context);
                if (inferred == null) {
                    return PlannedAction.waitUser("Please provide the exact https URL to open. I will not guess a destination.");
                }
                args.setUrl(inferred);
            } else if ("BROWSER".equals(tool) && context.browserUrl() != null) {
                args.setUrl(context.browserUrl());
            }
            if (arguments.has("selector")) {
                args.setSelector(arguments.get("selector").asText());
            }
            if (arguments.has("text")) {
                args.setText(arguments.get("text").asText());
            }
            if (arguments.has("browserControl")) {
                args.setBrowserControl(arguments.get("browserControl").asText());
            }
            if (arguments.has("timeoutMs") && arguments.get("timeoutMs").canConvertToInt()) {
                args.setTimeoutMs(arguments.get("timeoutMs").asInt());
            }
            if (arguments.has("processId") && arguments.get("processId").canConvertToLong()) {
                args.setProcessId(arguments.get("processId").asLong());
            }
            if (arguments.has("recursive") && arguments.get("recursive").isBoolean()) {
                args.setRecursive(arguments.get("recursive").asBoolean());
            }
            if (arguments.has("maxDepth") && arguments.get("maxDepth").canConvertToInt()) {
                args.setMaxDepth(arguments.get("maxDepth").asInt());
            }
            if (arguments.has("headed") && arguments.get("headed").isBoolean()) {
                args.setHeaded(arguments.get("headed").asBoolean());
            }
            if (arguments.has("persistent") && arguments.get("persistent").isBoolean()) {
                args.setPersistent(arguments.get("persistent").asBoolean());
            }
            if (arguments.has("argv") && arguments.get("argv").isArray()) {
                List<String> argv = new ArrayList<>();
                arguments.get("argv").forEach(item -> argv.add(item.asText()));
                args.setArgv(argv);
                args.setCommand(String.join(" ", argv));
            }
            String validationError = validateToolArguments(tool, operation, args);
            if (validationError != null) {
                return PlannedAction.fail(validationError);
            }
            return new PlannedAction(PlannedAction.Kind.ACTION, summary, tool, operation, context.workspace(), args);
        } catch (Exception e) {
            return null;
        }
    }

    static String validateToolArguments(String tool, String operation, ProtocolMessage.Arguments args) {
        if ("FILE".equals(tool)) {
            return switch (operation) {
                case "LIST_FILES", "READ_FILE", "DELETE_FILE", "MOVE_FILE" ->
                        args.getPath() == null || args.getPath().isBlank() ? "FILE " + operation + " requires arguments.path" : null;
                case "CREATE_FILE", "WRITE_FILE" -> {
                    if (args.getPath() == null || args.getPath().isBlank()) {
                        yield "FILE " + operation + " requires arguments.path";
                    }
                    if (args.getContent() == null) {
                        yield "FILE " + operation + " requires arguments.content";
                    }
                    yield null;
                }
                case "SEARCH_TEXT" -> {
                    if (args.getQuery() == null || args.getQuery().isBlank()) {
                        yield "FILE SEARCH_TEXT requires arguments.query";
                    }
                    yield null;
                }
                case "PATCH_FILE" -> {
                    if (args.getPath() == null || args.getPath().isBlank()) {
                        yield "FILE PATCH_FILE requires arguments.path";
                    }
                    if (args.getFind() == null || args.getFind().isEmpty() || args.getReplace() == null) {
                        yield "FILE PATCH_FILE requires arguments.find and arguments.replace";
                    }
                    yield null;
                }
                default -> "Unsupported FILE operation: " + operation;
            };
        }
        if ("TERMINAL".equals(tool) || "PROCESS".equals(tool)) {
            if ((args.getArgv() == null || args.getArgv().isEmpty())
                    && (args.getCommand() == null || args.getCommand().isBlank())) {
                return tool + " requires arguments.argv";
            }
        }
        if ("BROWSER".equals(tool) && "OPEN_URL".equals(operation)
                && (args.getUrl() == null || args.getUrl().isBlank())) {
            return "BROWSER OPEN_URL requires arguments.url";
        }
        return null;
    }

    private static PlannedAction list(String summary) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(".");
        args.setMaxDepth(2);
        return new PlannedAction(PlannedAction.Kind.ACTION, summary, "FILE", "LIST_FILES", null, args);
    }

    private static PlannedAction read(TaskContext context, String summary, String relative) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(path(context, relative));
        return new PlannedAction(PlannedAction.Kind.ACTION, summary, "FILE", "READ_FILE", context.workspace(), args);
    }

    private static PlannedAction write(TaskContext context, String summary, String operation, String relative, String content) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setPath(path(context, relative));
        args.setContent(content);
        return new PlannedAction(PlannedAction.Kind.ACTION, summary, "FILE", operation, context.workspace(), args);
    }

    private static PlannedAction terminal(TaskContext context, String summary, String... argv) {
        ProtocolMessage.Arguments args = new ProtocolMessage.Arguments();
        args.setArgv(List.of(argv));
        args.setCommand(String.join(" ", argv));
        args.setTimeoutMs(180_000);
        return new PlannedAction(PlannedAction.Kind.ACTION, summary, "TERMINAL", "RUN", context.workspace(), args);
    }

    private static String path(TaskContext context, String relative) {
        if (relative == null || relative.isBlank() || ".".equals(relative)) {
            return context.workspace();
        }
        java.nio.file.Path candidate = java.nio.file.Path.of(relative);
        if (candidate.isAbsolute()) {
            return candidate.normalize().toString();
        }
        return java.nio.file.Path.of(context.workspace()).resolve(relative).normalize().toString();
    }

    private static boolean done(TaskContext context, String marker) {
        return context.steps().stream().anyMatch(step -> step.summary().contains(marker) && "COMPLETED".equals(step.status()));
    }

    private static int count(TaskContext context, String marker) {
        int count = 0;
        for (TaskContext.StepView step : context.steps()) {
            if (step.summary().contains(marker)) {
                count++;
            }
        }
        return count;
    }

    static Mission detect(String goal) {
        String g = goal == null ? "" : goal.toLowerCase(Locale.ROOT);
        boolean codingCreate = looksLikeCodingCreate(g);
        if (g.contains("oracle") && !codingCreate) {
            return Mission.ORACLE;
        }
        if (g.contains("git push")) {
            return Mission.GIT_PUSH;
        }
        // Avoid substring trap: only the hello.txt delete demo mission.
        if (g.contains("delete") && g.contains("hello.txt")) {
            return Mission.DELETE;
        }
        if (!codingCreate && (g.contains("playwright") || g.contains("browser") || g.contains("http://") || g.contains("https://")
                || g.contains("account page") || g.contains("settings page") || g.contains("mynavi")
                || g.contains("log in") || g.contains("login"))) {
            return Mission.BROWSER;
        }
        if (g.contains("long ping")) {
            return Mission.LONG_PING;
        }
        if (g.contains("hello.txt") && (g.contains("edit") || g.contains("change") || g.contains("update"))) {
            return Mission.EDIT;
        }
        if (g.contains("hello.txt") && (g.contains("create") || g.contains("write") || g.contains("containing"))) {
            return Mission.HELLO;
        }
        if (g.contains("tomcat") || g.contains(".war") || g.contains(" war")) {
            return Mission.TOMCAT;
        }
        if (g.contains("maven test") || g.contains("mvn test") || g.contains("run maven")) {
            return Mission.MAVEN_TEST;
        }
        if (g.contains("maven") && (g.contains("create") || g.contains("simple"))) {
            return Mission.MAVEN_PROJECT;
        }
        if ((g.contains("git status") || g.contains("inspect")) && !codingCreate) {
            return Mission.INSPECT;
        }
        return Mission.LLM;
    }

    private static boolean looksLikeCodingCreate(String g) {
        boolean action = g.contains("create") || g.contains("write") || g.contains("build")
                || g.contains("implement") || g.contains("add file") || g.contains("multi-file")
                || g.contains("website") || g.contains("project");
        boolean artifact = g.contains(".html") || g.contains(".css") || g.contains(".js")
                || g.contains(".java") || g.contains(".ts") || g.contains("index.")
                || g.contains("style.") || g.contains("script.");
        return action && artifact;
    }

    static String effectiveGoal(TaskContext context) {
        String latest = context.latestUserMessage();
        if (latest != null && !latest.isBlank() && !isContinue(latest)) {
            return latest;
        }
        return context.goal() == null ? "" : context.goal();
    }

    static boolean isContinue(String message) {
        if (message == null) {
            return false;
        }
        String normalized = message.trim().toLowerCase(Locale.ROOT).replaceAll("[.!?]", "");
        return List.of("continue", "resume", "done", "logged in", "i logged in", "ok", "next").contains(normalized);
    }

    private static boolean closeRequested(TaskContext context) {
        String latest = context.latestUserMessage() == null ? "" : context.latestUserMessage().toLowerCase(Locale.ROOT);
        return latest.contains("close the browser");
    }

    private static boolean interactive(TaskContext context) {
        String blob = ((context.goal() == null ? "" : context.goal()) + " " + (context.latestUserMessage() == null ? "" : context.latestUserMessage()))
                .toLowerCase(Locale.ROOT);
        return blob.contains("login") || blob.contains("log in") || blob.contains("account page")
                || blob.contains("mynavi") || blob.contains("captcha") || blob.contains("mfa")
                || blob.contains("settings page");
    }

    static boolean needsLogin(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String value = text.toLowerCase(Locale.ROOT);
        if (value.contains("tron logged in")) {
            return false;
        }
        return value.contains("tron login") || value.contains("password") || value.contains("sign in") || value.contains("log in");
    }

    private static String pageText(TaskContext context) {
        if (context.pageText() != null && !context.pageText().isBlank()) {
            return context.pageText();
        }
        return context.lastObservation() == null ? "" : context.lastObservation();
    }

    private static String targetUrl(TaskContext context) {
        String found = targetUrlOrNull(context);
        return found == null ? "https://example.com" : found;
    }

    private static String targetUrlOrNull(TaskContext context) {
        String source = effectiveGoal(context);
        String direct = extractUrlOrNull(source);
        if (direct != null && !source.toLowerCase(Locale.ROOT).contains("settings page")) {
            return direct;
        }
        if (source.toLowerCase(Locale.ROOT).contains("settings")) {
            String base = context.browserUrl() != null ? context.browserUrl() : extractUrlOrNull(context.goal());
            if (base != null) {
                return origin(base) + "/settings";
            }
        }
        if (direct != null) {
            return direct;
        }
        return extractUrlOrNull(context.goal());
    }

    private static String boundBrowserUrl(TaskContext context, String requested) {
        if (context.browserUrl() != null && !context.browserUrl().isBlank()) {
            return context.browserUrl();
        }
        return requested;
    }

    private static boolean hasScreenshotEvidence(TaskContext context) {
        String recent = context.recentResults() == null ? "" : context.recentResults().toLowerCase(Locale.ROOT);
        String observation = context.lastObservation() == null ? "" : context.lastObservation();
        return recent.contains("screenshot")
                || observation.startsWith("iVBORw0KGgo")
                || (observation.length() > 64 && observation.chars().filter(Character::isLetterOrDigit).count() > 40);
    }

    private static boolean goalLooksVerified(TaskContext context, String page, String boundUrl) {
        if (boundUrl == null || boundUrl.isBlank()) {
            return false;
        }
        String goal = effectiveGoal(context).toLowerCase(Locale.ROOT);
        String pageLower = page == null ? "" : page.toLowerCase(Locale.ROOT);
        if (pageLower.isBlank() && !done(context, "Reading page text") && !done(context, "Checking the open page")) {
            return false;
        }
        String requested = extractUrlOrNull(effectiveGoal(context));
        if (requested != null && context.browserUrl() != null
                && !sameOriginOrPath(context.browserUrl(), requested)
                && !goal.contains("settings")) {
            return false;
        }
        if (goal.contains("login") || goal.contains("sign in")) {
            return pageLower.contains("login") || pageLower.contains("sign in") || pageLower.contains("password")
                    || needsLogin(page);
        }
        boolean read = done(context, "Reading page text") || done(context, "Checking the open page");
        boolean shot = done(context, "Capturing screenshot") && hasScreenshotEvidence(context);
        if (goal.contains("screenshot") || goal.contains("capture")) {
            return shot && (read || pageLower.length() > 20);
        }
        // Require page evidence — screenshot alone is not enough to claim the goal is done.
        return read && pageLower.length() > 20;
    }

    private static boolean sameOriginOrPath(String actual, String expected) {
        if (actual == null || expected == null) {
            return false;
        }
        String a = actual.toLowerCase(Locale.ROOT);
        String e = expected.toLowerCase(Locale.ROOT);
        return a.startsWith(e) || e.startsWith(a) || origin(a).equals(origin(e));
    }

    private static String verifiedFinish(TaskContext context, String summary) {
        String url = context.browserUrl();
        if (url == null || url.isBlank()) {
            return summary;
        }
        if (summary.toLowerCase(Locale.ROOT).contains(url.toLowerCase(Locale.ROOT))) {
            return summary;
        }
        return summary + " Current URL: " + oneLine(url);
    }

    private static String origin(String url) {
        try {
            java.net.URI uri = java.net.URI.create(url);
            return uri.getScheme() + "://" + uri.getRawAuthority();
        } catch (Exception e) {
            return url;
        }
    }

    private static String join(List<String> values) {
        if (values == null || values.isEmpty()) {
            return "";
        }
        return String.join("; ", values);
    }

    private static String extractUrl(String goal) {
        String found = extractUrlOrNull(goal);
        return found == null ? "https://example.com" : found;
    }

    private static String extractUrlOrNull(String goal) {
        Matcher matcher = URL.matcher(goal == null ? "" : goal);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private static String safeSummary(String summary, String fallback) {
        if (summary == null || summary.isBlank()) {
            return fallback;
        }
        String one = oneLine(summary);
        String lower = one.toLowerCase(Locale.ROOT);
        if (lower.contains("chain of thought") || lower.contains("let me think") || lower.contains("reasoning:")) {
            return fallback;
        }
        return one;
    }

    private static String oneLine(String value) {
        if (value == null) {
            return "";
        }
        String one = value.replaceAll("\\s+", " ").trim();
        return one.length() <= 300 ? one : one.substring(0, 300);
    }

    private static String trim(String value) {
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }

    public enum Mission {
        INSPECT, MAVEN_TEST, HELLO, EDIT, DELETE, GIT_PUSH, MAVEN_PROJECT, TOMCAT, ORACLE, BROWSER, LONG_PING, LLM
    }

    private ChatGenerationResult generatePlannerText(TaskContext context, List<ChatMessage> messages) {
        AiProfile logical = safeAiProfile(context.aiProfile());
        AiMode mode = toAiMode(logical);
        AiFeature feature = detectAgentFeature(context);
        if (aiGateway != null && usesGateway(logical)) {
            return aiGateway.generate(AiRequestContext.builder()
                    .feature(feature)
                    .mode(mode)
                    .userId(context.userId())
                    .messages(messages)
                    .temperature(0.1)
                    .maxTokens(1200)
                    .jsonMode(true)
                    .idempotencyKey(UUID.randomUUID().toString())
                    .build()).toChatGenerationResult();
        }
        ModelProfile profile = modelManager.getDefaultModel();
        return modelManager.getProvider(profile.getProvider()).generate(
                ChatGenerationRequest.builder()
                        .model(profile.getProviderModelName())
                        .messages(messages)
                        .temperature(0.1)
                        .numPredict(1200)
                        .jsonMode(true)
                        .build());
    }

    private static AiFeature detectAgentFeature(TaskContext context) {
        String goal = context.goal() == null ? "" : context.goal().toLowerCase(Locale.ROOT);
        boolean browserish = context.browserOpen()
                || goal.contains("browser")
                || goal.contains("http://")
                || goal.contains("https://")
                || goal.contains("navigate")
                || goal.contains("google")
                || goal.contains("example.com");
        return browserish ? AiFeature.BROWSER_AGENT : AiFeature.CODING_AGENT;
    }

    private static boolean usesGateway(AiProfile profile) {
        return profile == AiProfile.SMART || profile == AiProfile.ULTRA || profile == AiProfile.AUTO;
    }

    private static AiProfile safeAiProfile(String raw) {
        if (raw == null || raw.isBlank()) {
            return AiProfile.FAST;
        }
        try {
            return AiProfile.fromString(raw);
        } catch (RuntimeException ex) {
            return AiProfile.FAST;
        }
    }

    private static AiMode toAiMode(AiProfile profile) {
        return switch (profile) {
            case FAST -> AiMode.FAST;
            case SMART, QUALITY -> AiMode.SMART;
            case CLOUD -> AiMode.CLOUD;
            case ULTRA -> AiMode.ULTRA;
            case AUTO -> AiMode.AUTO;
        };
    }

    public record TaskContext(
            String goal,
            String workspace,
            List<StepView> steps,
            String lastObservation,
            boolean lastFailed,
            boolean lastDenied,
            boolean needsReinspect,
            boolean repeatedFailure,
            int actionCount,
            int maxActions,
            String latestUserMessage,
            List<String> historySummaries,
            List<String> changedFiles,
            String recentResults,
            String browserUrl,
            String browserTitle,
            String browserState,
            String pageText,
            String taskStatus,
            Long userId,
            String aiProfile
    ) {
        public int stepCount() {
            return steps == null ? 0 : steps.size();
        }

        public boolean browserOpen() {
            return browserState != null && !browserState.isBlank() && !"CLOSED".equals(browserState);
        }

        public record StepView(String summary, String tool, String operation, String status) {
        }
    }

    public record PlannedAction(
            Kind kind,
            String summary,
            String tool,
            String operation,
            String workingDirectory,
            ProtocolMessage.Arguments arguments
    ) {
        public static PlannedAction finish(String summary) {
            return new PlannedAction(Kind.FINISH, summary, null, null, null, null);
        }

        public static PlannedAction fail(String summary) {
            return new PlannedAction(Kind.FAIL, summary, null, null, null, null);
        }

        public static PlannedAction waitUser(String summary) {
            return new PlannedAction(Kind.WAIT_USER, summary, null, null, null, null);
        }

        public enum Kind { ACTION, FINISH, FAIL, WAIT_USER }
    }

    private static final String SAMPLE_POM = """
            <?xml version="1.0" encoding="UTF-8"?>
            <project xmlns="http://maven.apache.org/POM/4.0.0">
              <modelVersion>4.0.0</modelVersion>
              <groupId>com.tronai.sample</groupId>
              <artifactId>tron-sample</artifactId>
              <version>1.0.0</version>
              <properties>
                <maven.compiler.release>21</maven.compiler.release>
                <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
              </properties>
              <dependencies>
                <dependency>
                  <groupId>org.junit.jupiter</groupId>
                  <artifactId>junit-jupiter</artifactId>
                  <version>5.11.4</version>
                  <scope>test</scope>
                </dependency>
              </dependencies>
              <build>
                <plugins>
                  <plugin>
                    <artifactId>maven-surefire-plugin</artifactId>
                    <version>3.5.2</version>
                  </plugin>
                </plugins>
              </build>
            </project>
            """;

    private static final String SAMPLE_APP = """
            package com.tronai.sample;

            public class App {
                public static String message() {
                    return "TRON Desktop Agent works";
                }

                public static void main(String[] args) {
                    System.out.println(message());
                }
            }
            """;

    private static final String SAMPLE_TEST = """
            package com.tronai.sample;

            import org.junit.jupiter.api.Test;

            import static org.junit.jupiter.api.Assertions.assertEquals;

            class AppTest {
                @Test
                void message() {
                    assertEquals("TRON Desktop Agent works", App.message());
                }
            }
            """;

    private static final String WAR_POM = """
            <?xml version="1.0" encoding="UTF-8"?>
            <project xmlns="http://maven.apache.org/POM/4.0.0">
              <modelVersion>4.0.0</modelVersion>
              <groupId>com.tronai.sample</groupId>
              <artifactId>tron-web</artifactId>
              <version>1.0.0</version>
              <packaging>war</packaging>
              <properties>
                <maven.compiler.release>21</maven.compiler.release>
                <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
              </properties>
              <dependencies>
                <dependency>
                  <groupId>jakarta.servlet</groupId>
                  <artifactId>jakarta.servlet-api</artifactId>
                  <version>6.0.0</version>
                  <scope>provided</scope>
                </dependency>
              </dependencies>
              <build>
                <plugins>
                  <plugin>
                    <artifactId>maven-war-plugin</artifactId>
                    <version>3.4.0</version>
                  </plugin>
                </plugins>
              </build>
            </project>
            """;

    private static final String HELLO_SERVLET = """
            package com.tronai.sample;

            import jakarta.servlet.annotation.WebServlet;
            import jakarta.servlet.http.HttpServlet;
            import jakarta.servlet.http.HttpServletRequest;
            import jakarta.servlet.http.HttpServletResponse;

            import java.io.IOException;

            @WebServlet("/hello")
            public class HelloServlet extends HttpServlet {
                @Override
                protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
                    response.setContentType("text/plain;charset=UTF-8");
                    response.getWriter().write("TRON Desktop Agent works");
                }
            }
            """;

    private static final String INDEX_JSP = """
            <%@ page contentType="text/html;charset=UTF-8" %>
            <html><body><h1>TRON Desktop Agent works</h1></body></html>
            """;
}
