# TRON Backend Intelligence V1 ? STEP 8 Release Gate

**PR:** https://github.com/tron-ai-team/terafes_07/pull/28 (DRAFT)  
**Branch:** `feature/tron-backend-intelligence-v1`  
**Verdict:** Ready for **owner-approved** staged enablement review. **DO NOT MERGE. DO NOT DEPLOY** from this agent session.

---

## Exact final commit SHA

| Item | SHA |
|---|---|
| Fail-closed Serper + Step 8 report | `7afa2fc627dde10f0fc0d5b136fa6405f8e2f00c` |
| Branch tip | `645f3fc47589286de55151c59aea3bf8db95d2c4` |

---

## What Step 8 changed

### Serper budget ? fail-closed (Task 1)

| Risk | Mitigation |
|---|---|
| Unreadable / corrupt ledger resets to zero | **Fail-closed**: lock tracker; `tryConsume()` always false; no fresh budget |
| Persistence write failure still allows paid calls | Consume rolled back; tracker locked closed |
| Relative ledger lost on container replace | Paid Serper requires **absolute** ledger path (`isReady()` + tracker) |
| Concurrent overspend | All mutate paths `synchronized`; concurrent test asserts max cap |
| Ambiguous timeouts | Still **no refund** (retained from Step 7) |
| Default Serper on | Remains **disabled** (`enabled=false`, `dailyMaxCalls=0`) |

**Production note:** Do **not** enable Serper until an absolute ledger path is mounted on persistent storage (e.g. `/var/lib/tron-ai/serper-daily-budget.ledger`) **and** the owner has approved a Compose/volume change. Until then keep Serper disabled.

### Search routing (Task 2) ? verified in tests

| Mode | Inference | Search grounding |
|---|---|---|
| FAST | GTX lock unchanged | Private SearXNG |
| SMART | RTX lock unchanged | Private SearXNG |
| CLOUD | Configured provider | Native tool only when capable; `performed=true` only with verified citations |

Search never changes the inference provider. Local paid fallback remains OFF by default.

### Production config path (Task 3) ? validated in code/Compose (not applied)

`deploy/compose.prod.yml` already injects `/etc/tron-ai/tron-ai.env` via `env_file`. Spring binds:

```yaml
tron.search.web-search-v1-enabled: ${TRON_WEB_SEARCH_V1_ENABLED:false}
tron.search.searxng.enabled: ${TRON_SEARCH_SEARXNG_ENABLED:false}
tron.search.searxng.base-url: ${TRON_SEARCH_SEARXNG_BASE_URL:http://127.0.0.1:8888}
```

**Future enablement values (owner only ? DO NOT SET NOW):**

```dotenv
TRON_WEB_SEARCH_V1_ENABLED=true
TRON_SEARCH_SEARXNG_ENABLED=true
TRON_SEARCH_SEARXNG_BASE_URL=http://tron-searxng:8080
```

Master flag default remains **false**.

Owner-verified SearXNG (do not reinstall): container `tron-searxng-private`, network `tron_ai_internal`, DNS `tron-searxng`, HTTP PASS, 39/20 result samples observed.

---

## All test results

### Local Maven (`backend/backend-spring`)

```text
Tests run: 432, Failures: 0, Errors: 0, Skipped: 3
BUILD SUCCESS
```

Focused Step 8 coverage includes:

- `SerperBudgetTrackerTest` ? restart, corrupt/unreadable ledger fail-closed, relative path reject, write failure block, concurrency, timeout retain, 401 refund-only
- `SerperSearchClientTest` ? disabled / budget exhaustion
- `SearchRoutingLockTest` ? FAST/SMART ? SearXNG; CLOUD honesty
- Prior Step 7 suites: privacy, grounding, long context, orchestrator, voice, interview (via full suite)

### Live inference

**Not claimed PASS.** No production env enablement and no live FAST/SMART chat smoke in this session.

---

## GitHub CI status

Tip under test: `645f3fc47589286de55151c59aea3bf8db95d2c4`

https://github.com/tron-ai-team/terafes_07/pull/28/checks

Prior tip `d798fad0` CI: **SUCCESS**. Step 8 tip CI re-queued after push ? confirm green before owner merge.

Expect PR CI only (Maven, Security, Docker no-push). No production deploy workflow on this branch.

---

## Remaining blockers

1. Owner approval to merge DRAFT PR #28 (merge to `main` can trigger protected CD).
2. Owner approval to set search env vars in `/etc/tron-ai/tron-ai.env` (not done by this mission).
3. Live FAST/SMART web-search smoke after enablement (section below).
4. Serper remains blocked until absolute persistent ledger + owner volume/path approval.
5. Optional CLOUD native tool flags only if owner wants cloud search.
6. Confirm CI green on exact tip `645f3fc4` (or later tip if docs-only follow-up).

---

## Production deployment requirements

1. Merge only after explicit owner approval.
2. Deploy backend image via protected release controller (`/usr/local/sbin/tron-backend-release`) ? no manual Compose edits for search flags.
3. Confirm after deploy that search flags are still **false** before staged enablement.
4. SearXNG already on `tron_ai_internal` as `tron-searxng` ? leave configuration alone.
5. Do not enable Serper without absolute ledger on persistent storage.

---

## SearXNG enablement procedure (owner)

1. Confirm host: `curl -sS 'http://127.0.0.1:8888/search?q=tron&format=json' | head`
2. Confirm from backend container: `wget -qO- 'http://tron-searxng:8080/search?q=tron&format=json' | head`
3. Append **only** to `/etc/tron-ai/tron-ai.env`:

```dotenv
TRON_WEB_SEARCH_V1_ENABLED=true
TRON_SEARCH_SEARXNG_ENABLED=true
TRON_SEARCH_SEARXNG_BASE_URL=http://tron-searxng:8080
```

4. Redeploy/restart backend via approved release path.
5. Smoke Chat OFF / AUTO / ON on FAST then SMART.
6. Confirm FAST still GTX and SMART still RTX.

---

## FAST/SMART live verification procedure

```bash
# SearXNG
curl -sS 'http://127.0.0.1:8888/search?q=java+release&format=json' | head -c 400
docker exec tron-ai-backend wget -qO- 'http://tron-searxng:8080/search?q=java+release&format=json' | head -c 400

# Authenticated Chat FAST searchMode=on ? provider SEARXNG, GTX inference lock
# Authenticated Chat SMART searchMode=on ? provider SEARXNG, RTX inference lock
# search.performed=true only when results[] non-empty
# Long conversation (?50 turns) still retains current-turn evidence
```

Do not mark live inference PASS without captured responses.

---

## Rollback procedure

1. Immediate kill switch: `TRON_WEB_SEARCH_V1_ENABLED=false` in `/etc/tron-ai/tron-ai.env`, then restart/redeploy backend.
2. Optional: `TRON_SEARCH_SEARXNG_ENABLED=false`.
3. Leave SearXNG container running unless owner wants it stopped.
4. Image regression: protected controller `rollback` per existing runbook.
5. Serper: keep disabled; if ever enabled, fail-closed ledger blocks further paid calls on ledger faults.

---

## Safety checklist

- [x] PR remains DRAFT
- [x] No merge
- [x] No production deploy
- [x] No production env changes
- [x] No SearXNG reinstall / config change
- [x] No frontend UI branch edits
- [x] Master search flag default OFF
- [x] Serper default OFF + fail-closed durable budget
