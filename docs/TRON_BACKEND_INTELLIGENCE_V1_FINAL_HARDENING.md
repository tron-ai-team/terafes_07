# TRON Backend Intelligence V1 — Final Hardening & Release Readiness

**Mission step:** STEP 7 — Final code hardening  
**Branch:** `feature/tron-backend-intelligence-v1`  
**DRAFT PR:** https://github.com/tron-ai-team/terafes_07/pull/28  
**Status:** DRAFT — **DO NOT MERGE. DO NOT DEPLOY.**

---

## 1. Bugs found

| # | Area | Bug |
|---|---|---|
| 1 | Long chat grounding | `ChatContextWindow` kept only the **first** system message. Current-turn search evidence (second system message) was dropped when history exceeded the context budget. |
| 2 | Search cache | Cache keys used only `provider\|query`. Language and result-limit collisions caused cross-language contamination and FAST/SMART result-count mixing. |
| 3 | Cloud native honesty | Orchestrator set `succeeded=true` / status `ok` merely because a native tool was **requested**. `SearchInfo.available` could look successful without verifiable citations. |
| 4 | Serper budget | In-memory daily counter reset on process restart; ambiguous timeouts **refunded** budget (`releaseUnused`), under-counting real spend risk. |
| 5 | Privacy | Private signals were too narrow; CV/profile, credentials, addresses, JP/Sinhala personal cues could still reach public search after weak generalization. |
| 6 | Sanitizer limit | `toBundle` always clipped with `maxResultsSmart`, ignoring FAST’s configured limit. |

---

## 2. Exact code fixes

| Fix | Files |
|---|---|
| Preserve **all leading system messages** (prompt + evidence), then truncate conversation turns | `ChatContextWindow.java` |
| Cache key = `provider\|language\|maxResults\|query`; bounded eviction | `SearchCache.java`, `SearchOrchestrator.java` |
| Native path returns `native_tool_requested` / `succeeded=false`; `performed=true` only with verified hits; finalize after provider citations | `SearchOrchestrator.java`, `SearchBundle.java`, `CloudNativeSearchSupport.java`, `NativeSearchEvidenceExtractor.java`, `ChatService.java`, `OpenAiCompatibleClient.java`, `AiGenerationResult.java`, `ChatGenerationResult.java` |
| Durable Serper ledger; refund only on 401/403; retain budget on timeout/network ambiguity | `SerperBudgetTracker.java`, `SerperSearchClient.java`, `WebSearchProperties.java`, `application.yml` |
| Conservative skip for credentials / CV / address / JP / Sinhala personal content | `SearchDecisionPolicy.java` |
| Pass mode-specific `maxResults` into sanitizer | `SearchOrchestrator.java` |
| Honest native grounding note when unverified | `SearchGrounding.java` |

Master feature flag remains **OFF** by default (`TRON_WEB_SEARCH_V1_ENABLED=false`).

---

## 3. Tests and results

### Local Maven (`backend/backend-spring`)

```text
Tests run: 423, Failures: 0, Errors: 0, Skipped: 3
BUILD SUCCESS
```

Covered in this hardening pass (non-exhaustive):

- `ChatContextWindowTest` — 50+ message history preserves evidence
- `SearchCacheTest` — language + limit isolation + bound
- `SearchOrchestratorTest` — FAST/SMART counts; native not performed
- `CloudNativeSearchHonestyTest` — request vs verified citations
- `SearchDecisionPolicyTest` — privacy / injection
- `SerperBudgetTrackerTest` — restart ledger + timeout retains budget
- `SerperSearchClientTest` — disabled / exhaustion
- `SearchResultSanitizerTest` — injection redaction
- `AiModelRouterTest` / `ChatHybridRoutingUnitTest` — routing preserved
- `VoiceEndpointTest` / `VoiceIntelligenceTest` — voice regression
- `InterviewEndpointTest` — interview regression (via full suite)

### Docker build validation

**BLOCKED locally:** Docker Desktop daemon not running on the Windows workstation (`npipe:////./pipe/dockerDesktopLinuxEngine` unavailable).

**Substitute:** `mvn -DskipTests package` succeeded; JAR produced:

`backend/backend-spring/target/tronai-backend-0.1.0-SNAPSHOT.jar`

CI Docker/GHCR build remains the authoritative image check after push.

### Live inference

**Not claimed PASS.** No live FAST/SMART/CLOUD inference or live SearXNG-from-backend chat turn was executed in this hardening session. Owner-verified SearXNG infra (DNS/HTTP) stands separately — see §10 for verification procedure.

---

## 4. Final commit SHA

Feature tip (Step 7 hardening):

`959979aee9b467e978811da65588ab44f7ef2db5`

---

## 5. CI status

After push: check https://github.com/tron-ai-team/terafes_07/pull/28/checks  

Expected: normal PR CI only. **No production deploy workflow** should be triggered (branch ≠ `main`).

---

## 6. Production configuration requirements

Intended **future** runtime settings (owner-approved only). **Do not change production now.**

Via Compose `env_file` `/etc/tron-ai/tron-ai.env` (already wired in protected `compose.prod.yml` — no Compose edit required for these vars):

```dotenv
TRON_WEB_SEARCH_V1_ENABLED=true
TRON_SEARCH_SEARXNG_ENABLED=true
TRON_SEARCH_SEARXNG_BASE_URL=http://tron-searxng:8080
```

Keep defaults until staged enablement:

```dotenv
TRON_SEARCH_SERPER_ENABLED=false
TRON_SEARCH_SERPER_DAILY_MAX_CALLS=0
TRON_SEARCH_LOCAL_PAID_FALLBACK_ENABLED=false
TRON_SEARCH_GROQ_BROWSER_ENABLED=false
TRON_SEARCH_OPENROUTER_TOOL_ENABLED=false
```

Owner-verified SearXNG (already installed; do not reinstall):

| Item | Value |
|---|---|
| Container | `tron-searxng-private` |
| Network | `tron_ai_internal` |
| Backend DNS | `tron-searxng` |
| Backend URL | `http://tron-searxng:8080` |
| Host URL | `http://127.0.0.1:8888` |

Protected controller `/usr/local/sbin/tron-backend-release` and root Compose must **not** be edited for this enablement — env-file only + standard release path after merge approval.

---

## 7. Remaining blockers

1. Owner approval to merge PR #28 to `main` (triggers protected CD — treat as production risk).
2. Owner approval to set search env vars in `/etc/tron-ai/tron-ai.env` and restart/redeploy backend.
3. Confirm backend container can resolve `tron-searxng` on `tron_ai_internal` after enablement.
4. Live FAST/SMART chat web-search smoke (§10) — not run in this session.
5. Optional CLOUD native tool flags + compatible Groq GPT-OSS model / OpenRouter tool — only if owner wants CLOUD search.
6. Local Docker daemon unavailable here; rely on CI image build.
7. Serper stays disabled by default; durable ledger is ready if owner enables with `daily-max-calls > 0`.

---

## 8. Safe staged enablement procedure

1. Merge DRAFT PR only after owner review (explicit).
2. Deploy new backend image via normal protected release controller (no manual Compose edits).
3. Confirm master flag still `false` after deploy — chat search behaves as legacy stub.
4. Verify SearXNG from host: `curl -sS 'http://127.0.0.1:8888/search?q=tron&format=json' | head`
5. From backend container network: resolve/curl `http://tron-searxng:8080/search?q=tron&format=json`
6. Add only the three enablement vars to `/etc/tron-ai/tron-ai.env` (owner).
7. Redeploy/restart backend via approved release path.
8. Smoke: Chat FAST `searchMode=off|auto|on`, then SMART — confirm inference still GTX/RTX respectively.
9. Confirm `SearchInfo.performed=true` only when results present; OFF still skips.

---

## 9. Rollback plan

1. Immediate: set `TRON_WEB_SEARCH_V1_ENABLED=false` in `/etc/tron-ai/tron-ai.env` and restart/redeploy backend.
2. Optional: set `TRON_SEARCH_SEARXNG_ENABLED=false`.
3. Do **not** tear down SearXNG unless owner wants — leaving it running is fine while flag is off.
4. If image regression: protected controller `rollback` to prior image (existing runbook).
5. Serper never enabled by default — no paid rollback needed unless owner had enabled it.

---

## 10. Real FAST/SMART web-search verification procedure

Do this on the production host **after** staged enablement (not during this PR-only hardening):

```bash
# 1) SearXNG host health
curl -sS 'http://127.0.0.1:8888/search?q=java+release&format=json' | head -c 400

# 2) From backend container (Docker DNS)
docker exec tron-ai-backend wget -qO- 'http://tron-searxng:8080/search?q=java+release&format=json' | head -c 400

# 3) Authenticated Chat API — FAST + searchMode=on
# Expect: aiProfile/provider locked to GTX path; search.provider=SEARXNG;
#         search.performed=true only if results[] non-empty; no Serper calls.

# 4) Authenticated Chat API — SMART + searchMode=on
# Expect: RTX lock unchanged; SEARXNG results with SMART maxResults.

# 5) Long conversation (≥50 turns) with search ON on the last turn
# Expect: reply still grounded; search evidence not dropped.
```

Do **not** mark live inference PASS without capturing real request/response evidence.

---

## Routing preservation (Task 6)

Unchanged:

- FAST → GTX 1070 → Qwen3 8B → SearXNG grounding  
- SMART → RTX 4060 → Qwen3.5 9B → SearXNG grounding  
- CLOUD → configured provider → approved native tool only when capable  

Search never silently changes the inference provider. No paid fallback for FAST/SMART by default.
