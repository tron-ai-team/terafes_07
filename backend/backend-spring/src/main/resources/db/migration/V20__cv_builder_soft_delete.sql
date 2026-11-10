-- CP-03B: soft-delete for user CV drafts (templates untouched; profile untouched)
ALTER TABLE cv_builder_drafts
    ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_cv_builder_drafts_user_deleted ON cv_builder_drafts(user_id, deleted_at);
