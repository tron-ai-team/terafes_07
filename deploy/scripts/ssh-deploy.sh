#!/usr/bin/env bash
# Secrets are environment variables, never interpolated into shell source.
set -euo pipefail
: "${DEPLOY_HOST:?Missing deploy host}"
: "${DEPLOY_USER:?Missing restricted deploy user}"
: "${DEPLOY_KEY:?Missing deploy SSH key}"
: "${DEPLOY_KNOWN_HOSTS:?Missing out-of-band verified known_hosts entry}"
: "${RELEASE_RUN:?Missing successful publishing run ID}"
: "${DEPLOY_ENVIRONMENT:?Missing environment}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Invalid SSH hostname'; exit 1; }
[[ "$DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo 'Invalid SSH user'; exit 1; }
[[ "$DEPLOY_PORT" =~ ^[0-9]{1,5}$ ]] && ((10#$DEPLOY_PORT > 0 && 10#$DEPLOY_PORT < 65536)) || { echo 'Invalid SSH port'; exit 1; }
[[ "$RELEASE_RUN" =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid publishing run ID'; exit 1; }
[[ "$DEPLOY_ENVIRONMENT" == production || "$DEPLOY_ENVIRONMENT" == staging ]] || exit 1
umask 077
scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
printf '%s\n' "$DEPLOY_KEY" > "$scratch/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$scratch/known_hosts"
# No trust-on-first-use or keyscan. Missing/mismatched pins fail closed in OpenSSH.
ssh -i "$scratch/key" -p "$DEPLOY_PORT" \
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$scratch/known_hosts" -o GlobalKnownHostsFile=/dev/null \
  "$DEPLOY_USER@$DEPLOY_HOST" \
  "python3 /opt/tron-ai/deploy/scripts/release-manager.py deploy --environment $DEPLOY_ENVIRONMENT --run $RELEASE_RUN"
