# CV Builder V2 — Backend Completion Report

**Project:** TRON AI  
**Mission:** Stage 1 — Backend engineering complete  
**Branch:** `feature/cv-builder-v2-backend-complete`  
**Base:** `main` @ `93faaddc` (Japanese CV Builder clean HTML/PDF #19)  
**Author identity (repo-local):** Thushan Theekshana `<tt25304025@ga.ttc.ac.jp>`  
**Date:** 2026-11-11  
**Production deploy:** **NOT done** (owner rule)  
**Merge to main:** **NOT done** (owner rule)

---

## 1. Root causes identified

### Magic Fill production failure

**Symptom:** `"No local AI provider available (cloud disabled for this request). Start Ollama."`

**Confirmed cause:**

1. `CvBuilderService.magicFill` defaulted `allowCloud=false` unless the client explicitly sent `allowCloud:true`.
2. Frontend Magic Fill did not opt into cloud.
3. `CvMagicFillService` passed `allowCloud=false` into `AiRequestContext`.
4. `AiModelRouter.resolveRoute` then refused all cloud providers and threw when Ollama was unavailable.

Interview V2 / Chat already used cloud-first `AiGateway` SMART routing. Magic Fill was the outlier privacy gate that broke production (cloud-only host).

**Secondary issues found:**

- Profile Sync `refreshFromProfile` with `replaceAll=false` still **overwrote** non-empty draft fields (both branches of the merge wrote `incoming`) — silent destruction of manual edits.
- Legacy ITs still assumed EN/SHOKUMU template creation and switching.

---

## 2. Magic Fill cloud integration

- Reused existing **`AiGateway`** — no new gateway, no new API credentials.
- Default: **`tron.ai.cv-assist-cloud-enabled=true`** (`TRON_AI_CV_CLOUD_ENABLED`).
- Request still may force local: `localOnly:true` or `allowCloud:false`.
- Mode: **`AiMode.SMART`**, feature `CV_GENERATION`, `jsonMode=true`.
- Safe diagnostics: logs `provider` + `modelId` only — never API keys or prompt bodies.
- Failures surface as **503/502** (or warnings when profile-fact suggestions already exist). Never silent fabricated success text for AI rewrite.

---

## 3. Actual AI provider / model

**Configured SMART preference (code + `application.yml`):**

| Priority | Provider | Default model property |
|----------|----------|------------------------|
| 1 | Groq | `openai/gpt-oss-120b` (`groq-model-smart`) when `prefer-groq-for-smart=true` |
| Fallbacks | Mistral / Gemini / OpenRouter | via existing catalog + router |

**Tested:** Mockito returns `GROQ` / `openai/gpt-oss-120b` with `allowCloud=true` asserted on `AiRequestContext`.

**Production assumption:** With Groq credentials present (same as Chat/Interview), Magic Fill uses Groq SMART; otherwise authorized gateway fallbacks. Live production verification after deploy is still required (not performed in this mission).

---

## 4. Human approval behavior

Unchanged contract, reinforced:

1. Original text → AI/profile suggestion → `PENDING` row in `cv_ai_suggestions`
2. User Accept → write into draft payload
3. User Reject → draft unchanged
4. `applied: false` always on Magic Fill response
5. Suggestion ownership scoped by `user_id` + `draft_id`

---

## 5. Profile Sync implementation

New deterministic merger: `CvProfileSyncMerger`

| Mode | Behavior |
|------|----------|
| `FILL_BLANK` (default) | Fill empties only; preserve manual scalars & non-empty arrays |
| `OVERWRITE_SCALARS` | Overwrite scalars; arrays fill-only when empty |
| `REPLACE_ALL` | Replace profile-mapped fields; keep draft-only |

Response includes `syncReport` (`filled`, `preserved`, `conflicts`, `missingInProfile`, `draftOnlyPreserved`).

Field mapping uses existing Candidate Profile columns only (no invented schema fields such as separate mobile / addressFurigana — those do not exist on the entity).

---

## 6. Data-preservation guarantees

- Soft-delete drafts only (`deleted_at`); Candidate Profile untouched.
- Version restore copies snapshot into draft; **does not delete later version rows**.
- FILL_BLANK never silently wipes manual narrative or education lists.
- AI malformed output cannot write draft (exception before accept).
- Legacy EN/SHOKUMU historical rows remain in DB; new creates forced to `RIREKISHO_JA`.

---

## 7. CV history / version behavior

Existing APIs retained and verified:

- Create / update / list / get / soft-delete drafts
- Save version snapshot / list / restore
- Optional optimistic concurrency via `expectedUpdatedAt` → **409** on mismatch
- Generated document download ownership checks unchanged

No destructive Flyway migration required for this mission.

---

## 8. Security improvements

- Ownership checks unchanged (404 for cross-user).
- Photo key prefix guard retained.
- Magic Fill ignores unexpected AI JSON keys.
- Credential-invention markers expanded for Japanese IT hiring context.
- Proposed text size cap (2000 chars).
- Prompt-injection resistance: system rules + JSON schema strictness + language gate.
- Sensitive prompt content not logged.

---

## 9. Errors fixed

| Error | Fix |
|-------|-----|
| Cloud disabled → Ollama-only failure | Cloud-first Magic Fill / AI Assist |
| Profile sync overwrote manual edits | FILL_BLANK merge |
| Concurrent overwrite risk | `expectedUpdatedAt` optional lock |
| Misleading Ollama-only error copy | Cloud-aware messages |
| Legacy tests expecting EN templates | Updated to RIREKISHO_JA-only product |

---

## 10. Backend test results

See `docs/CV_BUILDER_V2_BACKEND_TEST_RESULTS.md`.

Focused CV + career + interview + gateway router suites: **PASS** (executed locally).

---

## 11. Remaining limitations

- Live cloud Magic Fill against production quotas not executed in this session.
- Full module `mvn test` (entire backend) not claimed here — career/interview/gateway subsets were.
- Address furigana / separate mobile fields are **not** in Candidate Profile schema — cannot sync what does not exist.
- Frontend still uses older Magic Fill client defaults; Stage 2 UI should omit `allowCloud:false` and show sync modes clearly.
- Production Gotenberg Chromium availability is an infra concern already documented; this mission did not change production infra.

---

## 12. Git branch and commits

- Branch: `feature/cv-builder-v2-backend-complete`
- Commits: see PR (logical groups for Magic Fill, Profile Sync, tests, docs)

---

## 13. Pull Request

- Target: `main`
- Status: opened, **not merged**
- Link: https://github.com/tron-ai-team/terafes_07/pull/20

### Commits on branch

1. `25222db5` — fix(cv-builder): route Magic Fill through cloud AiGateway SMART by default
2. `ceae69e9` — fix(cv-builder): non-destructive profile sync and draft concurrency guard
3. `ce587112` — test(cv-builder): cover Magic Fill, profile sync, history and document APIs

---

## 14. CI status

- **CI green** on PR #20 (Backend Maven tests, Frontend build, Security checks, Deployment recovery tests, Docker image build no-push, Vercel).
- Workflow run: https://github.com/tron-ai-team/terafes_07/actions/runs/43028506027
- **No merge. No production deploy.**

---

## 15. Frontend integration requirements

See `docs/CV_BUILDER_V2_BACKEND_API_CONTRACT.md` §9.

Minimum Stage 2 needs:

1. Magic Fill Accept/Reject UX (already partially present)
2. Profile Sync mode picker (`FILL_BLANK` default)
3. `expectedUpdatedAt` on save
4. HTML preview + PDF export paths
5. Japanese-only template UX

---

## Files changed (primary)

| Area | Files |
|------|-------|
| Magic Fill | `CvMagicFillService.java`, `CvBuilderService.java`, `AiGatewayProperties.java`, `application.yml` |
| Profile Sync | `CvProfileSyncMerger.java`, `CvBuilderService.refreshFromProfile` |
| Tests | `CvMagicFillServiceTest`, `CvProfileSyncMergerTest`, `CvBuilderV2BackendIT`, CP-03 IT updates |
| Docs | `CV_BUILDER_V2_BACKEND_*.md` |

**Not changed:** production infra, Netlify/frontend redesign, API keys, Flyway destructive migrations.
