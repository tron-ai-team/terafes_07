#!/usr/bin/env bash
# Roll back the Spring Boot container to a previous GHCR image.
# Does NOT reverse Flyway migrations or restore MySQL dumps.
#
# Usage:
#   ./rollback-release.sh [image-ref]
# If image-ref omitted, uses /opt/tron-ai/releases/CURRENT previous-image from latest meta.
set -euo pipefail

DEPLOY_DIR="${TRON_DEPLOY_DIR:-/opt/tron-ai/deploy}"
ENV_FILE="${TRON_ENV_FILE:-/etc/tron-ai/tron-ai.env}"
COMPOSE_FILE="${DEPLOY_DIR}/compose.prod.yml"
RELEASES_DIR="${TRON_RELEASES_DIR:-/opt/tron-ai/releases}"
HEALTH_URL="${TRON_HEALTH_URL:-http://127.0.0.1:18080/health}"

IMAGE_REF="${1:-}"
if [[ -z "${IMAGE_REF}" ]]; then
  LATEST_META="$(ls -1dt "${RELEASES_DIR}"/*/meta.env 2>/dev/null | head -n 1 || true)"
  if [[ -n "${LATEST_META}" ]]; then
    IMAGE_REF="$(grep '^PREV_IMAGE=' "${LATEST_META}" | cut -d= -f2- || true)"
  fi
fi

if [[ -z "${IMAGE_REF}" ]]; then
  echo "No previous image available. Pass an explicit image ref."
  exit 1
fi

echo "Rolling back backend to ${IMAGE_REF}"
TMP_ENV="$(mktemp)"
cat "${ENV_FILE}" | sed "/^TRON_BACKEND_IMAGE=/d" > "${TMP_ENV}"
echo "TRON_BACKEND_IMAGE=${IMAGE_REF}" >> "${TMP_ENV}"
sudo install -m 640 -o root -g root "${TMP_ENV}" "${ENV_FILE}"
rm -f "${TMP_ENV}"

docker pull "${IMAGE_REF}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d

ok=0
for _ in $(seq 1 40); do
  if curl --silent --show-error --fail --max-time 5 "${HEALTH_URL}" >/dev/null; then
    ok=1
    break
  fi
  sleep 3
done

if [[ "${ok}" -ne 1 ]]; then
  echo "Rollback health check failed. Manual intervention required."
  docker logs tron-ai-backend --tail 200 || true
  exit 1
fi

echo "IMAGE=${IMAGE_REF}" > "${RELEASES_DIR}/CURRENT"
echo "Rollback OK (application image only; MySQL unchanged)."
