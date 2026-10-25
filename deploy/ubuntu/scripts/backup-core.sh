#!/usr/bin/env bash
# Dump MySQL and record where MinIO and env files live.
# Does not print passwords. Does not copy env files into the git repository.
set -euo pipefail

ENV_FILE="${TRON_ENV_FILE:-/etc/tron-ai/tron-ai.env}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

STAMP="$(date +%Y%m%d%H%M%S)"
OUT_DIR="/var/lib/tron-ai/backups/${STAMP}"
mkdir -p "${OUT_DIR}"
chmod 700 "${OUT_DIR}"

: "${DB_HOST:?DB_HOST is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${DB_USERNAME:?DB_USERNAME is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

CNF="${OUT_DIR}/client.cnf"
umask 077
cat > "${CNF}" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT:-3306}
user=${DB_USERNAME}
password=${DB_PASSWORD}
EOF
chmod 600 "${CNF}"

mysqldump \
  --defaults-extra-file="${CNF}" \
  --single-transaction \
  --routines \
  --databases "${DB_NAME}" \
  > "${OUT_DIR}/mysql.sql"

rm -f "${CNF}"
chmod 600 "${OUT_DIR}/mysql.sql"
unset DB_PASSWORD

cat > "${OUT_DIR}/README.txt" <<EOF
MySQL dump: ${OUT_DIR}/mysql.sql

MinIO:
  Copy the bucket named in MINIO_BUCKET with mc mirror, or snapshot the MinIO data disk.
  Do not publish the bucket.

Environment:
  /etc/tron-ai/tron-ai.env is root-readable and is not part of the git repository.
  Store a sealed copy in your password manager or an encrypted backup, not in source control.

Uploads and local data:
  /var/lib/tron-ai/uploads
  /var/lib/tron-ai/data
EOF

echo "Backup written to ${OUT_DIR}"
