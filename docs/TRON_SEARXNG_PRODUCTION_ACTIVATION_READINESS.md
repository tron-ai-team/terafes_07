# TRON SearXNG Production Activation — Release Readiness

**Branch:** `feature/tron-searxng-production-activation`  
**Base:** `origin/main` @ `fbfad768b88280aff5d27e232f2f31364a0595ed` (current production release revision)  
**Tip SHA:** _(updated after this safety-fix push; see PR #29 HEAD)_  
**Activation commit:** `604d34e1bfc37fd96b536a1ec11aef1254b3b5a5`  
**PR:** https://github.com/tron-ai-team/terafes_07/pull/29 (DRAFT)  
**PR status:** DRAFT — **DO NOT MERGE / DO NOT DEPLOY** from this agent session.

---

## Exact changes

| File | Change |
|---|---|
| `backend/backend-spring/src/main/resources/application-prod.yml` | Prod-profile-only `tron.search` defaults: master + SearXNG ON at `http://tron-searxng:8080`; Serper / local paid fallback / Groq native / OpenRouter native remain OFF |
| `backend/backend-spring/src/main/resources/application.yml` | Comment clarifying global defaults stay OFF; activation is prod-profile-only |
| `.../SearxngProductionActivationTest.java` | YAML + orchestration safety tests |
| `.../SearxngProductionConfigBootTest.java` | Real Spring ConfigData binding tests (prod on / default off / env override / paid off / gateway locks) |
| This document | Owner release gate |

No Flyway migrations. No Compose edits. No release-controller edits. No `/etc/tron-ai/tron-ai.env` edits. No production host changes in this mission.

### Prod defaults (env still overrides at Spring bind time)

```yaml
tron.search.web-search-v1-enabled: ${TRON_WEB_SEARCH_V1_ENABLED:true}
tron.search.searxng.enabled: ${TRON_SEARCH_SEARXNG_ENABLED:true}
tron.search.searxng.base-url: ${TRON_SEARCH_SEARXNG_BASE_URL:http://tron-searxng:8080}
# paid paths remain :false / daily-max-calls:0
```

### Critical merge warning

Production Compose already sets `SPRING_PROFILES_ACTIVE=prod` and loads `/etc/tron-ai/tron-ai.env` without requiring new search keys.

**Merging this PR to `main` and deploying the resulting backend image through the protected release controller WILL enable private SearXNG web search in production** for FAST/SMART (when chat `searchMode` is AUTO/ON per existing policy), without editing the production env file.

Do **not** use direct `/etc/tron-ai/tron-ai.env` edits or ad-hoc Docker restarts as the emergency recovery path. Manual env fingerprint drift can break the protected release controller’s rollback / preflight matching. Prefer protected **image rollback**.

---

## Test evidence

Local Maven (`backend/backend-spring`):

```text
SearxngProductionConfigBootTest + SearxngProductionActivationTest + routing suites — see verification section after push
```

Covered:

1. Development/default profile — search disabled (Spring ConfigData)  
2. Production profile — SearXNG activated at `http://tron-searxng:8080` (Spring ConfigData)  
3. Explicit `TRON_WEB_SEARCH_V1_ENABLED=false` overrides production defaults  
4. Paid search remains disabled under prod  
5. FAST/SMART gateway lock YAML defaults unchanged by search activation  
6. Orchestration: SearXNG-only, no silent paid fallback, OFF skipped, privacy  
7. Existing Chat/Voice/Interview suites via broader Maven run  

Live FAST/SMART inference against production: **not claimed PASS** in this mission (no production contact).

---

## Production behavior before / after

| Item | Before (current prod image fbfad768) | After (this activation image) |
|---|---|---|
| Global/default profile search | OFF | OFF (unchanged) |
| Prod profile master search | OFF (inherits application.yml false default) | ON by default |
| Prod SearXNG | OFF | ON → `http://tron-searxng:8080` |
| Serper / paid fallback / native cloud tools | OFF | OFF |
| FAST inference | GTX lock | GTX lock (unchanged code) |
| SMART inference | RTX lock | RTX lock (unchanged code) |

---

## Release controller compatibility

Inspected `deploy/scripts/backend-production.py` / `deploy/BACKEND_PRODUCTION_CD.md` / `deploy/compose.prod.yml`:

| Requirement | Status |
|---|---|
| No production env file edit required | PASS — prod profile baked into image; env already has `SPRING_PROFILES_ACTIVE=prod` |
| No protected Compose change | PASS — image-only override path |
| Rollback compatibility | PASS — controller restores prior local image; keep env fingerprint unchanged |
| No Flyway changes | PASS — zero migration files in this PR |
| No service/volume modifications | PASS — config-only JAR change |

**No blockers** for image-based activation under the existing protected workflow.

---

## Protected deployment procedure (owner)

1. Review and approve this DRAFT PR.  
2. Merge to `main` with the repository’s required merge method / checks.  
3. Allow protected CD to publish/attest the new backend image and activate via `/usr/local/sbin/tron-backend-release` (image-only `up`).  
4. Do **not** edit `/etc/tron-ai/tron-ai.env` for enablement or for emergency disable.  
5. Confirm Actuator health UP and run live FAST/SMART search smokes below.  

This agent does **not** merge or deploy.

---

## Expected FAST/SMART live tests (post-deploy, owner)

```bash
# From host
curl -sS 'http://127.0.0.1:8888/search?q=tron&format=json' | head -c 400

# From backend container network
docker exec tron-ai-backend wget -qO- 'http://tron-searxng:8080/search?q=tron&format=json' | head -c 400

# Authenticated Chat:
# FAST + searchMode=on  -> GTX inference; search.provider=SEARXNG when results exist
# SMART + searchMode=on -> RTX inference; search.provider=SEARXNG when results exist
# searchMode=off        -> skipped; no SearXNG calls
```

Do not mark live inference PASS without captured responses.

---

## Exact rollback procedure

1. **Primary — protected image rollback:** use `/usr/local/sbin/tron-backend-release rollback` (or the approved owner runbook equivalent) to restore the prior local backend image (pre-activation SHA), then recheck health and preflight fingerprints.  
2. Leave `/etc/tron-ai/tron-ai.env` unchanged so the controller’s environment fingerprint remains MATCH.  
3. Leave SearXNG container running unless the owner separately wants it stopped.  
4. Confirm chat with `searchMode=on` no longer performs private web search after the previous image is restored.

**Do not** edit production env and restart Docker as an emergency kill switch: that can desynchronize the protected release controller’s env fingerprint and block or complicate rollback.

---

## Remaining risks

1. Merge to `main` triggers production CD — recovery is image rollback, not env surgery.  
2. AUTO search heuristics may increase SearXNG traffic vs OFF.  
3. DuckDuckGo CAPTCHA on SearXNG engines may reduce some result sets (owner-observed previously); Google CSE/Brave still OK.  
4. Live smoke still required after deploy.  
5. If `/etc/tron-ai/tron-ai.env` already sets search flags to `false`, those explicit values continue to win over prod YAML defaults (activation would then require a separate owner-approved env reconciliation — not done by this PR).

---

## Recommendation

**Approve for DRAFT review.** Merge only when the owner is ready for production search traffic under the protected CD path, with protected image rollback rehearsed as the recovery method.
