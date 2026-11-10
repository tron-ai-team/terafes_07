-- Candidate Profile master expansion (forward-only).
-- Preserves existing candidate_profiles rows and JSON bags.
-- Adds structured personal/address fields and additional JSON sections.

ALTER TABLE candidate_profiles ADD COLUMN gender VARCHAR(32) NULL;
ALTER TABLE candidate_profiles ADD COLUMN postal_code VARCHAR(20) NULL;
ALTER TABLE candidate_profiles ADD COLUMN prefecture VARCHAR(100) NULL;
ALTER TABLE candidate_profiles ADD COLUMN city VARCHAR(100) NULL;
ALTER TABLE candidate_profiles ADD COLUMN street_address VARCHAR(255) NULL;
ALTER TABLE candidate_profiles ADD COLUMN building VARCHAR(255) NULL;
ALTER TABLE candidate_profiles ADD COLUMN projects_json LONGTEXT NULL;
ALTER TABLE candidate_profiles ADD COLUMN certifications_json LONGTEXT NULL;
ALTER TABLE candidate_profiles ADD COLUMN career_stories_json LONGTEXT NULL;
ALTER TABLE candidate_profiles ADD COLUMN international_json LONGTEXT NULL;
ALTER TABLE candidate_profiles ADD COLUMN no_work_experience BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidate_profiles ADD COLUMN education_legacy_text LONGTEXT NULL;
ALTER TABLE candidate_profiles ADD COLUMN education_migration_status VARCHAR(32) NULL;
