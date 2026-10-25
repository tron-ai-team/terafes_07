# Codex — Ubuntu Server Start Here (TRON AI)

You are running **directly on the Ubuntu production server**.  
Windows Cursor prepared this USB package and **must not** push or authenticate to GitHub from that PC.

---

## Package contents (USB)

| Item | Purpose |
|------|---------|
| `tron-ai-ubuntu-handoff.tar.gz` | Clean project source (no `.git`) |
| `tron-ai-ubuntu-handoff.tar.gz.sha256` | SHA-256 checksum |
| `CODEX_SERVER_START_HERE.md` | This file |
| `TRON_USB_HANDOFF_REPORT.md` | Windows verification report |

Inside the archive top-level folder `tron-ai-project/`: React, Spring Boot, deploy/, `.github/workflows/`, docs.

---

## Infrastructure (re-verify on this host)

| Claim from owner | Your first job |
|------------------|----------------|
| Ubuntu 24.04, i7 7th Gen, 16GB RAM | `hostnamectl`; `free -h`; `nproc` |
| ~69GB free SSD (earlier) | `df -h /` — use **current** free space |
| 3 existing Spring Boot apps | List ports/containers/Nginx sites — **do not stop them** |
| Docker, Nginx, Cloudflare Tunnel, MySQL | Confirm services without replacing them |
| RTX 4060 Ollama on LAN | Private IP only; **no** large models on core |

Target path:

```text
Internet → Cloudflare Tunnel → existing Nginx
  → React static (/var/www/tron-ai)
  → Spring Boot (127.0.0.1:18080 by default)
       → MySQL schema tron_ai (separate DB/user)
       → Gotenberg (Docker, private network)
       → Ollama (RTX 4060 private LAN)
```

---

## STEP A — Verify USB archive

```bash
USB_DIR="/media/$USER/USB"   # adjust mount
cd "$USB_DIR"
sha256sum -c tron-ai-ubuntu-handoff.tar.gz.sha256
```

Expect `OK`. If not, stop and re-copy.

---

## STEP B — Extract safely

```bash
sudo mkdir -p /opt/tron-ai
sudo chown "$USER:$USER" /opt/tron-ai
cd /opt/tron-ai
tar -xzf "$USB_DIR/tron-ai-ubuntu-handoff.tar.gz"
# Expect: /opt/tron-ai/tron-ai-project/...
ls -la tron-ai-project | head
test ! -d tron-ai-project/.git && echo "OK: no embedded .git"
```

Read next:

```bash
cd /opt/tron-ai/tron-ai-project
less TRON_UBUNTU_SERVER_DEPLOYMENT_GUIDE.md
less TRON_DEPLOYMENT_PREPARATION_REPORT.md
less deploy/README.md
```

---

## STEP C — GitHub as `tt25304025-dev` (Ubuntu only)

Shared repository (existing — do **not** create a new repo):

`https://github.com/tron-ai-team/terafes_07`

```bash
# 1) Authenticate YOUR account
gh auth login
gh api user --jq .login
# Must print: tt25304025-dev

# 2) Configure commit identity for THIS machine (local, not Windows)
git config --global user.name "YOUR_VERIFIED_NAME"
git config --global user.email "YOUR_VERIFIED_EMAIL@example.com"
# Email must be verified on GitHub for tt25304025-dev

git config --global --get user.name
git config --global --get user.email
```

### Clone the shared repo (preserve full history)

```bash
sudo mkdir -p /opt/tron-ai/git
sudo chown "$USER:$USER" /opt/tron-ai/git
cd /opt/tron-ai/git
gh repo clone tron-ai-team/terafes_07
cd terafes_07

git fetch --all --tags
git branch -a
git checkout main
git pull --ff-only origin main
git log --oneline -20
# Inspect recent merges from NAYEM, Rakib, and other teammates
```

**Never** force-push. **Never** rewrite history. Original authors stay on their commits.

---

## STEP D — Integrate USB source onto a new branch

```bash
cd /opt/tron-ai/git/terafes_07
git checkout main
git pull --ff-only origin main
git checkout -b integrate/windows-group7-handoff-$(date +%Y%m%d)

USB_SRC=/opt/tron-ai/tron-ai-project

# Compare before copying (examples)
diff -rq --exclude=node_modules --exclude=target --exclude=.git \
  "$USB_SRC/backend" ./backend 2>/dev/null | head -n 50 || true

# Prefer careful rsync of source trees — review deletions
rsync -a --dry-run --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'target' --exclude 'dist' \
  "$USB_SRC/" ./ | head -n 100

# After dry-run review, apply without --delete first if unsure:
rsync -a \
  --exclude '.git' --exclude 'node_modules' --exclude 'target' --exclude 'dist' \
  --exclude '.env' --exclude '*.log' \
  "$USB_SRC/" ./
```

Rules:

1. Do not silently overwrite teammate-only files without reading the diff.
2. Keep team history intact; your work is **new commits** on this branch.
3. Do not claim Git history proves authorship of every line — attribute the **integration commit** to `tt25304025-dev`.

```bash
git status
# Build & test (see STEP E)
git add -A
git status   # confirm no secrets staged
git commit -m "Integrate Windows Group7 TRON AI handoff for Ubuntu deployment.

Bring deploy/, GitHub Actions, Gotenberg/Docker packaging, and current
application source from the Windows USB package onto latest main.
Preserves existing team commit history; integration authored by project lead."
git push -u origin HEAD
gh pr create --base main --fill
```

Merge only after review + green CI.

---

## STEP E — Build and test on Ubuntu

```bash
cd /opt/tron-ai/git/terafes_07

# Frontend
cd frontend
npm ci || npm install
VITE_CORE_API_URL= VITE_LEGACY_API_URL= npm run build
cd ..

# Backend
cd backend/backend-spring
./mvnw -B test -Dtest='!DesktopAgentControlLiveTest,!DesktopAgentLiveE2ETest,!DesktopAgentThreadLiveTest,!GotenbergLiveConvertIT,!Mission09LiveProviderVerificationIT,!CareerCenterV1BuilderIT,!CareerCenterJourneyIT'
./mvnw -B -DskipTests package
cd ../..
```

Live Desktop Agent / Gotenberg ITs need extra local services — do not treat their absence as a packaging failure.

---

## STEP F — Inspect server before deploy

```bash
bash /opt/tron-ai/tron-ai-project/deploy/scripts/inspect-server.sh | tee ~/tron-inspect-$(date +%Y%m%d).txt
# Or from the git tree after integration:
# bash deploy/scripts/inspect-server.sh | tee ~/tron-inspect-$(date +%Y%m%d).txt

free -h
df -h /
sudo ss -tulpn
docker ps
ls /etc/nginx/sites-enabled/
```

Confirm free RAM after the three existing apps. Default TRON publish port: **127.0.0.1:18080**. Change if busy.

**Do not** stop/delete existing Spring containers, volumes, DBs, or Nginx sites.

---

## STEP G — Deploy TRON (gated)

Follow `TRON_UBUNTU_SERVER_DEPLOYMENT_GUIDE.md` STEPS 3–14.

Summary:

1. Backup Nginx + cloudflared config.
2. Prepare `/opt/tron-ai/deploy`, `/etc/tron-ai/tron-ai.env`, `/var/www/tron-ai`.
3. Create MySQL database/user **tron_ai** / **tronai** only (`deploy/scripts/mysql-init-tron.sql`).
4. Add **new** Nginx site from `deploy/nginx/tron-ai.conf`.
5. Add Cloudflare hostname for the purchased `.tech` domain → `http://127.0.0.1:80` without removing other hostnames.
6. Bring up Compose: backend + Gotenberg (`deploy/compose.prod.yml`).
7. Health checks; PDF via Gotenberg; persistence volumes.

Production GitHub Action is **manual / gated** (`ubuntu_ready=UBUNTU_READY` + `confirm=deploy-production`). Do not enable auto-deploy to production until this server path is verified.

---

## STEP H — CI/CD + rollback

1. Configure GitHub Environments + SSH/GHCR secrets under `tron-ai-team/terafes_07`.
2. Prove one successful deploy and one `deploy/scripts/rollback-release.sh` (image only — **not** DB rollback).
3. Only then consider restoring automatic `main` deploy (owner approval).

---

## Absolute bans

- Do not break the three existing Spring Boot applications.
- Do not force-push or rewrite `main` history.
- Do not expose MySQL, Gotenberg, Ollama, or Docker publicly.
- Do not run large Ollama models on the 16GB core.
- Do not deploy unfinished features without Access / beta controls.
- Do not use Windows teammate GitHub credentials for commits.

---

## Success criteria

1. `sha256sum -c` OK on USB archive.  
2. Authenticated as `tt25304025-dev`.  
3. Branch from latest `main` with full prior history preserved.  
4. PR opened; merged only after review.  
5. TRON running beside existing apps with health + PDF checks.  
6. Rollback demonstrated.
