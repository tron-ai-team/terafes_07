-- Run on the EXISTING MySQL server as an admin user.
-- Creates an isolated schema and least-privilege account for TRON AI.
-- Does NOT drop or modify other databases.
--
-- Replace REPLACE_WITH_STRONG_PASSWORD before running.
--
-- Example:
--   sudo mysql < /opt/tron-ai/deploy/scripts/mysql-init-tron.sql

CREATE DATABASE IF NOT EXISTS tron_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'tronai'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
CREATE USER IF NOT EXISTS 'tronai'@'%' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, CREATE VIEW, SHOW VIEW
  ON tron_ai.* TO 'tronai'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, CREATE VIEW, SHOW VIEW
  ON tron_ai.* TO 'tronai'@'%';

FLUSH PRIVILEGES;
