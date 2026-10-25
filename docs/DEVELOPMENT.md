# Development

## Prerequisites

- Node.js 20+ (frontend)
- JDK 21 + Maven (backend)
- MySQL with Flyway-managed schema
- Ollama (local AI) optional for AI features

## Frontend

```bat
cd frontend
npm install
npm run build
npm run typecheck
```

Dev server (also started by `START_TRON.cmd`): Vite on **5174**.

## Backend

```bat
cd backend\backend-spring
mvn -q -DskipTests package
mvn -Dtest=CareerCenterJourneyIT test
```

After Java changes, restart with rebuild so stale JVM processes are not serving old classes (`RESTART_TRON.cmd` / `Start-Tron.ps1 -ForceRebuild`).

## Job search contract

```http
POST /api/v1/career/jobs/search
Authorization: Bearer <access>
Content-Type: application/json

{
  "query": "Java Developer",
  "location": "Tokyo",
  "keywords": ["Java"],
  "maxResults": 10,
  "language": "ja"
}
```

Providers: **Mynavi** and **CareerMap** only (`productJobSearchProviders`).

## Cleanup archive restore

See `DELETE_LATER/CLEANUP_2026-10-25/cleanup-manifest.md`.
