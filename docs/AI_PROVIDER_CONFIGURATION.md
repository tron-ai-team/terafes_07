# AI Provider Configuration

Centralized, backend-only configuration for TRON AI hybrid providers.

## Architecture

```text
React → Spring API → AiGateway (LLM) + WebResearchService (search/extract)
                         │                        │
              Groq / OpenRouter / … / Ollama    Tavily / Firecrawl / SafeUrlFetcher
```

LLM inference, web search, and web extraction are **separate capabilities**.

## Secret sources (priority)

1. Process / Docker / CI environment variables (always win when set)
2. Infisical Universal Auth (only if `INFISICAL_ENABLED=true` and credentials present)
3. Local secrets file (`TRON_AI_SECRETS_FILE` or `%LOCALAPPDATA%\TRON\secrets\ai-providers.env`)

Development **does not** require Infisical Cloud.

## Required cloud keys (when you create accounts)

| Variable | Provider | Purpose |
|---|---|---|
| `GROQ_API_KEY` | GroqCloud | Chat LLM, Whisper STT (`whisper-large-v3-turbo`), English Orpheus TTS |
| `STT_GROQ_MODEL` | Groq Whisper | Default `whisper-large-v3-turbo` (JA/EN multilingual) |
| `TTS_GROQ_MODEL_ENGLISH` | Groq Orpheus | English TTS only — **not Japanese** (use VOICEVOX or browser fallback for JA) |
| `TAVILY_API_KEY` | Tavily | Public company / recruitment search |
| `FIRECRAWL_API_KEY` | Firecrawl | Public page extraction |

Optional existing keys (preserved): `OPENROUTER_API_KEY_1/2`, `MISTRAL_API_KEY`, `GEMINI_API_KEY_1..4`, `CLOUDFLARE_*`, Google OAuth, JWT, MySQL, Gotenberg.

## Model IDs (configurable without Java edits)

```dotenv
GROQ_MODEL_FAST=openai/gpt-oss-20b
GROQ_MODEL_SMART=openai/gpt-oss-120b
TRON_AI_PREFER_GROQ_SMART=true
```

Defaults use documented Groq IDs. Change via env if your account exposes different models.

## Privacy

| Flag | Default | Meaning |
|---|---|---|
| `TRON_AI_CV_CLOUD_ENABLED` | `false` | CV assist stays local unless request sets `allowCloud: true` |
| `TRON_AI_COMPANY_CLOUD_ENABLED` | `true` | Public-source company synthesis may use cloud |
| `TRON_AI_INTERVIEW_CLOUD_ENABLED` | `true` | Interview may use cloud (existing gateway path) |

CV assist never silently overwrites drafts — pending / accept / reject unchanged.

## Infisical (future staging/production)

Create project **TRON-AI** with environments `development`, `staging`, `production`.

```dotenv
INFISICAL_ENABLED=false
INFISICAL_SITE_URL=https://app.infisical.com
INFISICAL_CLIENT_ID=
INFISICAL_CLIENT_SECRET=
INFISICAL_PROJECT_ID=
INFISICAL_ENV=development
INFISICAL_SECRET_PATH=/
```

Store the same key **names** as env vars. Enable only after credentials exist.

## Health (no secrets)

```http
GET /api/v1/ai/providers
```

Returns LLM provider health, `researchTools` (Tavily/Firecrawl/SafeFetcher), privacy flags, and Infisical status.

## Local file example

`%LOCALAPPDATA%\TRON\secrets\ai-providers.env`:

```dotenv
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
```

Restart Spring after changing keys (`START_TRON.cmd` or restart Spring Core only).

## Job Finder

Unchanged: **Mynavi + CareerMap only**. Tavily/Firecrawl are **not** used to invent job listings.
