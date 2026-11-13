# Frontend Integration Handoff (Antigravity ↔ Backend)

**Do not merge this backend PR with unfinished UI without a separate integration pass.**

## Ready now

1. Replace mock overlays for live users with `GET /api/v1/admin/users/search` (Spring Page).
2. Map `loginMethods` / `status` instead of inventing Google password fields.
3. Quotas UI → `GET/PUT /api/v1/admin/quotas/policies*` and `/users/{id}/quotas*`.
4. Show mode badge: OBSERVE vs ENFORCE; never claim blocked while OBSERVE.
5. Analytics: only display fields with `measurement=measured`; show UNAVAILABLE for spend when costs status is UNAVAILABLE.
6. Security: if `mfa.status=NOT_IMPLEMENTED`, disable MFA UI claims.
7. Announcements admin + user banner: `GET /api/v1/announcements/active`.

## Mapping table

| Antigravity type/field | Backend |
|---|---|
| `GetUsersResponse.users` | `Page.content` |
| `totalCount` | `totalElements` |
| `page/pageSize` | `number/size` |
| `authProvider` | derive from `loginMethods` |
| `GlobalQuotaConfig.aiChatDailyLimit` | policy meter `AI_CHAT.dailyLimit` |
| `UserQuotaOverride` | `/users/{id}/quotas/{meter}` |
| Provider `credentialMasked` | do not expect key fragments |
| Demo analytics series | use measured overview/usage; timeseries may be empty |

## Disabled / demo-only

- Budget BLOCK enforcement
- MFA enrollment
- Email invite delivery (offline `setupToken` only)
- Fabricated per-user cost dollars

## Integration sequence (tomorrow)

1. Review backend PR CI green
2. Point adminService live paths to new endpoints; remove fake usage merge
3. E2E: ADMIN search → suspend → restore; OWNER role change; quota OBSERVE→ENFORCE on test user only
4. Confirm Chat/Voice/CV still work for normal users under OBSERVE
5. Owner approval before ENFORCE in production
