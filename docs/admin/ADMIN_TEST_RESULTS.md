# Admin Test Results

**Date:** 2026-11-13  
**Environment:** local Windows, JDK 21, H2 MySQL-mode + Flyway V23, profile `test`  
**Command:**

```bash
./mvnw "-Dtest=AdminAuthorizationTest,AdminV1AuthorizationExtendedTest,AdminFeatureQuotaServiceTest,AdminAnnouncementTest,AdminFrontendCompatApiTest" test
```

## Summary

| Suite | Result |
|---|---|
| `AdminAuthorizationTest` | PASS |
| `AdminV1AuthorizationExtendedTest` | PASS |
| `AdminFeatureQuotaServiceTest` | PASS |
| `AdminAnnouncementTest` | PASS |
| `AdminFrontendCompatApiTest` | PASS |
| **Total selected** | **19 PASS / BUILD SUCCESS** |

## Coverage exercised

- Anonymous → 401 on `/users/search`
- USER → 403 on admin dashboard / quotas / analytics / global quotas
- ADMIN → dashboard + user search (no `passwordHash`)
- ADMIN → cannot change roles / cannot emergency-revoke
- OWNER → can change USER → ADMIN; emergency revoke preserves owners
- Feature quota OBSERVE over-limit allowed + would-block counter
- Feature quota ENFORCE blocks N+1
- Idempotent reserve + concurrent ENFORCE limit=1
- Announcement publish / active feed path
- Frontend global quota GET/PUT facade
- Insecure temporaryPassword create → 422
- Analytics aggregate honesty (`UNAVAILABLE`, empty series)
- Provider mutation → 409; secrets never exposed
- Flyway V1–V23 migrate on H2

## CI (PR #23)

Prior head already green. Re-run expected after this push.

## Not run / blocked

| Item | Status | Reason |
|---|---|---|
| Live Google OAuth against real accounts | NOT RUN | Safety |
| Multi-node quota race across processes | NOT RUN | Single JVM IT; DB locks intended |
| Production `api.tronai.tech` smoke / writes | NOT RUN | Forbidden |
| Full Maven suite beyond admin-focused tests | NOT RUN this pass | Targeted acceptance gate executed |

## Evidence notes

- Surefire: `backend/backend-spring/target/surefire-reports/`
- No production DB or secrets printed
