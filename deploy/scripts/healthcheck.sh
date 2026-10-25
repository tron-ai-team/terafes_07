#!/usr/bin/env bash
# Post-deploy verification on the Ubuntu core server.
set -euo pipefail

BACKEND_PORT="${TRON_BACKEND_HOST_PORT:-18080}"
DOMAIN="${TRON_PUBLIC_HOST:-}"

echo "=== Docker containers ==="
docker ps --filter name=tron-ai --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo
echo "=== Backend loopback health ==="
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" | head -c 500
echo

echo
echo "=== Gotenberg (docker network only) ==="
docker exec tron-ai-gotenberg curl -fsS http://127.0.0.1:3000/health | head -c 300
echo

echo
echo "=== Nginx config test ==="
sudo nginx -t

if [[ -n "${DOMAIN}" ]]; then
  echo
  echo "=== Public HTTPS (via Cloudflare) ==="
  curl -fsSI "https://${DOMAIN}/" | head -n 15
  curl -fsS "https://${DOMAIN}/health" | head -c 300
  echo
fi

echo
echo "Healthcheck script finished."
