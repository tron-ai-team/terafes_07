# TRON Core Polish — Test Matrix

**Branch:** `feature/tron-core-polish-20261114`  
**Date:** 2026-11-14  
**Rule:** Only PASS when the command/scenario was actually executed.

## Automated commands

| Command | Environment | Result | Notes |
|---|---|---|---|
| `npm run test:ai-mode` | local frontend | **PASS** | GTX FAST migration contract |
| `npm run test:safe-return` | local frontend | **PASS** | returnTo open-redirect sanitization |
| `npm run test:core-nav` | local frontend | **PASS** | App/Sidebar/TopBar/Landing static contract |
| `npm run test:contracts` | local frontend | **PASS** | all three above |
| `npx tsc -b` | local frontend | **PASS** | exit 0 |
| `npx vite build` | local frontend | **PASS** | built successfully; chunk size warning only |
| `mvnw test -Dtest=AiModelRouterTest,AiProfileServiceTest` | local backend-spring | **PASS** | GTX lock / no silent fallback |

## Guest / auth / routing (code + contract)

| Scenario | Result | Evidence |
|---|---|---|
| Guest `/chat` etc use `RequireAuth` | **PASS** (code) | `App.tsx` + `RequireAuth.tsx` |
| Unknown path → `NotFoundPage` | **PASS** (code + contract) | `App.tsx` `*` route |
| Malicious `returnTo` rejected | **PASS** | `verify-safe-return-to.mjs` |
| Already signed-in on `/auth` redirects | **PASS** (code) | `AuthPage.tsx` effect |
| Live Google OAuth callback | **NOT TESTED** | needs real provider session |
| Local preview guest `/chat` → sign-in required | **PASS** | Vite preview `127.0.0.1:4173` browser |
| Local preview unknown path → branded 404 | **PASS** | `/this-page-does-not-exist-xyz` |
| Local preview `/workspace` → feature unavailable | **PASS** | Japanese unavailable copy shown |
| Local preview `/` hero four core cards | **PASS** | Chat/Voice/Interview/CV present; no Workspace CTA in dock |

## Feature smoke

| Flow | Result |
|---|---|
| Chat send/receive live GPU | **NOT TESTED** (mutating/live inference against prod not authorized here) |
| FAST→GTX / SMART→RTX router contract | **PASS** (Maven unit) |
| Voice physical device | **NOT TESTED** |
| Voice cleanup on unmount/hide | **PASS** (code review + change) |
| Interview setup→room→feedback live | **NOT TESTED** |
| Interview room init error recovery | **PASS** (code) |
| CV PDF/XLSX real export | **NOT TESTED** |
| Profile round-trip | **NOT TESTED** |

## Viewport / browser

| Coverage | Result |
|---|---|
| Emulated 320–1440 CSS overflow pass | **PARTIAL** — layout `dvh`/safe-area + `overflow-x-hidden`; no automated screenshot suite in CI |
| Chrome desktop / Edge / Safari iOS / Android | **NOT TESTED** on physical devices this run |

## Known limitations / blockers

1. No Playwright harness in repo; added Node contract scripts only.
2. Production mutating flows intentionally not run while owner asleep.
3. Screenshots of before/after hero not captured in Git (browser automation optional; design freeze verified by code path — no hero/logo/video asset edits).
