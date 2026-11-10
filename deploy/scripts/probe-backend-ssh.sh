#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

[[ ${SSH_HOST:-} =~ ^[a-z0-9][a-z0-9.-]+\.ts\.net$ && -n ${SSH_KEY:-} && -n ${SSH_KNOWN_HOSTS:-} ]] ||
  fail 'Expected a MagicDNS name, private key and pinned host key.'

peer=$(tailscale ip -4 "$SSH_HOST" 2>/dev/null) || fail 'The host did not resolve through Tailscale.'
python3 -c 'from ipaddress import ip_address, ip_network; import sys; sys.exit(ip_address(sys.argv[1]) not in ip_network("100.64.0.0/10"))' \
  "$peer" >/dev/null 2>&1 || fail 'The peer did not return one Tailscale IPv4 address.'
route=$(ip -4 route get "$peer" 2>/dev/null) || fail 'The Tailscale peer has no local route.'
[[ " $route " =~ [[:space:]]dev[[:space:]]tailscale0[[:space:]] ]] || fail 'The peer route does not use tailscale0.'

umask 077
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
printf '%s\n' "$SSH_KEY" > "$scratch/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$scratch/known_hosts"
unset SSH_KEY SSH_KNOWN_HOSTS

# This shell builtin would only print a marker if the account were unrestricted.
# Never send a deploy request, run sudo, or open an interactive session.
status=0
timeout 35s ssh -4 -F /dev/null -i "$scratch/key" -T \
  -o BatchMode=yes -o PreferredAuthentications=publickey -o IdentitiesOnly=yes \
  -o ClearAllForwardings=yes -o ForwardAgent=no -o ConnectTimeout=15 -o LogLevel=ERROR \
  -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 -o HostKeyAlias="$SSH_HOST" \
  -o UserKnownHostsFile="$scratch/known_hosts" -o GlobalKnownHostsFile=/dev/null \
  "tron-backend-cd@$peer" "printf '%s\\n' TRON_UNAUTHORIZED_COMMAND_EXECUTED" \
  </dev/null > "$scratch/stdout" 2> "$scratch/stderr" || status=$?

# An SSH transport/auth failure, a shell executing the command, or an unrelated
# denial must not be mistaken for the controller's authenticated response.
[[ $status == 1 && ! -s "$scratch/stdout" &&
   $(<"$scratch/stderr") == 'Only the backend digest deployment command is permitted' ]] ||
  fail 'Pinned SSH did not return the expected forced-command rejection. Check peer access, host pin, deploy key and forced command.'

echo 'PASS: Private Tailscale route, pinned Ubuntu host key, deploy-user public key authentication, and unauthorized command rejection.'
