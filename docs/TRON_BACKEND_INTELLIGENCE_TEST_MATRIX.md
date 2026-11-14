# TRON Backend Intelligence V1 — Test Matrix

**Environment:** Windows workstation, Maven `backend/backend-spring`, profile `test` (H2).  
**Commands executed** (exit 0 unless noted):

```text
mvnw "-Dtest=SearchDecisionPolicyTest,SearchResultSanitizerTest,ChatContextWindowTest,SearchOrchestratorTest,SearxngSearchClientTest,SerperSearchClientTest,NativeWebSearchToolsTest,ChatHybridRoutingUnitTest,AiModelRouterTest,ChatEndpointTest" test
mvnw "-Dtest=VoiceIntelligenceTest,InterviewTurnEngineTest,TavilySearchClientTest,SafeUrlFetcherTest,SearchResultSanitizerTest,ChatContextWindowTest" test
```

| Case | Result | Evidence type |
|---|---|---|
| SearchMode OFF → 0 providers | **PASS** | `SearchOrchestratorTest.offZeroCalls`, `ChatEndpointTest.searchModeOffReturnsSkipped` |
| AUTO current-events triggers / greeting skips | **PASS** | `SearchDecisionPolicyTest.autoHeuristic` |
| ON + V1 disabled → unavailable stub | **PASS** | `ChatEndpointTest.searchModeOnReturnsUnavailable`, `SearchOrchestratorTest.v1DisabledLegacy` |
| FAST SearXNG mock JSON + citations | **PASS** | `SearxngSearchClientTest`, `SearchOrchestratorTest.fastUsesSearxngNotSerper` |
| SearXNG 403 JSON disabled | **PASS** | `SearxngSearchClientTest.jsonDisabled403` |
| Serper disabled / missing key / budget=0 → 0 calls | **PASS** | `SerperSearchClientTest` |
| No silent local→Serper fallback | **PASS** | `SearchOrchestratorTest.noSilentPaidFallback` |
| Groq browser_search compatible models only | **PASS** | `NativeWebSearchToolsTest`, `CloudNativeSearchSupport` |
| OpenRouter `openrouter:web_search` (not deprecated plugin) | **PASS** | `NativeWebSearchToolsTest.openRouterServerTool` |
| Injection snippet redacted | **PASS** | `SearchResultSanitizerTest.redactsInjection` |
| Chat context truncation keeps system | **PASS** | `ChatContextWindowTest` |
| FAST/SMART provider lock regression | **PASS** | `AiModelRouterTest`, `ChatHybridRoutingUnitTest` |
| Chat API backward compatible | **PASS** | `ChatEndpointTest` |
| Voice intelligence regression | **PASS** | `VoiceIntelligenceTest` |
| Interview turn engine regression | **PASS** | `InterviewTurnEngineTest` |
| Company Tavily client still disabled without key | **PASS** | `TavilySearchClientTest` |
| SafeUrlFetcher SSRF unit tests | **PASS** | `SafeUrlFetcherTest` |
| Live SearXNG on private host | **BLOCKED** | Not installed; owner approval required |
| Live Serper / Groq / OpenRouter billed search | **LIVE_BLOCKED** | No production keys exercised; mocked only |
| Physical mic Voice E2E | **BLOCKED** | No hardware; fixture/mock path covered |
| CvBuilderV2BackendIT full suite | **NOT_TESTED** this run | Shared gateway untouched for search OFF; recommend CI |
| Production GPU latency p50/p95 | **NOT_TESTED** | No production access; mock HTTP latency only |
| CI on GitHub after push | **PENDING** | Recorded after DRAFT PR |

## Performance (mocked local HTTP)

- SearXNG mock parse path: ~10–30 ms observed in unit logs (not production GPU).
- Full chat SpringBootTest cold start ~30–40 s (test context), not product latency.
