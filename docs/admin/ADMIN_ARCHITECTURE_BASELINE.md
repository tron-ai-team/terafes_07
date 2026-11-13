# Admin Architecture Baseline

**Branch:** `feature/tron-admin-backend-v1-v3`  
**Base:** `main` @ `9101963c`  
**Scope:** Backend only (Antigravity frontend not modified in this PR)

## Existing (reused)

| Component | Path | Notes |
|---|---|---|
| Admin V0 API | `com.tronai.admin.AdminController` | dashboard, users list, suspend/restore, control, audit |
| Audit entity | `AdminAuditLogEntity` + V14 table | Extended with result/request/role columns in V23 |
| Platform control | `HybridRoutingService` / `platform_control_state` | Preserved |
| Auth stack | JWT + refresh rotation + Google identity | Single auth system preserved |
| Ultra quota | `AiQuotaService` + V12 UTC day | Unchanged; independent of feature quotas |
| Usage events | `ai_usage_events` | Source for measured analytics counts |
| Provider health | `AiProviderHealthService` | Sanitized admin provider views |
| User identity | `user_identities` | Login methods only; never expose `provider_subject` |

## Missing before this branch

- Paginated user search with providers/status
- Soft-delete workflow
- OWNER-only role/invite controls
- Per-feature JST daily quotas (OBSERVE/ENFORCE)
- Honest analytics/cost/security endpoints
- Announcements + public active feed
- Structured feature-quota 429 body

## New in this branch

- Flyway **V23** admin control center schema
- `AdminFeatureQuotaService` wired into `AiGateway` for all authenticated generations
- Meter hints for CV Magic Fill vs AI Assist
- Admin controllers for users, quotas, analytics, providers, costs, security, announcements, system health
- Offline invitation token workflow (email delivery not configured)

## Role semantics

- `USER` / `ADMIN` / `OWNER` stored on `users.role`
- Spring authorities `ROLE_*`; JWT claim overridden by DB role
- OWNER is real but not bootstrapped by registration (must be set out-of-band / invite path)
- ADMIN cannot assign OWNER, soft-delete, or modify OWNER accounts

## Risks

1. Feature quotas default **OBSERVE** — not production-blocking until OWNER sets ENFORCE
2. STT/TTS spend still outside `AiGateway` meters (documented in quota matrix)
3. Local FAST chat bypass of gateway remains a coverage gap
4. Cost estimates UNAVAILABLE until pricing catalog rows are curated
5. MFA is honestly `NOT_IMPLEMENTED`
