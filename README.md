# TRON AI

Career + interview assistant for specialized-school / new-graduate candidates in Japan.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind (`frontend/`, port **5174**) |
| Backend | Java 21 + Spring Boot (`backend/backend-spring/`, port **8080**) |
| Database | MySQL + Flyway |
| AI | Central AI Gateway (Groq / OpenRouter / Ollama / …) |
| Auth | JWT + Google OAuth |
| Desktop | JavaFX + OpenCode (`desktop-agent/`) — Windows client |
| Deploy pack | `deploy/` (Compose + Nginx + Cloudflare reuse) |

## One-click local start

```bat
START_TRON.cmd
```

Stop: `STOP_TRON.cmd`. Force rebuild: `RESTART_TRON.cmd`.

## Career Center Job Finder

- **API:** `POST /api/v1/career/jobs/search`
- **Providers:** Mynavi, CareerMap only
- Empty results are honest empty states — TRON does not invent listings

## Documentation

| Doc | Purpose |
|---|---|
| [TRON_AI_MASTER_RELEASE_READINESS_REPORT.md](TRON_AI_MASTER_RELEASE_READINESS_REPORT.md) | **Authoritative** audit + beta + Ubuntu prep |
| [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) | What works / gaps |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Runtime architecture |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | API inventory |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local build & test |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Ubuntu / Docker / Nginx requirements |
| [docs/AI_PROVIDER_CONFIGURATION.md](docs/AI_PROVIDER_CONFIGURATION.md) | AI providers & privacy flags |
| [docs/GOTENBERG.md](docs/GOTENBERG.md) | PDF conversion |
| [docs/CV_EXCEL_TEMPLATE_MAPPING.md](docs/CV_EXCEL_TEMPLATE_MAPPING.md) | Japanese CV Excel mapping |
| [docs/BRANCHING_AND_RELEASE.md](docs/BRANCHING_AND_RELEASE.md) | Branch / freeze strategy |
| [deploy/README.md](deploy/README.md) | Deploy pack index |

Obsolete mission reports: `DELETE_LATER/` (gitignored; do not delete until owner confirms).

## Important

- Do **not** reset MySQL or Flyway history for cleanup
- Do **not** commit secrets / filled `.env` values
- This folder currently has **no project `.git`** — GitHub sync requires owner authorization
