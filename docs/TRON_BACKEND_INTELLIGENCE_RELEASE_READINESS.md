# TRON Backend Intelligence V1 — Release Readiness

## Verdict

**DRAFT PR ready for owner review. DO NOT MERGE. DO NOT DEPLOY.**

Feature flags default **OFF** — production behavior unchanged until owner enables search.

Final hardening report: [`docs/TRON_BACKEND_INTELLIGENCE_V1_FINAL_HARDENING.md`](./TRON_BACKEND_INTELLIGENCE_V1_FINAL_HARDENING.md)

## SHAs

| Item | Value |
|---|---|
| Verified base `origin/main` | `740d6b91df5c9cb08854efc5ebf57fef49bbba53` |
| Feature branch | `feature/tron-backend-intelligence-v1` |
| Feature tip | _(updated to HEAD after Step 7 hardening commit)_ |
| DRAFT PR | https://github.com/tron-ai-team/terafes_07/pull/28 (NOT MERGED) |

## Worktree safety

- Implementation worktree: `C:/Users/Thushan/Projects/tron-backend-intelligence-v1`
- Original dirty worktree preserved: `tron-ai` on `feature/tron-gtx-fast-ai-integration`
- UI branch untouched: `feature/tron-mobile-home-reference-20261114`

## Production changes

**NONE.** No compose.prod edits, no host installs, no secret writes, no service restarts, no merge.
SearXNG private instance already installed by owner — not modified by this mission.

## Enablement checklist (owner)

1. Private SearXNG already verified: `tron-searxng` / `http://tron-searxng:8080` on `tron_ai_internal`
2. Set in `/etc/tron-ai/tron-ai.env` (future): `TRON_WEB_SEARCH_V1_ENABLED=true`, `TRON_SEARCH_SEARXNG_ENABLED=true`, `TRON_SEARCH_SEARXNG_BASE_URL=http://tron-searxng:8080`
3. Optionally enable Groq/OpenRouter native tools and/or Serper with daily max &gt; 0
4. Smoke chat OFF/AUTO/ON on FAST and SMART
5. Confirm FAST still GTX and SMART still RTX

## Rollback

`TRON_WEB_SEARCH_V1_ENABLED=false` restores legacy search stub immediately.

## Remaining blockers

- Owner approval to merge and to change production env
- Live FAST/SMART web-search smoke after enablement
- Optional: CI Docker image confirmation (local Docker daemon unavailable during hardening)
