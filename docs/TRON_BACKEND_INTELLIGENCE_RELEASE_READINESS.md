# TRON Backend Intelligence V1 — Release Readiness

## Verdict

**DRAFT PR ready for owner review. DO NOT MERGE. DO NOT DEPLOY.**

Feature flags default **OFF** — production behavior unchanged until owner enables search.

## SHAs

| Item | Value |
|---|---|
| Verified base `origin/main` | `740d6b91df5c9cb08854efc5ebf57fef49bbba53` |
| Feature branch | `feature/tron-backend-intelligence-v1` |
| Feature tip | *(fill after push — see PR)* |

## Worktree safety

- Implementation worktree: `C:/Users/Thushan/Projects/tron-backend-intelligence-v1`
- Original dirty worktree preserved: `tron-ai` on `feature/tron-gtx-fast-ai-integration`
- UI branch untouched: `feature/tron-mobile-home-reference-20261114`

## Production changes

**NONE.** No compose.prod edits, no host installs, no secret writes, no service restarts, no merge.

## Enablement checklist (owner)

1. Install private SearXNG per `docs/TRON_SEARXNG_PRIVATE_DEPLOY_RUNBOOK.md`
2. Set `TRON_WEB_SEARCH_V1_ENABLED=true` and `TRON_SEARCH_SEARXNG_ENABLED=true`
3. Optionally enable Groq/OpenRouter native tools and/or Serper with daily max &gt; 0
4. Smoke chat OFF/AUTO/ON on FAST and SMART
5. Confirm FAST still GTX and SMART still RTX

## Rollback

`TRON_WEB_SEARCH_V1_ENABLED=false` restores legacy search stub immediately.

## Remaining blockers

- Live SearXNG deployment
- Live Serper/Groq/OpenRouter search credentials + budgets
- Owner approval to merge and to change production env
- Optional: full `CvBuilderV2BackendIT` in CI after push
