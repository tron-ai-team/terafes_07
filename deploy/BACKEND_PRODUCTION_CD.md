# TRON AI backend production delivery

## Audit (10 November 2026, JST)

The GitHub default and protected production release branch is `main` (audited at `584d1c90ad98`). GitHub requires all five CI contexts on an up-to-date branch. The operator verified that live Ubuntu uses `/home/thushan/Desktop/x/tron-ai-github/deploy/compose.prod.yml` and image `ghcr.io/tron-ai-team/terafes_07/tron-ai-backend:sha-43d1f3f12a24` (full revision `43d1f3f12a24182e863342be27bb5059b5185edc`). Git confirms that revision is four commits ahead of `main`. The server was not accessed while preparing this PR.

| Workflow on `main` | What exists and what was observed |
| --- | --- |
| `ci.yml` | PR/push to `main` or `develop`; reusable. Deployment recovery tests, frontend build, backend Maven tests/package, security checks, and Docker build/runtime smoke. [Main CI passed](https://github.com/tron-ai-team/terafes_07/actions/runs/40220524904). The secret check is filename-based. PR dependency review is advisory and currently reports that the repository does not support it. Live AI/desktop/provider tests are outside the hermetic suite. |
| `publish-release.yml` | Manual, `main` only, calls CI; pushes `ghcr.io/tron-ai-team/terafes_07/tron-ai-backend:sha-<full SHA>` using the workflow token and archives a digest-bound backend/frontend bundle. [Main publish passed](https://github.com/tron-ai-team/terafes_07/actions/runs/40221273887). Publication does not deploy. |
| `deploy-production.yml` | The legacy manual workflow on `main` expects a bundled frontend, a host MySQL relay and `production.env`. No GitHub runs recorded. This PR retires its SSH job; the dispatch now stops with a link to this runbook. |
| `deploy-staging.yml` | Manual and similarly guarded; uses the staging environment and a distinct SSH target. No GitHub runs recorded. |

[PR #11](https://github.com/tron-ai-team/terafes_07/pull/11) incorporates the verified [PR #8](https://github.com/tron-ai-team/terafes_07/pull/8) revision as a merge parent, preserving its backend behavior and the existing frontend tree on `main`. It retains the five required checks, restores the separate readiness endpoint without changing the live `/health` contract, and keeps the older relay stack in `compose.relay.yml` for isolated staging. It omits PR #8's tag-based deploy scripts and workflow changes. After approval, use [Create a merge commit](https://docs.github.com/en/pull-requests/reference/pull-request-merges#merge-your-commits) for PR #11. A squash or rebase loses the live SHA's ancestry and fails the `main` CI lineage check. Do not merge PR #8 separately. The audit credential could not read GHCR package metadata and an anonymous read returned HTTP 401. Plan for authenticated pulls unless the package owner confirms public read access.

## Proposed flow

After activation, a protected `main` push (or an optional retry on `main`) runs the same five required CI jobs. A target check verifies the current protected `main` SHA and the exact unattended environment policy before publishing. The workflow builds a Linux/amd64 image, tests that exact local image against disposable dedicated MySQL/Gotenberg containers, pushes only its full SHA tag to the existing GHCR package, and attests the resulting digest. Tags are only for lookup. After a successful publish, the deployment job checks the target again before connecting. It has no manual deployment approval; the separate PR branch protection still applies.

GitHub-hosted runners join a dedicated Tailscale tailnet path as ephemeral nodes via [GitHub OIDC federation](https://tailscale.com/docs/integrations/github/github-action). This avoids a persistent runner on a shared server for a [public repository](https://docs.github.com/en/actions/reference/security/secure-use#hardening-for-self-hosted-runners). The only granted flow is TCP 22 to the production node. OpenSSH pins the host key and uses a restricted key that can request only a release by commit and digest. A host-side controller verifies GitHub provenance, the current `main` head, ancestry of the live image, Compose identity and drift, baseline health, and byte-identical Flyway resources before switching images. A stopped temporary inspection container is used to read the candidate JAR without executing it.

The controller uses a reviewed, root-owned copy of the exact production Compose definition at `/etc/tron-ai/backend-release/compose.prod.yml`, project `tron-ai`, the existing `/etc/tron-ai/tron-ai.env`, and an image-only override. It uses the desktop checkout path only to check the containers' Compose labels. Preflight checks the backend's Compose hash and the running containers' labels, ports, named volumes, and private network. The sole runtime update is `docker compose ... up -d --no-deps --no-build --pull never backend`. It checks the image ID, container health, loopback readiness (database and storage), and loopback/public Actuator status. Failure restores the exact prior local image and rechecks health, while the workflow remains failed. A journal and host lock protect recovery; a transient systemd unit keeps running if SSH drops.

## Setup after explicit approval

Leave `TRON_BACKEND_CD_ENABLED` unset or `false` during review, merge, and rehearsal. Keep the existing Cloudflare API tunnel, Vercel and other projects as they are. No Vercel configuration changes are required for this backend workflow; the existing Git integration may build on an eventual approved merge.

1. **GitHub repository.** Keep strict required checks on `main`: `Deployment recovery tests`, `Frontend build`, `Backend Maven tests`, `Security checks`, and `Docker image build (no push)`. Keep the current branch review and admin enforcement. In **Settings → Environments → backend-production**, verify there are no required reviewers, wait timers or custom protection rules and administrator bypass is disabled. Under **Selected branches and tags**, allow exactly one **branch** rule `main` and no tag rules. This environment policy has been configured; leave unrelated environments alone. See [GitHub's environment setup](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). In the existing GHCR package's **Package settings → Manage Actions access**, verify `tron-ai-team/terafes_07` has write access. Avoid other package writers where possible.

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

3. **Ubuntu controller.** Use the existing approved admin channel. Confirm Linux/amd64, Docker Compose supporting `config --hash` and `up --pull never`, Python 3.10+, systemd, and a supported [GitHub CLI](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) with `gh attestation verify --source-digest`. From an administrator-controlled checkout of the approved merge, compare the reviewed file to the installed file as a user who can read both. Stop on any difference and review it before installing. Install only the reviewed copy and script:

   ```bash
   cmp -s -- deploy/compose.prod.yml /home/thushan/Desktop/x/tron-ai-github/deploy/compose.prod.yml || exit 1
   sudo install -d -o root -g root -m 0700 /etc/tron-ai/backend-release /var/lib/tron-backend-release /var/lib/tron-backend-release/registry
   sudo install -o root -g root -m 0600 deploy/compose.prod.yml /etc/tron-ai/backend-release/compose.prod.yml
   sudo install -o root -g root -m 0755 deploy/scripts/backend-production.py /usr/local/sbin/tron-backend-release
   sudo /usr/local/sbin/tron-backend-release preflight
   live_id="$(sudo docker inspect --format '{{.Image}}' tron-ai-backend)"
   live_sha="$(sudo docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$live_id")"
   git merge-base --is-ancestor "$live_sha" origin/main
   ```

   The managed Compose and existing runtime env files and their parent directories must be root controlled; preflight refuses symlinks and group/world writable paths. Leave both the desktop checkout and the runtime env file in place. Check only non-secret inspection fields; never print rendered Compose, env, or raw container inspection in shared logs. Fetch `origin/main` before the ancestry check. Stop if preflight fails or the live image is not an ancestor. Record the image and dependency IDs privately, verify matching migrations, and confirm no other automation replaces this backend. Test the current Vercel client against the rehearsed release.

   Create an expiring fine-grained token for a deployment service identity, resource owner `tron-ai-team`, selected repository `terafes_07`, permissions **Contents: Read** and **Attestations: Read** (Metadata read is automatic). Complete any organization approval. Enter it without echo from the admin shell, never via a command argument or a GitHub secret:

   ```bash
   sudo install -o root -g root -m 0600 /dev/null /etc/tron-ai/backend-release-github.token
   read -rsp 'GitHub verifier token: ' verifier; printf '\n'
   printf '%s\n' "$verifier" | sudo tee /etc/tron-ai/backend-release-github.token >/dev/null
   unset verifier
   ```

   For a private GHCR package, grant a service account read access and create its classic PAT scoped to `read:packages`, with SSO authorization if required. Use the controller's dedicated Docker credential configuration so existing projects' logins are untouched. Enter the token without echo:

   ```bash
   read -rsp 'GHCR pull token: ' pull_token; printf '\n'
   printf '%s' "$pull_token" | sudo -H docker --config /var/lib/tron-backend-release/registry login ghcr.io -u '<pull-service-account>' --password-stdin
   unset pull_token
   ```

   Prefer a credential helper configured for this directory when one is available. A public package can use an empty registry directory. Verify root can pull and `gh` can attest-verify with this `DOCKER_CONFIG` on the rehearsal host. See [GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) and [attestation verification](https://cli.github.com/manual/gh_attestation_verify).

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

6. **Activate once, after preflight and rehearsal.** Set **Settings → Secrets and variables → Actions → Variables → Repository variables**: `TRON_BACKEND_CD_ENABLED=true` only after the approved merge, private access and verification below. The next protected `main` push runs the whole release without human approval. If testing the already merged head, use the workflow's optional **Run workflow** on `main` once. No per-release command is needed. To stop future runs, set the variable to `false`, cancel queued runs, and revoke the deployment identity/key if necessary. Changing the variable does not cancel an in-flight run or transaction.

## Rehearsal, acceptance and recovery

1. Verify all five required checks on the reviewed PR and verify that a feature ref or an unset activation variable cannot publish or deploy. Check the new environment restrictions, protected branch, Tailscale claims and grants, SSH host pin, restricted key, and credential expiry. Confirm a wrong key, unauthorized workload, and stale SHA fail before deployment. Never exercise the legacy Compose path against this stack.
2. Rehearse on a disposable **separate host** matching the installed Compose, server architecture/version and runtime settings. Use synthetic or authorized sanitized data and a reviewed rehearsal copy of the controller with its public probe pointed at a test endpoint. Keep the rehearsal identity and key separate from production. The CI fixture exercises a bad release and the real backend-only rollback without production connectivity. On the rehearsal host verify public Actuator is uncached, access-controlled routing behaves as expected, and local readiness proves database and storage. Run a known-good release followed by an unhealthy one; verify nonzero deployment status, exact image ID restoration, preserved MySQL/Gotenberg IDs and volume contents, and successful health after restoration. Test recovery from a journal left pending and verify an out-of-lineage image and migration drift are rejected before backend replacement.
3. Before activation, verify an existing TRON backup and an isolated restore drill, compare live source SHA to the candidate, confirm migration compatibility, save a durable copy of the previous image to approved storage if local pruning is possible, and record a baseline for health, login/CORS, persistent uploads, PDF conversion and representative Vercel flows. During the first unattended run verify the attested digest from the Actions summary, the Ubuntu journal, both dependency IDs and the same product checks. Record the results in the change record.
4. To recover from a reported failure, review `sudo journalctl -u tron-backend-release.service --since today` and the root-only transaction file locally. If a journal is pending or an operator rolls back the latest release, use `sudo /usr/local/sbin/tron-backend-release rollback`; verify readiness again. Coordinate manual changes with this controller and its lock. For read-only Compose inspection after the first release, use project `tron-ai`, `--env-file /etc/tron-ai/tron-ai.env`, `-f /etc/tron-ai/backend-release/compose.prod.yml` and `-f /var/lib/tron-backend-release/compose.backend.json`. Keep the rollback alias. If managed Compose or the env has changed since release, the controller refuses rollback until the operator reconciles the settings.

This is a single-backend replacement with a brief outage possible during restart and a longer outage during rollback. Rollback restores an image, never database contents; schema-changing releases require a separate reviewed plan. Health probes cannot prove AI, Vercel compatibility, or every PDF path, and an upstream outage may trigger a conservative rollback. A power loss or SIGKILL can leave a pending journal that requires recovery. Host root and the Docker daemon remain trusted; compromise of either can affect all colocated deployments. The signing job, package ACLs, restricted SSH key, GitHub branch and environment policies, and root-only host credentials all need ongoing review and rotation. No live Ubuntu setup or deployment was performed from this branch.
