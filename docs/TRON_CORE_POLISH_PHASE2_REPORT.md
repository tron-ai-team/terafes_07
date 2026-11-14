# TRON Core Polish — Phase 2 Functional Verification Report

**Branch:** `feature/tron-core-polish-20261114`  
**PR:** https://github.com/tron-ai-team/terafes_07/pull/26 (DRAFT — not merged)  
**Production deploy:** **NO**

## Environment

- Live API used for authenticated smoke: `https://api.tronai.tech` (throwaway `example.com` account via `.env.e2e.local`, gitignored)
- Local Spring backend: **not running** on this workstation
- Physical iOS/Android devices / real microphone: **NOT TESTED**

## Live API results (executed)

| Step | Result | Notes |
|---|---|---|
| Login / register throwaway | **PASS** | Synthetic email only |
| `GET /api/v1/ai/modes` | **PASS** | FAST/SMART/CLOUD reported available |
| Chat SMART | **PASS** | Real reply (`SMART_OK`, profile SMART) |
| Chat FAST | **PASS_HONEST_OFFLINE** | HTTP 503, detail: local AI unavailable, **no cloud fallback** |
| Chat CLOUD | **NOT RUN** | Avoid unnecessary paid calls |
| Interview start | **PASS** | 5 questions created |
| Interview answer submit | **PASS** | Answer accepted (keys include nextAction/provider) |
| CV create `RIREKISHO_JA` | **PASS** | |
| CV create `RESUME_EN` (production API before fix) | **FAIL→fixed in branch** | Production still forced `RIREKISHO_JA`; local backend + IT now allow `RESUME_EN` |
| Magic Fill empty profile | **PASS** | `suggestionCount=0`, no fabricated employment |
| CV PDF export + download | **PASS** | `%PDF` magic, ~253 KB |
| CV XLSX export + download | **PASS** | `PK` magic, ~17 KB |
| Voice turn with fixture wav | **PASS_HONEST_CLIENT_ERROR** | HTTP 400 invalid media — honest; physical mic **NOT TESTED** |
| Magic Fill (empty profile) | Recorded in run logs | Expect empty/insufficient proposals, not fabricated employment |

## Frontend / browser automation

| Suite | Result |
|---|---|
| `npm run test:contracts` | **PASS** |
| `npx tsc -b` | **PASS** |
| `npx vite build` | **PASS** |
| Playwright desktop-1440 guest + viewport matrix | **PASS** (22 tests) |
| Playwright mobile-390 Chromium emulation guest | **PASS** (6 tests) |
| Physical iPhone Safari / Android Chrome | **NOT TESTED** |

Screenshots: `docs/tron-core-polish-evidence/playwright/` and `docs/tron-core-polish-evidence/viewports/`.

## Bugs fixed in Phase 2

| ID | Issue | Fix |
|---|---|---|
| P2-CHAT-01 | Offline chat text still mentioned localhost:8080 | User-facing unavailable copy in `chatClient.ts` |
| P2-CHAT-02 | Composer cleared even when send failed | Restore input when `sendChatMessage` returns false |
| P2-CHAT-03 | 503 FAST errors looked like generic server errors | Map 503 to honest FAST/provider unavailable labels |
| P2-CHAT-04 | Welcome sample locked FAST + implied real reply | Unlock welcome; clarify tip is not a model reply; default SMART |
| P2-AI-01 | Error classifier claimed “Automatic failover standing by” | Removed; states no silent fallback |
| P2-AI-02 | SMART default label still said gemma3:12b | Updated to Qwen 3.5 9B |
| P2-INT-01 | Feedback page fabricated company when no analysis | Empty recovery UI instead of fake LINE Yahoo scores |
| P2-MD-01 | Code copy ignored clipboard failures | No false “Copied” state |
| P2-CV-01 | New drafts ignored `RESUME_EN` (always RIREKISHO) | Backend create/list/update allow RIREKISHO_JA + RESUME_EN; block SHOKUMU for new; frontend template picker |
| P2-CV-02 | Missing regression for public templates | `CvBuilderV2BackendIT#publicTemplatesAndCreateResumeEn` **PASS** |

## Remaining limitations

1. **GTX FAST generation** currently returns 503 while modes metadata may still say available — health ≠ generation. UI now surfaces 503 honestly.
2. **Voice physical mic / STT/TTS end-to-end** not proven on a real device this session.
3. **Google OAuth browser callback** not re-run interactively (email/password login API **PASS**).
4. **Authenticated browser Chat UI** not driven by Playwright (API SMART chat **PASS**; UI uses same client).
5. Binary export artifacts gitignored; magic/size recorded here.

## Production risk

- No Compose/env/migration/CD changes.
- Throwaway account created on production API for smoke only — non-customer synthetic data.
- **Do not merge/deploy without owner approval.**
