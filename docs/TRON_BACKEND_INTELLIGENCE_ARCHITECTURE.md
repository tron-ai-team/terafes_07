# TRON Backend Intelligence V1 — Architecture

## Routing map

```text
POST /api/v1/chat (auth, searchMode, aiProfile, messages)
  → SearchOrchestrator (before LLM)
       OFF → no provider calls
       AUTO → SearchDecisionPolicy heuristics (no paid classifier)
       ON → attempt permitted search
            FAST/SMART/QUALITY/AUTO → private SearXNG
            CLOUD/ULTRA → Groq browser_search OR OpenRouter openrouter:web_search
                          else opt-in Serper (budget-gated)
  → LanguageService + SearchGrounding evidence block
  → ChatContextWindow truncate
  → generateWithGatewayOrLocal  (FAST→GTX / SMART→RTX locks unchanged)
  → SearchInfo in response (backward compatible + optional provider/warnings)
```

## Components

| Class | Role |
|---|---|
| `SearchDecisionPolicy` | OFF/AUTO/ON + privacy generalization |
| `SearchOrchestrator` | One primary search route; optional explicit paid fallback |
| `SearxngSearchClient` | Private JSON `GET /search?format=json` |
| `SerperSearchClient` + `SerperBudgetTracker` | Google results, daily hard cap |
| `CloudNativeSearchSupport` | Groq GPT-OSS / OpenRouter tool capability |
| `SearchResultSanitizer` | URL allow http(s), injection redaction, dedupe |
| `SearchGrounding` | Untrusted evidence prompt wrapping |
| `ChatContextWindow` | Keep system + recent turns |

## Cost / safety defaults

All `TRON_WEB_SEARCH_V1_*` / SearXNG / Serper / native tool flags default **false**.  
Local → Serper fallback requires `TRON_SEARCH_LOCAL_PAID_FALLBACK_ENABLED=true`.  
Search never changes inference provider.

## Honest provider labels

- SearXNG → `SEARXNG` (engine field may note google/bing/etc. when returned)
- Groq browser_search → `GROQ_BROWSER_SEARCH` (Exa-backed, not Google)
- OpenRouter → `OPENROUTER_WEB_SEARCH`
- Serper → `SERPER` (Google results)
