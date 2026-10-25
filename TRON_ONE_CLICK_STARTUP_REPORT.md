# TRON One-Click Startup Report

**Date:** 2026-10-25  
**Primary launcher:** `START_TRON.cmd` → `scripts\Start-Tron.ps1`  
**Stop:** `STOP_TRON.cmd` → `scripts\Stop-Tron.ps1`  
**Checkpoint:** `_tron_integration_checkpoint_20261025_183556/`

---

## Expected user experience

Double-click `START_TRON.cmd`:

1. Resolve project root (`%~dp0`)
2. Preflight env (`scripts\tron-local.env.ps1` when present)
3. MySQL :3306 (required)
4. RabbitMQ / MinIO (optional)
5. Ollama :11434 + default model check (`qwen3:8b`)
6. VOICEVOX / STT (optional)
7. Spring Boot Core :8080 (health / providers fingerprint)
8. Vite frontend :5174
9. Desktop Agent (default GUI; `TRON_DESKTOP_MODE=gui|headless|none`)
10. OpenCode `service start` when CLI on PATH (no `--standalone`)
11. Open browser to `http://localhost:5174/` when ready

---

## Ports (actual)

| Component | Port |
|---|---|
| Spring Boot | **8080** (`server.port`, bind `127.0.0.1`) |
| Vite / React | **5174** |
| MySQL | 3306 |
| Ollama | 11434 |
| VOICEVOX | 50021 |
| STT | 8091 |

---

## Process management

- Detached `Start-Process` with `.runtime/*.pid` tracking
- Single-instance lock: `.runtime/start-tron.lock`
- Idempotent: if Spring healthy **and** Vite listening → **reuse** (`ALREADY RUNNING`)
- `-Restart` / `-ForceRebuild` for clean rebuild
- Does **not** kill unrelated processes on occupied ports (non-TRON Spring → hard fail with message)
- Desktop Agent: refuse second identity (GUI vs Headless)

## Browser behavior

- Opens **`http://localhost:5174/`** (landing), not devices page
- `.runtime/browser_opened.flag` reduces duplicate tabs on reuse path
- Cleared by `STOP_TRON`

## Stop behavior

`STOP_TRON` stops only TRON-owned PIDs / Group7 command lines on 5174/8080/8091 and Desktop Agent processes.  
Does **not** stop system MySQL or Ollama services that were already independently running.

---

## Startup tests

| Test | Result | Evidence |
|---|---|---|
| Clean rebuild start (`-Restart -ForceRebuild`) | **PASS** | `_tron_final_integration_evidence/startup_restart_rebuild.txt` |
| Spring health after rebuild | **PASS** | Career OpenAPI paths = 23 |
| Frontend :5174 | **PASS** | HTTP 200 |
| Repeated start (idempotent reuse) | **PASS** | `startup_idempotent: PASS` in `api_curl_results.txt` |
| Ollama model check | **PASS** | `OK (model qwen3:8b)` |
| Desktop Agent in this verification | **SKIP** | `TRON_DESKTOP_MODE=none` for automation |
| Missing optional MinIO/RabbitMQ | **PASS** (warn/skip) | startup log |

---

## Required vs optional

| Dependency | Required? |
|---|---|
| MySQL | **Required** |
| Spring Boot | **Required** |
| Vite frontend | **Required** |
| Ollama | Optional (AI degraded) |
| VOICEVOX / STT | Optional (voice degraded) |
| Desktop Agent | Optional (`none` allowed) |
| OpenCode CLI | Optional |
| MinIO / RabbitMQ | Optional |

---

## Flags

```bat
START_TRON.cmd
START_TRON.cmd -Restart
START_TRON.cmd -ForceRebuild
START_TRON.cmd -NoBrowser
START_TRON.cmd -NoPause
set TRON_DESKTOP_MODE=headless
set TRON_DESKTOP_MODE=none
```
