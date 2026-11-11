# Admin Test Results

**Date:** 2026-11-12  
**Environment:** local Windows, JDK 21, H2 MySQL-mode + Flyway V23, profile `test`  
**Command:**

```bash
./mvnw "-Dtest=AdminAuthorizationTest,AdminV1AuthorizationExtendedTest,AdminFeatureQuotaServiceTest,AdminAnnouncementTest" test
```

## Summary

| Suite | Tests | Result |
|---|---|---|
| `AdminAuthorizationTest` | 3 | PASS |
| `AdminV1AuthorizationExtendedTest` | 5 | PASS |
| `AdminFeatureQuotaServiceTest` | 4 | PASS |
| `AdminAnnouncementTest` | 1+ | PASS |
| **Total** | **13** | **PASS / BUILD SUCCESS** |

## Coverage exercised

- Anonymous → 401 on `/users/search`
- USER → 403 on admin dashboard / quotas
- ADMIN → dashboard + user search (no `passwordHash`)
- ADMIN → cannot change roles (403 via `AuthorizationDeniedException`)
- OWNER → can change USER → ADMIN
- Feature quota OBSERVE over-limit allowed + would-block counter
- Feature quota ENFORCE blocks N+1
- Idempotent reserve
- Concurrent ENFORCE limit=1 (parallel latch)
- Announcement publish / active feed path
- Flyway V1–V23 migrate on H2

## CI (PR #23)

| Check | Status |
|---|---|
| Backend Maven tests | PASS (after FK cascade + auth cleanup fix) |
| Frontend build | PASS |
| Security checks | PASS |
| Deployment recovery tests | PASS |
| Docker image build | may still be pending / optional |

Head SHA at report time: see PR `feature/tron-admin-backend-v1-v3`.

## Not run / blocked

| Item | Status | Reason |
|---|---|---|
| Live Google OAuth against real accounts | NOT RUN | Safety — no production user writes |
| Multi-node quota race across processes | NOT RUN | Single JVM IT; DB locks intended for multi-node |
| Production `api.tronai.tech` smoke | NOT RUN | Forbidden by mission rules |

## Evidence notes

- Surefire: `backend/backend-spring/target/surefire-reports/`
- No production DB or secrets printed
