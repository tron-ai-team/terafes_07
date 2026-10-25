-- Career Center: jobs, matches, applications, CV enhancements, ops checkpoints
-- Note: no MySQL-only "AFTER column" clauses (H2 test profile compatibility).

ALTER TABLE cv_documents ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cv_documents ADD COLUMN version_label VARCHAR(100) NULL;

ALTER TABLE cv_profiles ADD COLUMN languages_json LONGTEXT NULL;
ALTER TABLE cv_profiles ADD COLUMN summary_text LONGTEXT NULL;
ALTER TABLE cv_profiles ADD COLUMN raw_text_excerpt LONGTEXT NULL;

CREATE TABLE IF NOT EXISTS career_search_runs (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_json LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    steps_json LONGTEXT NULL,
    metrics_json LONGTEXT NULL,
    blocked_reason VARCHAR(512) NULL,
    error_message VARCHAR(1024) NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_career_search_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_career_search_runs_user ON career_search_runs(user_id);

CREATE TABLE IF NOT EXISTS career_jobs (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    run_id VARCHAR(36) NULL,
    source_provider VARCHAR(64) NOT NULL,
    source_id VARCHAR(255) NULL,
    source_url VARCHAR(1024) NOT NULL,
    title VARCHAR(512) NOT NULL,
    company VARCHAR(512) NOT NULL,
    location VARCHAR(255) NULL,
    employment_type VARCHAR(100) NULL,
    new_graduate_eligible BOOLEAN NULL,
    japanese_requirement VARCHAR(255) NULL,
    education_requirement VARCHAR(512) NULL,
    experience_requirement VARCHAR(512) NULL,
    visa_support VARCHAR(100) NULL,
    salary VARCHAR(255) NULL,
    required_skills_json LONGTEXT NULL,
    description_text LONGTEXT NULL,
    published_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_career_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_career_jobs_run FOREIGN KEY (run_id) REFERENCES career_search_runs(id) ON DELETE SET NULL,
    CONSTRAINT uk_career_jobs_user_hash UNIQUE (user_id, content_hash)
);
CREATE INDEX idx_career_jobs_user ON career_jobs(user_id);

CREATE TABLE IF NOT EXISTS career_job_saves (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    saved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_career_job_saves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_career_job_saves_job FOREIGN KEY (job_id) REFERENCES career_jobs(id) ON DELETE CASCADE,
    CONSTRAINT uk_career_job_saves UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS career_matches (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    cv_document_id BIGINT NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    match_score INT NOT NULL,
    match_tier VARCHAR(16) NOT NULL,
    mandatory_blockers_json LONGTEXT NULL,
    matched_skills_json LONGTEXT NULL,
    missing_skills_json LONGTEXT NULL,
    strengths_json LONGTEXT NULL,
    gaps_json LONGTEXT NULL,
    reasons_json LONGTEXT NULL,
    improvements_json LONGTEXT NULL,
    rubric_json LONGTEXT NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_career_matches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_career_matches_cv FOREIGN KEY (cv_document_id) REFERENCES cv_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_career_matches_job FOREIGN KEY (job_id) REFERENCES career_jobs(id) ON DELETE CASCADE
);
CREATE INDEX idx_career_matches_user ON career_matches(user_id);

CREATE TABLE IF NOT EXISTS job_applications (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    job_id VARCHAR(36) NULL,
    cv_document_id BIGINT NULL,
    interview_session_id VARCHAR(36) NULL,
    company VARCHAR(512) NOT NULL,
    position VARCHAR(512) NOT NULL,
    source_url VARCHAR(1024) NULL,
    status VARCHAR(40) NOT NULL,
    application_date DATE NULL,
    next_action VARCHAR(512) NULL,
    deadline_at TIMESTAMP NULL,
    interview_at TIMESTAMP NULL,
    notes LONGTEXT NULL,
    reminder_json LONGTEXT NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_applications_job FOREIGN KEY (job_id) REFERENCES career_jobs(id) ON DELETE SET NULL,
    CONSTRAINT fk_job_applications_cv FOREIGN KEY (cv_document_id) REFERENCES cv_documents(id) ON DELETE SET NULL,
    CONSTRAINT uk_job_applications_user_hash UNIQUE (user_id, content_hash)
);
CREATE INDEX idx_job_applications_user ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

CREATE TABLE IF NOT EXISTS job_application_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(40) NULL,
    to_status VARCHAR(40) NOT NULL,
    note VARCHAR(1024) NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_status_hist_app FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
);
CREATE INDEX idx_app_status_hist_app ON job_application_status_history(application_id);

CREATE TABLE IF NOT EXISTS career_ops_checkpoints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(64) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    checkpoint_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    payload_json LONGTEXT NULL,
    last_error VARCHAR(1024) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_career_ops_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_career_ops UNIQUE (user_id, provider, source_id, checkpoint_key)
);

ALTER TABLE interview_sessions ADD COLUMN cv_document_id BIGINT NULL;
ALTER TABLE interview_sessions ADD COLUMN job_id VARCHAR(36) NULL;
ALTER TABLE interview_sessions ADD COLUMN language VARCHAR(16) NULL;
