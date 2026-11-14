# TRON Core Polish — Test Matrix

**Branch:** `feature/tron-core-polish-20261114`  
**Date:** 2026-11-14 (Phase 1 + Phase 2)  
**Rule:** Only PASS when the command/scenario was actually executed.

## Automated commands

| Command | Environment | Result | Notes |
|---|---|---|---|
| `npm run test:contracts` | local frontend | **PASS** | ai-mode + safe-return + core-nav + chat-errors |
| `npx tsc -b` | local frontend | **PASS** | exit 0 |
| `npx vite build` | local frontend | **PASS** | chunk size warning only |
| `npm run test:live-api` | api.tronai.tech throwaway | **PASS** | FAST returns honest 503 |
| Playwright desktop-1440 guest+viewports | local preview | **PASS** | 22 tests |
| Playwright mobile-390 Chromium emu | local preview | **PASS** | 6 tests; not physical iOS |
| `mvnw -Dtest=AiModelRouterTest,AiProfileServiceTest` | local backend | **PASS** | GTX lock / no silent fallback |
| `mvnw -Dtest=CvBuilderV2BackendIT#publicTemplatesAndCreateResumeEn` | local H2 IT | **PASS** | RESUME_EN create + SHOKUMU blocked |

## Live feature smoke (throwaway account)

| Flow | Result |
|---|---|
| Email register/login | **PASS** |
| Chat SMART real reply | **PASS** |
| Chat FAST | **PASS_HONEST_OFFLINE** (503, no cloud fallback) |
| Chat CLOUD | **NOT RUN** (cost avoidance) |
| Interview start + answer | **PASS** |
| CV RIREKISHO create + PDF/XLSX | **PASS** (`%PDF` / `PK`) |
| CV RESUME_EN create on production API | **FAIL** until backend deploy of this PR |
| CV RESUME_EN create local IT | **PASS** |
| Magic Fill empty profile | **PASS** (0 suggestions, no fabrication) |
| Voice fixture wav | **PASS_HONEST_CLIENT_ERROR** (400) |
| Voice physical mic | **NOT TESTED** |
| Google OAuth browser | **NOT TESTED** |

## Guest / auth / routing

| Scenario | Result |
|---|---|
| Guest protected routes → sign-in required | **PASS** (Playwright) |
| Unknown path → branded 404 | **PASS** |
| `/workspace` → feature unavailable | **PASS** |
| Home four core cards | **PASS** |
| Viewport 320–1440 no horizontal overflow (home/chat guest) | **PASS** (Playwright) |
| Physical iOS Safari / Android Chrome | **NOT TESTED** |

## Known limitations

- Production API will not accept `RESUME_EN` until this branch is deployed.
- FAST modes metadata may still say available while generation returns 503.
- Authenticated in-browser Chat UI not driven by Playwright (API client verified).
