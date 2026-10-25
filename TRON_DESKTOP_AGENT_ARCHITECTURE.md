# TRON Desktop Agent architecture

Spring is the brain. The desktop agent is the hands. The agent does not invent shell actions. Spring sends one structured action at a time. The agent checks workspace boundaries and the deterministic policy before it runs anything.

```text
TRON Web
    |  HTTPS + user JWT
Spring Boot Core
    |  outbound WebSocket from the desktop
TRON Desktop Agent (Java 21 + JavaFX)
    |  files, processes, git, Maven/Gradle/npm, Playwright
The user's PC
```

The agent never listens on a public port. Local development uses `ws://localhost:8080/api/v1/desktop-agent/ws`. Production uses `wss://` on the same path. The URL comes from `TRON_CORE_URL`. It is not hardcoded to a final domain.

## Modules

Spring packages live under `com.tronai.desktopagent` in `backend/backend-spring`:

- `device` — ownership, presence, revoke
- `pairing` — short code, one-time credential delivery
- `connection` — WebSocket handshake and session registry
- `task` — persistence, planner, orchestrator
- `protocol` — typed JSON messages
- `policy` — workspace guard, command risk, fingerprints, redaction
- `approval` — pending decision, single consume, HMAC
- `execution` — action rows stored with the task module
- `events` — SSE to the web console

The desktop app is `desktop-agent/`, a Maven Java 21 project. Packages under `com.tronai.desktop`:

- `app` — JavaFX window and headless runtime
- `connection` — outbound WebSocket inside the runtime
- `pairing` — code display and poll
- `protocol` — the same JSON shape as Spring
- `tools` — the only gateway that may call a tool
- `filesystem`, `terminal`, `git`, `process`, `browser`
- `policy`, `approval`, `security`
- `ui` — the JavaFX window in `app`

Policy classes are copied into the desktop module and must stay algorithm-identical with Spring. Risk is never taken from a model label.

## Security model

A user can list, task, read, and approve only their own devices. Revoke marks the device `REVOKED`, replaces the credential hash, clears the approval-key envelope, closes the socket, and rejects later connections and tasks.

The device WebSocket is permitted at the HTTP security layer and authenticated in the handshake with `Authorization: Device <credential>`. The credential is not accepted in the query string. `DEVICE_HELLO` must match the authenticated device UUID. Spring then sends `DEVICE_WELCOME`.

Heartbeats are about every 15 seconds. A presence check every 15 seconds marks `ONLINE` or `BUSY` devices `OFFLINE` when `last_seen` is older than 45 seconds and the socket is closed.

Logs and task output pass through a redactor. JWT material, API keys, device credentials, pairing secrets, and private keys are not returned. Child processes do not inherit environment variables whose names contain `SECRET`, `PASSWORD`, `TOKEN`, or `CREDENTIAL`.

## Pairing

On first launch the agent creates a stable device UUID and an Ed25519 key pair. It asks Spring for a pairing request. Spring returns a code such as `748-291`, a request id, and a poll secret. The code is stored as a SHA-256 hash of the six digits. The poll secret is hashed. Neither is kept as reusable plaintext.

The signed-in user submits the code and an allowed workspace. That consumes the code. The desktop poll then receives the device credential and approval key once. The delivery envelopes are cleared after that read. The agent stores them locally. It never stores the user's password or the user's Spring access token.

Failed code attempts are locked out after 30 failures in 10 minutes.

## Local credential storage

Default locations:

- Windows: `%LOCALAPPDATA%\TRON\desktop-agent\identity.json`, then `icacls` limits the file to the current user
- Linux: `~/.config/tron-desktop-agent/identity.json` with mode `600` on the file and directory

`TRON_IDENTITY_FILE` overrides the path. Tests use that override so they do not touch the real store. The file is outside the project workspace unless an operator deliberately points the override inside it. The private key, credential, and approval key are not printed and are not written into task output.

## Protocol

Protocol version `1.0`. JSON uses Jackson. Null fields are omitted. `deviceId` on the wire is the device UUID.

Messages: `DEVICE_HELLO`, `DEVICE_WELCOME`, `DEVICE_HEARTBEAT`, `TASK_START`, `TASK_CANCEL`, `TASK_PAUSE`, `TASK_RESUME`, `TAKE_CONTROL`, `ACTION_REQUEST`, `ACTION_RESULT`, `APPROVAL_REQUIRED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`, `TERMINAL_OUTPUT`, `FILE_CHANGED`, `BROWSER_EVENT`, `TASK_COMPLETED`, `TASK_FAILED`, `ERROR`.

Where they apply, messages carry `protocolVersion`, `deviceId`, `taskId`, `actionId`, and `timestamp`.

An action request looks like:

```json
{
  "protocolVersion": "1.0",
  "type": "ACTION_REQUEST",
  "deviceId": "device-uuid",
  "taskId": "task-uuid",
  "actionId": "action-uuid",
  "action": {
    "tool": "TERMINAL",
    "operation": "RUN",
    "workingDirectory": "C:\\Dev\\project",
    "arguments": { "argv": ["mvn", "test"] },
    "fingerprint": "sha256",
    "approvalId": "only-when-required",
    "approvalMac": "only-when-required",
    "approvalExpiresAt": "epoch-millis"
  }
}
```

## Workspace sandbox

Every file path and command working directory is resolved to a canonical path and must stay inside the allowed workspace. `Path.startsWith` is component-aware, so `C:\Dev` does not allow `C:\Dev2`. `..`, `C:\Windows`, and `/etc` are rejected. V1 has no expanded-permission escape hatch.

## Tools

File tools: `LIST_FILES`, `READ_FILE`, `SEARCH_TEXT`, `CREATE_FILE`, `WRITE_FILE`, `PATCH_FILE`, `MOVE_FILE`. `DELETE_FILE` exists and requires approval. Reads are size-limited (default 1 MiB), detect binary content, and use UTF-8 for text.

Terminal tools run through `ProcessBuilder` with an argument list. The agent does not concatenate a user shell string. On Windows, `.cmd` and `.bat` files are started with `SystemRoot\System32\cmd.exe /d /s /c` because `CreateProcess` cannot start a batch file. Arguments that contain `& | < > ^ % ! "` or newlines are rejected before that launch. Linux execs the binary directly.

If `mvn` or `gradle` is not on `PATH`, and `mvnw` / `mvnw.cmd` or `gradlew` / `gradlew.bat` exists in the working directory, that project wrapper is used. The policy decision still applies to the requested `mvn` or `gradle` arguments.

Stdout and stderr stream to Spring. The process has a timeout, can be cancelled, and the process tree is destroyed (`taskkill /T /F` on Windows, descendants plus destroy on Linux).

Git operations `STATUS`, `DIFF`, `LOG`, and `BRANCH` are structured. Commit and push require approval. `git push --force` and `git reset --hard` are blocked.

The agent tracks processes it starts and can stop only those. It does not kill arbitrary system processes.

Playwright is a local Node helper, `desktop-agent/playwright-helper/server.js`, bound to `127.0.0.1`. The Java agent starts `node server.js` and calls HTTP routes: open, click, type, text, wait, visible, screenshot, close. Chromium is headless. If Playwright is not installed, the result is `DEPENDENCY_MISSING`. Screenshots are for the browser page. There is no desktop recording.

## Risk policy

Levels: `SAFE`, `NORMAL`, `REQUIRES_APPROVAL`, `BLOCKED`.

Safe examples include `git status`, `git diff`, `git log`, `mvn test`, `mvn package`, `npm test`, `npm run build`, `gradle test`, and read-only file access. Normal covers source edits and ordinary local commands inside the workspace. Approval covers delete, `git commit`, `git push`, package installs, `sudo`, elevation, and system configuration. Blocked covers disk format, shell operators, `cmd` / `bash` as the user command, force push, hard reset, and destructive system commands. A block cannot be approved.

## Approvals

The fingerprint is SHA-256 of the tool, operation, normalized paths, argv, content hash, and URL. Spring seals an approval key per device with AES-GCM. The MAC is HMAC-SHA256 over device UUID, task id, action id, fingerprint, and expiry. The desktop agent refuses a dangerous action whose MAC, fingerprint, or expiry does not match. Each approval is consumed once.

The web console approves or denies. The JavaFX window can also show a local approve-once / deny popup. Either decision is sent to Spring. The agent still waits for Spring's signed `ACTION_REQUEST` before it executes.

The orchestrator is woken only after the approval transaction commits, so it cannot consume a decision that is not yet visible.

## Task lifecycle

States: `QUEUED`, `PLANNING`, `RUNNING`, `WAITING_APPROVAL`, `PAUSED`, `COMPLETED`, `FAILED`, `STOPPED`.

The planner loop is inspect, plan one action, execute, observe, repeat, then finish. Known missions are deterministic: inspect, Maven test, hello file, edit, delete, git push, a small Maven project, a Tomcat WAR project, an Oracle refusal, and a browser open. Other goals may ask the existing TRON model for one JSON action. The model is not asked to rate risk. Hidden reasoning is not stored. The web UI receives short summaries only.

`MAX_ACTIONS_PER_TASK` defaults to 50. The same failing fingerprint stops the task after three failures.

Pause does not cancel the action already running. Stop cancels the current action, stops processes that task started, and sets `STOPPED`. Take control pauses the task, sets `MANUAL`, and asks the agent to release the browser. Resume clears the manual flag and the agent continues from the stored steps. There is no remote-desktop stream.

An Oracle goal finishes with an explicit statement that Oracle was not contacted. A missing local tool is reported as missing. The agent does not claim a deployment succeeded.

## Data

Flyway `V6__desktop_agent.sql` creates `desktop_devices`, `desktop_pairing_requests`, `agent_tasks`, `agent_task_steps`, `agent_action_executions`, `agent_approvals`, and `agent_file_changes`. Credentials and pairing codes are hashes or sealed envelopes. Terminal text is redacted before it is stored.

## Windows run

From `backend/backend-spring`:

```text
.\mvnw.cmd spring-boot:run
```

From `desktop-agent`, using the same wrapper:

```text
..\backend\backend-spring\mvnw.cmd -DskipTests package
```

Then launch `com.tronai.desktop.app.DesktopAgentApp` with JavaFX on the module path, or `mvnw javafx:run`. Set `TRON_CORE_URL` if Spring is not on `ws://localhost:8080/api/v1/desktop-agent/ws`. Set `TRON_WORKSPACE` for the allowed root. The window shows the pairing code. Submit that code from the web API with the workspace path.

Browser actions need, once, in `desktop-agent/playwright-helper`:

```text
npm install
npx playwright install chromium
```

Closing the window hides it. The tray Exit item shuts the agent down. `mvn -Pjlink` can build a future runtime image. Installer signing is not part of V1.

## Ubuntu later

The same Java runtime applies. Do not assume `cmd.exe`. The process runner uses `PATH` and a project `mvnw` or `gradlew`. Credentials use `~/.config/tron-desktop-agent` with mode `600`. The core URL stays `TRON_CORE_URL`, with `wss://` in production.
