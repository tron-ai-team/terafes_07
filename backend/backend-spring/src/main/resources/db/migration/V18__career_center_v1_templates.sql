CREATE TABLE IF NOT EXISTS cv_templates (
    code VARCHAR(40) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    locale VARCHAR(16) NOT NULL,
    schema_json LONGTEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cv_templates (code, display_name, locale, schema_json, active) VALUES
('RIREKISHO_JA', '履歴書（日本語）', 'ja', '{"sections":["personal","education","work","certifications","selfPr"]}', TRUE),
('SHOKUMU_JA', '職務経歴書（日本語）', 'ja', '{"sections":["summary","workExperience","skills","selfPr"]}', TRUE),
('RESUME_EN', 'Resume (English)', 'en', '{"sections":["contact","summary","experience","education","skills"]}', TRUE);
