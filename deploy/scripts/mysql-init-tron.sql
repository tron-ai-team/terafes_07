-- LEGACY / OPTIONAL helper for host MySQL.
-- Current production Compose uses a DEDICATED MySQL container
-- (service "mysql" in deploy/compose.prod.yml) with volume tron_ai_mysql_data.
--
-- Do NOT run this against the host MySQL used by nijotours / techtitans / ttcomputers
-- unless you explicitly chose host-MySQL mode (not the default anymore).
--
-- If you ever need a host schema instead of Docker MySQL, replace the password
-- placeholders and run as an admin — this script never DROPs databases.
--
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
