# TRON AI

Career + interview assistant for specialized-school / new-graduate candidates in Japan.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind (`frontend/`, port **5174**) |
| Backend | Java 21 + Spring Boot (`backend/backend-spring/`, port **8080**) |
| Database | MySQL + Flyway |
| AI | Ollama + AI Gateway |
| Auth | JWT + Google OAuth |
| Desktop | JavaFX + OpenCode (`desktop-agent/`) |

## One-click local start

```bat
START_TRON.cmd
```

Stop with `STOP_TRON.cmd`. Force rebuild after backend changes: `RESTART_TRON.cmd` (or the script’s `-ForceRebuild` path).

## Career Center Job Finder

- **Authoritative API:** `POST /api/v1/career/jobs/search`
- **Approved providers only:** Mynavi, CareerMap
- Legacy `/api/v1/agents/career-search/*` and Arbeitnow/Remotive providers have been **removed**
- Empty results are honest empty states — TRON does not invent listings

## Documentation

| Doc | Purpose |
|---|---|
| [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) | What works / known gaps |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local build & test |
| [TRON_FRONTEND_BACKEND_API_MATRIX.md](TRON_FRONTEND_BACKEND_API_MATRIX.md) | FE↔BE API map |
| [TRON_PUBLIC_PRODUCT_ARCHITECTURE.md](TRON_PUBLIC_PRODUCT_ARCHITECTURE.md) | Product architecture |
| [CV_EXCEL_TEMPLATE_MAPPING.md](CV_EXCEL_TEMPLATE_MAPPING.md) | Japanese CV Excel mapping |
| [TRON_LEGACY_REMOVAL_AND_CLEANUP_REPORT.md](TRON_LEGACY_REMOVAL_AND_CLEANUP_REPORT.md) | Legacy removal + cleanup (this mission) |

Obsolete mission reports live under `DELETE_LATER/CLEANUP_2026-10-25/` (gitignored; owner deletes manually later).

## Important

- Do **not** reset MySQL or Flyway history for cleanup
- Do **not** commit secrets / `.env` values
- Historical FastAPI tree was archived from `backend-old/` into `DELETE_LATER`
