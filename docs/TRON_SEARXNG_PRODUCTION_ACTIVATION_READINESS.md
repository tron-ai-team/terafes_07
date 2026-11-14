# TRON SearXNG Production Activation — Release Readiness

**Branch:** `feature/tron-searxng-production-activation`  
**Base:** `origin/main` @ `fbfad768b88280aff5d27e232f2f31364a0595ed` (current production release revision)  
**Tip SHA:** `8c53a15e0c47c7fdd36912d187951063fb0d3c2c`  
**Activation commit:** `604d34e1bfc37fd96b536a1ec11aef1254b3b5a5`  
**PR status:** DRAFT — **DO NOT MERGE / DO NOT DEPLOY** from this agent session.

---

## Exact changes

| File | Change |
|---|---|
| `backend/backend-spring/src/main/resources/application-prod.yml` | Prod-profile-only `tron.search` defaults: master + SearXNG ON at `http://tron-searxng:8080`; Serper / local paid fallback / Groq native / OpenRouter native remain OFF |
| `backend/backend-spring/src/main/resources/application.yml` | Comment clarifying global defaults stay OFF; activation is prod-profile-only |
| `.../SearxngProductionActivationTest.java` | Safety tests for YAML defaults, kill-switch, FAST/SMART SearXNG-only, no paid fallback, OFF skipped, privacy |
| This document | Owner release gate |

No Flyway migrations. No Compose edits. No release-controller edits. No `/etc/tron-ai/tron-ai.env` edits. No production host changes in this mission.

### Prod defaults (env still overrides)

```yaml
tron.search.web-search-v1-enabled: ${TRON_WEB_SEARCH_V1_ENABLED:true}
tron.search.searxng.enabled: ${TRON_SEARCH_SEARXNG_ENABLED:true}
tron.search.searxng.base-url: ${TRON_SEARCH_SEARXNG_BASE_URL:http://tron-searxng:8080}
# paid paths remain :false / daily-max-calls:0
```

### Critical merge warning

Production Compose already sets `SPRING_PROFILES_ACTIVE=prod` and loads `/etc/tron-ai/tron-ai.env` without requiring new search keys.

**Merging this PR to `main` and deploying the resulting backend image through the protected release controller WILL enable private SearXNG web search in production** for FAST/SMART (when chat `searchMode` is AUTO/ON per existing policy), without editing the production env file.

Immediate kill switch without rebuild: set `TRON_WEB_SEARCH_V1_ENABLED=false` in `/etc/tron-ai/tron-ai.env` and restart/redeploy (owner-operated only).

---

## Test evidence

Local Maven (`backend/backend-spring`):

```text
Tests run: 437, Failures: 0, Errors: 0, Skipped: 3
BUILD SUCCESS
```

(Excluded two pre-existing evidence writers that hardcode another user's OneDrive path
`C:/Users/engrm/...` and fail with `AccessDeniedException` on this workstation. Unrelated to search activation.)

Covered:

1. Development/default YAML — search disabled  
2. Production YAML — SearXNG activated at `http://tron-searxng:8080`  
3. Explicit master `false` override — search unavailable / no provider calls  
4. FAST/SMART prod-like config — SearXNG only; Serper never called  
5. SearXNG failure — no silent paid fallback  
6. Search OFF — skipped  
7. Privacy — credentials/CV blocked; email generalized  
8. Existing suites — Chat hybrid routing, AI model router, orchestrator, voice/interview via full suite  

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
| Env kill switch | N/A (already off) | `TRON_WEB_SEARCH_V1_ENABLED=false` forces off |

---

## Release controller compatibility

Inspected `deploy/scripts/backend-production.py` / `deploy/BACKEND_PRODUCTION_CD.md` / `deploy/compose.prod.yml`:

| Requirement | Status |
|---|---|
| No production env file edit required | PASS — prod profile baked into image; env already has `SPRING_PROFILES_ACTIVE=prod` |
| No protected Compose change | PASS — image-only override path |
| Rollback compatibility | PASS — controller restores prior local image |
| No Flyway changes | PASS — zero migration files in this PR |
| No service/volume modifications | PASS — config-only JAR change |

**No blockers** for image-based activation under the existing protected workflow.

---

## Protected deployment procedure (owner)

1. Review and approve this DRAFT PR.  
2. Merge to `main` with the repository’s required merge method / checks.  
3. Allow protected CD to publish/attest the new backend image and activate via `/usr/local/sbin/tron-backend-release` (image-only `up`).  
4. Do **not** edit `/etc/tron-ai/tron-ai.env` for enablement (optional kill-switch only).  
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

1. **Image rollback (preferred):** use protected controller `rollback` to prior local image (pre-activation SHA), then recheck health.  
2. **Config kill switch (fast):** set `TRON_WEB_SEARCH_V1_ENABLED=false` in `/etc/tron-ai/tron-ai.env` and restart/redeploy backend only (owner).  
3. Leave SearXNG container running unless owner wants it stopped.  
4. Confirm chat `searchMode=on` returns legacy unavailable/stub without SearXNG usage when master flag is false.

---

## Remaining risks

1. Merge to `main` triggers production CD — irreversible without rollback.  
2. AUTO search heuristics may increase SearXNG traffic vs OFF.  
3. DuckDuckGo CAPTCHA on SearXNG engines may reduce some result sets (owner-observed previously); Google CSE/Brave still OK.  
4. Live smoke still required after deploy.  
5. If `/etc/tron-ai/tron-ai.env` already sets search flags to `false`, those explicit values continue to win over prod YAML defaults (safe; activation would then require removing/overriding those keys).

---

## Recommendation

**Approve for DRAFT review.** Merge only when the owner is ready for production search traffic under the protected CD path, with rollback and kill-switch procedures rehearsed.
