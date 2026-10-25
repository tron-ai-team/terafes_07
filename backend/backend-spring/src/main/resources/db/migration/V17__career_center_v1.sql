-- Career Center V1: candidate profile, CV builder versions, company analyses
-- Forward-only; does not modify V1–V16.

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    full_name VARCHAR(255) NULL,
    name_ja VARCHAR(255) NULL,
    furigana VARCHAR(255) NULL,
    date_of_birth DATE NULL,
    nationality VARCHAR(100) NULL,
    address_text VARCHAR(1024) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    photo_object_key VARCHAR(500) NULL,
    education_json LONGTEXT NULL,
    career_json LONGTEXT NULL,
    skills_json LONGTEXT NULL,
    languages_json LONGTEXT NULL,
    self_pr LONGTEXT NULL,
    career_goals LONGTEXT NULL,
    motivation LONGTEXT NULL,
    preferences_json LONGTEXT NULL,
    completeness_score INT NOT NULL DEFAULT 0,
    confirmed_fields_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidate_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_candidate_profiles_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS cv_builder_drafts (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    profile_id BIGINT NULL,
    template_code VARCHAR(40) NOT NULL,
    version_label VARCHAR(100) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    payload_json LONGTEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    source_cv_document_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cv_builder_drafts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cv_builder_drafts_profile FOREIGN KEY (profile_id) REFERENCES candidate_profiles(id) ON DELETE SET NULL
);
CREATE INDEX idx_cv_builder_drafts_user ON cv_builder_drafts(user_id);

CREATE TABLE IF NOT EXISTS cv_builder_versions (
    id VARCHAR(36) PRIMARY KEY,
    draft_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    template_code VARCHAR(40) NOT NULL,
    version_number INT NOT NULL,
    version_label VARCHAR(100) NULL,
    payload_json LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cv_builder_versions_draft FOREIGN KEY (draft_id) REFERENCES cv_builder_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cv_builder_versions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_cv_builder_versions_draft ON cv_builder_versions(draft_id);

CREATE TABLE IF NOT EXISTS cv_generated_documents (
    id VARCHAR(36) PRIMARY KEY,
    version_id VARCHAR(36) NULL,
    draft_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    format VARCHAR(16) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cv_gen_docs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cv_gen_docs_draft FOREIGN KEY (draft_id) REFERENCES cv_builder_drafts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cv_ai_suggestions (
    id VARCHAR(36) PRIMARY KEY,
    draft_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    original_text LONGTEXT NULL,
    proposed_text LONGTEXT NULL,
    reason LONGTEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    CONSTRAINT fk_cv_ai_sugg_draft FOREIGN KEY (draft_id) REFERENCES cv_builder_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cv_ai_sugg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_analyses (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_name VARCHAR(512) NOT NULL,
    website_url VARCHAR(1024) NOT NULL,
    recruitment_url VARCHAR(1024) NULL,
    cv_document_id BIGINT NULL,
    cv_draft_id VARCHAR(36) NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    status VARCHAR(32) NOT NULL,
    overview_json LONGTEXT NULL,
    requirements_json LONGTEXT NULL,
    comparison_json LONGTEXT NULL,
    preparation_json LONGTEXT NULL,
    error_message VARCHAR(1024) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_company_analyses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_company_analyses_user ON company_analyses(user_id);

CREATE TABLE IF NOT EXISTS company_research_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL,
    source_url VARCHAR(1024) NOT NULL,
    title VARCHAR(512) NULL,
    excerpt LONGTEXT NULL,
    extracted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_sources_analysis FOREIGN KEY (analysis_id) REFERENCES company_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_cv_suggestions (
    id VARCHAR(36) PRIMARY KEY,
    analysis_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    original_text LONGTEXT NULL,
    proposed_text LONGTEXT NULL,
    reason LONGTEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    transferred_draft_id VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_cv_sugg_analysis FOREIGN KEY (analysis_id) REFERENCES company_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_company_cv_sugg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE interview_sessions ADD COLUMN company_analysis_id VARCHAR(36) NULL;
ALTER TABLE career_jobs ADD COLUMN job_category VARCHAR(255) NULL;
ALTER TABLE career_jobs ADD COLUMN graduation_year VARCHAR(32) NULL;
