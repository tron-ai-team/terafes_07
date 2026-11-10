-- CP-04: shared verified job source cache + verification metadata on user jobs.
-- H2-compatible (no MySQL-only AFTER clauses).

CREATE TABLE IF NOT EXISTS career_job_source_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_provider VARCHAR(64) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    source_url VARCHAR(1024) NOT NULL,
    title VARCHAR(512) NOT NULL,
    company VARCHAR(512) NOT NULL,
    location VARCHAR(255) NULL,
    employment_type VARCHAR(100) NULL,
    description_text LONGTEXT NULL,
    required_skills_json LONGTEXT NULL,
    application_status VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
    international_student_policy VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
    new_graduate_eligible BOOLEAN NULL,
    graduation_year VARCHAR(32) NULL,
    content_hash VARCHAR(64) NOT NULL,
    last_verified_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_career_job_source_cache UNIQUE (source_provider, source_id)
);
CREATE INDEX idx_career_job_source_cache_expires ON career_job_source_cache(expires_at);
CREATE INDEX idx_career_job_source_cache_provider ON career_job_source_cache(source_provider);

ALTER TABLE career_jobs ADD COLUMN last_verified_at TIMESTAMP NULL;
ALTER TABLE career_jobs ADD COLUMN application_status VARCHAR(40) NULL;
ALTER TABLE career_jobs ADD COLUMN international_student_policy VARCHAR(40) NULL;
ALTER TABLE career_jobs ADD COLUMN verification_notes VARCHAR(1024) NULL;
