# Admin V1/V2/V3 Implementation Report

## Status legend

- DONE — implemented + covered by automated tests or verified locally
- PARTIAL — API present with honest limitations
- DEFERRED — documented, not claimed complete

## V1 — Users & identities

| Requirement | Status | Files |
|---|---|---|
| Paginated search | DONE | `AdminUserService`, `AdminUserAdminController` |
| Login methods LOCAL/GOOGLE | DONE | `toSummary` + identities (no subject) |
| Detail endpoint | DONE | `GET /users/{id}` |
| Suspend/restore (legacy) | DONE | `AdminController` + `AdminControlService` |
| Soft-delete | DONE (OWNER) | `AdminUserService.softDelete` |
| Role change OWNER-only | DONE | `PUT /users/{id}/role` |
| Invite offline token | DONE | `POST /users/invite` |
| Password reset initiate | PARTIAL | No email send; audited initiate only |
| Session revoke | DONE | `POST /users/{id}/revoke-sessions` |
| deletedAt auth reject | DONE | `JwtAuthenticationFilter`, `AuthService` |

## V1 — Quotas

| Requirement | Status | Files |
|---|---|---|
| Global policies | DONE | `admin_quota_policies` + admin APIs |
| Per-user overrides | DONE | upsert/delete APIs |
| JST day | DONE | `AdminFeatureQuotaService` |
| OBSERVE default | DONE | V23 seed |
| ENFORCE + 429 | DONE | `FeatureQuotaExceededException` handler |
| AiGateway wiring | DONE | all modes with userId |
| CV meter split | DONE | Magic Fill / Assist hints |
| STT/TTS metering | DEFERRED | documented gap |
| Ultra UTC preserved | DONE | `AiQuotaService` unchanged |

## V2 — Analytics / providers / costs

| Requirement | Status | Notes |
|---|---|---|
| Overview measured counts | DONE | users + usage events |
| Timeseries | PARTIAL | honest empty/partial |
| Providers sanitized | DONE | no secrets |
| Pricing catalog schema | DONE | empty → UNAVAILABLE costs |
| Budget BLOCK | DEFERRED/gated | default disabled OBSERVE |

## V3 — Announcements / audit / security

| Requirement | Status | Notes |
|---|---|---|
| Announcements CRUD + publish | DONE | |
| Active audience feed | DONE | `/api/v1/announcements/active` |
| Audit search | DONE | extended fields |
| Security overview | DONE | MFA NOT_IMPLEMENTED honest |
| Security events table | DONE | |
| Full MFA | DEFERRED | |

## Frontend contract reconciliation (2026-11-13)

After Antigravity frontend push (`4bd3e00d`), backend added compatibility facades for global quotas, analytics aggregate, security overview/emergency revoke, announcement unpublish/archive, provider ping (cached), and secure rejection of plaintext password create/reset. See `ADMIN_FRONTEND_API_MAPPING.md`.

## Regression

- Existing Chat/Voice/CV/Interview gateway paths still call `AiGateway`
- Frontend Antigravity files intentionally **not** committed in this backend PR
