# Reviewed private-release protocol

This protocol supersedes the historical image-tag/rsync deployment examples in the server guide. The new CLI does **not** accept arbitrary images or archives. Production remains manual; no automatic triggers were enabled.

## Approval and release provenance

1. Review and merge the release-safety PR with all required CI checks green. Install that reviewed `deploy/` tree **root-owned** at `/opt/tron-ai/deploy`; the restricted SSH account must not be able to edit executable code there.
2. Dispatch **Publish approved release** on `main`. It runs the full reusable CI, builds a backend labelled with repository and full SHA, and builds the matching frontend with Node 22 and `npm ci`. It publishes `sha-<full SHA>`, but deployments use the build's immutable digest.
3. The workflow uploads `release-bundle` containing `release.json` plus `frontend.tar.gz`. The manifest binds the source SHA, repository, image digest and frontend checksum. The server checks the successful main publishing run, main ancestry, GitHub's artifact ZIP checksum, manifest binding and pulled image labels. Missing API checksum, expired artifact, wrong workflow/ref or changed bytes fail closed. Retain release directories for rollback; future expiry of the publishing artifact does not delete installed releases.
4. Keep server `gh api` authenticated with a narrowly scoped credential that can read this repository's Actions artifacts. Configure package pull authentication separately if required. Never reuse a broad owner token in a deploy workflow. Server credentials are operator-managed, not interpolated into remote commands.

## Administrator preparation (no MySQL restart)

The account executing deployment needs access to its own release directories, runtime env, Docker and Actions artifact read credentials. Docker group access is inherently powerful: use a dedicated account, restrict its SSH key and keep deployment executables root-owned. Do not grant unrestricted sudo.

- Run `sudo bash deploy/scripts/prepare-dirs.sh <restricted-deploy-user>` through a trusted administrator. It does not install sudo policy or modify services. Give only that account traversal on `/etc/tron-ai` (dedicated group/ACL); each env stays mode 600 and account-owned.
- Install separate `/etc/tron-ai/production.env` and `staging.env` from `runtime.env.example`. Generate distinct JWT/DB secrets locally. Do not source these files as shell code. Literal unquoted values only; interpolation, duplicate settings and placeholders are rejected.
- Host MySQL stays bound to 127.0.0.1. A trusted administrator runs `install-db-relay.sh`, which creates only the dedicated `tron-db-access` group, tmpfiles rule and new socket-activated TRON units. The restricted mode-660 socket `/run/tron-ai-mysql/mysqld.sock` forwards through systemd-socket-proxyd to **TCP** 127.0.0.1:3306. It never connects to MySQL's native Unix socket and never changes or restarts MySQL. Set the numeric relay group GID printed by the installer in the runtime file. The internal unprivileged `mysql-proxy` container has only that supplementary GID, a read-only relay-directory mount, no capabilities and no host port. The socket unit's directory is root:tron-db-access mode 750. The relay service is sandboxed to localhost, 32 MiB, 10% CPU and 32 connections. It is shared transport only; production/staging database grants remain separate. Do not install the units until administrator access is authorized.
- Direct TCP-to-native-MySQL-Unix forwarding failed authentication in the fresh-account CI test. Preserving TCP at the server avoids that secure-transport/authentication mismatch without downgrading caching_sha2_password, prewarming an auth cache, enabling '%' accounts or exposing MySQL. See [MySQL authentication requirements](https://dev.mysql.com/doc/mysql-secure-deployment-guide/8.0/en/secure-deployment-configure-authentication.html). This forwarding uses the existing application's authenticated local TCP contract; it does not assert TLS for internal bridge data. Verify host MySQL's actual auth/transport policy during administrator setup.
- In an authenticated MySQL administrator session, inspect for existing schema/user first. Create only `tron_ai` and `tronai_prod` at **127.0.0.1** for relay TCP and **localhost** for socket backup access; staging uses `tron_ai_staging` and its own account at the same two local-only hosts. Explicit 127.0.0.1 matching is required when skip_name_resolve is enabled. Generate a restricted SQL input file; never put passwords in command arguments or history. The SQL template documents schema-scoped permissions; no '%' account is needed. Do not reset existing users/schemas. Flyway migrations are forward-only.
- Resolve and inspect the platform-compatible digests for Gotenberg, Nginx Alpine and alpine/socat before entering them in the runtime file. Digest resolution alone does not verify Japanese font/conversion functionality.
- Set **both** Ollama URL variables to the confirmed private node. Never guess an endpoint. STT/VOICEVOX remain optional but unavailable functions must be reported.

## Isolation and resource budget

| Resource | Production | Staging |
| --- | --- | --- |
| Compose project | tron-ai-production | tron-ai-staging |
| Backend bind | 127.0.0.1:18080 | 127.0.0.1:28080 |
| Private frontend/proxy | 127.0.0.1:18081 | 127.0.0.1:28081 |
| Releases/state/backups | /opt/tron-ai/production | /opt/tron-ai/staging |
| Runtime env | /etc/tron-ai/production.env | /etc/tron-ai/staging.env |
| Database | tron_ai | tron_ai_staging |

Compose scopes networks and volumes to the project; no fixed container/network/volume names remain. Gotenberg and the DB proxy have no host ports. The frontend container serves the matched static build and same-origin API. Existing host Nginx/Cloudflare files are untouched for private deployment. Do not bypass its maintenance boundary by publicly routing directly to the backend.

Defaults: backend <=1280 MiB / 1 CPU, Gotenberg <=1024 MiB / 0.5 CPU and queue 1; frontend 64 MiB / 0.25 CPU; DB proxy 32 MiB / 0.1 CPU. These are per environment. Do not run both under load on this two-core host without measuring available headroom. Never run core-server Ollama models.

## Deployment, recovery and maintenance boundary

```
python3 /opt/tron-ai/deploy/scripts/release-manager.py validate --environment production
python3 /opt/tron-ai/deploy/scripts/release-manager.py deploy --environment production --run <successful-publishing-run-ID>
python3 /opt/tron-ai/deploy/scripts/release-manager.py rollback --environment production
bash /opt/tron-ai/deploy/scripts/healthcheck.sh production
```

The old shell entrypoints wrap this CLI with the same new arguments. A per-environment file lock serializes deploy, rollback and backup. Pull, manifest validation and Compose validation happen before the frontend is interrupted. TRON has a short maintenance window: frontend stops, backend/dependencies become ready, then the matching frontend starts. This is recovery-safe pairing, not zero-downtime blue/green or atomic database rollback; already-open clients/API requests may fail during maintenance.

Failures during startup, readiness, frontend start or state commit restore the prior pair; a failed first deployment removes only that project's containers/network while preserving data volumes. Recovery failure is surfaced, never suppressed. Runtime secrets are not rewritten during release changes. A pending-transaction journal allows the next operation to reconcile an interrupted deployment before making another change; SIGTERM/SIGHUP attempt immediate recovery. A power loss or SIGKILL cannot guarantee immediate recovery, so operators must run the manager again and inspect its result. Each release snapshots Compose, private proxy config, manifest and static files. State is atomically replaced only after readiness and frontend HTTP success. Backend digest, frontend content and release-specific Compose restore together; env changes and database migrations are **not** reversed.

GET `/health/ready` checks DB and persistent object storage without calling AI. Existing `/health` still reports AI and other dependency status, and remains 503 when core AI is down. Operators must inspect both: a passing deployment readiness gate does not mean AI, voice, interviews or PDF journeys are verified. Compose independently waits for Gotenberg health. Live smoke tests remain mandatory before claiming a successful release.

## SSH and GitHub environments

The manual deployment workflows need `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, optional `PRODUCTION_SSH_PORT`, and `PRODUCTION_SSH_KNOWN_HOSTS`; staging uses its own prefixed equivalents. Obtain host public keys/fingerprints through a trusted administrator channel. OpenSSH enforces StrictHostKeyChecking; no keyscan or trust-on-first-use fallback exists.

Use an authorized_keys entry with `restrict,command="python3 /opt/tron-ai/deploy/scripts/forced-command.py production"` for the production key. A separate staging key must bind the staging argument. The forced command accepts only the expected verified-release operation, never a shell, scp or arbitrary Docker commands. Verify the account cannot edit these root-owned scripts. Store a real protected production environment/reviewer policy before enabling workflow access; the workflow retains `deploy-production` and `UBUNTU_READY` confirmations. The SSH account's Docker access is not equivalent to a safely sandboxed host account.

Do not dispatch deployment until credentials, DB setup and backup prerequisites are verified. Automatic deployment remains disabled until actual first release, rollback and access protection have passed.

## Backups and restore drill

`python3 deploy/scripts/backup-release.py --environment production --quiesce` takes the deployment lock, stops only TRON frontend/backend writers, dumps only the dedicated schema via a temporary restricted MySQL defaults file, and archives the two persistent data volumes with the pinned backend image in resource-limited, networkless read-only helper containers. It restarts the matched release even if backup fails. It omits triggers/routines (current migrations create none); revisit that contract if future migrations add them. Only backups with `COMPLETE` are usable. Secrets/logs are excluded and need separate encrypted handling. Verify encrypted off-host retention.

An administrator must create a disposable restore schema/user and separate restore volumes, import `database.sql` into that schema, extract archives into only those disposable volumes, then run the matching application version and verify counts/content, uploads and auth. Never restore into another application's schema or volumes. Record checksum, dump time, migration history and successful smoke tests. Do not reverse Flyway migrations by image rollback. A production data restore is a separate owner-controlled destructive boundary.

Before first migration, an existing nonempty TRON schema needs its own backup even if there is no release state yet: an administrator must perform that dump separately. Baseline-on-migrate must not silently adopt unknown contents. None of these authored procedures counts as a restore/rollback execution test on a live host.

## Public exposure remains separately gated

No hostname is invented. Keep the private frontend bound to localhost. Public routing requires a verified TRON domain, beta access policy, trusted forwarded-HTTPS strategy, secure cookies, CORS/OAuth settings and tests for denied unauthenticated traffic. The private proxy deliberately uses its own HTTP scheme and is not a production tunnel-HTTPS template. Review WebSocket upgrade handling before exposing Desktop Agent features. No automatic production trigger is enabled by these changes.
