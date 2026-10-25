# TRON AI deployment pack

Self-hosted deployment on the existing Ubuntu core server (Nginx + Cloudflare Tunnel + Docker).

| Path | Purpose |
|------|---------|
| `compose.prod.yml` | Backend + Gotenberg only (no MySQL/Ollama) |
| `.env.example` | Server env template → `/etc/tron-ai/tron-ai.env` |
| `nginx/tron-ai.conf` | New Nginx site: SPA + `/api` proxy |
| `scripts/` | Inspect, prepare, deploy, rollback, health |
| `cloudflare/ingress.example.yml` | Tunnel hostname fragment |
| `ubuntu/` | Legacy systemd/JAR notes + backups/AI node docs |

Primary path: **GHCR image + Compose + Nginx static frontend**.

Owner guide: `../TRON_UBUNTU_SERVER_DEPLOYMENT_GUIDE.md`
