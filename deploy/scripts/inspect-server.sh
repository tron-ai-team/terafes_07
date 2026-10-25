#!/usr/bin/env bash
# STEP 1–2 helper: inspect an existing Ubuntu core server BEFORE deploying TRON AI.
# Run on Ubuntu. Read-only. Does not modify existing projects.
set -euo pipefail

echo "=== Host ==="
hostnamectl 2>/dev/null || hostname
uname -a

echo
echo "=== CPU / RAM / Disk ==="
nproc
free -h
df -h /

echo
echo "=== Listening ports (ss) ==="
sudo ss -tulpn | head -n 80 || ss -tulpn | head -n 80

echo
echo "=== Docker (if present) ==="
if command -v docker >/dev/null 2>&1; then
  docker version --format 'Server: {{.Server.Version}}' || true
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' || true
  docker network ls || true
  docker system df || true
else
  echo "docker not found"
fi

echo
echo "=== Nginx ==="
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1 || true
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
else
  echo "nginx not found"
fi

echo
echo "=== Cloudflare tunnel ==="
if command -v cloudflared >/dev/null 2>&1; then
  cloudflared --version || true
  systemctl is-active cloudflared 2>/dev/null || systemctl is-active cloudflared.service 2>/dev/null || true
  ls -la /etc/cloudflared/ 2>/dev/null || true
else
  echo "cloudflared not found in PATH"
fi

echo
echo "=== MySQL ==="
if command -v mysql >/dev/null 2>&1; then
  mysql --version || true
  systemctl is-active mysql 2>/dev/null || systemctl is-active mysqld 2>/dev/null || true
else
  echo "mysql client not found"
fi

echo
echo "=== Existing Spring / Java processes (sample) ==="
ps aux | grep -E '[j]ava|[s]pring' | head -n 40 || true

echo
echo "Inspect complete. Record free RAM/disk and occupied ports before choosing TRON_BACKEND_HOST_PORT."
