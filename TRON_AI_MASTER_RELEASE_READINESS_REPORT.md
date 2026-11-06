# TRON AI — Master Release Readiness Report

**Label:** `TRON-AI-v1-beta-rc1`  
**Date:** 2026-11-06  
**Tree:** `C:\Users\engrm\OneDrive\Desktop\Group7`  
**Deploy during this mission:** **No**  
**Commit / push / Ubuntu changes:** **Not performed** (owner authorization required)

---

## 1. Executive summary

The active TRON AI application is a React 19 + Spring Boot 21 Career Center product with Flyway V1–V18, AI Gateway, Gotenberg PDF, and a Windows Desktop Agent. **Frontend production build PASS** and **Spring package PASS** after cleanup. Hermetic Maven samples **PASS** (50 tests across two runs). Career Center SpringBoot ITs **FAIL locally** with a pre-existing Mockito/`AiProvider` mock classloading error (also excluded from CI). **Docker Desktop daemon is not running** on this Windows host, so image build was not verified this session. The tree has **no project `.git`**, so an immutable Git tag cannot be created without owner-authorized init/remote sync.

**Verdict:** Codebase is **ready for protected beta release preparation** (docs, deploy pack, builds). It is **not** ready for public internet exposure or automatic Ubuntu deploy until GitHub sync, secrets, domain/OAuth, server inspect, and AI-node firewall confirmation are complete.

Companion snapshot file: `RELEASE_SNAPSHOT_TRON-AI-v1-beta-rc1.md`.

---

## 2. Actual repository structure (active)

```text
Group7/
├── frontend/                 React 19 + Vite
├── backend/backend-spring/   Java 21 Spring Boot + Flyway
├── backend/stt-worker/       Whisper worker (optional)
├── desktop-agent/            Windows JavaFX / OpenCode
├── deploy/                   Compose prod, Nginx, Cloudflare, scripts
├── docs/                     Consolidated documentation
├── scripts/                  START_TRON helpers
├── .github/workflows/        ci / deploy-staging / deploy-production
├── docker-compose.yml        Local Gotenberg only
├── DELETE_LATER/             Archives (gitignored) — DO NOT DELETE
├── README.md
├── TRON_AI_MASTER_RELEASE_READINESS_REPORT.md  (this file)
└── RELEASE_SNAPSHOT_TRON-AI-v1-beta-rc1.md
```

Presentation assets (`TRON_AI_FINAL_PRESENTATION.*`) and `履歴書フォーマット.xlsx` remain at root (owner review / KEEP).

---

## 3. Active architecture

See `docs/ARCHITECTURE.md`.

Production intent: Cloudflare → host Nginx → loopback `127.0.0.1:18080` → Docker backend + internal Gotenberg; host MySQL schema `tron_ai`; private LAN Ollama on Windows AI node. Desktop Agent stays on Windows clients — **not** on Ubuntu.

---

## 4. Feature inventory and verified status

Status vocabulary: `IMPLEMENTED` | `VERIFIED_API` | `VERIFIED_BROWSER` | `USER_MANUAL_PASS` | `PARTIAL` | `FAIL` | `BLOCKED` | `NOT_TESTED`

| Feature | Status (evidence) |
|---|---|
| Auth JWT register/login/refresh | IMPLEMENTED; VERIFIED_API (historical 2026-10-25); NOT_TESTED this mission |
| Google OAuth | IMPLEMENTED; BLOCKED for prod until domain + redirect URIs |
| Candidate Profile | IMPLEMENTED; VERIFIED_API (hist.); FE wired |
| CV Builder drafts / AI assist / XLSX | IMPLEMENTED; VERIFIED_API (hist.); FE wired (`CvBuilderPage`) |
| CV Management “revised CV” generate | PARTIAL — `CVManagementPage.handleGenerateRevisedCv` shows “not implemented” toast only |
| CV PDF (Gotenberg) | IMPLEMENTED; VERIFIED_API (hist. live PDF); Docker daemon BLOCKED this mission |
| Job Finder (Mynavi/CareerMap) | IMPLEMENTED; VERIFIED_API honest `[]`; FE also has offline **demo fixture** path — must not be presented as live scrape |
| CV↔job matching | IMPLEMENTED backend; FE PARTIAL (no client methods) |
| Applications / Career dashboard | IMPLEMENTED backend; FE PARTIAL (no applications dashboard page) |
| Company Advisor | IMPLEMENTED; VERIFIED_API (hist.); quality depends on Tavily/Firecrawl; hallucination risk LIMITED |
| Interview Practice | IMPLEMENTED; VERIFIED_API start/answer (hist.); quality PARTIAL |
| Interview Preparation | IMPLEMENTED routes; may be generic — PARTIAL |
| Chat | IMPLEMENTED; hermetic ChatEndpointTest PASS this mission |
| Voice STT/TTS | IMPLEMENTED; NOT_TESTED mic E2E this mission |
| Desktop Agent | IMPLEMENTED Windows client; DISABLE for public beta messaging |
| Workspace “General Web Agent” | PARTIAL — UI “Coming Soon / In Development” |
| Settings / Admin | IMPLEMENTED; Admin role-gated |
| Landing / pricing | IMPLEMENTED; pricing “Plans Coming Soon” / Pro “COMING SOON” |
| Sinhala language | PARTIAL — interview type union includes `sinhala`; UI locales = en/ja/bn/ne/my only |
| Auth refresh race | Code has single-flight refresh; race NOT_TESTED |
| Full browser E2E | NOT_TESTED this mission |

Historical issues rechecked via code/docs (not re-debugged): Mynavi empty honesty still the contract; matching FE still missing; Company Advisor still cloud/research dependent; interview quality unverified; Sinhala UI pack still absent.

Post-audit inventory agents confirmed: 25 Spring `@RestController`s; FE routes/API clients as above; prod Compose = backend+Gotenberg only; deploy workflows are **manual `workflow_dispatch` only**.

---

## 5. Frontend route inventory

Source: `frontend/src/App.tsx`

| Path | Page |
|---|---|
| `/`, `/landing`, `/features`, `/models`, `/pricing` | Landing |
| `/auth`, `/auth/callback` | Auth |
| `/connect-device`, `/devices/connect/:requestId` | Device link |
| `/chat`, `/chat/:conversationId` | Chat |
| `/voice` | Voice |
| `/workspace`, `/workspace/agent*` | Workspace / Desktop Agent UI |
| `/career`, `/career/profile`, `/career/jobs` | Career shell / profile / Job Finder |
| `/career/interview*`, `/career/interview-agent` | Interview |
| `/career/company-analysis` | Company Advisor |
| `/career/cv`, `/career/cv-builder`, `/career/history` | CV |
| `/settings`, `/admin`, `/mentor`, `/about`, `/help`, `/profile` | Support |

Legacy `/workspace/*` and `/interview*` paths redirect into `/career/*`.

---

## 6. Backend API inventory

See `docs/API_REFERENCE.md`. Controllers present for auth, career (profile, jobs, cv-builder, company-analyses, matches, applications, dashboard, ops), interviews, chat, AI gateway, voice, desktop agents, agent-tasks, admin, supervisor, agents, agent-engines, users, health.

---

## 7. Database and Flyway status

| Item | Value |
|---|---|
| Migrations | V1 … V18 under `src/main/resources/db/migration/` |
| Prod schema | `tron_ai` (dedicated; see `deploy/scripts/mysql-init-tron.sql`) |
| Test profile | H2 MySQL-mode + Flyway (`application-test.yml`) |
| Reset | **Forbidden** for this mission — history preserved |

---

## 8. AI provider integration status

| Provider / tool | Role | Beta |
|---|---|---|
| Groq | Primary cloud LLM | Essential recommended |
| OpenRouter / Mistral / Gemini | Fallbacks | Optional |
| Ollama (`qwen3:8b`) | Local/LAN privacy path | Essential if cloud off |
| Tavily / Firecrawl | Company research | Strongly recommended |
| Cloudflare Workers AI tokens | Optional gateway path | Optional |
| Infisical | Secrets broker | Optional (off by default) |

Privacy flags: `TRON_AI_CV_CLOUD_ENABLED` (default false), `TRON_AI_COMPANY_CLOUD_ENABLED`, `TRON_AI_INTERVIEW_CLOUD_ENABLED`. Details: `docs/AI_PROVIDER_CONFIGURATION.md`.

---

## 9. CV Builder / Gotenberg status

- Primary path: POI XLSX → Gotenberg LibreOffice PDF  
- Local compose: `docker-compose.yml` binds `127.0.0.1:3000`  
- Prod: `deploy/compose.prod.yml` internal network only; Chromium routes disabled; mem_limit ~1024m  
- Historical live PDF evidence archived under `DELETE_LATER/CLEANUP_2026-11-06/evidence/_gotenberg_verify_evidence/`  
- This mission: Docker daemon **unavailable** → Gotenberg live re-verify **BLOCKED**

---

## 10. Job Finder status

- Active API only: `POST /api/v1/career/jobs/search` (+ save/import/ops)  
- Providers: Mynavi + CareerMap  
- FE: `careerCenterClient` — dual legacy agent call removed  
- Empty `[]` is valid; do not advertise guaranteed live scrapes  

---

## 11. Company Advisor status

- FE + BE wired (`/api/v1/career/company-analyses`)  
- Uses research tools + LLM synthesis; treat as **assistive**, not ground truth  
- Historical fallback/restart issue: not re-exercised this mission → retain as known risk  

---

## 12. Interview and Voice status

- Interview REST + voice-answer multipart implemented; endpoint tests PASS this mission  
- Preparation quality may be generic — LIMITED beta  
- Voice depends on STT (`8091`) + VOICEVOX (`50021`) on AI node — optional for first beta  

---

## 13. External dependencies

| Dependency | Required for beta core? |
|---|---|
| MySQL 8 | Yes |
| Docker (backend + Gotenberg) | Yes |
| Nginx + Cloudflare | Yes (existing) |
| Groq **or** Ollama | Yes (one working LLM path) |
| Google OAuth | For Google login only |
| Tavily/Firecrawl | Company Advisor quality |
| RabbitMQ / MinIO | No (disable / local fallback) |
| Desktop Agent runtime | No on Ubuntu |
| Whisper / VOICEVOX | No for first beta |

---

## 14. Secrets / environment variable inventory (names only)

**Required prod (typical):** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `TRON_FRONTEND_URL`, `TRON_PUBLIC_API_URL`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`

**Auth optional:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**AI:** `GROQ_API_KEY`, `GROQ_MODEL_*`, `OPENROUTER_API_KEY_1/2`, `MISTRAL_API_KEY`, `GEMINI_API_KEY_1..4`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TAVILY_API_KEY`, `FIRECRAWL_API_KEY`, `CLOUD_AI_*`, `TRON_AI_*_CLOUD_ENABLED`, `INFISICAL_*`

**PDF / storage / voice:** `GOTENBERG_URL`, `TRON_PDF_*`, `MINIO_*`, `STT_BASE_URL`, `VOICEVOX_*`, `RABBITMQ_*`, `JAVA_OPTS`, `TRON_BACKEND_*`

Templates: root `.env.example`, `backend/backend-spring/.env.example`, `deploy/.env.example`.  
**Local secret file present (exclude from packages):** `frontend/.env` (gitignored).

---

## 15. Cleanup changes and archive manifest

| Archive | Content |
|---|---|
| `DELETE_LATER/CLEANUP_2026-10-25/` | Prior ~1 GB archive — **preserved** |
| `DELETE_LATER/CLEANUP_2026-11-06/` | This mission: obsolete root Markdown reports, evidence dirs, regenerable logs |

Manifests:

- `DELETE_LATER/CLEANUP_2026-11-06/cleanup-manifest.md`
- Cross-link added at top of `DELETE_LATER/CLEANUP_2026-10-25/cleanup-manifest.md`

Docs consolidated under `docs/` (`ARCHITECTURE`, `API_REFERENCE`, `DEPLOYMENT`, updated `CURRENT_STATUS`, `README`, `DEVELOPMENT`, `deploy/README`).  
Added `.dockerignore` (root) and `backend/backend-spring/.dockerignore` for safer image contexts.

**Permanent deletes:** none of unique historical sources.

---

## 16. Build and test results (this mission)

| Check | Result |
|---|---|
| `frontend` `tsc -b && vite build` | **PASS** (~10.3s) |
| `mvnw -DskipTests package` | **PASS** → `tronai-backend-0.1.0-SNAPSHOT.jar` |
| Unit: `CommandPolicyEngineTest`, `CvParserTest` | **PASS** (12) |
| Hermetic: Health, Interview, Chat, Cv endpoints + Gotenberg validate + SkillMatch + SafeUrlFetcher | **PASS** (38) |
| `CareerCenterJourneyIT`, `CareerCenterV1ProfileIT` | **FAIL** — ApplicationContext / Mockito mock of `AiProvider` (`NoClassDefFoundError: ChatGenerationRequest` during instrumentation). Source class **exists**. CI already excludes these ITs. **Not caused by cleanup.** |
| Docker image build | **BLOCKED** — Docker Desktop engine not running |
| Browser smoke | **NOT_TESTED** this mission |
| MySQL reset | Not performed |

Artifact fingerprints: see `RELEASE_SNAPSHOT_TRON-AI-v1-beta-rc1.md`.

---

## 17. Security assessment

| Topic | Assessment |
|---|---|
| JWT + role-gated admin | Present |
| CORS / secure cookies (prod yml) | Configured via env |
| Gotenberg / MySQL public exposure | Compose designed loopback/internal — keep as designed |
| Desktop Agent pairing bootstrap | Partially `permitAll` by design — **do not market as public remote RCE**; Windows-local only |
| Desktop Agent WebSocket CORS | Registry allows broad origins (`setAllowedOrigins("*")`) while handshake still requires device credential — harden before public edge |
| Swagger `/v3/api-docs` | Public in SecurityConfig — consider locking for public beta |
| Demo upload paths | `CvController` / voice still expose `/demo/*` routes — confirm auth or disable in prod profile |
| SSRF | SafeUrlFetcher / research path present — keep allowlists |
| Secrets in Git | `.gitignore` covers `.env`; local `frontend/.env` must never be packaged |
| Rate limiting | Not comprehensively verified — treat as gap for public traffic |
| CV cloud | Default off |

---

## 18. Ubuntu server resource estimates

Additional draw on shared 16 GB i7 core (with three existing Spring apps):

| Component | Cap |
|---|---|
| Backend container | mem_limit **1280m**, JVM **-Xmx768m**, cpus **1.5** |
| Gotenberg | mem_limit **1024m**, cpus **1.0**, queue size 2 |
| Frontend static | negligible |
| Free RAM reserve | keep **≥2–3 GB** system-wide |

Re-measure with `deploy/scripts/inspect-server.sh` / `free -h` / `docker stats`. Do **not** trust historical “11 GB free / 69 GB SSD” figures.

---

## 19. Deployment configuration requirements

Documented in `docs/DEPLOYMENT.md` and `deploy/`:

1. New Nginx site from `deploy/nginx/tron-ai.conf` (do not overwrite other vhosts)  
2. `compose.prod.yml` with env file `/etc/tron-ai/tron-ai.env`  
3. Dedicated MySQL schema/user  
4. Frontend same-origin build (`VITE_CORE_API_URL=""`) → `/var/www/tron-ai`  
5. Cloudflare Tunnel hostname → existing Nginx  
6. Ollama on AI node LAN only; confirm Ubuntu core IP vs firewall allow list (`192.168.0.10` vs `.24`)  
7. Port default host bind `127.0.0.1:18080` — confirm free vs other apps  

---

## 20. Beta-enabled / limited / disabled matrix

### A. Enabled for protected beta

Auth (email/JWT), Profile, CV Builder (+ PDF if Gotenberg healthy), Chat (with configured LLM), Company Advisor (with disclaimer), Interview practice (assistive), Job Finder UI (honest empty), Settings, Health.

### B. Limited beta (truthful UX)

Mynavi/CareerMap live scrape reliability; Company Advisor factual accuracy; Interview preparation depth; multi-language (no Sinhala UI pack); voice if STT/TTS not online; OAuth until domain wired.

### C. Disabled / not advertised for public beta

Desktop Agent remote control as a hosted SaaS capability; CV matching / applications dashboards as “complete”; claims of always-populated job listings; exposing Gotenberg/Ollama/MySQL publicly.

Features remain in codebase — not deleted.

---

## 21. Critical deployment blockers

1. **No project `.git` / no confirmed GitHub remote** → cannot tag/push/CI  
2. **Owner secrets + domain** not filled (JWT, DB, OAuth, CORS, Cloudflare hostname)  
3. **Ubuntu not inspected this mission** (ports, RAM, disk, other Spring ports)  
4. **Docker image build unverified** on this PC (daemon down)  
5. **Ollama Ubuntu→Windows path** must be re-verified; firewall allow IP may need update  
6. Career IT suite local failure (pre-existing) — CI hermetic path is the gate  
7. Public Swagger / Desktop pairing surface needs beta hardening decisions  

---

## 22. Exact next deployment steps (next mission)

1. Owner provides GitHub `OWNER/REPO`, authorizes `git init` or clone sync + first commit  
2. Tag `TRON-AI-v1-beta-rc1` after commit; configure GHCR + Actions secrets  
3. SSH to Ubuntu: run `inspect-server.sh` (read-only); record free RAM/disk/ports  
4. Create MySQL schema/user; write `/etc/tron-ai/tron-ai.env`  
5. Confirm AI node IP + firewall; set `OLLAMA_BASE_URL`  
6. Build/push backend image; `compose.prod.yml up`; deploy frontend to `/var/www/tron-ai`  
7. Add **new** Nginx site + Cloudflare hostname; `nginx -t` (prefer `deploy/nginx/tron-ai.conf`, not legacy `api.example.com` vhost)  
8. Trigger deploy via **manual** GitHub Actions (`workflow_dispatch` + confirm strings); auto push-to-`main`/`develop` is disabled  
9. Health checks + rollback script dry-run; Google OAuth redirect update  
10. Protected beta user smoke (auth, CV export, one chat, job search empty honesty — no demo-fixture confusion)  

---

## 23. Release snapshot identity and Git status

| Item | Value |
|---|---|
| Intended label | `TRON-AI-v1-beta-rc1` |
| Project `.git` | **ABSENT** |
| Branch / commit / tags | **N/A** |
| Immutable Git tag | **Blocked** pending owner auth |
| Local fingerprint file | `RELEASE_SNAPSHOT_TRON-AI-v1-beta-rc1.md` |
| FE `dist/index.html` SHA256 | `7814D1FDEA86838237870A51F90039005BDC925047624600D96A9E1BE03F7158` |
| Backend JAR SHA256 | `D4306FF83B4BAFF822659F184F2650E23D7D9FA71EE325D0DD648B960064390E` |

Do not confuse a possible `.git` under the Windows user profile with this project.

---

## 24. Remaining known limitations

- Job scrape may return empty  
- Matching / applications FE incomplete  
- Sinhala UI missing  
- Voice / Desktop Agent not production-hardened for internet  
- Company Advisor can hallucinate without strong research keys  
- Full browser E2E incomplete  
- CareerCenter*IT local context load failure (Mockito) — investigate in a focused test mission, not release-critical if CI hermetic suite is green on GitHub  
- Resource figures on Ubuntu must be remeasured  

---

## Owner checklist before saying “deploy”

- [ ] GitHub repository URL + auth to sync  
- [ ] Approval to commit + tag `TRON-AI-v1-beta-rc1`  
- [ ] Exact `.tech` domain string  
- [ ] Confirm Ubuntu core LAN IP (`.10` vs `.24` vs other)  
- [ ] Confirm free RAM/disk after inspect  
- [ ] Provide/confirm secret injection path (env file or Infisical)  
- [ ] Google Cloud OAuth client for production redirect  
- [ ] Explicit approval to SSH/change Ubuntu (next mission)  
