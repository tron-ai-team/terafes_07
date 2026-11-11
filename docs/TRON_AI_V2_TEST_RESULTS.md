# TRON AI V2 — Test Results

**Branch:** `feature/interview-v2-intelligent-engine`  
**Date:** 2026-11-11  
**GitHub account:** `tt25304025-dev`

## Frontend unit tests (tsx)

| Suite | Result |
|-------|--------|
| `src/services/__tests__/authLifecycle.test.ts` | PASS (5/5) |
| `src/services/__tests__/refreshSingleFlight.test.ts` | PASS (4/4) |

### Auth lifecycle coverage

1. `expiresIn` stored on `setAccessToken`
2. Failed refresh clears token + notifies session-invalid handler
3. Protected 401 + failed refresh returns 401 and clears session
4. `ensureFreshAccessToken` refreshes when within 60s skew
5. `ensureFreshAccessToken` skips network when token far from expiry

## Frontend production build

| Check | Result |
|-------|--------|
| `tsc -b && vite build` | PASS |

## Backend Maven (selected)

Command:

```text
mvnw -Dtest=InterviewTurnEngineTest,InterviewAnalysisServiceTest,InterviewReportServiceTest,InterviewSessionManagerEngineStateTest,InterviewReportEndpointTest,InterviewEndpointTest,InterviewVoiceAnswerTest,AuthIntegrationTest test
```

| Suite | Result |
|-------|--------|
| `InterviewTurnEngineTest` | PASS |
| `InterviewAnalysisServiceTest` | PASS |
| `InterviewReportServiceTest` | PASS (Japanese HTML present) |
| `InterviewSessionManagerEngineStateTest` | PASS |
| `InterviewReportEndpointTest` | PASS (401 / 404 / 200 mocked Gotenberg) |
| `InterviewEndpointTest` | PASS |
| `InterviewVoiceAnswerTest` | PASS (includes live SMART routing when gateway available) |
| `AuthIntegrationTest` | PASS |
| Flyway | Validated **22** migrations including `V22__interview_v2_memory` |

Overall Maven selected suite: **exit code 0**.

## Not executed in this delivery

| Area | Status |
|------|--------|
| Full `mvn test` (entire module) | Not run end-to-end in this session (selected suites passed) |
| Playwright browser E2E against production | Not run (forbidden destructive/prod risk; no dedicated local E2E harness invoked) |
| Live Gotenberg PDF byte signature on production | Not verified (dev/tests mock or require local Gotenberg) |
| Multi-hour real idle wait | Replaced by controlled expiry/skew unit tests |

## Cloud AI note

`InterviewVoiceAnswerTest` logged progression with provider `GROQ` / model `openai/gpt-oss-120b` when credentials were available in the local test profile. Treat that as a gated live path — not every CI runner will have cloud secrets.
