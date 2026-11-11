-- TRON Admin Control Center V1–V3 (additive only).
-- Feature-daily quotas are JST-day based and independent of legacy Ultra UTC credits (V12).
-- Enforcement mode defaults to OBSERVE so existing production traffic is not blocked on migrate.

-- H2-compatible (no MySQL-only AFTER column clauses).
ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE users
    ADD COLUMN delete_reason VARCHAR(500) NULL;

ALTER TABLE admin_audit_logs
    ADD COLUMN result_status VARCHAR(32) NULL;

ALTER TABLE admin_audit_logs
    ADD COLUMN request_id VARCHAR(64) NULL;

ALTER TABLE admin_audit_logs
    ADD COLUMN actor_role VARCHAR(30) NULL;

CREATE TABLE IF NOT EXISTS admin_quota_policies (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    meter           VARCHAR(64)  NOT NULL,
    scope           VARCHAR(32)  NOT NULL,
    role_name       VARCHAR(30)  NULL,
    daily_limit     INT          NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    mode            VARCHAR(32)  NOT NULL DEFAULT 'OBSERVE',
    timezone        VARCHAR(64)  NOT NULL DEFAULT 'Asia/Tokyo',
    revision        INT          NOT NULL DEFAULT 1,
    updated_by      BIGINT       NULL,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_quota_policy (meter, scope, role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_user_quota_overrides (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    meter           VARCHAR(64)  NOT NULL,
    override_limit  INT          NULL,
    inherit         BOOLEAN      NOT NULL DEFAULT FALSE,
    notes           VARCHAR(500) NULL,
    revision        INT          NOT NULL DEFAULT 1,
    updated_by      BIGINT       NULL,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_user_quota (user_id, meter),
    CONSTRAINT fk_admin_user_quota_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_feature_daily_counters (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    meter           VARCHAR(64)  NOT NULL,
    quota_day       DATE         NOT NULL,
    timezone        VARCHAR(64)  NOT NULL DEFAULT 'Asia/Tokyo',
    reserved_count  INT          NOT NULL DEFAULT 0,
    settled_count   INT          NOT NULL DEFAULT 0,
    denied_count    INT          NOT NULL DEFAULT 0,
    observe_would_block_count INT NOT NULL DEFAULT 0,
    version         INT          NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ai_feature_day (user_id, meter, quota_day),
    KEY idx_ai_feature_day_lookup (quota_day, meter),
    CONSTRAINT fk_ai_feature_counter_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_feature_quota_reservations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    meter           VARCHAR(64)  NOT NULL,
    quota_day       DATE         NOT NULL,
    units           INT          NOT NULL DEFAULT 1,
    status          VARCHAR(32)  NOT NULL,
    mode_at_reserve VARCHAR(32)  NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_id      VARCHAR(64)  NOT NULL,
    feature         VARCHAR(64)  NULL,
    provider        VARCHAR(64)  NULL,
    model_id        VARCHAR(128) NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at      TIMESTAMP    NULL,
    UNIQUE KEY uq_ai_feature_quota_idem (user_id, idempotency_key),
    KEY idx_ai_feature_quota_day (user_id, meter, quota_day, status),
    CONSTRAINT fk_ai_feature_quota_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_quota_adjustments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    meter           VARCHAR(64)  NOT NULL,
    quota_day       DATE         NOT NULL,
    adjustment      INT          NOT NULL,
    reason          VARCHAR(500) NOT NULL,
    request_id      VARCHAR(64)  NULL,
    actor_user_id   BIGINT       NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_quota_adj_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_announcements (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    title_en        VARCHAR(300) NOT NULL,
    title_ja        VARCHAR(300) NOT NULL,
    body_en         TEXT         NOT NULL,
    body_ja         TEXT         NOT NULL,
    severity        VARCHAR(32)  NOT NULL DEFAULT 'INFO',
    audience        VARCHAR(32)  NOT NULL DEFAULT 'ALL',
    status          VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    start_at        TIMESTAMP    NULL,
    end_at          TIMESTAMP    NULL,
    created_by      BIGINT       NULL,
    updated_by      BIGINT       NULL,
    published_at    TIMESTAMP    NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_admin_ann_status_time (status, start_at, end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_cost_pricing (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider        VARCHAR(64)  NOT NULL,
    model_id        VARCHAR(128) NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'USD',
    input_per_1m    DECIMAL(18, 8) NULL,
    output_per_1m   DECIMAL(18, 8) NULL,
    stt_per_minute  DECIMAL(18, 8) NULL,
    tts_per_1k_chars DECIMAL(18, 8) NULL,
    effective_from  TIMESTAMP    NOT NULL,
    effective_to    TIMESTAMP    NULL,
    source          VARCHAR(64)  NOT NULL DEFAULT 'MANUAL',
    notes           VARCHAR(500) NULL,
    updated_by      BIGINT       NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_pricing (provider, model_id, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_budget_policies (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    scope           VARCHAR(32)  NOT NULL DEFAULT 'GLOBAL',
    currency        CHAR(3)      NOT NULL DEFAULT 'USD',
    monthly_limit   DECIMAL(18, 4) NULL,
    warn_pct        INT          NOT NULL DEFAULT 80,
    critical_pct    INT          NOT NULL DEFAULT 95,
    mode            VARCHAR(32)  NOT NULL DEFAULT 'OBSERVE',
    enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
    revision        INT          NOT NULL DEFAULT 1,
    updated_by      BIGINT       NULL,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_budget_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_security_events (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type      VARCHAR(80)  NOT NULL,
    severity        VARCHAR(32)  NOT NULL DEFAULT 'INFO',
    actor_user_id   BIGINT       NULL,
    target_user_id  BIGINT       NULL,
    detail          VARCHAR(1000) NULL,
    request_id      VARCHAR(64)  NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_admin_sec_events_created (created_at),
    KEY idx_admin_sec_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_user_invitations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    role_name       VARCHAR(30)  NOT NULL DEFAULT 'USER',
    token_hash      VARCHAR(128) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    note            VARCHAR(500) NULL,
    invited_by      BIGINT       NULL,
    expires_at      TIMESTAMP    NOT NULL,
    accepted_at     TIMESTAMP    NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_invite_token (token_hash),
    KEY idx_admin_invite_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed global feature policies (OBSERVE). Limits are demo defaults; not enforced until mode=ENFORCE.
INSERT INTO admin_quota_policies (meter, scope, role_name, daily_limit, enabled, mode, timezone, revision)
VALUES
    ('AI_CHAT', 'GLOBAL', NULL, 30, TRUE, 'OBSERVE', 'Asia/Tokyo', 1),
    ('AI_VOICE', 'GLOBAL', NULL, 10, TRUE, 'OBSERVE', 'Asia/Tokyo', 1),
    ('AI_INTERVIEW', 'GLOBAL', NULL, 3, TRUE, 'OBSERVE', 'Asia/Tokyo', 1),
    ('CV_MAGIC_FILL', 'GLOBAL', NULL, 5, TRUE, 'OBSERVE', 'Asia/Tokyo', 1),
    ('CV_AI_ASSIST', 'GLOBAL', NULL, 10, TRUE, 'OBSERVE', 'Asia/Tokyo', 1),
    ('OTHER_AI', 'GLOBAL', NULL, 50, TRUE, 'OBSERVE', 'Asia/Tokyo', 1);

INSERT INTO admin_budget_policies (scope, currency, monthly_limit, warn_pct, critical_pct, mode, enabled, revision)
VALUES ('GLOBAL', 'USD', NULL, 80, 95, 'OBSERVE', FALSE, 1);
