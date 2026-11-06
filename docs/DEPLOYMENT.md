# TRON AI — Ubuntu Deployment Requirements

**Updated:** 2026-11-06  
**Status:** Preparation only — **do not deploy** until owner authorizes the next mission.  
**Preferred path:** GHCR image + `deploy/compose.prod.yml` + existing Nginx + Cloudflare Tunnel.

Domain name: use the owner’s purchased `.tech` domain. Placeholders in config use `YOUR_DOMAIN.tech`. Prior AI-node notes referenced a candidate hostname in private docs; **confirm the live domain with the owner before configuring OAuth/Cloudflare.**

## Coexistence rules

The Ubuntu core already hosts **three other Spring Boot apps**. TRON must:

- Use a **new** Nginx site (`deploy/nginx/tron-ai.conf`) — never overwrite other vhosts
- Bind backend host port to **loopback only** (`127.0.0.1:18080` by default)
- Use a **dedicated MySQL schema/user** (`deploy/scripts/mysql-init-tron.sql` → `tron_ai` / `tronai`)
- Keep Gotenberg **off** the public network (Compose internal only)
- Cap RAM: backend ≈1280m, Gotenberg ≈1024m, JVM `-Xmx768m`
- Not run Ollama models on the core; call the Windows AI node privately

## Services

| Component | How | Public? |
|---|---|---|
| React SPA | Static files under `/var/www/tron-ai` | Via Nginx/Cloudflare |
| Spring backend | Docker `tron-ai-backend` | Only via Nginx → 127.0.0.1:18080 |
| Gotenberg 8 | Docker `tron-ai-gotenberg` | No host ports |
| MySQL | Existing host instance | No public expose |
| Ollama | Windows AI node LAN | Private LAN only |
| STT / VOICEVOX | Optional on AI node | Private LAN only |
| Desktop Agent | Windows clients only | Not on Ubuntu |

## AI node (documented LAN evidence)

From prior verified setup (re-verify at deploy time):

| Role | Documented value |
|---|---|
| AI node (RTX 4060) | `192.168.0.21:11434`, model `qwen3:8b` |
| Ubuntu core candidates | `192.168.0.10` (firewall allow in last AI-node report) and twin `192.168.0.24` |
| Env | `OLLAMA_BASE_URL=http://192.168.0.21:11434`, `OLLAMA_MODEL=qwen3:8b` |

Windows Firewall was narrowed to allow TCP 11434 from the Ubuntu core IP only. Confirm which Ubuntu IP is the TRON core before go-live; extend the allow rule if needed.

## Essential vs optional for first beta

**Essential**

- MySQL schema + Flyway
- JWT secret + CORS + frontend/public URLs
- Docker Compose backend + Gotenberg
- Nginx site + Cloudflare hostname
- At least one working LLM path (Groq cloud **or** reachable Ollama)

**Strongly recommended**

- Google OAuth production redirect URIs
- `GROQ_API_KEY` (Career AI quality)
- `TAVILY_API_KEY` / `FIRECRAWL_API_KEY` (Company Advisor research)

**Optional / disable safely for beta**

- RabbitMQ (exclude auto-config if unused)
- MinIO (local volume fallback)
- STT / VOICEVOX (voice limited)
- Desktop Agent for public users (**disable messaging as fully working**)
- OpenRouter / Mistral / Gemini extras if Groq or Ollama works

## Env files (names only)

Copy `deploy/.env.example` → `/etc/tron-ai/tron-ai.env` (`chmod 640`).  
Key groups: `DB_*`, `JWT_*`, `GOOGLE_*`, `CORS_*`, `TRON_FRONTEND_URL`, `TRON_PUBLIC_API_URL`, `OLLAMA_*`, `GOTENBERG_URL` (Compose override), `GROQ_*`, `TAVILY_*`, `FIRECRAWL_*`, privacy flags `TRON_AI_*_CLOUD_ENABLED`.

Never commit filled env files. Frontend production build uses empty `VITE_CORE_API_URL` for same-origin Nginx.

## Deploy scripts (already in tree)

| Script | Purpose |
|---|---|
| `deploy/scripts/inspect-server.sh` | Read-only capacity/port inspect |
| `deploy/scripts/prepare-dirs.sh` | `/opt/tron-ai` layout |
| `deploy/scripts/mysql-init-tron.sql` | Schema + user |
| `deploy/scripts/deploy-release.sh` | Pull image, frontend sync, health, rollback hook |
| `deploy/scripts/rollback-release.sh` | Previous image only (not DB) |
| `deploy/scripts/healthcheck.sh` | Post-deploy checks |

## CI/CD (prepared, not verified end-to-end)

| Workflow | Trigger | Role |
|---|---|---|
| `.github/workflows/ci.yml` | Auto on PR/push `main`/`develop` | FE build, hermetic Maven tests, Docker build (**no** push) |
| `deploy-staging.yml` | **`workflow_dispatch` only** (`confirm=deploy-staging`) | CI gate → GHCR `:staging` → SSH `deploy-release.sh` |
| `deploy-production.yml` | **`workflow_dispatch` only** (`confirm=deploy-production` + `ubuntu_ready=UBUNTU_READY`) | GHCR `:production`/`:latest` → SSH + healthcheck |

Automatic push-to-`develop` / `main` deploys are **disabled** in the workflow files.

**Blocker:** this Windows tree currently has **no project `.git`**. CI cannot run until a GitHub remote is linked and code is committed/pushed with owner approval.

## Resource estimate (additional on 16 GB core)

| Item | Cap / estimate |
|---|---|
| Backend container | ≤ ~1.3 GB |
| Gotenberg | ≤ ~1.0 GB |
| Frontend static | negligible |
| MySQL incremental | small (shared host) |
| Free RAM reserve | keep ≥ 2–3 GB system-wide |

Re-measure with `free -h` / `docker stats` on the live server; do not trust historical free-RAM figures.
