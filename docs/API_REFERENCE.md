# TRON AI — API Reference (inventory)

**Updated:** 2026-11-06  
**Base:** Spring Boot JSON APIs under `/api/v1` unless noted.  
**Auth:** Most routes require `Authorization: Bearer <access>` or session cookie after login. Public exceptions are listed in `SecurityConfig`.

This is an inventory of **implemented** controllers, not a claim that every path is browser-verified.

## Auth — `/api/v1/auth`

| Method | Path | Notes |
|---|---|---|
| GET | `/providers` | Public |
| POST | `/register`, `/login`, `/refresh`, `/logout` | Public |
| GET | `/me` | Authenticated |
| OAuth | `/oauth2/**`, `/login/oauth2/**` | Google when configured |

## Career Center

| Controller | Base | Key operations |
|---|---|---|
| CandidateProfile | `/api/v1/career/profile` | GET, PUT, `/completeness` |
| CvBuilder | `/api/v1/career/cv-builder` | templates, drafts, AI assist, export, download |
| CareerJob | `/api/v1/career/jobs` | `POST /search`, `/import`, `/{id}/save` |
| CareerOps | `/api/v1/career/ops` | `GET /status` |
| CompanyAnalysis | `/api/v1/career/company-analyses` | CRUD-ish + suggestions + transfer-to-cv |
| CareerMatch | `/api/v1/career/matches` | POST/GET — **backend only; FE client not wired** |
| JobApplication | `/api/v1/career/applications` | POST/GET — **backend only; FE client not wired** |
| CareerDashboard | `/api/v1/career/dashboard` | GET — **FE incomplete** |

Job search providers (product): **Mynavi**, **CareerMap** only. Empty `[]` is an honest empty state.

## Interviews — `/api/v1/interviews`

`POST /start`, answers, voice-answer (multipart), analysis, list/get, repeat.

## Chat / AI / Models

| Base | Notes |
|---|---|
| `/api/v1/chat` | Sessions + message |
| `/api/v1/ai` | modes, models, usage, providers |
| `/api/v1/models` | Public catalog |
| `/api/v1/ai-profiles` | Profiles |

## CV upload (legacy path)

`/api/v1/cv` — upload/list/primary/suggestions (distinct from Career CV Builder).  
Also present: `/demo/cv/upload`, `/api/cv/upload` — review before public beta (demo surfaces).

## Voice

`POST /api/v1/voice/turn`, `GET /api/v1/voice/audio/{clipId}` (audio GET deliberately public with random UUIDs).

## Desktop Agent

| Base | Notes |
|---|---|
| `/api/v1/desktop-agents` | Pairing / link / download-info |
| `/api/v1/desktop-agents/devices` | Device list |
| `/api/v1/agent-tasks` | Task control + SSE |
| `/api/v1/desktop-agent/ws` | WebSocket (device credential required after connect) |

**Beta caution:** pairing/link bootstrap endpoints are partially public by design for local Windows agents. Do not treat remote desktop control as a public SaaS feature.

## Admin / Supervisor / Agents

| Base | Notes |
|---|---|
| `/api/v1/admin` | ADMIN/OWNER roles |
| `/api/v1/supervisor` | Plans / milestones |
| `/api/v1/agents` | Agent runs |
| `/api/v1/agent-engines` | Engine sessions / health |

## Health

`GET /health`, `/actuator/health`, `/actuator/info` — public.

OpenAPI: `/v3/api-docs`, Swagger UI (consider restricting in public beta).
