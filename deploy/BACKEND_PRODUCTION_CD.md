# TRON AI backend production delivery

## Audit (10 November 2026, JST)

The GitHub default and protected production release branch is `main` (audited at `584d1c90ad98`). The existing production environment permits only `main`, requires a reviewer, and prevents self-review; administrators can currently bypass protection. GitHub requires all five CI contexts on an up-to-date branch. **The running server's source revision, Compose file, package visibility, and credentials have not been verified on Ubuntu.** Public read-only probes returned HTTP 200 for `/actuator/health` and `/health`, and HTTP 401 for `/health/ready`.

| Workflow on `main` | What exists and what was observed |
| --- | --- |
| `ci.yml` | PR/push to `main` or `develop`; reusable. Deployment recovery tests, frontend build, backend Maven tests/package, security checks, and Docker build/runtime smoke. [Main CI passed](https://github.com/tron-ai-team/terafes_07/actions/runs/40220524904). The secret check is filename-based. PR dependency review is advisory and currently reports that the repository does not support it. Live AI/desktop/provider tests are outside the hermetic suite. |
| `publish-release.yml` | Manual, `main` only, calls CI; pushes `ghcr.io/tron-ai-team/terafes_07/tron-ai-backend:sha-<full SHA>` using the workflow token and archives a digest-bound backend/frontend bundle. [Main publish passed](https://github.com/tron-ai-team/terafes_07/actions/runs/40221273887). Publication does not deploy. |
| `deploy-production.yml` | Manual, `main` only, requires review and explicit confirmations, and sends a successful publication run ID over host-key-pinned SSH. No GitHub runs recorded. Its release manager expects a bundled frontend, a host MySQL relay and `production.env`; that does not match the reported production stack. |
| `deploy-staging.yml` | Manual and similarly guarded; uses the staging environment and a distinct SSH target. No GitHub runs recorded. |

Open [PR #8](https://github.com/tron-ai-team/terafes_07/pull/8) is a different deployment design. Its Compose file matches the reported named MySQL, Gotenberg and backend containers and `tron-ai.env`; the branch's [manual GHCR publish passed](https://github.com/tron-ai-team/terafes_07/actions/runs/42506940121) using a 12-character SHA tag. That is evidence of a publish, not of the installed revision. The branch's deploy workflows accept mutable/operator-supplied tags, interpolate dispatch inputs into shell, and can recreate dependencies or sync frontend files. Do not use them to activate this design. If production runs that unmerged branch, reconcile its application changes with protected `main` in a separate reviewed PR before activation. The audit credential could not read package metadata and an anonymous GHCR read returned HTTP 401. Verify visibility and package ACLs in GitHub and plan for authenticated pulls unless the owner confirms public read access.

## Proposed flow

After activation, a `main` push (or a retry dispatched on `main`) runs the same five required CI jobs. It builds a Linux/amd64 image, tests that exact local image against disposable dedicated MySQL/Gotenberg containers, pushes only its full SHA tag to the existing GHCR package, and attests the resulting digest. Tags are only for lookup. The production job needs a successful publish and an independent environment approval. It verifies the environment policy and current head before connecting.

GitHub-hosted runners join a dedicated Tailscale tailnet path as ephemeral nodes via [GitHub OIDC federation](https://tailscale.com/docs/integrations/github/github-action). This avoids a persistent runner on a shared server for a [public repository](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners). The only granted flow is TCP 22 to the production node. OpenSSH pins the host key and uses a restricted key that can request only a release by commit and digest. A host-side controller verifies GitHub provenance, the current `main` head, ancestry of the live image, Compose identity and drift, baseline health, and byte-identical Flyway resources before switching images. A stopped temporary inspection container is used to read the candidate JAR without executing it.

The host uses the **installed** `/opt/tron-ai/deploy/compose.prod.yml`, project `tron-ai` and `/etc/tron-ai/tron-ai.env`, plus an image-only override. The sole runtime update is `docker compose ... up -d --no-deps --no-build --pull never backend`. It checks the running image ID, container health, loopback readiness (database and storage), and loopback/public Actuator status. Failure restores the exact prior local image and rechecks health, while the workflow remains failed. A journal and host lock protect recovery; a transient systemd unit keeps running if SSH drops. An interrupted transaction is recovered before a subsequent release can proceed.

## Setup after explicit approval

Leave `TRON_BACKEND_CD_ENABLED` unset or `false` during review and rehearsal. Keep the existing Cloudflare API tunnel, Vercel and other projects as they are. Do not replace the installed Compose with the copy from `main`.

1. **GitHub repository.** Keep strict required checks on `main`: `Deployment recovery tests`, `Frontend build`, `Backend Maven tests`, `Security checks`, and `Docker image build (no push)`. Require PR review for workflow, Dockerfile, and deployment script changes, and keep direct pushes, force pushes and bypass restricted. In **Settings → Environments**, create `backend-production`. Under protection rules select an independent required reviewer/team, enable **Prevent self-review**, and turn off administrator bypass. Choose **Selected branches and tags**, add exactly one **branch** rule `main`, and add no tag rules. See [GitHub's environment setup](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). In the existing GHCR package's **Package settings → Manage Actions access**, verify `tron-ai-team/terafes_07` has write access. Avoid other package writers where possible.

2. **Private network.** Install Tailscale using the [Ubuntu instructions](https://tailscale.com/kb/1031/install-linux) after confirming the installed Ubuntu release. Enroll only the TRON deployment target with tag `tag:tron-backend-prod`; on a new enrollment use `sudo tailscale up --advertise-tags=tag:tron-backend-prod --accept-routes=false --accept-dns=false`. If the host is already enrolled, coordinate with the tailnet owner and preserve existing tags, routes and settings. Use ordinary OpenSSH over Tailscale (no Tailscale SSH takeover). In the tailnet access policy, merge these entries and remove any broader grant **for the CI tag**; check existing wildcards and test effective access before activating:

   ```json
   {
     "tagOwners": {
       "tag:tron-backend-prod": ["autogroup:admin"],
       "tag:tron-backend-ci": ["autogroup:admin"]
     },
     "grants": [
       { "src": ["tag:tron-backend-ci"], "dst": ["tag:tron-backend-prod"], "ip": ["tcp:22"] }
     ]
   }
   ```

   In Tailscale **Settings → Trust credentials → Federated identities**, create a GitHub Actions identity with issuer `https://token.actions.githubusercontent.com`, a dedicated audience, scope **Auth Keys → Write**, and only tag `tag:tron-backend-ci`. Use subject `repo:tron-ai-team@347857149/terafes_07@1386554663:environment:backend-production`: GitHub reports that this repository was created on September 25, 2026 and uses the default template, so the subject includes immutable IDs. Add exact claims `repository_id=1386554663`, `ref=refs/heads/main` and `workflow_ref=tron-ai-team/terafes_07/.github/workflows/backend-production.yml@refs/heads/main`. If the OIDC template changes, match its actual subject and keep these restrictions. See [federation claim matching](https://tailscale.com/docs/features/workload-identity-federation) and [GitHub's immutable subjects](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims). Do not open public SSH ingress or alter the existing Cloudflare API route. Verify the deploy account can be reached only over the intended tailnet path and that existing admin access still works.

3. **Ubuntu controller.** Use the existing approved admin channel. Compare the installed project, Compose path, root ownership, Docker context, image revision, mounts, ports and Compose version to the controller's preflight; a different path or topology requires review. Check only non-secret inspection fields; do not print rendered Compose, environment, or raw container inspection output in shared logs. Confirm Linux/amd64, Compose v2 supporting `config --hash` and `up --pull never`, Python 3.10+, systemd, and a supported [GitHub CLI](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) with `gh attestation verify --source-digest`. From a reviewed checkout of this branch/its eventual merge commit:

   ```bash
   sudo install -d -o root -g root -m 0700 /var/lib/tron-backend-release
   sudo install -o root -g root -m 0755 deploy/scripts/backend-production.py /usr/local/sbin/tron-backend-release
   sudo /usr/local/sbin/tron-backend-release preflight
   live_id="$(sudo docker inspect --format '{{.Image}}' tron-ai-backend)"
   live_sha="$(sudo docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$live_id")"
   git merge-base --is-ancestor "$live_sha" origin/main
   ```

   The Compose and runtime env files and their parent directories must be root controlled; the controller refuses symlinks and group/world writable paths. Inspect any mismatch with the administrator. Do not overwrite or move the live environment file. Fetch `origin/main` on the reviewed checkout before the ancestry check. If the revision label is missing or the check fails, stop and reconcile the live version with protected `main`. Record the image and dependency IDs privately, verify matching migrations, and check that no other automation replaces this backend. Test with the current Vercel build; an app downgrade could break active clients even when migrations match.

   Create an expiring fine-grained token for a deployment service identity, resource owner `tron-ai-team`, selected repository `terafes_07`, permissions **Contents: Read** and **Attestations: Read** (Metadata read is automatic). Complete any organization approval. Enter it without echo from the admin shell, never via a command argument or a GitHub secret:

   ```bash
   sudo install -o root -g root -m 0600 /dev/null /etc/tron-ai/backend-release-github.token
   read -rsp 'GitHub verifier token: ' verifier; printf '\n'
   printf '%s\n' "$verifier" | sudo tee /etc/tron-ai/backend-release-github.token >/dev/null
   unset verifier
   ```

   For a private GHCR package, grant a service account read access and create its classic PAT scoped to `read:packages`, with SSO authorization if required. Store it using root's existing Docker credential configuration (prefer a credential helper), via `read -rsp 'GHCR pull token: ' pull_token; printf '\n'; printf '%s' "$pull_token" | sudo -H docker login ghcr.io -u '<pull-service-account>' --password-stdin; unset pull_token`. Do not overwrite an existing working GHCR login without checking its consumers. A public package can be pulled without that credential. Verify root can pull and `gh` can attest-verify using these credentials on the rehearsal host. See [GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) and [attestation verification](https://cli.github.com/manual/gh_attestation_verify).

4. **Restricted SSH.** On a trusted admin machine generate a unique key: `umask 077; ssh-keygen -t ed25519 -f ./tron-backend-cd -C tron-backend-cd -N ''`. Create the dedicated account (after confirming the name is unused) and root-managed key path on Ubuntu:

   ```bash
   sudo useradd --system --no-create-home --home-dir /var/lib/tron-backend-cd --shell /bin/sh tron-backend-cd
   sudo install -d -o root -g root -m 0755 /var/lib/tron-backend-cd /var/lib/tron-backend-cd/.ssh
   sudoedit /var/lib/tron-backend-cd/.ssh/authorized_keys
   sudo chown root:root /var/lib/tron-backend-cd/.ssh/authorized_keys
   sudo chmod 0644 /var/lib/tron-backend-cd/.ssh/authorized_keys
   sudo visudo -f /etc/sudoers.d/tron-backend-cd
   ```

   Put this **single** line in `authorized_keys`, replacing the final placeholder with the generated public key line:

   ```text
   restrict,from="100.64.0.0/10",command="/usr/local/sbin/tron-backend-release ssh" <ssh-ed25519 public key line>
   ```

   The sole sudoers rule is `tron-backend-cd ALL=(root) NOPASSWD: /usr/local/sbin/tron-backend-release from-ssh`. Check with `sudo visudo -c`. Do not give the account Docker group membership or other sudo rights. Verify an invalid command, shell, and forwarding all fail. Obtain the host public key from `/etc/ssh/ssh_host_ed25519_key.pub` through the trusted admin channel and verify its fingerprint out of band with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`.

5. **GitHub environment secrets.** In **Settings → Environments → backend-production → Environment secrets**, add the following. Do not store secrets at repository scope.

   | Name | Value |
   | --- | --- |
   | `TS_FEDERATED_CLIENT_ID` | Tailscale federated identity client ID |
   | `TS_FEDERATED_AUDIENCE` | Exact audience of that identity |
   | `BACKEND_SSH_HOST` | Production node's full MagicDNS `*.ts.net` name |
   | `BACKEND_SSH_KEY` | Dedicated Ed25519 private key, including delimiters |
   | `BACKEND_SSH_KNOWN_HOSTS` | A single line `<same MagicDNS name> ssh-ed25519 <host public key base64>` |

6. **Activate only after sign-off.** Complete the verification below. The owner can then set **Settings → Secrets and variables → Actions → Variables → Repository variables**: `TRON_BACKEND_CD_ENABLED=true`. For the first approved release, dispatch `gh workflow run backend-production.yml --ref main -R tron-ai-team/terafes_07` in an agreed window; an independent reviewer must approve the deployment job. Future pushes to `main` run automatically and still require production review. To stop future runs, set the variable to `false`, reject pending production reviews, and revoke the deployment identity/key if necessary. Changing the variable does not cancel a transaction already started on Ubuntu.

## Rehearsal, acceptance and recovery

1. Verify all five required checks on the reviewed PR and verify that a feature ref or an unset activation variable cannot publish or deploy. Check the new environment restrictions, protected branch, Tailscale claims and grants, SSH host pin, restricted key, and credential expiry. Confirm a wrong key, unauthorized workload, and stale SHA fail before deployment. Never exercise the legacy Compose path against this stack.
2. Rehearse on a disposable **separate host** matching the installed Compose, server architecture/version and runtime settings. Use synthetic or authorized sanitized data and a reviewed rehearsal copy of the controller with its public probe pointed at a test endpoint. Keep the rehearsal identity and key separate from production. The CI fixture exercises a bad release and the real backend-only rollback without production connectivity. On the rehearsal host verify public Actuator is uncached, access-controlled routing behaves as expected, and local readiness proves database and storage. Run a known-good release followed by an unhealthy one; verify nonzero deployment status, exact image ID restoration, preserved MySQL/Gotenberg IDs and volume contents, and successful health after restoration. Test recovery from a journal left pending and verify an out-of-lineage image and migration drift are rejected before backend replacement. When the first approved workflow publishes its signed digest, verify that digest independently while the deployment awaits environment review.
3. Before approving production, verify an existing TRON backup and an isolated restore drill, compare live source SHA to the candidate, confirm migration compatibility, save a durable copy of the previous image to approved storage if local pruning is possible, and record a baseline for health, login/CORS, persistent uploads, PDF conversion and representative Vercel flows. During the first window verify the digest from the Actions summary, the Ubuntu journal, both dependency IDs and the same product checks. Record the results in the change record.
4. To recover from a reported failure, review `sudo journalctl -u tron-backend-release.service --since today` and the root-only transaction file locally. If a journal is pending or an operator rolls back the latest release, use `sudo /usr/local/sbin/tron-backend-release rollback`; verify readiness again. Coordinate other manual changes with this controller and its lock. Future manual Compose operations on this stack must include both `-f /opt/tron-ai/deploy/compose.prod.yml` and `-f /var/lib/tron-backend-release/compose.backend.json` once the override exists. Do not manually reset the env or prune the rollback alias. If Compose or the env has changed since release, the controller refuses rollback until the operator reconciles the settings.

This is a single-backend replacement with a brief outage possible during restart and a longer outage during rollback. Rollback restores an image, never database contents; schema-changing releases require a separate reviewed plan. Health probes cannot prove AI, Vercel compatibility, or every PDF path, and an upstream outage may trigger a conservative rollback. A power loss or SIGKILL can leave a pending journal that requires recovery. Host root and the Docker daemon remain trusted; compromise of either can affect all colocated deployments. The signing job, package ACLs, restricted SSH key, GitHub reviewer policy, and root-only host credentials all need ongoing review and rotation. No live production setup or deployment is part of this branch.
