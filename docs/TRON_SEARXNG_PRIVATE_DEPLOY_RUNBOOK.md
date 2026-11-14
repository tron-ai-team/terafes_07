# Private SearXNG — Operator Deploy Runbook (NOT installed by this mission)

**Status:** documentation + sample compose only. **Do not** apply to production without owner approval.  
**Do not** modify `deploy/compose.prod.yml`, GPU Ollama configs, or release-controller.

## Goal

Give the i7 Spring backend a private Tailnet/localhost SearXNG for FAST/SMART web grounding.

## Sample (isolated) Compose

See `deploy/searxng-private/docker-compose.yml` and `settings.yml` in this branch.

Key requirements:

1. Bind to `127.0.0.1` or private Tailnet IP only — never public `0.0.0.0` without auth/firewall.
2. Enable JSON in SearXNG settings:

```yaml
search:
  formats:
    - html
    - json
```

Without `json`, `format=json` returns **HTTP 403**.

3. CPU/memory caps (example): `cpus: 1.0`, `mem_limit: 512m`.
4. Attach SearXNG to the existing backend Docker network (`tron_ai_internal`) with DNS name `tron-searxng`.
5. Backend env (owner-approved future enablement in `/etc/tron-ai/tron-ai.env` — do not set on prod without approval):

```dotenv
TRON_WEB_SEARCH_V1_ENABLED=true
TRON_SEARCH_SEARXNG_ENABLED=true
TRON_SEARCH_SEARXNG_BASE_URL=http://tron-searxng:8080
```

Host-only validation URL remains `http://127.0.0.1:8888`. The Spring backend container must use Docker DNS `http://tron-searxng:8080`, not host loopback.

Owner-verified infrastructure (2026-11-14): container `tron-searxng-private`, network `tron_ai_internal`, backend DNS `tron-searxng`, Google CSE + Brave OK, DuckDuckGo CAPTCHA observed.

## Validation (owner-approved host)

```bash
curl -sS 'http://127.0.0.1:8888/search?q=tron&format=json' | head
```

Expect JSON with `results` array. Then enable flags on backend and retry chat `searchMode=on`.

## Rollback

1. Set `TRON_WEB_SEARCH_V1_ENABLED=false` (immediate kill switch).
2. Stop the SearXNG container.
3. Chat returns legacy unavailable stub for ON/AUTO; OFF unchanged.

## Health

Backend AI health map includes `searxng.configured` / status without querying Google or burning Serper quota.
