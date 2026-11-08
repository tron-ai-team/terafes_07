# TRON AI deployment pack

Self-hosted deployment on the existing Ubuntu core server (Nginx + Cloudflare Tunnel + Docker).

| Path | Purpose |
|------|---------|
| `compose.prod.yml` | Isolated stack: backend + dedicated MySQL + Gotenberg |
| `.env.example` | Server env template → `/etc/tron-ai/tron-ai.env` |
| `nginx/tron-ai.conf` | New Nginx site: SPA + `/api` proxy (`traonai.tech`) |
| `scripts/` | Inspect, prepare, deploy, rollback, health |
| `cloudflare/ingress.example.yml` | Tunnel hostname fragment |
| `ubuntu/` | Legacy systemd/JAR notes + backups/AI node docs |

Primary path: **GHCR image + Compose project `tron-ai` + Nginx static frontend**.

Owner guide: [`../docs/UBUNTU_PRODUCTION_DEPLOYMENT.md`](../docs/UBUNTU_PRODUCTION_DEPLOYMENT.md)  
Legacy notes: [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)
