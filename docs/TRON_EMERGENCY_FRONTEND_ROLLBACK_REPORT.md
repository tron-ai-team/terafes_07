# TRON AI — Emergency Frontend Rollback Report

**Date:** 2026-11-15  
**Branch:** `hotfix/tron-restore-pre-mobile-ui`  
**Worktree:** `C:\Users\Thushan\Projects\tron-restore-pre-mobile-ui`  
**Priority:** CRITICAL production restore  
**Status:** Verified rollback ready for merge (frontend-only)

---

## Rollback target

| Item | Value |
|---|---|
| Target revision | `a834e09f0e1cc8fd42a649a36993f7e7241127de` |
| Meaning | Merge of PR #29 SearXNG production activation — last good main **before** mobile UI |
| Current origin/main before hotfix | `87ba9ccc` (PR #31 docs) |
| PR #30 merge | `83265079` (mobile UI) — **reverted** |
| PR #31 merge | `87ba9ccc` (mobile docs) — **reverted** |
| PR #32 | Draft only — **not incorporated** |

### Restored tree verification

```text
git diff a834e09f..HEAD -- frontend/   → empty
git diff a834e09f..HEAD -- backend/    → empty
git diff a834e09f..HEAD                → empty (full tree identical)
```

Actual restored frontend tree content SHA matches target `a834e09f` exactly (via auditable revert commits on tip of main).

### Revert commits

1. `Revert "Merge pull request #31 ..."` (`-m 1`)
2. `Revert "Merge pull request #30 ..."` (`-m 1`)

---

## Root cause — missing homepage background video

**Established.**

PR #30 removed the master full-bleed `<video>` from `LandingPage.tsx` and relocated it into `HeroSection.tsx` inside a constrained mobile stage (`rounded-2xl` card / `lg:contents` / `lg:fixed` transition).

| Revision | Video placement |
|---|---|
| `a834e09` (target) | `LandingPage`: `fixed/absolute inset-0` full-bleed `.landing-background-video` |
| `83265079` (mobile) | `HeroSection` only; LandingPage comment: “HeroSection houses the master single video element” |

Production still served `/videos/tron-ai-hero.mp4` (HTTP 200, ~8.0 MB). The asset was present; the **layout/ownership change** caused the cinematic full-bleed background to disappear or appear as a cropped inset rather than the original desktop experience.

Restored markup again uses the LandingPage full-bleed video with muted autoplay.

---

## Root cause — data fetching failures

**Partially established; not caused by API client changes in PR #30.**

| Check | Result |
|---|---|
| `frontend/src/config/api.ts` vs `a834e09` | **Unchanged** by mobile PR |
| `frontend/src/services/**` vs `a834e09` | **Unchanged** by mobile PR |
| Live `https://api.tronai.tech/health` during rollback | **HTTP 530** (Cloudflare origin error) |
| Live `https://api.tronai.tech/api/v1/auth/providers` | **HTTP 530** |

Conclusion: Frontend API base URL / client code was not altered by the mobile integration. Observed live API **530** is an **origin/backend reachability** problem independent of this frontend tree restore. Restoring the pre-mobile UI restores request/UI state behavior from `a834e09`, but **cannot** by itself heal a Cloudflare 530 on `api.tronai.tech`.

Owners should treat API 530 as a separate backend/origin incident after frontend rollback.

---

## Security

| Check | Result |
|---|---|
| `frontend/init` | Absent |
| `package.json` scripts | Clean (`vite` / contracts / playwright) — no `node init` |
| `tailwind.config.js` | Clean (2857 bytes); no obfuscation |
| Historical mobile obfuscated payloads | **Not restored** (never present at `a834e09`) |

---

## Tests performed

| Suite | Result |
|---|---|
| `npm run test:contracts` | PASS |
| `npx tsc -b` | PASS |
| `npx vite build` / `npm run build` path | PASS |
| Playwright `guest-routing` + `viewport-matrix` + `core-features-viewport` | **140 passed, 0 failed** |
| Homepage video CDP verification (local preview) | **PASS** — see evidence |
| Production `www` video asset HTTP | 200 |
| Live API health | **FAIL / 530** (backend origin — separate) |

### Obsolete tests (removed by revert — expected)

Mobile-only suites introduced in PR #30 are gone with the restore:

- `e2e/mobile-home-reference.spec.ts`
- `e2e/mobile-chat-reference.spec.ts`
- `e2e/mobile-core-pages.spec.ts`

Not weakened — they targeted the reverted mobile redesign.

### Video playback evidence

File: `docs/tron-emergency-frontend-rollback-evidence/homepage-video-report.json`

Verified on local preview `http://127.0.0.1:4173`:

- `videoWidth=1920`, `videoHeight=1080`
- `readyState=4`, `paused=false`, `muted=true`
- Playback advanced (`7.05 → 7.85`)
- Full viewport coverage `1440×900`, `opacity=1`, `visibility=visible`
- Screenshot: `homepage-video-desktop-1440-verified.png`

---

## Backend impact / CD safety

| Item | Assessment |
|---|---|
| Backend Java / Flyway / Compose changes in this hotfix | **None** |
| SearXNG / FAST / SMART contracts in tree | Preserved at `a834e09` |
| `TRON_BACKEND_CD_ENABLED=true` | Workflow `backend-production.yml` runs on **every** push to `main` |
| Effect of merging this frontend-only PR | Will **rebuild and redeploy** backend image tagged with new SHA even though backend sources are identical |

This is **not** a force-push and does not modify MySQL. Residual operational risk: production backend container restart via normal CD. No path filter exists to skip backend publish for frontend-only merges.

---

## GitHub / Vercel delivery

| Item | Value |
|---|---|
| PR title | `hotfix(frontend): restore pre-mobile stable UI and preserve SearXNG` |
| PR URL | _(filled after create)_ |
| CI | _(filled after checks)_ |
| Vercel preview | _(filled after deploy)_ |
| Production merge | Proceed only after required checks PASS |

---

## Outstanding problems

1. **`api.tronai.tech` HTTP 530** at verification time — Cloudflare origin down/unreachable. Separate from frontend rollback.
2. Physical iOS/Android device lab not used (Chromium emulation only).
3. Live authenticated chat/search/CV export not re-run while API origin returns 530.
4. Merging to main will trigger backend CD rebuild/redeploy of identical backend sources.

---

## Success criteria mapping

| Criterion | Status |
|---|---|
| Original TRON AI UI restored (`a834e09` tree) | YES |
| Homepage video working (verified locally) | YES |
| Frontend API client compatibility preserved | YES (unchanged vs target) |
| SearXNG-era backend tree preserved | YES |
| Production site healthy | **BLOCKED on API 530** until origin recovered; frontend deploy path ready |
