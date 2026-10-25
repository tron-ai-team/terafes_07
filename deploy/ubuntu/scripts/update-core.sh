#!/usr/bin/env bash
# Replace the Spring jar, restart, and check health.
# Usage: sudo ./update-core.sh /path/to/tron-ai-core.jar
set -euo pipefail

NEW_JAR="${1:-}"
if [[ -z "${NEW_JAR}" || ! -f "${NEW_JAR}" ]]; then
  echo "Usage: sudo $0 /path/to/tron-ai-core.jar"
  exit 1
fi

TARGET="/opt/tron-ai/backend/tron-ai-core.jar"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/opt/tron-ai/backend/tron-ai-core.jar.bak.${STAMP}"

sudo systemctl stop tron-ai-core

if [[ -f "${TARGET}" ]]; then
  sudo cp -a "${TARGET}" "${BACKUP}"
  echo "Backed up current jar to ${BACKUP}"
fi

sudo install -o tron-ai -g tron-ai -m 640 "${NEW_JAR}" "${TARGET}"
sudo systemctl start tron-ai-core

echo "Waiting for health..."
ok=0
for _ in $(seq 1 30); do
  if curl --silent --show-error --fail --max-time 3 http://127.0.0.1:8080/health >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "${ok}" -ne 1 ]]; then
  echo "Health check failed."
  echo "Rollback:"
  echo "  sudo systemctl stop tron-ai-core"
  echo "  sudo cp -a ${BACKUP} ${TARGET}"
  echo "  sudo systemctl start tron-ai-core"
  echo "This script does not drop or rewrite the database."
  exit 1
fi

echo "tron-ai-core is healthy."
echo "Flyway runs during normal Spring startup. No manual migration command is required."
