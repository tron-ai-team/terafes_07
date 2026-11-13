# Admin Frontend ↔ Backend API Mapping

**Frontend branch:** `feature/tron-admin-control-center-v1-v3` @ `4bd3e00d`  
**Backend branch:** `feature/tron-admin-backend-v1-v3`  
**Source of truth for UI expectations:** `docs/TRON_ADMIN_BACKEND_API_REQUIREMENTS.md` (frontend branch)

## Live endpoints the current frontend already calls

| Frontend action | Method | Path | Backend status |
|---|---|---|---|
| Dashboard / health probe | GET | `/api/v1/admin/dashboard` | Live measured counters |
| User list (legacy) | GET | `/api/v1/admin/users` | Live (unpaginated; prefer `/users/search`) |
| Suspend user | POST | `/api/v1/admin/users/{id}/suspend` | Live mutation + session revoke; OWNER/self protected |
| Restore user | POST | `/api/v1/admin/users/{id}/restore` | Live mutation |
| Audit (legacy) | GET | `/api/v1/admin/audit` | Live last 100 |
| Platform controls | PUT | `/api/v1/admin/control` | Live mutation (dangerous) |

## Compatibility adapters added for Antigravity contract

| Frontend path | Backend behavior |
|---|---|
| `GET/PUT /api/v1/admin/quotas/global` | Facade over `admin_quota_policies` meters |
| `PUT/DELETE /api/v1/admin/quotas/users/{userId}` | Bulk override upsert / inherit-all |
| `POST /api/v1/admin/quotas/users/{userId}/reset-today` | Reset all meters for JST day |
| `GET /api/v1/admin/analytics` | Honest aggregate; series arrays empty + `UNAVAILABLE` markers |
| `GET /api/v1/admin/security/overview` | Alias of `/security/summary` |
| `POST /api/v1/admin/security/users/{id}/revoke-sessions` | Live TRON session revoke |
| `POST /api/v1/admin/security/emergency-revoke-all` | OWNER-only; preserves OWNER sessions |
| `POST /api/v1/admin/announcements/{id}/unpublish` | Status → UNPUBLISHED |
| `DELETE /api/v1/admin/announcements/{id}` | Soft archive (status → ARCHIVED) |
| `POST /api/v1/admin/providers/{id}/ping` | Cached health only; **no paid provider call** |
| `PUT /api/v1/admin/providers/{id}` | **409 NOT_ACTIVATED** (safety) |
| `POST /api/v1/admin/users` with `temporaryPassword` | **422** — insecure create disabled; use `/users/invite` |
| `POST /api/v1/admin/users/{id}/reset-password` + temp password | **422** — use initiate-only `/password-reset` |
| `DELETE /api/v1/admin/users/{id}` | OWNER soft-delete |

## Intentionally rejected / deferred frontend expectations

1. **Plaintext temporary passwords** — never accepted or returned.
2. **Fabricated demo usage/cost overlays** — backend returns `UNAVAILABLE` / empty series; integration must stop merging mock usage into live users.
3. **Provider routing mutation** — disabled until owner-approved rollout tests.
4. **Token / USD budgets** — schema ready for pricing/budget tables; values remain `UNAVAILABLE` until catalog configured.
5. **MFA** — explicitly `NOT_IMPLEMENTED`.
6. **STT/TTS separate metering** — documented gap; voice turn currently maps primarily via `AiGateway` VOICE_REASONING meter.

## Integration requirements (next mission)

1. Wire frontend `adminService.ts` to prefer measured endpoints and **stop overlaying demo usage** onto live `/users`.
2. Treat suspend / restore / control as production-impacting; keep DemoModeBanner accurate.
3. Map Spring `Page` (`content`, `totalElements`) for `/users/search` instead of inventing client-side pagination over mixed demo+live lists.
4. Do not claim cost charts are live until pricing rows exist.
5. Keep frontend branch and backend branch separate until owner-authorized merge.
