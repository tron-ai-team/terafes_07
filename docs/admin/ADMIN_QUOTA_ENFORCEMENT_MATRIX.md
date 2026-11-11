# Admin Quota Enforcement Matrix

Feature quotas are **JST calendar day** (`Asia/Tokyo`), stored separately from legacy Ultra **UTC** credits (V12).  
Default policy mode after V23 seed: **OBSERVE** (would-block counted, requests still allowed).

## Meters

| Meter | AiFeature mapping | Hint required? |
|---|---|---|
| AI_CHAT | CHAT | no |
| AI_VOICE | VOICE_REASONING | no |
| AI_INTERVIEW | INTERVIEW, INTERVIEW_FEEDBACK | no |
| CV_MAGIC_FILL | CV_GENERATION | `quotaMeterHint=CV_MAGIC_FILL` |
| CV_AI_ASSIST | CV_GENERATION | `quotaMeterHint=CV_AI_ASSIST` |
| OTHER_AI | CV_REVIEW, COMPANY_RESEARCH, CAREER_JOB_MATCHING, CODING_AGENT, BROWSER_AGENT, SUPERVISOR_PLAN | no |

## Entrypoint coverage

| Entrypoint | Path / class | Enforced via AiGateway feature quota? | Notes |
|---|---|---|---|
| Chat (gateway modes) | `ChatService` → `AiGateway` | YES | Ultra credits still separate |
| Voice LLM turn | `VoiceService` VOICE_REASONING | YES | STT/TTS **not** metered here |
| Voice STT | `RoutingSpeechToTextProvider` | **NO** | Bypass — cost undercount risk |
| Voice/Interview TTS | `tts/*` | **NO** | Bypass — cost undercount risk |
| Interview turn | `InterviewTurnEngine` | YES | Counts as AI_INTERVIEW units |
| Interview feedback | `InterviewAnalysisService` | YES | Same meter as interview |
| CV Magic Fill | `CvMagicFillService` | YES | Hint set |
| CV AI Assist | `CvAiAssistService` | YES | Hint set |
| CV review/parse | `CvParser` | YES (OTHER_AI) | |
| Company research | `CompanyAnalysisService` | YES (OTHER_AI) | |
| Job matching | `JobCompatibilityMatcher` | YES (OTHER_AI) | |
| Desktop agents | `DesktopAgentPlanner` | YES when gateway used | |
| Supervisor plan | `SupervisorService` | YES (OTHER_AI) | |
| Local FAST/QUALITY chat without gateway | hybrid local path | **NO / PARTIAL** | Documented gap |

## Reservation semantics

1. Reserve **before** provider invoke when `userId != null`
2. Idempotency key: request idempotency or `fq:{requestId}`
3. Settle on success; release on provider failure (units returned to reserved pool)
4. ENFORCE: N+1 → `FeatureQuotaExceededException` → HTTP 429 structured JSON
5. OBSERVE: allow + increment `observe_would_block_count`
6. Counter locking: MySQL/H2 pessimistic write on `(user_id, meter, quota_day)` + unique constraint

## Ultra legacy

- Unchanged UTC Ultra credit reservations in `ai_quota_reservations`
- Not rewritten; not reinterpreted as JST feature limits

## Rollout

- Keep OBSERVE until owner explicitly sets `mode=ENFORCE` per policy
- Do not enable ENFORCE on production without staged validation
