# TRON Core Polish — Phase 4 Release Readiness

**PR:** https://github.com/tron-ai-team/terafes_07/pull/26  
**Branch:** `feature/tron-core-polish-20261114`  
**Final commit SHA:** `84514e1f6a970f67540acb9ad3b4b84dc2c83b05`  
**Base:** `origin/main` @ `d9df8dea35ac09021f2e9472de01ca8111aaefc2`  
**Merge / production deploy by this mission:** **NO — owner approval required**

---

## 1. Final commit SHA

`84514e1f6a970f67540acb9ad3b4b84dc2c83b05` (Phase 4 readiness docs)

Primary functional fix commit: `2f2d9430` (ChatService FAST → GTX gateway lock).  
CI fully green on prior tip `e976431f` (all five required checks + Vercel). Docs-only tip re-runs CI — confirm green before merge.

---

## 2. Required GitHub CI status

Verified on `e976431f` via `gh pr checks` (all **pass**). Tip `84514e1f` is docs-only; reconfirm checks before merge:

| Check | Status |
|---|---|
| Deployment recovery tests | **SUCCESS** |
| Frontend build | **SUCCESS** |
| Backend Maven tests | **SUCCESS** |
| Security checks | **SUCCESS** |
| Docker image build (no push) | **SUCCESS** (5m57s) |
| Vercel Preview | **SUCCESS** |

Local re-verification (this session):

| Command | Result |
|---|---|
| `npm run test:contracts` | **PASS** |
| `npx tsc -b` | **PASS** |
| `npm run build` | **PASS** |
| Maven `ChatHybridRoutingUnitTest,AiModelRouterTest,AiProfileServiceTest,CvBuilderV2BackendIT#publicTemplatesAndCreateResumeEn` | **PASS** |
| Playwright guest + viewport matrix (desktop-1440) | **PASS** |

---

## 3. Remaining release blockers

| ID | Severity | Notes |
|---|---|---|
| R1 | **Owner gate** | Do not merge/deploy until owner explicitly approves |
| R2 | **Post-deploy verify** | Production FAST still 503 until backend with ChatService fix is live; must re-test GTX after deploy |
| R3 | Soft | Interactive Google OAuth consent click-through **NOT TESTED** (callback code reviewed; button configured on prod) |
| R4 | Soft | Physical iOS/Android / real microphone **NOT TESTED** |
| R5 | Soft | Occasional production **502** on CV/voice observed once; retries succeeded — monitor after deploy; no speculative code change |
| R6 | Informational | `mergeStateStatus: BLOCKED` while draft / required checks / review rules apply — expected |

**No code release blockers** found in the PR diff beyond owner approval and post-deploy FAST GPU verification.

---

## 4. Complete feature test matrix

| Feature | Evidence | Result |
|---|---|---|
| Guest auth / branded 404 / core nav | Playwright guest | **PASS** |
| Email login → Chat | Playwright @ tronai.tech | **PASS** |
| Chat SMART | Live API + browser | **PASS** |
| Chat FAST (prod today) | Live API | **PASS_HONEST_OFFLINE** (503) |
| Chat FAST (branch) | Unit: GTX bypasses ModelManager | **PASS** (needs deploy for live) |
| Chat CLOUD | Intentionally skipped (cost) | **NOT RUN** |
| Voice TTS→STT→LLM→TTS | Live API | **PASS** |
| Voice physical mic | — | **NOT TESTED** |
| Interview full session + analysis | Live API | **PASS** |
| CV RIREKISHO PDF/XLSX | Live API | **PASS** |
| CV RESUME_EN | Local IT | **PASS**; prod after backend deploy |
| Mobile viewports 320–1440 | Playwright | **PASS** (Chromium emu) |
| Design freeze (logo/hero/robot) | Diff review: nav/CTA routes only on landing | **PASS** (no visual redesign) |

---

## 5. Expected frontend changes (after Vercel merge deploy)

- Core-only public nav: Chat / Voice / Interview / CV (+ Home/Profile/Auth).
- Guests on protected routes → sign-in required (not 404).
- Branded 404 + Feature Unavailable for unfinished product paths (source kept).
- Honest chat offline/503 copy; composer restore on failed send; clipboard honesty.
- Interview empty feedback recovery (no fabricated company scores).
- CV template picker includes RESUME_EN (backend must match).
- Landing CTAs open Chat instead of Workspace; no hero/logo/video redesign.
- `vercel.json` SPA rewrites unchanged in intent (existing file, no deploy infra rewrite).

---

## 6. Expected backend changes (after protected CD)

- **ChatService:** when `tron.ai.gtx-fast-mode-enabled`, FAST always uses AI gateway → `OLLAMA_GTX` (never RTX ModelManager, never silent cloud).
- **CvBuilderService:** new drafts allow `RIREKISHO_JA` + `RESUME_EN`; SHOKUMU not for new creates.
- Regression tests updated accordingly.
- **No** changes to `deploy/compose.prod.yml`, Flyway migrations, `.github` workflows, or GTX/RTX/CLOUD env wiring in this PR.

Diff confirmation: `git diff --name-only origin/main...HEAD -- deploy/ .github/ '**/migration/**'` → **empty**.

---

## 7. Production rollout procedure (owner-operated)

### Preconditions

1. All five required CI checks green on tip SHA.
2. PR unmarked draft; human review approved per branch protection.
3. Confirm `TRON_BACKEND_CD_ENABLED` policy intentional (see `deploy/BACKEND_PRODUCTION_CD.md`).
4. Prefer **merge commit** (not squash) if lineage/`merge-base --is-ancestor` checks matter for live image ancestry.
5. Vercel Git integration will build/deploy frontend from `main` after merge — no Vercel config change required.

### Order

1. **Merge PR #26** to `main` (owner only).
2. **Frontend:** Vercel production deploy from `main` (automatic if already linked).
3. **Backend:** Follow protected `backend-production.yml` / host controller path when CD enabled:
   - CI → publish SHA-tagged GHCR image → controller preflight → image-only `compose up` for `backend`.
4. **Do not** edit production Compose, env files, MySQL, or sibling apps during this release.
5. Run **§8 post-deploy verification** before announcing.

### Preflight reminders (from existing runbook)

- Controller uses reviewed Compose at `/etc/tron-ai/backend-release/compose.prod.yml`.
- Sole runtime update: image-only backend container switch with health recheck.
- Failure path restores prior local image (see §9).

---

## 8. Post-deployment FAST GPU verification

Use a throwaway account (never customer data):

```text
1. GET /api/v1/ai/modes → gtxFastModeEnabled=true, FAST available=true
2. GET /api/v1/ai/providers → OLLAMA_GTX CONFIGURED (qwen3:8b)
3. POST /api/v1/chat aiProfile=FAST  body: "Reply with exactly: GTX_FAST_OK"
   EXPECT: HTTP 200, reply contains GTX_FAST_OK (or clearly GTX-backed content)
   FAIL if: 503 "Local AI is unavailable..." (old ChatService path still live)
4. Confirm response provider/model path is GTX / qwen3:8b (not groq/cloud)
```

Optional: `frontend/scripts/phase3-fast-diagnose.mjs` against production after deploy.

---

## 9. SMART and CLOUD regression checks

| Mode | Check | Expect |
|---|---|---|
| SMART | `POST /chat` aiProfile=SMART | HTTP 200, RTX/local smart path (no cloud) |
| CLOUD | One short paid call **only if owner authorizes cost** | Cloud provider; no GTX/RTX contamination |
| Isolation | FAST failure must not silently become CLOUD | Honest 503/error if GTX down |
| Interview | Start → answer → analysis | Completes; no fabricated company scores |
| Voice | Valid WAV or TTS→turn | 2xx with transcript/reply or honest 4xx |
| CV | RIREKISHO + RESUME_EN create | Both templates; exports `%PDF` / `PK` |

Production health baseline before release (read-only, 2026-11-14):

- `GET /actuator/health` → **UP**
- Modes: `gtxFastModeEnabled=true`, `rtxSmartModeEnabled=true`, FAST/SMART/CLOUD available

---

## 10. Rollback procedure

### Frontend (Vercel)

- Instant rollback to previous production deployment in Vercel dashboard, **or**
- Revert merge commit on `main` and let Vercel redeploy prior SHA.

### Backend (protected controller)

```bash
# On the production host (admin channel) — use existing tooling:
# deploy/scripts/rollback-release.sh  →  release-manager.py rollback
sudo /usr/local/sbin/tron-backend-release   # follow installed controller rollback / prior image restore
```

Per runbook: failed release restores the **exact prior local image** and rechecks health; workflow stays failed.

### Data

- This PR introduces **no new Flyway migrations** — no schema rollback required for this change set.
- Do not drop databases or touch sibling Compose projects.

---

## Code review summary (Phase 4)

| Area | Verdict |
|---|---|
| ChatService FAST gateway lock | Correct; unit covered |
| AiModelRouter FAST→GTX / SMART→RTX / no silent cloud | Unchanged architecture; FAST chat now honors it |
| Auth / returnTo / RequireAuth | Present; contracts pass |
| CV RESUME_EN | Backend + IT + FE picker |
| Interview / Voice cleanup | Prior phases; visibility cleanup present |
| Design preservation | Landing diffs are route/CTA only |
| Compose / migrations / CD workflows | **Not modified** |

---

## Owner decision

**PR #26 is ready for owner review** when:

1. Docker image CI on tip is green.
2. Owner accepts soft blockers R3–R5.
3. Owner schedules merge + post-deploy §8 FAST verification.

**This document does not authorize merge or production deployment.**
