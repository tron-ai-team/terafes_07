# TRON AI V2 — Full Development Report

**Mission:** Interview Mode V2 completion + authentication stability  
**Repository:** https://github.com/tron-ai-team/terafes_07  
**GitHub account used:** `tt25304025-dev`  
**Author:** Thushan Theekshana `<tt25304025@ga.ttc.ac.jp>` (repo-local)  
**Branch:** `feature/interview-v2-intelligent-engine`  
**Base:** `main`  
**Deployment:** NOT performed (by design)

---

## A. Git Information

| Item | Value |
|------|-------|
| Feature branch | `feature/interview-v2-intelligent-engine` |
| Phase 1 commit | `abbfc40` — Interview TurnEngine + SMART routing |
| Interview completion commit | `946f9b6` — durable memory, analysis categories, PDF |
| Auth stability commit | `27668cb` — login offline + idle JWT recovery |
| Voice + docs commit | `ab55831` — Algenib opening TTS + delivery docs |
| PR | https://github.com/tron-ai-team/terafes_07/pull/17 |
| Production deploy on feature push | **No** — `backend-production.yml` triggers only on `main`; legacy prod deploy retired |

---

## B. Authentication

### Login offline — root cause

1. `backendStatus` was only probed on AppProvider mount via heavy `GET /health` (DB + Ollama + STT + TTS + …) with a **3.5s abort**.
2. TopBar treated **`checking` as Offline**.
3. Successful `login()` never re-checked health and never marked connected even though auth already proved API reachability.
4. Refresh remounted AppProvider → health often succeeded → UI flipped to Online.

### Login offline — fix

- Probe **`/health/ready`** (DB + storage) with 6s timeout + one retry; fallback to `/health`.
- TopBar shows **Connecting…** while `checking`, Online only when `connected`, Offline only when `offline`.
- After login/register/silent refresh/OAuth session apply: immediately mark **connected (authenticated)** and confirm with ready probe.
- Successful auth no longer waits for a slow dependency probe before clearing Offline.

### Long-idle failure — root cause

1. Access JWT TTL ≈ **15 minutes**; refresh cookie ≈ **7 days** (already implemented).
2. No proactive refresh from `expiresIn`; no visibility/focus renew.
3. Failed refresh cleared **module** token only — React still showed logged-in.
4. Some binary/SSE clients used raw `fetch` and bypassed the 401 interceptor.

### Long-idle failure — fix

- Track `expiresIn`, schedule proactive refresh ~60s before expiry (single-flight).
- `ensureFreshAccessToken()` for near-expiry renewals.
- Session-invalid handler clears React auth, toast, redirect to `/auth?session=expired` **only if an access token previously existed** (guest bootstrap stays silent).
- Visibility/focus renew + health recheck after browser sleep.
- Career photo/download + CV preview + SSE streams use refresh-aware paths.
- AuthPage shows session-expired notice.

### Auth tests

See `docs/TRON_AI_V2_TEST_RESULTS.md` — authLifecycle + refreshSingleFlight all PASS.

---

## C. Interview Mode

### Intelligence (preserved + extended from `abbfc40`)

- `InterviewTurnEngine` with FOLLOW_UP / NEXT_TOPIC / CLARIFY / REDIRECT / CLOSE
- Structured quality assessment; cloud SMART routing for turns
- EN/JA support retained

### Session memory

- Flyway **V22** adds `interview_sessions.engine_state_json`
- Persist/restore: `activeTopic`, follow-up counters, topic coverage, assessments, asked questions

### Analysis

- Folds per-turn assessments into final report
- Evidence categories with optional `not_assessed`
- Does not invent credentials

### Cloud model

- Turn engine targets SMART gateway routing
- Local voice-answer test observed provider/model when secrets present (see test results); CI may mock

---

## D. Voice

| Item | Status |
|------|--------|
| Shared `SpeechSynthesisRouter` | Used by voice-answer and `/demo/voice/speak` |
| Gemini Algenib primary | Preserved (no duplicate Gemini client) |
| Opening speech language | `synthesizeSpeech(text, language)` + SpeakRequest.language |
| Feedback-loop guard | Mic stopped while AI speaks (existing + retained) |
| Duplicate submit guard | `isSubmittingRef` / conflict 409 path retained |
| UI copy | VOICEVOX/qwen3 strings replaced with Algenib/SMART-accurate messaging |

Browser microphone E2E not automated in this session.

---

## E. Reports

| Item | Status |
|------|--------|
| `InterviewReportService` HTML (EN+JA Unicode) | Implemented |
| `GET /api/v1/interviews/{id}/report.pdf` | Owner-only; Gotenberg conversion |
| FeedbackPage download | Wired to real endpoint |
| History → feedback with `interviewId` | Wired |
| Authz tests | 401 unauthenticated, 404 wrong user, 200 owner (mocked Gotenberg) |

Sample PDF: generated at runtime via endpoint; not committed as a binary artifact.

---

## F. Stability

| Found | Fixed |
|-------|-------|
| False OFFLINE after login | Yes |
| Idle JWT leave UI “logged in” | Yes |
| Raw fetch bypassing refresh | Partially (career/SSE/CV preview) |
| Interview memory lost on restart | Yes (V22) |
| Fake PDF toast | Yes → real endpoint |
| Opening TTS language/branding drift | Yes |

Remaining: see `docs/TRON_AI_V2_REMAINING_ISSUES.md`.

---

## G. Verification

| Layer | Result |
|-------|--------|
| Frontend auth unit tests | PASS |
| Frontend production build | PASS |
| Backend interview/auth selected Maven tests | PASS (exit 0) |
| Playwright full E2E | NOT RUN |
| Production mutation | NOT DONE |

---

## H. Deployment Readiness

**Verdict: NOT READY for automatic production deploy**

Reasons:

1. Owner must review PR; no merge authorized.
2. Flyway **V22** must run on backend deploy.
3. Gotenberg must be available for interview PDF.
4. Browser E2E against staging/local still recommended.
5. Feature-branch push does not deploy production (verified workflow triggers).

**Safe recommendation:** Merge only after PR CI green + manual smoke of login online status, idle refresh, one JA/EN interview, and PDF download on a non-prod environment.

---

## I. Remaining Work

Prioritized list in `docs/TRON_AI_V2_REMAINING_ISSUES.md`.
