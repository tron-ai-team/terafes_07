# TRON AI Gateway API Contract

**Status:** STABLE for frontend (Anti) integration  
**Date:** 2026-10-20  
**Base path:** `/api/v1/ai`  
**Auth:** JWT bearer (same as other `/api/v1/**` routes). `GET /usage` requires an authenticated user. Modes/models/providers may be called authenticated; secrets are never returned.

Do not send provider API keys from the browser. Keys stay in Spring env / `%LOCALAPPDATA%\TRON\secrets\ai-providers.env`.

---

## Modes (`aiMode` / `aiProfile`)

Allowed values (case-insensitive):

| Mode | Credits | Notes |
|------|---------|-------|
| `FAST` | 0 Ultra | Local Ollama path for chat/voice (legacy compatible) |
| `QUALITY` | 0 Ultra | Legacy alias; routing treats as SMART where gateway is used |
| `SMART` | 0 Ultra | Shared gateway, balanced cloud/local |
| `ULTRA` | Consumes Ultra credits | Strongest configured route; fails closed if unavailable |
| `AUTO` | 0 Ultra (unless resolved to ULTRA — it does not) | Server picks FAST/SMART by feature |

Selection hierarchy:

1. Explicit request field (`aiProfile` / `aiMode` on the feature request)
2. User saved preference (`user_settings.preferred_ai_profile`)
3. `AUTO` / product default (`FAST` where legacy clients omit the field)

Ultra never silent-downgrades while still labeling the response Ultra.

---

## `GET /api/v1/ai/modes`

### Response `200`

```json
{
  "modes": [
    {
      "id": "FAST",
      "description": "Low-latency responses for chat and voice.",
      "consumesUltraCredits": false
    },
    {
      "id": "SMART",
      "description": "Balanced quality for analysis, CV, and agents.",
      "consumesUltraCredits": false
    },
    {
      "id": "QUALITY",
      "description": "Alias for SMART (legacy clients).",
      "consumesUltraCredits": false
    },
    {
      "id": "ULTRA",
      "description": "Highest-quality models; consumes daily Ultra credits.",
      "consumesUltraCredits": true
    },
    {
      "id": "AUTO",
      "description": "Automatic mode selection based on feature and context.",
      "consumesUltraCredits": false
    }
  ],
  "ultraEnabled": true,
  "dailyUltraCredits": 5
}
```

---

## `GET /api/v1/ai/models`

Allowlisted catalog only (no secrets).

### Response `200`

```json
{
  "models": [
    {
      "provider": "OLLAMA",
      "modelId": "qwen3:8b",
      "label": "Local Qwen 8B"
    }
  ]
}
```

Fields: `provider`, `modelId`, `label` only.

---

## `GET /api/v1/ai/usage`

Requires authentication. Returns **the current user's** Ultra quota for the UTC day.

### Response `200`

```json
{
  "dailyLimit": 5,
  "usedCredits": 2,
  "remaining": 3,
  "utcDay": "2026-10-20",
  "ultraEnabled": true
}
```

### Errors

| Status | When |
|--------|------|
| `401` | Not authenticated |

Clients cannot query another user's usage; the user id is taken from the JWT.

---

## `GET /api/v1/ai/providers`

Provider health snapshots. Never includes tokens, account secrets, or raw headers.

### Response `200`

```json
{
  "providers": [
    {
      "provider": "GROQ",
      "status": "CONFIGURED",
      "detail": "API key present",
      "configured": true,
      "knownModels": ["llama-3.1-8b-instant"]
    },
    {
      "provider": "CLOUDFLARE_WORKERS_AI",
      "status": "UNAVAILABLE",
      "detail": "CLOUDFLARE_ACCOUNT_ID missing",
      "configured": false,
      "knownModels": []
    },
    {
      "provider": "GEMINI",
      "status": "DISABLED",
      "detail": "No Gemini inference key configured",
      "configured": false,
      "knownModels": []
    }
  ]
}
```

### Status enum

`CONFIGURED` | `AVAILABLE` | `INVALID_CREDENTIAL` | `RATE_LIMITED` | `UNAVAILABLE` | `DISABLED`

---

## Preference update (existing settings)

Prefer the existing user settings endpoint to persist the shared mode:

- Field: `preferredAiProfile` / `aiProfile` (string mode id above)
- Applies across Chat, Voice, Interview, CV, Career tools, Coding Agent, Browser Agent

Do not invent a second preference store.

---

## Passing `aiMode` through product APIs

Non-breaking: existing clients that send `aiProfile: "FAST"|"QUALITY"` continue to work.

| Surface | How to pass mode | Notes |
|---------|------------------|-------|
| Chat | `ChatRequest.aiProfile` | Session locks profile after first message |
| Voice | voice request `aiProfile` (existing) | FAST/QUALITY local; SMART/ULTRA/AUTO via gateway when wired |
| Interview start | `InterviewConfigDto.aiProfile` | Locked on session; Ultra interview costs up to 2 credits for plan+eval budget |
| Interview feedback | session profile | Uses `INTERVIEW_FEEDBACK` feature |
| CV parse/review | gateway `CV_REVIEW` with AUTO unless caller sets profile | Deterministic fallback preserved |
| Career / job tools | agent tool context / session profile | Analysis only; no fabricated jobs |
| Coding Agent | task create may omit; uses user preference / AUTO for LLM planner steps | Tool policy unchanged |
| Browser Agent | same task pipeline | Browser ops normalized; completion requires evidence |

### Ultra credit costs (configurable defaults)

| Feature | Credits |
|---------|---------|
| Deep Chat (`CHAT` Ultra) | 1 |
| Coding / Browser agent Ultra task budget | 2 |
| Interview + evaluation Ultra | 2 |
| Premium CV evaluation | 1 |

Agent Ultra cost is a **task budget**, not one credit per internal model call.

### Common Ultra errors

| Status | Body / message |
|--------|----------------|
| `429` / business exception | Daily Ultra credit limit reached |
| `503` | Ultra disabled, no Ultra-capable provider, or Ultra unavailable (no silent downgrade) |

---

## Error shape (gateway)

Provider failures surface as categories (never fake success text):

- `INVALID_CREDENTIAL` (401/403)
- `RATE_LIMITED` (429)
- `UNAVAILABLE` (timeouts / 5xx / missing account id)
- `UNSUPPORTED_MODEL`
- `UPSTREAM_ERROR`

Streaming chunks (when enabled) use the same request id; credentials and chain-of-thought are never exposed.

---

## Frontend integration checklist (Anti)

1. Call `GET /api/v1/ai/modes` for picker labels and Ultra flags.
2. Call `GET /api/v1/ai/usage` after login and after Ultra actions.
3. Call `GET /api/v1/ai/providers` only for status badges (optional).
4. Persist user choice via existing settings; send `aiProfile` on feature requests.
5. Treat `QUALITY` as supported legacy; map UI "Smart" → `SMART`.
6. Never put API keys in React `.env` or request bodies.
