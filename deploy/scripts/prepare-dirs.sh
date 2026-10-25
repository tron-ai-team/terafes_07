#!/usr/bin/env bash
# Run through a trusted administrator; grants no sudo policy and changes no service.
set -euo pipefail
[[ "${EUID}" == 0 ]] || { echo 'Administrator execution required; do not send passwords in chat.'; exit 1; }
DEPLOY_USER="${1:?Usage: prepare-dirs.sh restricted-deploy-user}"
id "$DEPLOY_USER" >/dev/null
install -d -m 755 /opt/tron-ai /opt/tron-ai/deploy
install -d -m 700 /etc/tron-ai
for environment in production staging; do
  install -d -m 700 -o "$DEPLOY_USER" -g "$(id -gn "$DEPLOY_USER")" \
    "/opt/tron-ai/$environment" "/opt/tron-ai/$environment/releases" "/opt/tron-ai/$environment/backups"
done
echo 'Install reviewed deploy/ scripts root-owned and immutable to the SSH account.'
echo 'Install each runtime env as mode 600 owned by the restricted deploy account.'
echo 'Grant directory traversal on /etc/tron-ai only to that account using an ACL or dedicated group.'
