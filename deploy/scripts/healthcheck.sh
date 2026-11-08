#!/usr/bin/env bash
# Post-deploy verification on the Ubuntu core server.
# Read-only checks only — never stops other projects' containers.
set -euo pipefail

BACKEND_PORT="${TRON_BACKEND_HOST_PORT:-18080}"
DOMAIN="${TRON_PUBLIC_HOST:-}"
API_DOMAIN="${TRON_API_HOST:-}"

echo "=== Docker containers (tron-ai only) ==="
docker ps --filter name=tron-ai --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo
echo "=== Backend Actuator liveness (deploy gate) ==="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/actuator/health" | head -c 500
echo

echo
echo "=== Backend diagnostic /health (may be degraded without AI node) ==="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" | head -c 800 || true
echo

echo
echo "=== Dedicated MySQL volume present ==="
docker volume inspect tron_ai_mysql_data --format '{{.Name}} {{.Mountpoint}}' || true

echo
echo "=== Gotenberg (docker network only) ==="
docker exec tron-ai-gotenberg curl -fsS http://127.0.0.1:3000/health | head -c 300
echo

echo
echo "=== Confirm no public MySQL/Gotenberg bind ==="
docker port tron-ai-mysql 2>/dev/null || echo "mysql: no published ports (expected)"
docker port tron-ai-gotenberg 2>/dev/null || echo "gotenberg: no published ports (expected)"

echo
echo "=== Nginx config test (safe) ==="
sudo nginx -t

if [[ -n "${DOMAIN}" ]]; then
  echo
  echo "=== Public HTTPS origin (via Cloudflare) ==="
  curl -fsSI "https://${DOMAIN}/" | head -n 15 || true
fi

if [[ -n "${API_DOMAIN}" ]]; then
  echo
  echo "=== Public API health ==="
  curl -fsS "https://${API_DOMAIN}/actuator/health" | head -c 300 || true
  echo
fi

echo
echo "Healthcheck script finished."
