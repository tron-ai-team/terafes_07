# TRON AI — Current Status

**Updated:** 2026-10-25

## Working (preserved)

- Auth (JWT + Google OAuth)
- Candidate Profile
- CV Builder (drafts, versions, XLSX/PDF export)
- Interview Practice / Preparation
- Company Analysis
- Chat, Voice, Workspace, Desktop Agent, AI Gateway, Settings
- Career Center shell + Job Finder UI (Career V1 only)

## Job Finder (post legacy removal)

| Item | Status |
|---|---|
| Dual call (`jobs/search` + `agents/career-search/run`) | **Fixed** — V1 search only |
| Arbeitnow / Remotive | **Removed** from active runtime |
| Misleading pipeline metrics (e.g. “15 discovered”) | **Fixed** — metrics reflect filtered V1 results |
| Honest empty / auth / source states | **Implemented** in Job Finder UI |
| Mynavi real extraction | **Verify live** — may return `[]` if public scrape empty/blocked |
| CareerMap real extraction | **Verify live** — same caveat |
| CV↔job matching UI | Backend match API exists; FE wiring still limited |

## CV PDF (Gotenberg)

- Spring primary path: POI XLSX → local Gotenberg v8 (`127.0.0.1:3000`) — **live verified**
- Docker Linux engine + `tron-gotenberg` healthy; JA/EN PDF samples in `_gotenberg_verify_evidence/`
- See `docs/GOTENBERG.md` and `TRON_GOTENBERG_INTEGRATION_REPORT.md`

## Known gaps

- `POST/GET /api/v1/career/matches` — backend ready, FE incomplete
- Career applications / dashboard — backend ready, FE incomplete
- Locked leftover: `_v4_golden_evidence/agent-identity/identity.json` (file lock; copy in DELETE_LATER)
- _(none for Gotenberg — live PDF visual QA completed 2026-10-25)_

## Archive

Obsolete reports and `backend-old/` → `DELETE_LATER/CLEANUP_2026-10-25/` (gitignored).
