# TRON Search — Frontend API Contract (Anti UI branch handoff)

**Audience:** separate mobile/UI agent  
**Do not redesign UI here.** Integrate against this contract only.  
**Routes unchanged:** `/api/v1/chat`, `/api/v1/voice/turn`, `/api/v1/interviews/**`, CV builder routes.

## Auth

All chat/voice/interview endpoints require authenticated user (Bearer JWT / session cookie as today).

## Chat — `POST /api/v1/chat`

### Request (existing + compatible)

```json
{
  "sessionId": "optional-client-id",
  "messages": [{"role": "user", "content": "What is the latest news today?"}],
  "language": "en",
  "searchMode": "off|auto|on",
  "aiProfile": "FAST|SMART|CLOUD|ULTRA|AUTO"
}
```

- Missing `searchMode` → treated as `auto`.
- Invalid/unknown `searchMode` → treated as `auto` (no 500).
- `searchMode=off` always wins over server feature flags.

### Response `search` object (backward compatible)

Existing fields always present:

| Field | Type | Notes |
|---|---|---|
| `mode` | `off\|auto\|on` | Echo of resolved mode |
| `performed` | boolean | True only when usable results returned |
| `status` | `skipped\|unavailable\|ok\|timeout\|error` | |
| `query` | string\|null | Sanitized public query; may be null |
| `detail` | string | Human-readable status |
| `results` | `{title,url,snippet}[]` | Real provider URLs only; never invented |

Optional additive fields (older UI may ignore):

| Field | Type |
|---|---|
| `requested` | boolean |
| `available` | boolean |
| `provider` | `SEARXNG\|SERPER\|GROQ_BROWSER_SEARCH\|OPENROUTER_WEB_SEARCH\|…` |
| `warnings` | string[] |

### Mode semantics

| Mode | Behavior |
|---|---|
| OFF | Zero search calls; `status=skipped` |
| AUTO | Heuristic: current/latest/look-up → search; greetings/math → skip |
| ON | Attempt search; honest `unavailable`/`timeout`/`error` if provider fails |

### Inference vs search

| Profile | Inference | Search (when V1 enabled) |
|---|---|---|
| FAST | GTX `qwen3:8b` when GTX lock on | Private SearXNG |
| SMART | RTX `qwen3.5:9b-q4_K_M` when RTX lock on | Private SearXNG |
| CLOUD | Configured cloud provider | Native tool if enabled, else Serper if enabled |
| ULTRA | Ultra cloud path | Same as cloud capability rules |

Search **does not** change inference mode.

### Feature flags (server)

Until owner enables `TRON_WEB_SEARCH_V1_ENABLED=true` (+ provider flags), ON/AUTO continue to return `unavailable` / `"Search provider not configured"` (legacy stub). OFF still `skipped`.

### Streaming

No SSE/search-progress stream in this mission. Single JSON response.

## Voice — `POST /api/v1/voice/turn` (multipart)

New optional fields (backward compatible):

- `searchMode` or `search_mode` — `off|auto|on` (default `auto`)

AUTO avoids searching every utterance. Search failure must not break the audio loop; reply stays caption-friendly.

## Suggested copy only (no UI redesign)

- EN: “Sources”, “Web search unavailable”, “Search is off”
- JA: 「出典」「検索できませんでした」「検索オフ」
- SI: keep existing language resolver; do not invent new layouts

## Privacy / cost notice (for UI copy when cloud/Serper enabled)

Cloud native search and Serper may consume provider credits. Local FAST/SMART use private SearXNG and do not silently fall back to paid Google search unless the owner sets `TRON_SEARCH_LOCAL_PAID_FALLBACK_ENABLED=true`.

## Fixture expectations

- OFF → `performed=false`, `status=skipped`, `results=[]`
- ON + V1 off → `status=unavailable`, detail contains “not configured”
- ON + mock SearXNG → `status=ok`, `provider=SEARXNG`, `results[].url` https
