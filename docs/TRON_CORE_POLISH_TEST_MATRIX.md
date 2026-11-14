# TRON Core Polish — Test Matrix

**Branch:** `feature/tron-core-polish-20261114`  
**Date:** 2026-11-14 (Phase 1 + Phase 2 + Phase 3)  
**Rule:** Only PASS when the command/scenario was actually executed.

## Automated commands

| Command | Environment | Result | Notes |
|---|---|---|---|
| `npm run test:contracts` | local frontend | **PASS** | ai-mode + safe-return + core-nav + chat-errors |
| `npx tsc -b` | local frontend | **PASS** | exit 0 |
| `npx vite build` | local frontend | **PASS** | chunk size warning only |
| `npm run test:live-api` / `test:phase3-live` | api.tronai.tech | **PASS** | FAST honest 503 pending deploy |
| Playwright guest + prior viewports | local preview | **PASS** | Phase 2 |
| Playwright `core-features-viewport` | local preview | **PASS** | 48 tests, 320–1440 |
| Playwright `auth-chat` | tronai.tech | **PASS** | SMART 200; FAST 503 |
| `mvnw AiModelRouterTest,AiProfileServiceTest,ChatHybridRoutingUnitTest` | local | **PASS** | GTX FAST bypasses ModelManager |
| `mvnw CvBuilderV2BackendIT#publicTemplatesAndCreateResumeEn` | local H2 | **PASS** | RESUME_EN + SHOKUMU blocked |

## Live feature smoke (throwaway account)

| Flow | Result |
|---|---|
| Email login (API + browser) | **PASS** |
| Chat SMART | **PASS** |
| Chat FAST | **PASS_HONEST_OFFLINE** — root cause fixed in branch; prod pending deploy |
| Chat CLOUD | **NOT RUN** (cost) |
| Interview full session + analysis | **PASS** |
| Voice valid WAV + TTS→STT→LLM→TTS | **PASS** (retry after transient 502) |
| Voice physical mic | **NOT TESTED** |
| CV RIREKISHO PDF/XLSX | **PASS** |
| CV RESUME_EN production | **Pending deploy** |
| CV RESUME_EN local IT | **PASS** |
| Google interactive OAuth | **NOT TESTED** (button configured on prod) |

## Guest / auth / routing / mobile

| Scenario | Result |
|---|---|
| Guest protected routes → sign-in | **PASS** |
| Branded 404 / feature unavailable | **PASS** |
| Viewport overflow matrix (6 routes × 8 widths) | **PASS** |
| Physical iOS/Android | **NOT TESTED** |
| Local preview browser → production API | **BLOCKED** (Origin/CORS) |

## Known limitations

- Production FAST remains 503 until `ChatService` GTX lock is deployed.
- Production RESUME_EN create pending same backend deploy.
- Physical mic / interactive Google OAuth / real devices still open.
