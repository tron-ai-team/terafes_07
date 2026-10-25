#!/usr/bin/env bash
# Create isolated TRON AI directories. Does not touch other project paths.
set -euo pipefail

sudo mkdir -p \
  /opt/tron-ai/deploy \
  /opt/tron-ai/releases \
  /opt/tron-ai/frontend-dist \
  /var/www/tron-ai \
  /var/lib/tron-ai/backups \
  /var/lib/tron-ai/uploads \
  /etc/tron-ai

sudo chmod 750 /opt/tron-ai /var/lib/tron-ai /etc/tron-ai
sudo chmod 755 /var/www/tron-ai

if [[ ! -f /etc/tron-ai/tron-ai.env ]]; then
  echo "Create /etc/tron-ai/tron-ai.env from deploy/.env.example before starting containers."
else
  echo "Existing /etc/tron-ai/tron-ai.env left in place."
fi

echo "Directories ready."
