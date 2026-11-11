# TRON AI — Enterprise Admin Control Center
## Backend API Specifications & Integration Requirements for Cursor

**Document Version:** 1.0.0 (V1 + V2 + V3)  
**Author:** Antigravity (Frontend Pair Programmer)  
**Target Backend Engineer:** Cursor (Spring Boot & MySQL Development)  
**Base Repository:** `tron-ai-team/terafes_07`  
**Security Scope:** `@PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")`  

---

## 1. Overview & Objectives

The frontend for the **TRON AI Enterprise Admin Control Center** has been fully implemented in `feature/tron-admin-control-center-v1-v3`. It is structured to consume live Spring Boot endpoints via `adminService.ts`, currently using typed fallback fixtures where endpoints have not yet been backed by database persistence.

Cursor is tasked with implementing the backend services, controllers, Spring Data JPA repositories, and Flyway migrations required to make every administration capability fully persistent and enforced.

---

## 2. Existing Endpoints vs Required New Endpoints

### 2.1 Existing Endpoints in Spring Boot (`AdminController.java`)
The following endpoints already exist in `com.tronai.admin.AdminController`:
- `GET /api/v1/admin/dashboard` — Returns registered users, enabled users, suspended users, online devices, hybrid metrics, and agent engines.
- `GET /api/v1/admin/users` — Returns user ID, email, display name, role, enabled, suspendedAt, suspendReason.
- `POST /api/v1/admin/users/{id}/suspend` — Suspends user, sets `enabled=false`, revokes refresh tokens.
- `POST /api/v1/admin/users/{id}/restore` — Restores user, sets `enabled=true`, clears `suspendedAt`.
- `GET /api/v1/admin/control` — Returns current hybrid platform control entity.
- `PUT /api/v1/admin/control` — Updates mode (`NORMAL`, `EXHIBITION`, `MAINTENANCE`), routing toggles, and pause flags.
- `GET /api/v1/admin/audit` — Returns recent audit log entities from `AdminAuditLogRepository`.

### 2.2 New Endpoints to Implement (Phase 1 — Admin V1)

#### `POST /api/v1/admin/users`
Creates a local email/password user account.
- **Request Body:**
  ```json
  {
    "email": "candidate@example.com",
    "displayName": "Kenji Sato",
    "role": "USER",
    "temporaryPassword": "OptionalTempPassword123!",
    "sendWelcomeEmail": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": 15,
    "email": "candidate@example.com",
    "displayName": "Kenji Sato",
    "role": "USER",
    "status": "ACTIVE",
    "enabled": true,
    "registeredAt": "2026-11-12T02:00:00Z"
  }
  ```

#### `POST /api/v1/admin/users/invite`
Dispatches an email invitation token to a prospective candidate or staff member.
- **Request Body:**
  ```json
  {
    "email": "user@target-company.com",
    "role": "USER",
    "personalNote": "Welcome to TRON AI Career Center",
    "expiresInDays": 7
  }
  ```
- **Response (200 OK):** `{"success": true, "inviteToken": "inv_...", "expiresAt": "..."}`

#### `PUT /api/v1/admin/users/{id}/role`
Updates a user's role permission (`USER` ⇄ `ADMIN`).
- **Authorization Guard:** Must return `403 Forbidden` if attempting to demote or change the role of an `OWNER` account.
- **Request Body:** `{"role": "ADMIN"}`
- **Response (200 OK):** `{"id": 15, "role": "ADMIN"}`

#### `POST /api/v1/admin/users/{id}/reset-password`
Assigns a temporary hashed password to a local account.
- **Guard:** If user is a Google OAuth account, return `400 Bad Request` (`"Cannot reset password for Google OAuth accounts. Credentials managed by Google."`).
- **Request Body:** `{"temporaryPassword": "GeneratedPassword123!"}`
- **Response (200 OK):** `{"success": true, "requirePasswordChange": true}`

#### `DELETE /api/v1/admin/users/{id}`
Soft-deletes or disables an account.
- **Guard:** If user is `OWNER`, return `403 Forbidden`.
- **Response (200 OK):** `{"id": 15, "status": "DISABLED", "deleted": true}`

#### `GET /api/v1/admin/quotas/global`
Retrieves current global daily limits and feature toggles.
- **Response (200 OK):**
  ```json
  {
    "aiChatDailyLimit": 30,
    "aiVoiceDailyLimit": 10,
    "aiInterviewDailyLimit": 3,
    "cvMagicFillDailyLimit": 5,
    "cvAiAssistDailyLimit": 10,
    "dailyTokenBudget": 100000,
    "monthlyTokenBudget": 2500000,
    "monthlySpendingCapUsd": 15.00,
    "resetSchedule": "Daily at 00:00 JST (15:00 UTC)",
    "featuresEnabled": {
      "aiChat": true,
      "aiVoice": true,
      "aiInterview": true,
      "cvMagicFill": true,
      "cvAiAssist": true
    }
  }
  ```

#### `PUT /api/v1/admin/quotas/global`
Updates the global quotas table.
- **Request Body:** Partial or complete fields from above.
- **Enforcement:** The AI Gateway must query this table (or a cached Redis/Spring Cache version) when checking daily quota limits for standard users.

#### `PUT /api/v1/admin/quotas/users/{userId}`
Configures custom per-user quota overrides.
- **Request Body:**
  ```json
  {
    "aiChatDailyLimit": 50,
    "aiVoiceDailyLimit": 20,
    "aiInterviewDailyLimit": 5,
    "cvMagicFillDailyLimit": 10,
    "cvAiAssistDailyLimit": 20,
    "dailyTokenCeiling": 250000,
    "notes": "Approved for beta test"
  }
  ```
- **Response (200 OK):** Echoes saved override entity.

#### `DELETE /api/v1/admin/quotas/users/{userId}`
Deletes individual override, reverting user back to inheriting global limits.

#### `POST /api/v1/admin/quotas/users/{userId}/reset-today`
Resets the consumed request counter for the user for the current day back to 0.

---

### 2.3 New Endpoints to Implement (Phase 2 — Admin V2)

#### `GET /api/v1/admin/analytics`
- **Query Parameters:** `?range=today|7d|30d|custom&startDate=...&endDate=...`
- **Response Structure:** Must match `AnalyticsResponseData` in `frontend/src/services/admin/adminTypes.ts`:
  - `overview`: Total users, active users, requests today, monthly requests, token totals, estimated spend, error rate.
  - `dailyRequests`: Array of `{ date, totalRequests, chatRequests, voiceRequests, interviewRequests, cvRequests, failedRequests }`.
  - `userGrowth`: Array of `{ date, totalUsers, activeUsers, newSignups }`.
  - `tokenConsumption`: Array of `{ date, chatTokens, voiceTokens, interviewTokens, cvTokens, totalTokens }`.
  - `featureDistribution`: Array of `{ featureKey, featureName, requests, percentage, color }`.
  - `providerUsage`: Array of `{ providerId, providerName, requestCount, percentage, color }`.
  - `dailyCost`: Array of `{ date, cost, projectedCost }`.
  - `latencyTrend`: Array of `{ time, p50, p95, p99 }`.

#### `GET /api/v1/admin/providers`
Returns list of connected inference providers (Groq, Gemini, Mistral, OpenRouter, Ollama) and current routing matrix.
- **CRITICAL SECURITY REQUIREMENT:** NEVER return raw API keys in response. Always return masked values (e.g. `gsk_●●●●-9f8a`).

#### `PUT /api/v1/admin/providers/{id}`
Updates provider configuration:
```json
{
  "enabled": true,
  "preferredModel": "llama-3.3-70b-versatile",
  "fallbackRank": 1,
  "spendingLimitMonthlyUsd": 150.0
}
```

#### `POST /api/v1/admin/providers/{id}/ping`
Executes an active test ping to verify connectivity and latency.
- **Response:** `{"providerId": "groq", "status": "ONLINE", "latencyMs": 240, "checkedAt": "..."}`

#### `GET /api/v1/admin/costs`
Returns financial monitoring data matching `CostControlResponseData`:
- `overview`: `todayEstimatedCostUsd`, `monthlyEstimatedCostUsd`, `monthlyBudgetCapUsd`, `budgetUsagePct`, `projectedMonthEndCostUsd`.
- `byProvider`: Cost breakdown by provider.
- `byFeature`: Cost breakdown by feature.
- `topUsers`: Top 10 users by monthly token spend.

---

### 2.4 New Endpoints to Implement (Phase 3 — Admin V3)

#### `GET /api/v1/admin/security/overview`
Returns authentication method health, session counts, and security events.

#### `POST /api/v1/admin/security/users/{id}/revoke-sessions`
Invalidates all refresh tokens for a specific user ID in `refresh_tokens` table.

#### `POST /api/v1/admin/security/emergency-revoke-all`
Invalidates all active refresh tokens for all accounts except `OWNER`.

#### `GET /api/v1/admin/announcements`
Returns all announcements (Draft, Scheduled, Published, Expired).

#### `POST /api/v1/admin/announcements`
Creates a new announcement.
- **Request Body:**
  ```json
  {
    "titleEn": "TRON AI Update",
    "titleJa": "TRON AI アップデート",
    "messageEn": "Details in markdown...",
    "messageJa": "マークダウン詳細...",
    "audience": "ALL",
    "priority": "ANNOUNCEMENT",
    "status": "PUBLISHED",
    "startAt": "2026-11-12T00:00:00Z",
    "endAt": null
  }
  ```

#### `PUT /api/v1/admin/announcements/{id}`
Updates an announcement.

#### `DELETE /api/v1/admin/announcements/{id}`
Deletes an announcement.

---

## 3. Recommended Database Schema & Flyway Migration

Create a migration (e.g. `V24__admin_enterprise_suite.sql`):

```sql
-- 1. Global Quotas Configuration
CREATE TABLE IF NOT EXISTS platform_quotas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ai_chat_daily_limit INT NOT NULL DEFAULT 30,
    ai_voice_daily_limit INT NOT NULL DEFAULT 10,
    ai_interview_daily_limit INT NOT NULL DEFAULT 3,
    cv_magic_fill_daily_limit INT NOT NULL DEFAULT 5,
    cv_ai_assist_daily_limit INT NOT NULL DEFAULT 10,
    daily_token_budget BIGINT NOT NULL DEFAULT 100000,
    monthly_token_budget BIGINT NOT NULL DEFAULT 2500000,
    monthly_spending_cap_usd DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    reset_schedule VARCHAR(100) NOT NULL DEFAULT 'Daily at 00:00 JST',
    chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    voice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    interview_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cv_magic_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cv_assist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- 2. User Quota Overrides
CREATE TABLE IF NOT EXISTS user_quota_overrides (
    user_id BIGINT PRIMARY KEY,
    ai_chat_daily_limit INT NOT NULL,
    ai_voice_daily_limit INT NOT NULL,
    ai_interview_daily_limit INT NOT NULL,
    cv_magic_fill_daily_limit INT NOT NULL,
    cv_ai_assist_daily_limit INT NOT NULL,
    daily_token_ceiling BIGINT NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    CONSTRAINT fk_quota_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Announcements
CREATE TABLE IF NOT EXISTS admin_announcements (
    id VARCHAR(64) PRIMARY KEY,
    title_en VARCHAR(255) NOT NULL,
    title_ja VARCHAR(255) NOT NULL,
    message_en TEXT NOT NULL,
    message_ja TEXT NOT NULL,
    audience VARCHAR(32) NOT NULL DEFAULT 'ALL',
    priority VARCHAR(32) NOT NULL DEFAULT 'ANNOUNCEMENT',
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Failed Login Auditing
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    location VARCHAR(255),
    failure_reason VARCHAR(255) NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Quota Enforcement Architecture (AI Gateway)

When any user triggers an AI request (Chat, Voice, Interview, CV Magic Fill):
1. **Identify Actor User:** Extract user ID from authenticated JWT SecurityContext.
2. **Check Status:** If `user.isEnabled() == false` or `user.getSuspendedAt() != null`, reject with `403 Forbidden` (`{"detail": "Account suspended by administrator"}`).
3. **Lookup Limits:**
   - Check `user_quota_overrides` for `user_id`.
   - If present, apply user's custom limit for the feature.
   - If absent, apply limit from `platform_quotas`.
   - If user is `OWNER`, bypass all quota limits.
4. **Lookup Consumed Today:**
   - Query `ai_usage_events` count for `user_id` and `feature` where `created_at >= CURRENT_DATE at 00:00 JST`.
   - If `count >= limit`, return `429 Too Many Requests` (`{"detail": "Daily quota limit reached for this feature. Please try again tomorrow."}`).
5. **Increment Usage:** Upon completion of inference, record `AiUsageEvent` with token count and provider metadata.

---

## 5. Security & Safety Rules

1. **Owner Account Protection:**
   The `OWNER` account must never be suspended, role-demoted, or deleted. Any administrative request targeting the `OWNER` must immediately return `403 Forbidden` with detail `"Action prohibited: OWNER account cannot be modified"`.
2. **Password Security:**
   Admins can only generate new temporary passwords hashed with Spring Security's `PasswordEncoder` (`BCryptPasswordEncoder`). Old passwords can never be displayed or retrieved.
3. **Google OAuth Users:**
   Password reset endpoints must reject Google OAuth users.
4. **Audit Everything:**
   Every call to a mutating `/api/v1/admin/*` endpoint must persist an entry into `admin_audit_logs`.
