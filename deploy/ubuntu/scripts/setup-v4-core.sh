#!/usr/bin/env bash
# TRON V4 Core node preparation (Ubuntu). Does not purchase cloud resources.
# Run on the always-ON Core server (Spring, MySQL, Nginx, Tunnel, RabbitMQ, MinIO).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "== TRON V4 Core setup helper =="
echo "Config examples: $ROOT/config"
echo "Systemd units: $ROOT/systemd"
echo "Nginx: $ROOT/nginx"
echo "Cloudflare tunnel example: $ROOT/cloudflare"

cat <<'EOF'
Manual steps (require human credentials / approval):
1. Install JDK 21, MySQL 8, Nginx, RabbitMQ, MinIO (or Docker Compose if approved).
2. Copy config/tron-ai.env.example -> /etc/tron-ai/tron-ai.env and fill secrets (never commit).
3. Install systemd units from systemd/ and enable tron-ai-core.service.
4. Apply nginx/tron-ai-api.conf and reload nginx.
5. Configure Cloudflare Tunnel with cloudflare/config.example.yml (token not in git).
6. Ensure RTX/GTX nodes are OPTIONAL — Core must start without them.
7. Run Flyway via Spring Boot startup (V14+). Do not wipe MySQL data.
8. Public go-live requires explicit deployment authorization after security audit.
EOF
