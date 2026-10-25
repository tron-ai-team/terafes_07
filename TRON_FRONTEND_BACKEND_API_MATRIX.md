# TRON Frontend ↔ Backend API Compatibility Matrix

**Date:** 2026-10-25 (updated — legacy Job Finder agent removed)  
**Frontend:** `frontend/` @ Vite `:5174` (`VITE_CORE_API_URL=http://localhost:8080`)  
**Backend:** `backend/backend-spring/` @ `127.0.0.1:8080`  
**Auth:** Bearer JWT + HttpOnly refresh cookie via `apiFetch` / `credentials: 'include'`  
**CORS:** `localhost:5174` / `127.0.0.1:5174`

Legend: **MATCH** | **WIRED** | **MISSING_FE** | **MISMATCH** | **REMOVED**

---

## Career Center V1 (authoritative)

| Frontend call | Client | Backend | Status |
|---|---|---|---|
| `GET/PUT /api/v1/career/profile` | `careerCenterClient` + `CandidateProfilePage` | `CandidateProfileController` | **WIRED** |
| `GET /api/v1/career/profile/completeness` | `careerCenterClient` | same | **WIRED** |
| `GET /api/v1/career/cv-builder/templates` | `careerCenterClient` + `CvBuilderPage` | `CvBuilderController` | **WIRED** |
| `GET .../templates/{code}/schema` | `careerCenterClient` | same | **WIRED** |
| `GET/POST/PUT .../drafts` | `careerCenterClient` + `CvBuilderPage` | same | **WIRED** |
| `POST .../ai-assist` + accept/reject | `careerCenterClient` + `CvBuilderPage` | same | **WIRED** |
| `POST .../versions` | `careerCenterClient` + `CvBuilderPage` | same | **WIRED** |
| `POST .../export?format=xlsx\|pdf` | `careerCenterClient` + `CvBuilderPage` | same | **WIRED** |
| `GET .../documents/{id}/download` | `careerCenterClient.downloadDocument` | same | **WIRED** |
| `POST /api/v1/career/jobs/search` | `careerCenterClient` + Job Finder | `CareerJobController` | **WIRED** (sole search path) |
| `POST /api/v1/career/jobs/import` | `careerCenterClient` | same | **WIRED** (client) |
| `POST /api/v1/career/jobs/{jobId}/save` | `careerCenterClient.toggleSaveJob` | same | **WIRED** |
| `GET /api/v1/career/ops/status` | `careerCenterClient` + Job Finder | `CareerOpsController` | **WIRED** |
| `GET/POST /api/v1/career/company-analyses` | `careerCenterClient` + `CompanyAnalysisPage` | `CompanyAnalysisController` | **WIRED** |
| `POST .../{id}/transfer-to-cv` | `careerCenterClient` + `CompanyAnalysisPage` | same | **WIRED** |
| `POST/GET /api/v1/career/matches` | — | `CareerMatchController` | **MISSING_FE** (backend ready) |
| `CRUD /api/v1/career/applications` | — | `JobApplicationController` | **MISSING_FE** (backend ready) |
| `GET /api/v1/career/dashboard` | — | `CareerDashboardController` | **MISSING_FE** |

**Approved providers only:** Mynavi (`mynavi.jp`), CareerMap (`careermap.jp`) via `productJobSearchProviders`.

---

## Legacy Job Finder agent — REMOVED

| Former call | Status |
|---|---|
| `POST /api/v1/agents/career-search/run` | **REMOVED** (controller/service archived) |
| `GET .../runs/{runId}` | **REMOVED** |
| `POST .../jobs/{jobId}/save` (agent path) | **REMOVED** — use `/api/v1/career/jobs/{id}/save` |
| `careerAgentClient.ts` | **REMOVED** |
| Arbeitnow / Remotive providers | **REMOVED** from active runtime |

Frontend Job Finder (`CareerSearchAgentPage`) calls Career V1 only. Empty HTTP 200 ⇒ honest `NO_RESULTS` / provider status — never fabricated listings or stale pipeline metrics.

---

## Interview Practice

| Frontend call | Client | Backend | Status |
|---|---|---|---|
| `POST /api/v1/interviews/start` | `tronApi.startInterview` | `InterviewController` | **MATCH** (+ `cvDocumentId`, `companyAnalysisId`, `jobId`) |
| `POST .../{id}/answers` | `tronApi` | same | **MATCH** |
| `POST .../{id}/voice-answer` | `tronApi` | same | **MATCH** |
| `GET .../{id}/analysis` | `tronApi` | same | **MATCH** |
| `GET /api/v1/interviews` | `authApi` / History | same | **MATCH** |

---

## Auth / settings / legacy CV

| Frontend call | Status |
|---|---|
| Auth register/login/refresh/logout/me/providers | **MATCH** |
| `GET/PATCH /api/v1/users/me/settings` | **MATCH** |
| `PUT /api/v1/users/me/settings` (`updateUserSettings`) | **MISMATCH** (dead code; PATCH is correct) |
| `POST /demo/cv/upload` + `GET /api/v1/cv` | **LEGACY** (CV Upload page retained) |

---

## Chat / Voice / Desktop

| Area | Paths | Status |
|---|---|---|
| Chat | `/api/v1/chat`, `/api/v1/chat/sessions` | Present |
| Voice | `/api/v1/voice/turn`, `/demo/voice/speak` | Existing FE wiring |
| Desktop / tasks | `/api/v1/desktop-agents/*`, tasks | Existing |

---

## Live verification notes

Evidence: `_tron_final_integration_evidence/` (pre-cleanup). Post-cleanup verification recorded in `TRON_LEGACY_REMOVAL_AND_CLEANUP_REPORT.md`.
