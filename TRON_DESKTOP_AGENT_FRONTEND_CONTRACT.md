# TRON Desktop Agent frontend contract

Spring is the control plane. The React console talks only to Spring. It does not open a socket to the desktop agent.

Authentication for every route below, except the two pairing routes the desktop agent calls itself, is the existing user JWT:

`Authorization: Bearer <access-token>`

Errors keep the existing API shape: `{ "detail": "..." }`. A missing device, task, or approval that belongs to another user is `404`, not `403`.

## Devices

`GET /api/v1/desktop-agents/devices`

Returns an array of devices owned by the caller.

`DELETE /api/v1/desktop-agents/devices/{id}`

`id` is the numeric device id. Revokes the device, invalidates its credential, and closes its socket.

Device object:

| Field | Type | Notes |
| --- | --- | --- |
| id | number | REST id |
| deviceUuid | string | Protocol identity. Not the REST id |
| displayName | string | |
| os | string | |
| hostname | string | |
| agentVersion | string | |
| fingerprint | string | Public-key fingerprint. Never a private key |
| status | string | `PENDING`, `OFFLINE`, `ONLINE`, `BUSY`, `REVOKED` |
| lastSeen | string | ISO-8601, or null |
| pairedAt | string | ISO-8601, or null |
| revokedAt | string | ISO-8601, or null |
| allowedWorkspace | string | Absolute path on the desktop machine |
| createdAt | string | ISO-8601 |

## Pairing

The desktop agent creates the request. The web console only submits the short code.

`POST /api/v1/desktop-agents/pair`

```json
{
  "code": "748-291",
  "allowedWorkspace": "C:\\Dev",
  "displayName": "Thushan-PC"
}
```

`allowedWorkspace` is required. The response is a device object and does not contain the device credential or approval key. Those are delivered once to the desktop agent.

The code expires (default 600 seconds), is single-use, and is stored only as a hash.

## Tasks

`POST /api/v1/agent-tasks` returns `201`.

```json
{
  "deviceId": 1,
  "goal": "Inspect the selected workspace and run git status.",
  "workspace": "C:\\Dev"
}
```

`workspace` is optional. When omitted, Spring uses the device's allowed workspace. A workspace outside the device's allowed root is rejected.

`GET /api/v1/agent-tasks`

`GET /api/v1/agent-tasks/{id}`

Control:

- `POST /api/v1/agent-tasks/{id}/pause`
- `POST /api/v1/agent-tasks/{id}/resume`
- `POST /api/v1/agent-tasks/{id}/stop`
- `POST /api/v1/agent-tasks/{id}/take-control`

Task object:

| Field | Type | Notes |
| --- | --- | --- |
| id | string | UUID |
| deviceId | number | |
| goal | string | |
| status | string | See task states |
| controlMode | string | `AGENT` or `MANUAL` |
| summary | string | Safe progress text. No hidden reasoning |
| workspace | string | |
| actionCount | number | |
| createdAt, startedAt, finishedAt | string | ISO-8601 or null |
| steps | array | Present on the detail route |
| executions | array | Present on the detail route |
| approvals | array | Present on the detail route |
| fileChanges | array | Present on the detail route |

Task states: `QUEUED`, `PLANNING`, `RUNNING`, `WAITING_APPROVAL`, `PAUSED`, `COMPLETED`, `FAILED`, `STOPPED`.

`take-control` sets `controlMode` to `MANUAL` and status to `PAUSED`. `resume` returns the task to `AGENT`.

Step:

| Field | Type |
| --- | --- |
| id | string |
| index | number |
| summary | string |
| tool | string |
| operation | string |
| status | string |
| createdAt | string |

Execution:

| Field | Type | Notes |
| --- | --- | --- |
| id | string | |
| actionId | string | |
| tool | string | `FILE`, `TERMINAL`, `GIT`, `PROCESS`, `BROWSER` |
| operation | string | |
| risk | string | `SAFE`, `NORMAL`, `REQUIRES_APPROVAL`, `BLOCKED` |
| status | string | |
| exitCode | number | |
| durationMs | number | |
| stdout | string | Redacted and truncated. A small browser screenshot may be stored here as base64 |
| stderr | string | Redacted and truncated |
| fingerprint | string | |

File change:

| Field | Type |
| --- | --- |
| path | string |
| changeType | string |
| sha256 | string |
| sizeBytes | number |

## Approvals

`POST /api/v1/agent-tasks/{id}/approvals/{approvalId}/approve`

`POST /api/v1/agent-tasks/{id}/approvals/{approvalId}/deny`

No request body. One decision is final. An approval cannot be reused for a different command, path, or action.

Approval object:

| Field | Type | Notes |
| --- | --- | --- |
| id | string | |
| taskId | string | |
| deviceId | number | |
| actionId | string | |
| fingerprint | string | Binds tool, operation, paths, argv, content hash, and URL |
| risk | string | |
| summary | string | |
| commandPreview | string | |
| pathPreview | string | |
| status | string | `PENDING`, `APPROVED`, `DENIED`, `EXPIRED`, `CONSUMED` |
| expiresAt | string | ISO-8601 |
| decidedAt | string | ISO-8601 or null |

While an approval is pending, the task status is `WAITING_APPROVAL`. The desktop agent does not run that action until Spring sends a signed action request after a single consume.

## Live events

Do not poll every second. Use server-sent events.

`GET /api/v1/agent-tasks/{id}/events`

`GET /api/v1/desktop-agents/events`

Both require the user JWT and `Accept: text/event-stream`. The stream stays open for 30 minutes. The event name is the SSE `event:` field. The `data:` field is JSON.

| Event | When |
| --- | --- |
| TASK_STATUS | Status or control mode changed |
| STEP_STARTED | An action started. `summary` is the safe label |
| STEP_COMPLETED | An action finished. `summary` is the safe result line |
| TERMINAL_OUTPUT | Live stdout or stderr chunk |
| FILE_CHANGED | A workspace file was created, edited, moved, or deleted |
| APPROVAL_REQUIRED | User must approve or deny |
| APPROVAL_GRANTED | Decision recorded |
| APPROVAL_DENIED | Decision recorded |
| BROWSER_EVENT | Browser title, URL, detail, and an optional screenshot |
| TASK_COMPLETED | Task finished successfully |
| TASK_FAILED | Task failed |
| DEVICE_STATUS | Device presence changed. On the user stream |

There is no `BROWSER_SCREENSHOT` event name. A screenshot is `screenshotBase64` inside `BROWSER_EVENT`, or the execution `stdout` when the action result itself is a screenshot. Screenshots are browser pages only. The desktop is not recorded.

Shared status payload:

```json
{
  "taskId": "uuid",
  "status": "RUNNING",
  "controlMode": "AGENT",
  "summary": "Running Maven tests"
}
```

`STEP_STARTED` and `STEP_COMPLETED` add `actionId` and replace `summary` with the step line.

Terminal chunk:

```json
{
  "taskId": "uuid",
  "actionId": "uuid",
  "stream": "stdout",
  "chunk": "BUILD SUCCESS"
}
```

`stream` is `stdout` or `stderr`.

Browser event:

```json
{
  "taskId": "uuid",
  "actionId": "uuid",
  "event": "OPEN_URL",
  "url": "http://127.0.0.1:8080/",
  "title": "Example",
  "detail": "optional",
  "screenshotBase64": "optional-png"
}
```

## What the console should show

Show `summary` and step summaries. Do not expect chain-of-thought. Dangerous actions stay on an approval card until approve or deny. `git status` proceeds on its own. `git push` and file delete wait. Force push is blocked and will not produce an approval card.
