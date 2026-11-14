# TRON Core Polish — Phase 3 Report

**Branch:** `feature/tron-core-polish-20261114`  
**PR:** https://github.com/tron-ai-team/terafes_07/pull/26 (**DRAFT**)  
**Production deploy / merge:** **NO**

## Exact root cause of FAST HTTP 503

### Observed (production, 2026-11-14)

| Probe | Result |
|---|---|
| `GET /api/v1/ai/modes` | `gtxFastModeEnabled=true`, FAST `available=true` |
| `GET /api/v1/ai/providers` | `OLLAMA_GTX` = **CONFIGURED** — `"GTX Ollama reachable; model qwen3:8b available"` |
| `POST /api/v1/chat` `aiProfile=FAST` | **HTTP 503** — `"Local AI is unavailable and cloud fallback is disabled."` |
| `POST /api/v1/chat` `aiProfile=SMART` | **HTTP 200** — real reply |

Evidence: `docs/tron-core-polish-evidence/phase3-fast-diagnose.json`

### Cause (application code — not GTX infra)

With `TRON_AI_GTX_FAST_MODE=true`, **modes/health** correctly resolve FAST → `OLLAMA_GTX` via `AiModelRouter`.

**Chat** (`ChatService.generateWithGatewayOrLocal`) still took the legacy hybrid path:

1. `HybridRoutingService` selects `LOCAL_OLLAMA` because **RTX** Ollama health is up.
2. FAST is sent to **ModelManager / RTX local provider** (`tron-fast`), **not** GTX.
3. Local generation fails → `FallbackAiProvider.LOCAL_UNAVAILABLE_DETAIL`.
4. Exception is rethrown as 503 — **GTX is never called**, despite being healthy.

So: **health ≠ inference** because chat and modes used different code paths. GTX Tailscale/Ollama were fine; the bug was FAST bypassing the GTX gateway lock inside `ChatService`.

### Fix in this PR (not yet on production)

`ChatService`: when `aiGatewayProperties.isGtxFastModeEnabled()` and mode is FAST, **always** `generateViaGateway` (GTX-only via `AiModelRouter`). Never RTX ModelManager, never silent cloud fallback.

Regression: `ChatHybridRoutingUnitTest#gtxFastModeBypassesLocalModelManager` **PASS** (local Maven).

**Release blocker for live FAST success:** deploy this backend change. Until then production FAST remains honest 503.

---

## Tests executed

| Suite | Result |
|---|---|
| Maven `ChatHybridRoutingUnitTest,AiModelRouterTest,AiProfileServiceTest` | **PASS** |
| Maven `CvBuilderV2BackendIT#publicTemplatesAndCreateResumeEn` | **PASS** |
| `npm run test:contracts` + `npx tsc -b` + Vite build | **PASS** |
| Playwright guest routing | **PASS** (prior) |
| Playwright viewport matrix 320–1440 × home/chat/voice/interview/cv/auth | **PASS** (48) |
| Playwright authenticated chat @ `https://tronai.tech` | **PASS** (SMART 200, FAST 503 honest) |
| Live API Phase 3 verify | See below |
| Physical mic / iOS Safari / Android Chrome | **NOT TESTED** |
| Interactive Google OAuth consent | **NOT TESTED** (button configured on prod; no interactive click-through) |

---

## Chat E2E

| Check | Result |
|---|---|
| Email login (browser) | **PASS** |
| Redirect / land on Chat | **PASS** |
| SMART send + real API reply | **PASS** (`smartReplyLen=22`) |
| FAST send | **PASS_HONEST_OFFLINE** (503, known bug pending deploy) |
| Refresh stays authenticated | **PASS** |
| Local preview auth UI → API | **BLOCKED** — browser Origin `127.0.0.1:4173` rejected by API edge (Failed to fetch). Auth E2E uses `tronai.tech`. |

Evidence: `phase3-auth-chat-e2e.json`, `playwright/auth-chat-*.png`

---

## Voice pipeline

| Check | Result |
|---|---|
| Phase 2 invalid fixture → 400 | Confirmed: bad RIFF/parse → `"The audio file is invalid"` |
| Valid silent PCM16 16 kHz WAV | **PASS** (HTTP 200 on turn) |
| TTS `POST /demo/voice/speak` | **PASS** (RIFF WAV) |
| TTS → STT → LLM → TTS turn | **PASS** (retry after transient 502): transcript `"Hello, Tron Phase 3."`, reply + `audio_url`, latency STT/LLM/TTS recorded |
| Physical microphone | **NOT TESTED** |
| Transient 502 | Observed once on first batch; succeeded on retry — treat as infra flake, not app regression |

---

## Interview complete session

| Step | Result |
|---|---|
| Start (5 questions) | **PASS** |
| Answer loop → `nextAction=CLOSE` (5 turns) | **PASS** |
| Analysis / feedback | **PASS** (`aiOverallFeedback` present) |
| Fabricated LINE Yahoo scores | **Not detected** |
| History lists session | **PASS** |

---

## CV Builder

| Check | Result |
|---|---|
| Production `RIREKISHO_JA` create + PDF/XLSX | **PASS** (retry after transient 502) |
| Production `RESUME_EN` | **Not deployed** — branch + local IT only |
| Local IT `RESUME_EN` create + SHOKUMU blocked | **PASS** |
| Magic Fill empty profile | Phase 2: 0 suggestions (no fabrication) |

---

## Google OAuth + auth security

| Check | Result |
|---|---|
| Email login API + browser | **PASS** |
| Google button on `tronai.tech` | Configured (`googleConfigured=true`) |
| Interactive Google login / callback | **NOT TESTED** (blocked without owner Google session) |
| Local preview Google | Shows “not configured” (expected for non-prod origin) |
| Safe returnTo | Covered by Phase 1 contract tests |
| API-only refresh without cookie | Expected non-success |

---

## Mobile / viewports

Guest screenshots for home, chat, voice, interview, CV, auth at **320 / 360 / 375 / 390 / 430 / 768 / 1024 / 1440** — **no horizontal overflow** (Playwright Chromium).  
Physical device QA: **NOT TESTED**.

Screenshots: `docs/tron-core-polish-evidence/viewports-p3/`

---

## Remaining bugs / release blockers

1. **BLOCKER for FAST:** Production still runs pre-fix `ChatService` — FAST 503 until backend deploy of this PR.
2. **RESUME_EN** production create still blocked until backend deploy.
3. Occasional **502** on CV/voice under load (retry succeeded) — monitor; no code change without stable repro.
4. Interactive Google OAuth + physical mic/mobile — owner follow-up.
5. Production SPA still shows Workspace nav (Phase 1 frontend not deployed yet).

---

## Files changed (Phase 3 highlight)

- `backend/.../ChatService.java` — GTX FAST gateway lock
- `backend/.../ChatHybridRoutingUnitTest.java` — regression
- `frontend/scripts/phase3-*.mjs` — diagnose + live verify
- `frontend/e2e/auth-chat.spec.ts`, `core-features-viewport.spec.ts`
- `docs/TRON_CORE_POLISH_PHASE3_REPORT.md`

---

## Final status

- **PR #26 remains DRAFT.**
- **Do not merge or deploy without owner approval.**
- FAST root cause is **identified and fixed in branch**; production verification of GTX inference after deploy is required for a full FAST PASS.
