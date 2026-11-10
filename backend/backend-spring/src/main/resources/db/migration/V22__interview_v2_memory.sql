-- Interview Mode V2: durable per-session turn engine memory (survives restarts)
ALTER TABLE interview_sessions ADD COLUMN engine_state_json LONGTEXT NULL;
