# TRON AI — Architecture

**Updated:** 2026-11-06  
**Audience:** developers and deploy operators

## Stack

| Layer | Technology | Location |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind | `frontend/` (dev **5174**) |
| Backend | Java 21 + Spring Boot | `backend/backend-spring/` (dev **8080**) |
| Database | MySQL 8 + Flyway V1–V18 | schema `tron_ai` |
| Auth | JWT + Google OAuth2 | `/api/v1/auth`, `/oauth2/**` |
| AI | Central AI Gateway → Groq / OpenRouter / Mistral / Gemini / Ollama | `/api/v1/ai` |
| Research | Tavily + Firecrawl (+ SafeUrlFetcher) | Company Advisor path |
| PDF | Apache POI XLSX → Gotenberg v8 LibreOffice | internal Docker only |
| Voice | Whisper STT worker + VOICEVOX TTS | optional AI-node ports |
| Desktop Agent | JavaFX / OpenCode on **Windows client** | `desktop-agent/` |

## Runtime topology (production intent)

```text
Internet → Cloudflare Tunnel → Host Nginx (:80)
                                 ├─ /           → /var/www/tron-ai (React SPA)
                                 └─ /api,/health,/oauth2,/login,/ws → 127.0.0.1:18080
                                                                        │
                                                         tron-ai-backend (Docker)
                                                                ├─ MySQL host (schema tron_ai)
                                                                ├─ gotenberg:3000 (internal net)
                                                                └─ Ollama LAN AI node (private)
```

MySQL, Nginx, Cloudflare, and Ollama are **not** owned by TRON Compose. Desktop Agent is **not** deployed on Ubuntu.

## Module map (backend packages)

| Package area | Responsibility |
|---|---|
| `com.tronai.auth` | Register / login / refresh / OAuth |
| `com.tronai.career.*` | Profile, jobs, CV builder, company analyses, matches, applications |
| `com.tronai.interview` | Interview sessions / voice answers / analysis |
| `com.tronai.ai.gateway` | Provider routing, modes, usage |
| `com.tronai.chat` | Chat sessions |
| `com.tronai.voice` | Voice turn + audio clips |
| `com.tronai.desktopagent` | Pairing, devices, agent tasks (Windows peers) |
| `com.tronai.admin` / `supervisor` | Admin control / planning |

## Data

Flyway migrations: `backend/backend-spring/src/main/resources/db/migration/V1__…` through `V18__career_center_v1_templates.sql`.  
Do **not** reset Flyway history or wipe user DBs for cleanup.

## Related docs

- [CURRENT_STATUS.md](CURRENT_STATUS.md)
- [API_REFERENCE.md](API_REFERENCE.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [AI_PROVIDER_CONFIGURATION.md](AI_PROVIDER_CONFIGURATION.md)
- [GOTENBERG.md](GOTENBERG.md)
