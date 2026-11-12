# Admin Backend API Contract (V1–V3)

All `/api/v1/admin/**` require JWT + `ADMIN` or `OWNER`.  
OWNER-only noted per endpoint. Errors: 401 unauthenticated, 403 forbidden, 404 missing, 409/422 validation, 429 quota.

Legacy routes preserved:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | Existing counters + hybrid |
| GET | `/api/v1/admin/users` | Legacy unpaginated array |
| POST | `/api/v1/admin/users/{id}/suspend` | reason optional |
| POST | `/api/v1/admin/users/{id}/restore` | |
| GET/PUT | `/api/v1/admin/control` | Platform control |
| GET | `/api/v1/admin/audit` | Last 100 |

## Users

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/admin/users/search?q&role&enabled&deleted&page&size` | ADMIN+ |
| GET | `/api/v1/admin/users/{id}` | ADMIN+ |
| POST | `/api/v1/admin/users/invite` | OWNER |
| POST | `/api/v1/admin/users/{id}/soft-delete` | OWNER |
| PUT | `/api/v1/admin/users/{id}/role` | OWNER |
| POST | `/api/v1/admin/users/{id}/revoke-sessions` | ADMIN+ |
| POST | `/api/v1/admin/users/{id}/password-reset` | ADMIN+ (initiate only) |
| GET | `/api/v1/admin/users/{id}/quotas` | ADMIN+ |
| PUT | `/api/v1/admin/users/{id}/quotas/{meter}` | ADMIN+ |
| DELETE | `/api/v1/admin/users/{id}/quotas/{meter}` | ADMIN+ |
| POST | `/api/v1/admin/users/{id}/quotas/{meter}/reset` | ADMIN+ |

### User summary example

```json
{
  "id": 12,
  "email": "user@example.com",
  "displayName": "User",
  "role": "USER",
  "enabled": true,
  "status": "ACTIVE",
  "loginMethods": ["LOCAL", "GOOGLE"],
  "lastLoginAt": "2026-11-11T10:00:00Z",
  "createdAt": "2026-10-01T01:00:00Z",
  "suspendedAt": null,
  "deletedAt": null
}
```

`passwordHash`, Google `providerSubject`, and tokens are never returned.

### Invite (OWNER) response

```json
{
  "id": 1,
  "email": "new@example.com",
  "role": "USER",
  "status": "PENDING",
  "delivery": "OFFLINE_ADMIN_SETUP",
  "emailDeliveryConfigured": false,
  "setupToken": "<once>",
  "expiresAt": "2026-11-19T00:00:00Z"
}
```

## Quotas

Meters: `AI_CHAT`, `AI_VOICE`, `AI_INTERVIEW`, `CV_MAGIC_FILL`, `CV_AI_ASSIST`, `OTHER_AI`  
Timezone: `Asia/Tokyo` (JST day). Default mode: `OBSERVE`.

| Method | Path |
|---|---|
| GET | `/api/v1/admin/quotas/policies` |
| PUT | `/api/v1/admin/quotas/policies/{id}` |
| PUT | `/api/v1/admin/quotas/policies/by-meter/{meter}` |
| GET | `/api/v1/admin/quotas/users/{userId}/usage` |
| PUT | `/api/v1/admin/quotas/users/{userId}/overrides/{meter}` |
| DELETE | `/api/v1/admin/quotas/users/{userId}/overrides/{meter}` |
| GET | `/api/v1/ai/quotas` | Current user self summary |

### Effective usage example

```json
{
  "quotaDay": "2026-11-12",
  "timezone": "Asia/Tokyo",
  "resetAt": "2026-11-12T15:00:00Z",
  "meters": [
    {
      "meter": "AI_CHAT",
      "dailyLimit": 30,
      "used": 2,
      "remaining": 28,
      "mode": "OBSERVE",
      "enabled": true
    }
  ]
}
```

### 429 feature quota body

```json
{
  "detail": "Daily feature quota exceeded",
  "code": "FEATURE_QUOTA_EXCEEDED",
  "feature": "CHAT",
  "meter": "AI_CHAT",
  "limit": 30,
  "used": 30,
  "remaining": 0,
  "resetAt": "2026-11-12T15:00:00Z"
}
```

Header: `Retry-After` (seconds).

## Analytics / Providers / Costs

| Method | Path | Honesty |
|---|---|---|
| GET | `/api/v1/admin/analytics/overview` | measured counters; DAU/spend may be `unavailable` |
| GET | `/api/v1/admin/analytics/timeseries?range=` | partial / empty until materialized |
| GET | `/api/v1/admin/analytics/usage?range=` | measured event counts |
| GET | `/api/v1/admin/providers` | configured boolean only |
| GET | `/api/v1/admin/providers/{id}` | no secrets |
| GET | `/api/v1/admin/costs/overview` | `UNAVAILABLE` without pricing rows |
| GET | `/api/v1/admin/costs/pricing` | catalog |
| GET/PUT | `/api/v1/admin/budgets` | BLOCK mode gated / disabled by default |

## Security / Audit / Announcements / Health

| Method | Path |
|---|---|
| GET | `/api/v1/admin/security/overview` |
| GET | `/api/v1/admin/audit/search` |
| GET/POST | `/api/v1/admin/announcements` |
| GET/PUT | `/api/v1/admin/announcements/{id}` |
| POST | `/api/v1/admin/announcements/{id}/publish` |
| POST | `/api/v1/admin/announcements/{id}/unpublish` |
| GET | `/api/v1/announcements/active` | authenticated users |
| GET | `/api/v1/admin/system/health` | sanitized |

### Security overview excerpt

```json
{
  "mfa": { "status": "NOT_IMPLEMENTED", "detail": "Multi-factor authentication is not enabled on this deployment" },
  "sessionRevocation": { "supported": true },
  "oauth": { "providersExposed": false }
}
```

## Frontend-compatible facades (Antigravity @ 4bd3e00d)

| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/api/v1/admin/quotas/global` | Flat GlobalQuotaConfig facade |
| PUT/DELETE | `/api/v1/admin/quotas/users/{userId}` | Bulk overrides / inherit |
| POST | `/api/v1/admin/quotas/users/{userId}/reset-today` | All meters, JST day |
| GET | `/api/v1/admin/analytics` | Aggregate + empty honest series |
| GET | `/api/v1/admin/security/overview` | Alias of `/summary` |
| POST | `/api/v1/admin/security/emergency-revoke-all` | OWNER-only |
| POST | `/api/v1/admin/providers/{id}/ping` | Cached health; no paid call |
| PUT | `/api/v1/admin/providers/{id}` | 409 NOT_ACTIVATED |
| POST | `/api/v1/admin/users` | 422 if temporaryPassword create |
| DELETE | `/api/v1/admin/users/{id}` | Soft-delete |
| DELETE | `/api/v1/admin/announcements/{id}` | Archive |

See also: `docs/admin/ADMIN_FRONTEND_API_MAPPING.md`.

## Antigravity mapping notes

| Frontend expectation | Backend reality |
|---|---|
| Paginated `GetUsersResponse` | Spring `Page` (`content`, `totalElements`, `number`, `size`) |
| Fake demo usage overlays | Prefer `/users/{id}/quotas` + analytics measured fields |
| GlobalQuotaConfig flat fields | Map to `admin_quota_policies` meters |
| Provider credentialMasked | Boolean `configured` only / `••••configured`; never raw keys |
| MFA toggle | Must not claim enabled while `NOT_IMPLEMENTED` |
| temporaryPassword create/reset | Rejected — invite / initiate-only reset |
