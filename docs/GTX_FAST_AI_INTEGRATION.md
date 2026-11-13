# GTX Fast AI Integration

Dedicated **FAST → GTX Ollama → Qwen3 8B** provider for TRON AI, without changing RTX SMART or CLOUD routes.

## Mode map

| Mode | Provider | Model |
|------|----------|--------|
| SMART | RTX Ollama (`OLLAMA`) | `qwen3.5:9b-q4_K_M` (configurable) |
| FAST | GTX Ollama (`OLLAMA_GTX`) | `qwen3:8b` |
| CLOUD | Existing cloud gateway | Groq / OpenRouter / Mistral |

When `TRON_AI_GTX_FAST_MODE=true`:

- FAST uses **only** GTX. Offline GTX → FAST unavailable.
- No silent fallback to RTX or paid CLOUD for FAST.
- SMART continues exclusively to RTX when `TRON_AI_RTX_SMART_MODE=true`.
- CLOUD is unchanged.

When the GTX flag is **false**, prior behavior is preserved (FAST unavailable under RTX exhibition mode; legacy FAST cloud/Ollama path when RTX smart mode is also off).

## Environment variables

```dotenv
# GTX Tailscale Serve (Ollama remains bound to localhost on the GTX host)
GTX_OLLAMA_BASE_URL=https://thushan-ai.tail63f4de.ts.net
GTX_OLLAMA_CONNECT_IP=100.109.33.81
GTX_OLLAMA_TLS_SERVER_NAME=thushan-ai.tail63f4de.ts.net
GTX_OLLAMA_OVERRIDE_HOST=localhost:11434
TRON_AI_GTX_FAST_MODEL=qwen3:8b
TRON_AI_GTX_FAST_MODE=false

# RTX SMART (unchanged — do not reuse these for GTX)
OLLAMA_BASE_URL=https://<rtx-magicdns>
OLLAMA_CONNECT_IP=100.95.30.39
OLLAMA_TLS_SERVER_NAME=<rtx-magicdns>
OLLAMA_OVERRIDE_HOST=localhost:11434
TRON_AI_RTX_SMART_MODE=true
TRON_AI_RTX_SMART_MODEL=qwen3.5:9b-q4_K_M
```

TLS certificate verification stays enabled. `CONNECT_IP` only pins DNS for Docker/MagicDNS; `OVERRIDE_HOST` sends `Host: localhost:11434` because Ollama rejects the Serve hostname.

## Compose

`deploy/compose.prod.yml` passes the GTX env vars into the backend and adds an `extra_hosts` entry for GTX MagicDNS, separate from the RTX entry.

## API

`GET /api/v1/ai/modes` reports:

- `fastAvailable` from **GTX** health (not RTX) when GTX Fast Mode is enabled
- `fastProvider` / `fastModelId` metadata
- `gtxFastModeEnabled`

## Security

- Keep GTX Ollama on `127.0.0.1:11434` only
- Expose via Tailscale Serve HTTPS only
- Never publish `11434` publicly
- Never commit production `.env` secrets
- Respect Tailscale ACLs

## Safe rollout

1. Deploy code with `TRON_AI_GTX_FAST_MODE=false` (default).
2. Set GTX connection env vars on the Ubuntu backend host only.
3. Verify Tailscale Serve: `https://thushan-ai.tail63f4de.ts.net/api/tags`.
4. Flip `TRON_AI_GTX_FAST_MODE=true` via the protected CI/CD env update (owner approval).
5. Confirm `GET /api/v1/ai/modes` shows `fastAvailable: true` and `fastProvider: OLLAMA_GTX`.
6. Spot-check Chat FAST, SMART (RTX), and CLOUD.

## Rollback

1. Set `TRON_AI_GTX_FAST_MODE=false` (or unset).
2. Redeploy / restart backend via normal CI/CD only.
3. FAST returns to previous unavailable / legacy behavior; SMART and CLOUD remain unchanged.

Do **not** edit production `.env` from developer workstations without owner approval. Do **not** merge or deploy without owner approval.
