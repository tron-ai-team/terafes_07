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
4. Backend env (placeholders):

```dotenv
TRON_WEB_SEARCH_V1_ENABLED=true
TRON_SEARCH_SEARXNG_ENABLED=true
TRON_SEARCH_SEARXNG_BASE_URL=http://127.0.0.1:8888
```

If Spring runs in Docker, `127.0.0.1` inside the container is **not** the host. Use Docker DNS / Tailnet hostname instead.

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
