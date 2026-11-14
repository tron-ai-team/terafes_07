# TRON Core Polish — Release Handoff

## Source

- **Branch:** `feature/tron-core-polish-20261114`
- **Base:** `origin/main` @ `d9df8dea…` (PR #25)
- **PR:** https://github.com/tron-ai-team/terafes_07/pull/26 (**DRAFT**)
- **Production deployment performed by this mission:** **NO**
- **Merge to main:** **NOT AUTHORIZED** — owner approval required
- **Phase 2 report:** `docs/TRON_CORE_POLISH_PHASE2_REPORT.md`
- **Phase 3 report:** `docs/TRON_CORE_POLISH_PHASE3_REPORT.md`
- **Test matrix:** `docs/TRON_CORE_POLISH_TEST_MATRIX.md`
- **FAST 503 root cause:** ChatService routed FAST to RTX ModelManager while GTX was healthy; fixed in branch — **deploy required** for live FAST PASS

## Risk assessment

| Risk | Level | Mitigation |
|---|---|---|
| Auth guard blocks guests incorrectly | Low–Med | Loading state + clear sign-in; refresh preserved |
| Legacy Workspace deep links | Low | Friendly unavailable page; source/backends intact |
| Open redirect via returnTo | Mitigated | `sanitizeReturnTo` |
| GTX/RTX routing regression | Low | Existing Maven router tests pass; no backend routing edits |
| Visual identity drift | Low | No hero/logo/video edits |
| RESUME_EN template until backend deploy | Med | Fixed in this PR; production API still coerces until deploy |
| FAST generation 503 while modes say available | Med (env) | Honest UI 503; no silent CLOUD fallback |

## Owner test checklist (before merge/deploy)

1. Guest: open `/chat`, `/voice`, `/career/interview`, `/career/cv-builder` → sign-in required (not 404).
2. Guest: open `/this-is-not-a-route` → branded 404.
3. Sign in (email + Google) with `returnTo=/career/cv-builder` → lands on CV Builder.
4. TopBar shows Chat / Voice / Interview / CV only — no Workspace.
5. Home Get Started (signed in) → Chat; hero video/logo unchanged.
6. Chat: send FAST message; confirm GTX answer when FAST online; no silent fallback.
7. Voice: start/stop; leave tab; confirm mic stops.
8. Interview: setup → room → answer → feedback.
9. CV: open draft, Magic Fill accept/reject, PDF/XLSX export.
10. Mobile 390px: drawer, chat composer, interview controls usable.

## Rollback

Revert/close the PR; do not merge. No production DB or Compose changes to roll back.

## Explicit warning

**Do not merge or deploy this PR without owner approval.** Protected backend CD is enabled on `main`.
