# TRON AI — Ubuntu Production Deployment Guide

**Target:** Ubuntu 24.04.5 LTS core (`traonai.tech` / `api.traonai.tech`)  
**Stack:** isolated Docker Compose (`tron-ai`) = Spring Boot + MySQL + Gotenberg  
**Status:** Manual deploy only. Do not change existing services, DNS, or Cloudflare until you review this pack.

Existing host apps **must remain untouched**:

| Service | Port |
|---------|------|
| `nijotours.service` | 8080 |
| `techtitans.service` | 8081 |
| `ttcomputers.service` | 8082 |

TRON AI binds **`127.0.0.1:18080` only**. MySQL and Gotenberg have **no host ports**.

---

## 1. Obtain the latest repository

On the Ubuntu server (or a staging clone you sync to `/opt/tron-ai`):

```bash
sudo mkdir -p /opt/tron-ai
sudo chown "$USER":"$USER" /opt/tron-ai
cd /opt/tron-ai
git clone https://github.com/tron-ai-team/terafes_07.git repo
cd repo
git fetch origin
git checkout feature/production-docker-modernization   # or the branch you were given
git pull --ff-only
```

Copy deploy assets into the runtime layout (without touching other projects):

```bash
mkdir -p /opt/tron-ai/deploy /opt/tron-ai/releases /var/www/tron-ai
rsync -a deploy/ /opt/tron-ai/deploy/
sudo mkdir -p /etc/tron-ai
sudo chmod 750 /etc/tron-ai
```

---

## 2. Configure production environment variables

```bash
sudo cp /opt/tron-ai/deploy/.env.example /etc/tron-ai/tron-ai.env
sudo chmod 640 /etc/tron-ai/tron-ai.env
sudo nano /etc/tron-ai/tron-ai.env
```

**Required before first start:**

| Variable | Notes |
|----------|--------|
| `DB_USERNAME` / `DB_PASSWORD` | App DB user for the Compose MySQL |
| `MYSQL_ROOT_PASSWORD` | Root password for the Compose MySQL only |
| `JWT_SECRET` | ≥ 32 chars; not the development marker |
| `CORS_ALLOWED_ORIGINS` | e.g. `https://traonai.tech,https://api.traonai.tech` |
| `TRON_FRONTEND_URL` | `https://traonai.tech` |
| `TRON_PUBLIC_API_URL` | `https://api.traonai.tech` |
| `TRON_BACKEND_IMAGE` | GHCR tag from CI publish |

Generate secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 24      # DB passwords
```

Do **not** put real secrets in git. Do **not** reuse host MySQL credentials for other apps.

---

## 3. Authenticate with GHCR

```bash
# Prefer a read-only PAT / fine-grained token with packages:read
echo "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_PULL_USER" --password-stdin
```

Package visibility may need org permission for `tron-ai-team/terafes_07`.

---

## 4. Pull production Docker images

```bash
cd /opt/tron-ai/deploy
source /dev/null
export $(grep -v '^#' /etc/tron-ai/tron-ai.env | xargs -d '\n')   # or use --env-file below
docker compose --project-name tron-ai --env-file /etc/tron-ai/tron-ai.env -f compose.prod.yml pull
```

Validate config without starting:

```bash
docker compose --project-name tron-ai --env-file /etc/tron-ai/tron-ai.env -f compose.prod.yml config >/tmp/tron-ai.compose.rendered.yml
```

---

## 5. Start the isolated TRON AI stack

```bash
docker compose --project-name tron-ai --env-file /etc/tron-ai/tron-ai.env -f compose.prod.yml up -d
docker ps --filter name=tron-ai
```

Expected containers:

- `tron-ai-mysql` — no published ports
- `tron-ai-gotenberg` — no published ports
- `tron-ai-backend` — `127.0.0.1:18080->8080/tcp`

Confirm other apps still listen on 8080–8082:

```bash
ss -lntp | grep -E ':808[0-2]\s'
```

---

## 6. Logs and health endpoints

```bash
docker logs tron-ai-backend --tail 200
docker logs tron-ai-mysql --tail 100
docker logs tron-ai-gotenberg --tail 50

curl -fsS http://127.0.0.1:18080/actuator/health
curl -fsS http://127.0.0.1:18080/health
```

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Deploy gate / container liveness (DB) |
| `/health` | Diagnostic JSON; may show `degraded` until AI node / cloud keys |

---

## 7. Verify database persistence

```bash
docker volume inspect tron_ai_mysql_data
docker exec -it tron-ai-mysql mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -e "SHOW TABLES FROM tron_ai;"
```

Flyway runs on backend start (`V1`…`V21`). Never delete `tron_ai_mysql_data`. Never run `docker system prune` / volume prune on this host as a habit.

---

## 8. Test Gotenberg

```bash
docker exec tron-ai-gotenberg curl -fsS http://127.0.0.1:3000/health
# From backend network:
docker exec tron-ai-backend wget -qO- http://gotenberg:3000/health
```

Gotenberg must stay off the public internet (no host port mapping).

---

## 9. Test authentication and backend APIs

```bash
# Providers (public)
curl -fsS http://127.0.0.1:18080/api/v1/auth/providers

# Register / login (adjust JSON as needed)
curl -fsS -X POST http://127.0.0.1:18080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ops-test@example.com","password":"ChangeMe-Strong-1","displayName":"Ops"}'

curl -fsS -X POST http://127.0.0.1:18080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -c /tmp/tron-cookies.txt \
  -d '{"email":"ops-test@example.com","password":"ChangeMe-Strong-1"}'

curl -fsS http://127.0.0.1:18080/api/v1/auth/me -b /tmp/tron-cookies.txt
```

Do not disable Spring Security to “make deploy work”.

---

## 10. Backups and rollback

**Backup MySQL volume (example):**

```bash
STAMP=$(date +%Y%m%d%H%M%S)
mkdir -p /opt/tron-ai/backups
docker exec tron-ai-mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases \
  | gzip > "/opt/tron-ai/backups/tron-ai-mysql-${STAMP}.sql.gz"
```

**Image rollback (DB unchanged):**

```bash
/opt/tron-ai/deploy/scripts/rollback-release.sh ghcr.io/tron-ai-team/terafes_07/tron-ai-backend:sha-PREVIOUS
```

Or use `deploy-release.sh` with a known-good tag. Rollback does **not** reverse Flyway.

---

## 11. Prepare Nginx and Cloudflare (do not apply yet)

Files ready in the repo:

- `deploy/nginx/tron-ai.conf` → `traonai.tech` SPA + API proxy to `127.0.0.1:18080`
- `deploy/ubuntu/nginx/tron-ai-api.conf` → `api.traonai.tech` API-only
- `deploy/cloudflare/ingress.example.yml` → tunnel hostname fragments

When approved:

```bash
sudo cp /opt/tron-ai/deploy/nginx/tron-ai.conf /etc/nginx/sites-available/tron-ai.conf
# optionally also api-only site
sudo nginx -t   # inspect only first; enable symlink when ready
```

Merge Cloudflare ingress hostnames without removing existing projects. **Do not** change DNS or tunnel tokens in this preparation phase.

---

## Later integrations (not in this phase)

| Dependency | Why deferred |
|------------|--------------|
| Ollama (RTX AI node) | Not required for Spring startup; `/health` may show `degraded` |
| Whisper / STT worker | Optional voice |
| VOICEVOX | Optional TTS |
| AI Gateway cloud keys | Optional quality path via Groq/etc. |
| RabbitMQ | Disabled via `TRON_RABBITMQ_ENABLED=false` |
| MinIO | Local Docker volume fallback |
| Frontend on Vercel | Self-host via Nginx first |
| Automatic GH Actions SSH deploy | Enable only after manual acceptance |

---

## Quick acceptance checklist

- [ ] Host apps on 8080–8082 still healthy
- [ ] `tron-ai-*` containers healthy
- [ ] `127.0.0.1:18080/actuator/health` → UP
- [ ] MySQL volume persists across `compose down` / `up` (without `-v`)
- [ ] Gotenberg `/health` OK inside Docker network
- [ ] Auth register/login works on loopback
- [ ] No MySQL/Gotenberg ports on `0.0.0.0`
- [ ] Secrets only in `/etc/tron-ai/tron-ai.env`
