#!/usr/bin/env bash
set -euo pipefail
environment="${1:?Usage: healthcheck.sh production|staging}"
case "$environment" in production) port=18080 ;; staging) port=28080 ;; *) exit 1 ;; esac
curl -fsS --max-time 5 "http://127.0.0.1:$port/health/ready"
curl -fsS --max-time 5 "http://127.0.0.1:$((port+1))/" >/dev/null
# Full dependency status is informational: an external AI outage must not revert a release.
if ! curl -fsS --max-time 10 "http://127.0.0.1:$port/health"; then
  echo 'External dependency degradation: check Ollama/STT/TTS independently.'
fi
