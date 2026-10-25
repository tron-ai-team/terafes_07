# TRON AI — Deployment Preparation Report

> Release-safety update: deployment CLI, paths and release contracts below are historical. Follow [deploy/README.md](deploy/README.md) for the reviewed digest-bound paired-release protocol. Do not execute the legacy image-tag/rsync commands.

> Integration update (2026-10-26): staging and production deployment workflows are manual-only.
> Pushes and PRs run CI only. Do not enable automatic deploys, merge, or deploy until owner approval
> and server verification. Earlier automatic-deployment descriptions below are future-state notes.
> The existing repository is https://github.com/tron-ai-team/terafes_07; do not create a replacement.

**Date:** 2026-10-25  
**Scope:** Self-hosted Ubuntu deployment prep + GitHub Actions / GHCR CI/CD  
**Commit/push/deploy to Ubuntu:** Not performed (owner authorization required)

---

## Overall readiness

| Gate | Status |
|------|--------|
| CODE READY | **YES** — deploy pack, Dockerfiles, workflows, guides |
| BUILD VERIFIED | **PARTIAL** — frontend production build PASS; Spring package PASS; hermetic Maven tests PASS (247); Docker image build **BLOCKED** (Docker Desktop daemon not running) |
| SERVER VERIFIED | **NO** — Ubuntu inspect/deploy not executed |
| DEPLOYED | **NO** |
| CI/CD VERIFIED | **NO** — workflows authored; no GitHub-triggered deploy/rollback demonstrated |
| BLOCKED | Docker daemon (local image build); Ubuntu SSH; GitHub remote/secrets; purchased `.tech` domain values |

This application is **not** marked production-ready merely because it compiles. Unfinished / environment-dependent features remain (Desktop Agent live OpenCode path, optional RabbitMQ/MinIO, OAuth until domain configured).

---

## 1. Prepared files

| Path | Purpose |
|------|---------|
| `backend/backend-spring/Dockerfile` | Multi-stage Spring Boot image for GHCR |
| `deploy/compose.prod.yml` | Backend + Gotenberg (loopback bind; resource limits) |
| `deploy/.env.example` | Production env template (no secrets) |
| `deploy/nginx/tron-ai.conf` | New Nginx site: SPA + `/api` proxy |
| `deploy/scripts/inspect-server.sh` | Read-only server inspection |
| `deploy/scripts/prepare-dirs.sh` | Isolated `/opt/tron-ai` layout |
| `deploy/scripts/mysql-init-tron.sql` | Dedicated schema + least-privilege user |
| `deploy/scripts/deploy-release.sh` | Image + frontend deploy + health + rollback on failure |
| `deploy/scripts/rollback-release.sh` | Previous GHCR image only (no DB rollback) |
| `deploy/scripts/healthcheck.sh` | Post-deploy checks |
| `deploy/cloudflare/ingress.example.yml` | Tunnel hostname fragment |
| `deploy/README.md` | Deploy pack index |
| `.github/workflows/ci.yml` | Frontend, Maven hermetic tests, security heuristic, Docker build (no push) |
| `.github/workflows/deploy-staging.yml` | `develop` → GHCR → SSH staging |
| `.github/workflows/deploy-production.yml` | `main` → GHCR → SSH production |
| `docs/BRANCHING_AND_RELEASE.md` | Branch / freeze strategy |
| `TRON_UBUNTU_SERVER_DEPLOYMENT_GUIDE.md` | Owner STEP 1–18 guide |
| `TRON_DEPLOYMENT_PREPARATION_REPORT.md` | This report |

---

## 2. Modified files

| Path | Change |
|------|--------|
| `backend/backend-spring/src/main/resources/application-prod.yml` | Gotenberg, storage path, pool limits, cookie/CORS/frontend URLs, logging rotation hooks |
| `frontend/src/config/api.ts` | Empty `VITE_*` = same-origin (production Nginx) |
| `frontend/.env.example` | Production same-origin notes |
| `deploy/ubuntu/config/tron-ai.env.example` | Self-hosted domain + Docker/GHCR fields (removed Vercel assumption) |
| `deploy/ubuntu/docs/CLOUDFLARE.md` | Self-hosted frontend+API path |
| `.gitignore` | Secrets, env files, evidence dirs, `.netlify` |

Existing `deploy/ubuntu` systemd/JAR path retained as legacy; **preferred path is Compose + GHCR**.

---

## 3. Docker architecture

```text
Host Nginx (:80) ──► 127.0.0.1:18080 ──► tron-ai-backend (container)
                                              │
                                              ├── GOTENBERG_URL=http://gotenberg:3000
                                              ├── DB via host.docker.internal → existing MySQL (schema tron_ai)
                                              └── Ollama via private LAN IP (RTX 4060)

                     tron-ai-gotenberg (no host ports)
                     volumes: object_storage, uploads, logs
```

**Not** containerized on purpose: MySQL (reuse host), Nginx (existing), Cloudflare Tunnel (existing), Ollama (AI node).

Default resource caps (tune after STEP 2 inspect):

| Container | mem_limit | JVM / notes |
|-----------|-----------|-------------|
| backend | 1280m | `-Xms256m -Xmx768m` |
| gotenberg | 1024m | LibreOffice queue=2; Chromium routes disabled |

---

## 4. Nginx integration approach

- Add **new** site `tron-ai.conf`; do not overwrite other vhosts.
- Serve React from `/var/www/tron-ai`.
- Proxy `/api/`, `/health`, `/actuator/`, `/login/`, `/oauth2/`, `/ws/` to `127.0.0.1:18080`.
- Same-origin frontend build (`VITE_CORE_API_URL=""`) avoids CORS for primary browser traffic; `CORS_ALLOWED_ORIGINS` still set to `https://YOUR_DOMAIN.tech`.

---

## 5. Resource requirements

Conservative **additional** draw on the 16GB core (already running three Spring apps):

| Item | Estimate |
|------|----------|
| Backend container | ≤ ~1.3GB |
| Gotenberg | ≤ ~1.0GB |
| Frontend static | negligible |
| MySQL schema | shared instance; small incremental |
| **Reserve** | Keep ≥2–3GB free system-wide under load |

**Do not** allocate all ~11GB free RAM to TRON. Measure with `free -h` / `docker stats` before raising limits. Do not run Ollama models on the core server.

---

## 6. GitHub Actions configuration

| Workflow | Trigger | Behavior |
|----------|---------|----------|
| `ci.yml` | PR/push `main`/`develop` + `workflow_call` | FE build, hermetic Maven tests, secret-file heuristic, Docker build (no push) |
| `deploy-staging.yml` | push `develop` / manual | CI gate → push GHCR `:sha-*` + `:staging` → SCP frontend → SSH `deploy-release.sh` |
| `deploy-production.yml` | push `main` / manual (`confirm=deploy-production`) | Same with `:production` / `:latest`; GitHub Environment `production` |

CI excludes environment-dependent tests: Desktop Agent *Live*, Gotenberg live IT, Career builder journeys needing live PDF/Gotenberg, Mission09 live providers.

---

## 7. GHCR configuration

- Image name: `ghcr.io/<lowercase-owner>/<repo>/tron-ai-backend`
- Tags: `sha-<12>`, `staging`, `production`, `latest` (prod workflow)
- Server pull: `GHCR_PULL_USER` + `GHCR_PULL_TOKEN` (`read:packages`)
- Actions push: `GITHUB_TOKEN` with `packages: write`

---

## 8. Deployment instructions

Primary document: **`TRON_UBUNTU_SERVER_DEPLOYMENT_GUIDE.md`** (STEPS 1–18).

Short path after GitHub + secrets exist:

1. Inspect server (do not touch other apps).
2. Create dirs + `/etc/tron-ai/tron-ai.env`.
3. Init MySQL `tron_ai` / `tronai` user.
4. Install Nginx site; add Cloudflare hostname for `YOUR_DOMAIN.tech`.
5. Merge/push → Actions builds GHCR → SSH deploy.
6. Verify HTTPS, auth, PDF, persistence.
7. Practice `rollback-release.sh`.

---

## 9. Known risks

| Risk | Mitigation |
|------|------------|
| Port collision with existing Spring apps | Default host port **18080**; inspect first |
| RAM pressure with 3 existing apps | Low heap + Gotenberg limits; measure before raise |
| RabbitMQ missing | `RABBITMQ_LISTENER_ENABLED=false` + optional `SPRING_AUTOCONFIGURE_EXCLUDE` |
| MinIO missing | Local filesystem volume fallback |
| App rollback ≠ DB rollback | Documented; Flyway forward-only; mysqldump separately |
| Unfinished Desktop Agent live path | Keep beta Access policy; do not claim full production readiness |
| No git remote in workspace today | Owner must create GitHub repo / push before Actions run |
| Docker Desktop down on Windows | Image build verified in CI runners once pushed |

---

## 10. Test results (this session)

| Check | Result | Evidence |
|-------|--------|----------|
| React production build (`VITE_*=` empty) | **PASS** | `FRONTEND_EXIT=0`; `frontend/dist` produced |
| Spring `mvn -DskipTests package` | **PASS** | `BACKEND_PACKAGE_EXIT=0`; jar in `target/` |
| Full `mvn test` | **FAIL (3)** | Desktop Agent live OpenCode timeouts (pre-existing env dependency) |
| Hermetic suite (CI exclusions) | **PASS** | `Tests run: 247, Failures: 0` |
| `compose.prod.yml` YAML parse | **PASS** | Python `yaml.safe_load` |
| Docker image build | **BLOCKED** | Docker API pipe missing (daemon not running) |
| Docker Compose up (prod) | **BLOCKED** | Same |
| Ubuntu server inspect/deploy | **BLOCKED** | No SSH performed |
| GitHub Actions live run | **BLOCKED** | No git remote / secrets |
| HTTPS / OAuth / PDF on server | **BLOCKED** | Not deployed |

---

## 11. Remaining server-side / owner actions

1. Initialize git remote on GitHub; create `main` + `develop`; optional `release/frozen-YYYYMMDD`.
2. Configure GitHub Environments + SSH/GHCR secrets (guide STEP 11).
3. SSH to Ubuntu; run STEP 1–3 inspect + backup.
4. Choose free `TRON_BACKEND_HOST_PORT` after measuring ports/RAM.
5. Create MySQL schema/user; fill `/etc/tron-ai/tron-ai.env` (real domain when purchased).
6. Install Nginx site + Cloudflare tunnel hostname **without** removing existing projects.
7. First deploy via Actions or `deploy-release.sh`.
8. Demonstrate automatic deploy + rollback (STEPS 15–16) before claiming **CI/CD VERIFIED**.
9. Enable Cloudflare Access / beta protection for unfinished surfaces.
10. Point Ollama URLs at RTX 4060 private IP; never expose 11434 publicly.

---

## 12. Overall deployment readiness (summary)

**Repository preparation for self-hosted deployment is CODE READY.**  
**Local build verification is PARTIAL (Docker daemon blocked).**  
**Nothing is DEPLOYED or CI/CD VERIFIED on the Ubuntu server.**

Next owner move: push to GitHub, run Ubuntu STEP 1 inspection, then proceed through the guide without modifying the three existing applications.
