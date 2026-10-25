# TRON AI — Ubuntu Core Server Deployment Guide

> Integration update (2026-10-26): staging and production deployment workflows are manual-only.
> Pushes and PRs run CI only. Do not enable automatic deploys, merge, or deploy until owner approval
> and server verification. Earlier automatic-deployment descriptions below are future-state notes.
> The existing repository is https://github.com/tron-ai-team/terafes_07; do not create a replacement.

**Audience:** Owner performing the first self-hosted deployment.  
**Date prepared:** 2026-10-25  
**Status:** Repository preparation complete. Server steps are **BLOCKED** until you run them on the real Ubuntu machine.

Replace every `YOUR_DOMAIN.tech`, `OWNER/REPO`, `AI_NODE_PRIVATE_IP`, and password placeholder with real values. **Do not invent a domain name.**

---

## Architecture (target)

```text
Internet → Cloudflare DNS → Cloudflare Tunnel → existing Nginx
  → /var/www/tron-ai (React static)
  → 127.0.0.1:18080 (Spring Boot container)
       → host MySQL schema tron_ai
       → docker network → Gotenberg
       → private LAN → RTX 4060 Ollama
```

**Do not** break the three existing Spring Boot projects. Add TRON AI beside them.

---

## Prerequisites checklist

| Item | Where |
|------|--------|
| Ubuntu core server with Docker + Nginx + Cloudflare Tunnel | Server |
| Admin laptop with SSH | Laptop |
| GitHub repository for this project | GitHub |
| Purchased `.tech` domain (when ready) | Cloudflare |
| Private IP of RTX 4060 AI node | LAN |

---

## STEP 1 — Inspect existing Ubuntu server

**Where:** Ubuntu (SSH from admin laptop)

```bash
ssh YOUR_ADMIN_USER@YOUR_UBUNTU_HOST
```

Copy deploy scripts to the server once the repo is available, or run commands manually:

```bash
# If repo already cloned:
bash /path/to/Group7/deploy/scripts/inspect-server.sh | tee ~/tron-inspect-$(date +%Y%m%d).txt
```

Or without the script:

```bash
hostnamectl
nproc
free -h
df -h /
sudo ss -tulpn
docker ps
docker network ls
ls -la /etc/nginx/sites-enabled/
systemctl list-units --type=service --state=running | head -n 80
```

**Expected:** Output lists CPU, RAM, free disk, listening ports, existing containers, Nginx sites.

**Verify:** Save the inspection file on the admin laptop.

**Common errors:** SSH permission denied → fix keys/`authorized_keys`. `docker` permission denied → add user to `docker` group and re-login.

**Recovery:** Read-only step; no recovery needed.

---

## STEP 2 — Verify CPU, RAM, SSD, services, and ports

**Where:** Ubuntu

```bash
free -h
df -h /
sudo ss -tulpn | grep -E ':80|:443|:3306|:8080|:8081|:8082|:18080|:3000|:11434' || true
docker stats --no-stream
```

**Expected:** Enough free RAM that allocating ~2.3GB to TRON (backend ~1.2GB + Gotenberg ~1GB) still leaves headroom for the three existing apps. Prefer leaving **≥2–3GB** free system-wide under load.

**Default TRON ports (change if busy):**

| Service | Bind | Notes |
|---------|------|--------|
| Spring Boot | `127.0.0.1:18080` | Avoids common `:8080` collisions |
| Gotenberg | Docker network only | Not published on host |
| Nginx | existing `:80` | New `server_name` only |

**Verify:** Confirm `18080` is free. If not, pick another free high port and set `TRON_BACKEND_HOST_PORT`.

**Common errors:** Port already in use → choose another host port; update Nginx upstream.

**Recovery:** Do not stop other projects’ containers to “free” ports unless you own that decision.

---

## STEP 3 — Back up existing server configuration

**Where:** Ubuntu

```bash
STAMP=$(date +%Y%m%d%H%M%S)
mkdir -p ~/server-backups/$STAMP
sudo tar -czf ~/server-backups/$STAMP/nginx.tar.gz -C / etc/nginx
sudo cp -a /etc/cloudflared ~/server-backups/$STAMP/cloudflared 2>/dev/null || true
docker ps -a > ~/server-backups/$STAMP/docker-ps.txt
sudo ss -tulpn > ~/server-backups/$STAMP/ss.txt
# Optional: dump OTHER databases only if you have a known backup policy.
# Do NOT drop or rewrite existing MySQL data.
```

**Expected:** Backup directory with Nginx and process snapshots.

**Verify:** `ls -la ~/server-backups/$STAMP`

**Common errors:** Permission denied → use `sudo`.

**Recovery:** Keep backups on the admin laptop too (`scp -r`).

---

## STEP 4 — Prepare deployment directories

**Where:** Ubuntu

```bash
# After cloning or copying the deploy/ folder:
sudo bash /opt/tron-ai/src/deploy/scripts/prepare-dirs.sh
# Or manually:
sudo mkdir -p /opt/tron-ai/deploy /opt/tron-ai/releases /var/www/tron-ai /var/lib/tron-ai/backups /etc/tron-ai
sudo chmod 750 /opt/tron-ai /var/lib/tron-ai /etc/tron-ai
```

Copy compose + scripts from the repository:

```bash
# Example if you cloned to /opt/tron-ai/src
sudo rsync -a /opt/tron-ai/src/deploy/ /opt/tron-ai/deploy/
sudo chmod +x /opt/tron-ai/deploy/scripts/*.sh
```

**Expected:** `/opt/tron-ai/deploy/compose.prod.yml` exists.

**Verify:** `ls -la /opt/tron-ai/deploy`

**Common errors:** Path typos → re-run `rsync`.

**Recovery:** Directories are empty; safe to recreate.

---

## STEP 5 — Configure Docker and required services

**Where:** Ubuntu

```bash
docker version
docker compose version
```

Login to GHCR (after GitHub package exists — see STEP 11):

```bash
echo "$GHCR_PULL_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

**Expected:** Docker Engine already present (per your infrastructure). Compose v2 available.

**Verify:** `docker info | head`

**Common errors:** Cannot connect to Docker daemon → start Docker service: `sudo systemctl start docker`.

**Recovery:** Do not reinstall Docker if other projects depend on the current install; fix the service first.

**Do not** install Ollama models on this Ubuntu core server.

---

## STEP 6 — Configure Spring Boot production environment

**Where:** Ubuntu

```bash
sudo cp /opt/tron-ai/deploy/.env.example /etc/tron-ai/tron-ai.env
sudo chmod 640 /etc/tron-ai/tron-ai.env
sudo nano /etc/tron-ai/tron-ai.env
```

Set at minimum:

- `DB_*` passwords
- `JWT_SECRET` (≥32 random characters)
- `TRON_FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` / `TRON_PUBLIC_API_URL` → `https://YOUR_DOMAIN.tech`
- `OLLAMA_BASE_URL` → AI node private IP
- `TRON_BACKEND_IMAGE` → GHCR image (after first push)
- If no RabbitMQ: uncomment `SPRING_AUTOCONFIGURE_EXCLUDE=...RabbitAutoConfiguration`

**Expected:** File mode `640`, no secrets in git.

**Verify:** `sudo ls -l /etc/tron-ai/tron-ai.env` and confirm placeholders are gone.

**Common errors:** App fails on missing `JWT_SECRET` → generate one: `openssl rand -base64 48`

**Recovery:** Edit env and recreate containers (STEP 13); MySQL data remains.

---

## STEP 7 — Configure MySQL database and permissions

**Where:** Ubuntu (existing MySQL)

1. Edit password in `/opt/tron-ai/deploy/scripts/mysql-init-tron.sql`.
2. Run as MySQL admin:

```bash
sudo mysql < /opt/tron-ai/deploy/scripts/mysql-init-tron.sql
```

3. Test:

```bash
mysql -u tronai -p -h 127.0.0.1 -e "SHOW DATABASES LIKE 'tron_ai';"
```

**Expected:** Database `tron_ai` exists; user `tronai` can connect. **Other databases untouched.**

**Verify:** `SHOW GRANTS FOR 'tronai'@'%';`

**Common errors:** Access denied for `tronai` from Docker → ensure user `'tronai'@'%'` exists (script creates it). Host MySQL must listen for Docker bridge / `host.docker.internal` as appropriate.

**Recovery:** `DROP USER` / recreate only the `tronai` user and `tron_ai` database — never other schemas.

Flyway runs on Spring startup (forward-compatible). **Do not** manually rollback migrations to “undeploy.”

---

## STEP 8 — Configure Gotenberg

Gotenberg is defined in `deploy/compose.prod.yml`:

- Image `gotenberg/gotenberg:8`
- Chromium routes disabled
- Queue size limited
- **No host port publish** — only `http://gotenberg:3000` on `tron_ai_internal`

**Where:** Ubuntu (after compose up in STEP 13)

```bash
docker exec tron-ai-gotenberg curl -fsS http://127.0.0.1:3000/health
```

**Expected:** JSON health with LibreOffice up.

**Verify:** Backend env `GOTENBERG_URL=http://gotenberg:3000` (compose sets this).

**Common errors:** PDF conversion timeout → check `docker logs tron-ai-gotenberg`; raise timeouts only if RAM allows.

**Recovery:** `docker compose ... restart gotenberg` — does not affect MySQL.

---

## STEP 9 — Configure React production build and Nginx

### Build (CI preferred)

GitHub Actions builds with empty `VITE_CORE_API_URL` (same-origin). Manual build on Windows:

```powershell
cd C:\Users\engrm\OneDrive\Desktop\Group7\frontend
$env:VITE_CORE_API_URL=""
$env:VITE_LEGACY_API_URL=""
npm install
npm run build
```

### Nginx (Ubuntu)

```bash
sudo cp /opt/tron-ai/deploy/nginx/tron-ai.conf /etc/nginx/sites-available/tron-ai.conf
sudo nano /etc/nginx/sites-available/tron-ai.conf   # set server_name YOUR_DOMAIN.tech; upstream port if changed
sudo ln -sfn /etc/nginx/sites-available/tron-ai.conf /etc/nginx/sites-enabled/tron-ai.conf
sudo nginx -t
sudo systemctl reload nginx
```

**Expected:** `nginx -t` succeeds. Existing sites in `sites-enabled` remain.

**Verify:** `ls /etc/nginx/sites-enabled/` still shows the three existing projects plus `tron-ai.conf`.

**Common errors:** `nginx -t` fails → fix syntax; do not `systemctl restart nginx` until test passes if you prefer reload-only. Conflicting `server_name` → use unique hostname.

**Recovery:** `sudo rm /etc/nginx/sites-enabled/tron-ai.conf && sudo nginx -t && sudo systemctl reload nginx` removes only TRON’s site link.

---

## STEP 10 — Configure Cloudflare Tunnel and `.tech` domain

**Where:** Cloudflare Zero Trust dashboard + Ubuntu

1. Add the purchased domain to Cloudflare (owner action).
2. Open the **existing** tunnel used by the three projects.
3. Add public hostname `YOUR_DOMAIN.tech` → `http://127.0.0.1:80`.
4. Do **not** remove existing hostnames.
5. DNS: proxied CNAME/alias as shown by the Cloudflare tunnel UI for your account.

Example fragment only: `deploy/cloudflare/ingress.example.yml`.

If tunnel is file-managed:

```bash
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.$(date +%Y%m%d)
sudo nano /etc/cloudflared/config.yml   # add hostname entry; keep catch-all last
sudo systemctl restart cloudflared     # only if that is how this server runs the tunnel
```

**Expected:** HTTPS works at the domain; other project domains still work.

**Verify:**

```bash
curl -fsSI https://YOUR_DOMAIN.tech/
curl -fsSI https://EXISTING_PROJECT_DOMAIN/   # still OK
```

**Common errors:** 502 → Nginx/upstream down; 404 tunnel catch-all → hostname missing from ingress.

**Recovery:** Restore `config.yml.bak.*` and restart cloudflared.

OAuth: set Google redirect to `https://YOUR_DOMAIN.tech/login/oauth2/code/google`.

---

## STEP 11 — Configure GitHub repository secrets and GHCR access

**Where:** GitHub → Repo → Settings

### Create environments

- `staging` (optional reviewers)
- `production` (**required reviewers** recommended)

### Secrets

| Secret | Used by |
|--------|---------|
| `STAGING_HOST` / `STAGING_USER` / `STAGING_SSH_KEY` | deploy-staging |
| `STAGING_SSH_PORT` | optional, default 22 |
| `PRODUCTION_HOST` / `PRODUCTION_USER` / `PRODUCTION_SSH_KEY` | deploy-production |
| `PRODUCTION_SSH_PORT` | optional |
| `GHCR_PULL_USER` / `GHCR_PULL_TOKEN` | server `docker login` (PAT with `read:packages`) |

`GITHUB_TOKEN` pushes packages in Actions automatically (`packages: write`).

### GHCR package visibility

After first image push, set package visibility / grant the server identity read access.

**Verify:** A manual `workflow_dispatch` of CI succeeds; package appears under GitHub Packages.

**Common errors:** SSH deploy fails → wrong key or host firewall. GHCR pull denied → PAT scopes / package permissions.

**Recovery:** Rotate PAT; update secrets; do not embed tokens in the repo.

---

## STEP 12 — Configure GitHub Actions CI/CD

Workflows already in the repository:

| File | Role |
|------|------|
| `.github/workflows/ci.yml` | Frontend build, Maven tests, secret heuristic, Docker build (no push) |
| `.github/workflows/deploy-staging.yml` | `develop` → GHCR → SSH staging deploy |
| `.github/workflows/deploy-production.yml` | `main` → GHCR → SSH production deploy |

**Branch strategy:** see `docs/BRANCHING_AND_RELEASE.md`.

**Owner actions:**

1. Push this repository to GitHub (`main` + `develop`).
2. Protect `main` (PR required, status checks: CI).
3. Enable Actions.
4. After first successful staging deploy, allow automatic production deploys from `main` (Environment protection still recommended).

**Verify:** Actions tab shows green CI on a PR.

**Common errors:** `npm ci` fails without lockfile → workflows fall back to `npm install`. Maven wrapper not executable on Linux → `chmod +x mvnw` in repo if needed.

**Recovery:** Re-run failed jobs; do not force-push.

---

## STEP 13 — Deploy the current application version

### First-time server bootstrap (Ubuntu)

```bash
# Ensure env + compose present (STEPS 4–7)
cd /opt/tron-ai/deploy
# Pin image after CI published it:
sudo nano /etc/tron-ai/tron-ai.env   # TRON_BACKEND_IMAGE=ghcr.io/OWNER/REPO/tron-ai-backend:sha-...

docker pull "$TRON_BACKEND_IMAGE"   # or rely on deploy-release.sh
sudo -E bash scripts/deploy-release.sh \
  "ghcr.io/OWNER/REPO/tron-ai-backend:sha-YOURSHA" \
  /tmp/frontend-dist.tar.gz
```

Or let GitHub Actions call `deploy-release.sh` after secrets work.

**Expected:** Containers `tron-ai-backend` and `tron-ai-gotenberg` healthy; files in `/var/www/tron-ai`.

**Verify:**

```bash
bash /opt/tron-ai/deploy/scripts/healthcheck.sh
curl -fsS http://127.0.0.1:18080/health
```

**Common errors:** DB connection refused → fix `DB_HOST` / MySQL bind / user host. OOM kill → lower `JAVA_OPTS` / Gotenberg mem_limit after measuring real free RAM.

**Recovery:** `bash scripts/rollback-release.sh` (image only). MySQL not reverted.

---

## STEP 14 — Verify HTTPS, authentication, APIs, PDF generation, and persistence

**Where:** Admin laptop browser + Ubuntu curls

```bash
curl -fsSI https://YOUR_DOMAIN.tech/
curl -fsS https://YOUR_DOMAIN.tech/health
curl -fsS https://YOUR_DOMAIN.tech/api/v1/models   # may require auth depending on security config
```

Manual checks:

1. Landing page loads over HTTPS.
2. Login / Google OAuth (if configured) with production redirect URI.
3. CV upload + PDF download (Gotenberg path).
4. Restart backend container; confirm uploaded objects still present in volume `tron_ai_object_storage`.
5. Confirm MySQL, Gotenberg, Ollama, Docker socket are **not** reachable from the public internet.

**Expected:** Documented PASS/FAIL with evidence (screenshots or curl output). Until then: **SERVER VERIFIED = NO**.

**Common errors:** CORS errors → `CORS_ALLOWED_ORIGINS` must match the exact HTTPS origin. Cookies not set → `COOKIE_SECURE=true` requires HTTPS.

**Recovery:** Fix env; recreate backend container; no DB drop.

---

## STEP 15 — Demonstrate a subsequent automatic deployment

1. Merge a small approved change to `main` (after CI green).
2. Watch **Deploy production** workflow.
3. Confirm new `sha-********` image on server:

```bash
cat /opt/tron-ai/releases/CURRENT
docker inspect tron-ai-backend --format '{{.Config.Image}}'
curl -fsS http://127.0.0.1:18080/health
```

**Expected:** New image tag without manual jar copy.

**Status until demonstrated:** **CI/CD VERIFIED = NO**.

---

## STEP 16 — Demonstrate rollback and recovery

**Where:** Ubuntu

```bash
# Application image rollback (no DB rollback)
bash /opt/tron-ai/deploy/scripts/rollback-release.sh
# Or explicit:
bash /opt/tron-ai/deploy/scripts/rollback-release.sh ghcr.io/OWNER/REPO/tron-ai-backend:sha-PREVIOUS
```

MySQL backup / restore (separate):

```bash
bash /opt/tron-ai/deploy/ubuntu/scripts/backup-core.sh
# Restore only into tron_ai if needed — never other databases.
```

**Expected:** Previous image healthy; Flyway history unchanged unless you intentionally restore a dump.

**Verify:** `/health` OK; `CURRENT` file points to previous image.

**Common errors:** No `PREV_IMAGE` recorded → pass explicit tag.

**Recovery:** Redeploy last known good GHCR digest from GitHub Packages UI.

---

## STEP 17 — Configure monitoring and log access

**Where:** Ubuntu / admin laptop

```bash
docker logs -f --tail 200 tron-ai-backend
docker logs -f --tail 100 tron-ai-gotenberg
sudo journalctl -u nginx -f
sudo journalctl -u cloudflared -f   # if applicable
docker stats tron-ai-backend tron-ai-gotenberg
```

Log rotation: Compose `json-file` max-size/max-file is set; Nginx uses system logrotate.

Optional: install your preferred metrics agent on the **admin laptop** or existing monitoring stack — do not overload the 16GB core with heavy APM unless measured.

**Verify:** You can retrieve last 24h of backend logs.

---

## STEP 18 — Normal operation, updates, and maintenance

| Task | Command / action |
|------|------------------|
| App update | Merge to `main` → Actions deploy |
| Manual deploy | `deploy-release.sh <image> <frontend.tgz>` |
| Rollback app | `rollback-release.sh` |
| DB backup | `ubuntu/scripts/backup-core.sh` |
| Inspect resources | `free -h; docker stats --no-stream` |
| Feature work | Continue on `develop`; freeze tags for releases |

**Protected beta:** Keep Cloudflare Access / Zero Trust policy on `YOUR_DOMAIN.tech` until unfinished features are gated.

**Never:**

- Delete unrelated Docker volumes/containers
- Reset host MySQL
- Publish Gotenberg/MySQL/Ollama ports publicly
- Run large Ollama models on the core server
- Commit secrets

---

## Placeholder index

| Placeholder | Replace with |
|-------------|--------------|
| `YOUR_DOMAIN.tech` | Purchased domain |
| `YOUR_UBUNTU_HOST` | Server LAN/VPN IP or SSH host |
| `YOUR_ADMIN_USER` | SSH user |
| `OWNER/REPO` | GitHub `owner/name` (lowercase for GHCR) |
| `AI_NODE_PRIVATE_IP` | RTX 4060 LAN IP |
| `REPLACE_WITH_STRONG_PASSWORD` | Generated DB password |

---

## Status legend for this guide

| Area | Status after repo prep |
|------|------------------------|
| Guide + scripts authored | CODE READY |
| Local Windows build checks | See `TRON_DEPLOYMENT_PREPARATION_REPORT.md` |
| Ubuntu inspect / deploy | **BLOCKED** (needs owner SSH) |
| GitHub Actions live deploy | **BLOCKED** (needs remote + secrets) |
| Production HTTPS proof | **BLOCKED** |
