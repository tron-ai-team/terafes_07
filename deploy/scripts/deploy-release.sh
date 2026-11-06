#!/usr/bin/env bash
# Deploy a GHCR backend image tag + optional frontend dist tarball.
# Run on Ubuntu as a user in the docker group (or with sudo).
#
# Usage:
#   ./deploy-release.sh <image-ref> [frontend-dist.tar.gz]
#
# Example:
#   ./deploy-release.sh ghcr.io/OWNER/REPO/tron-ai-backend:sha-abc123 /tmp/frontend-dist.tar.gz
#
# Never deletes MySQL volumes or other projects' containers.
set -euo pipefail

IMAGE_REF="${1:-}"
FRONTEND_TGZ="${2:-}"
DEPLOY_DIR="${TRON_DEPLOY_DIR:-/opt/tron-ai/deploy}"
ENV_FILE="${TRON_ENV_FILE:-/etc/tron-ai/tron-ai.env}"
COMPOSE_FILE="${DEPLOY_DIR}/compose.prod.yml"
RELEASES_DIR="${TRON_RELEASES_DIR:-/opt/tron-ai/releases}"
CURRENT_LINK="${RELEASES_DIR}/CURRENT"
WWW_ROOT="${TRON_WWW_ROOT:-/var/www/tron-ai}"
HEALTH_URL="${TRON_HEALTH_URL:-http://127.0.0.1:18080/health}"

if [[ -z "${IMAGE_REF}" ]]; then
  echo "Usage: $0 <ghcr-image-ref> [frontend-dist.tar.gz]"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing ${COMPOSE_FILE}"
  exit 1
fi

STAMP="$(date +%Y%m%d%H%M%S)"
REL_DIR="${RELEASES_DIR}/${STAMP}"
mkdir -p "${REL_DIR}"

PREV_IMAGE=""
if [[ -f "${CURRENT_LINK}" ]]; then
  PREV_IMAGE="$(grep '^IMAGE=' "${CURRENT_LINK}" | cut -d= -f2- || true)"
fi

echo "Recording release metadata in ${REL_DIR}"
{
  echo "IMAGE=${IMAGE_REF}"
  echo "PREV_IMAGE=${PREV_IMAGE}"
  echo "STAMP=${STAMP}"
  echo "FRONTEND_TGZ=${FRONTEND_TGZ}"
} > "${REL_DIR}/meta.env"

# Remember previous image for rollback
if [[ -n "${PREV_IMAGE}" ]]; then
  echo "${PREV_IMAGE}" > "${REL_DIR}/previous-image.txt"
fi

# Update image pin used by compose
TMP_ENV="$(mktemp)"
# shellcheck disable=SC2002
cat "${ENV_FILE}" | sed "/^TRON_BACKEND_IMAGE=/d" > "${TMP_ENV}"
echo "TRON_BACKEND_IMAGE=${IMAGE_REF}" >> "${TMP_ENV}"
sudo install -m 640 -o root -g root "${TMP_ENV}" "${ENV_FILE}"
rm -f "${TMP_ENV}"

echo "Pulling ${IMAGE_REF}"
docker pull "${IMAGE_REF}"

echo "Updating containers (no volume prune)"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

if [[ -n "${FRONTEND_TGZ}" ]]; then
  if [[ ! -f "${FRONTEND_TGZ}" ]]; then
    echo "Frontend archive not found: ${FRONTEND_TGZ}"
    exit 1
  fi
  STAGE="${REL_DIR}/frontend"
  mkdir -p "${STAGE}"
  tar -xzf "${FRONTEND_TGZ}" -C "${STAGE}"
  # Support archives that contain a top-level dist/ folder or flat files.
  if [[ -d "${STAGE}/dist" ]]; then
    SRC="${STAGE}/dist"
  else
    SRC="${STAGE}"
  fi
  sudo mkdir -p "${WWW_ROOT}"
  sudo rsync -a --delete "${SRC}/" "${WWW_ROOT}/"
  echo "Frontend synced to ${WWW_ROOT}"
fi

echo "Waiting for health at ${HEALTH_URL}"
ok=0
for _ in $(seq 1 40); do
  if curl --silent --show-error --fail --max-time 5 "${HEALTH_URL}" >/dev/null; then
    ok=1
    break
  fi
  sleep 3
done

if [[ "${ok}" -ne 1 ]]; then
  echo "Health check FAILED."
  echo "Automatic image rollback to previous tag (if recorded)..."
  if [[ -n "${PREV_IMAGE}" ]]; then
    "${DEPLOY_DIR}/scripts/rollback-release.sh" "${PREV_IMAGE}" || true
  fi
  echo "Database was NOT rolled back. Inspect logs:"
  echo "  docker logs tron-ai-backend --tail 200"
  exit 1
fi

echo "IMAGE=${IMAGE_REF}" > "${CURRENT_LINK}"
echo "STAMP=${STAMP}" >> "${CURRENT_LINK}"
echo "Deploy OK: ${IMAGE_REF}"
