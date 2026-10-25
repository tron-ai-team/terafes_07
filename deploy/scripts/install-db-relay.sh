#!/usr/bin/env bash
# Trusted administrator only. Installs NEW TRON units, never edits/restarts MySQL.
set -euo pipefail
[[ "$EUID" == 0 ]] || { echo 'Trusted administrator execution required.'; exit 1; }
source_dir="$(cd "$(dirname "$0")/../systemd" && pwd)"
getent group tron-db-access >/dev/null || groupadd --system tron-db-access
for unit in tron-ai-mysql.socket tron-ai-mysql.service; do
  target="/etc/systemd/system/$unit"
  if [[ -e "$target" ]] && ! cmp -s "$source_dir/$unit" "$target"; then
    echo 'Existing TRON relay unit differs; back up and review it before replacement.'; exit 1
  fi
  install -o root -g root -m 644 "$source_dir/$unit" "$target"
done
target=/etc/tmpfiles.d/tron-ai-mysql.conf
if [[ -e "$target" ]] && ! cmp -s "$source_dir/tron-ai-mysql.tmpfiles.conf" "$target"; then
  echo 'Existing TRON tmpfiles rule differs; back up and review it before replacement.'; exit 1
fi
install -o root -g root -m 644 "$source_dir/tron-ai-mysql.tmpfiles.conf" "$target"
systemd-analyze verify /etc/systemd/system/tron-ai-mysql.socket /etc/systemd/system/tron-ai-mysql.service
systemd-tmpfiles --create "$target"
systemctl daemon-reload
systemctl enable --now tron-ai-mysql.socket
relay_gid="$(getent group tron-db-access | cut -d: -f3)"
printf 'Set TRON_MYSQL_SOCKET_GID=%s in each restricted runtime file. MySQL was not modified or restarted.\n' "$relay_gid"
