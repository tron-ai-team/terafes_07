# Backup

Run `deploy/ubuntu/scripts/backup-core.sh` on the core node as a user who can read `/etc/tron-ai/tron-ai.env`.

The script writes:

- `/var/lib/tron-ai/backups/<timestamp>/mysql.sql`
- a short README next to the dump

It does not print `DB_PASSWORD`.

## MinIO

Use `mc mirror` against the private bucket, or snapshot the disk that holds MinIO data. Keep that copy on a private disk. Do not put bucket contents in git.

## Environment

`/etc/tron-ai/tron-ai.env` contains the database password, JWT secret, MinIO keys, and the optional cloud API key. Back it up in an encrypted store. Do not add it to the repository.

## Restore

1. Stop `tron-ai-core`.
2. Load the SQL dump with the `mysql` client.
3. Restore MinIO objects before starting the app if those objects are required.
4. Start `tron-ai-core`. Flyway applies pending migrations on startup. Do not drop tables as part of restore.
