#!/usr/bin/env bash
# Prepare the core node layout and install unit files.
# Does not install packages automatically and does not overwrite an existing env file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v java >/dev/null 2>&1; then
  echo "Java 21 was not found."
  echo "Install it with the Ubuntu command you trust, for example:"
  echo "  sudo apt-get update && sudo apt-get install -y openjdk-21-jre-headless"
  exit 1
fi

JAVA_LINE="$(java -version 2>&1 | head -n 1 || true)"
echo "Found: ${JAVA_LINE}"
echo "Confirm this is Java 21 before continuing."

if ! id tron-ai >/dev/null 2>&1; then
  sudo useradd --system --home /opt/tron-ai --shell /usr/sbin/nologin tron-ai
fi

sudo mkdir -p \
  /opt/tron-ai/backend \
  /opt/tron-ai/stt-worker \
  /opt/tron-ai/config \
  /opt/tron-ai/logs \
  /etc/tron-ai \
  /var/lib/tron-ai/uploads \
  /var/lib/tron-ai/data \
  /var/lib/tron-ai/backups

sudo chown -R tron-ai:tron-ai /opt/tron-ai /var/lib/tron-ai
sudo chmod 750 /opt/tron-ai /var/lib/tron-ai

if [[ ! -f /etc/tron-ai/tron-ai.env ]]; then
  sudo cp "${ROOT}/config/tron-ai.env.example" /etc/tron-ai/tron-ai.env
  sudo chown root:tron-ai /etc/tron-ai/tron-ai.env
  sudo chmod 640 /etc/tron-ai/tron-ai.env
  echo "Wrote /etc/tron-ai/tron-ai.env from the example. Edit it before starting the service."
else
  echo "Left existing /etc/tron-ai/tron-ai.env in place."
fi

sudo cp "${ROOT}/systemd/tron-ai-core.service" /etc/systemd/system/tron-ai-core.service
sudo cp "${ROOT}/nginx/tron-ai-api.conf" /etc/nginx/sites-available/tron-ai-api.conf
sudo systemctl daemon-reload

echo
echo "Next, on the Ubuntu host, after you review the files:"
echo "  1. Put tron-ai-core.jar in /opt/tron-ai/backend/"
echo "  2. Edit /etc/tron-ai/tron-ai.env"
echo "  3. sudo ln -sfn /etc/nginx/sites-available/tron-ai-api.conf /etc/nginx/sites-enabled/tron-ai-api.conf"
echo "  4. sudo nginx -t && sudo systemctl reload nginx"
echo "  5. sudo systemctl enable --now tron-ai-core"
echo "Nginx and OpenJDK packages are not installed by this script."
