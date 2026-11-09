# TRON AI backend CI/CD handoff

## A. Executive summary

[Draft PR #11](https://github.com/tron-ai-team/terafes_07/pull/11) reconciles the exact live backend revision from PR #8 with protected `main` and adds a gated, backend-only release workflow. The production Compose definition and Flyway migrations are identical to the operator-reported live revision. The controller uses a root-owned copy of the reviewed Compose file and can restore the previous backend image if health checks fail.

**Automatic deployment is disabled.** `TRON_BACKEND_CD_ENABLED` was absent when checked. Production was not accessed, modified, or deployed to. Neither PR was merged. Treat GitHub CI on the current PR head, protected environment configuration, private access, and an isolated rehearsal as prerequisites for activation.

## B. GitHub information and checks

- Repository: `tron-ai-team/terafes_07`. Review branch: `codex/backend-production-cicd`. Target: `main`, at `584d1c90ad9811d49e91e9449a84ff6d860ce9aa` at audit time.
- PR: [#11](https://github.com/tron-ai-team/terafes_07/pull/11), draft. Get the exact current head with `gh pr view 11 -R tron-ai-team/terafes_07 --json headRefOid --jq .headRefOid`. For the commit containing this handoff, run `git log -1 --format=%H -- docs/handoffs/TRON_AI_BACKEND_CICD_FINAL_HANDOFF.md` on the review branch. A file cannot embed its own commit hash; the PR records the exact verified head and run link.
- The historical runtime failure is in [run 42670106652](https://github.com/tron-ai-team/terafes_07/actions/runs/42670106652). It passed recovery, frontend, Maven, and security, and built the Docker image. Its Docker job failed the production-topology smoke test after the old relay MySQL/PDF smoke passed.
- [Run 42671980947](https://github.com/tron-ai-team/terafes_07/actions/runs/42671980947) at `e48387b5fd19cedc881ec882895177585c7f12aa` failed at the run level. Attempts 1 and 3 report no jobs; attempt 2 reports only successful recovery. GitHub did not expose the root cause of incomplete job scheduling in the job API or logs. **NOT VERIFIED:** that this run's failure was due to a repository defect or a particular GitHub incident.
- [Rollback regression run 42674171419](https://github.com/tron-ai-team/terafes_07/actions/runs/42674171419) at `adb25abc` passed recovery, frontend and security; Maven did not report a job and Docker was skipped because it needs Maven. Use [PR #11 checks](https://github.com/tron-ai-team/terafes_07/pull/11/checks) for the final head. A green job from an earlier SHA does not satisfy current branch protection.

| Required GitHub check | Last conclusive historical result before the fresh run |
| --- | --- |
| Deployment recovery tests | Passed on run 42671980947, attempt 2 |
| Frontend build | Passed on run 42670106652 |
| Backend Maven tests | Passed on run 42670106652 |
| Security checks | Passed on run 42670106652; dependency review is advisory and unavailable for this repo |
| Docker image build (no push) | Built the image; failed the production-topology smoke on run 42670106652. The root cause was fixed and independently retested locally |

GitHub's [Vercel preview check](https://vercel.com/tron-ai2/tron-ai/3xMA5k94Jj6vPFkHPiPn987Bz5ct) passed for `e48387b5`. The Vercel connector did not return the project team for the current connection. **NOT VERIFIED:** current Vercel production deployment or application behavior against a new backend. No Vercel project changes are needed for this workflow.

## C. Changes and diagnosis

The CI fault with a job log was `Installed Compose settings differ from the running backend` during baseline preflight. In [Docker Compose's env_file hash bug](https://github.com/docker/compose/issues/14001), older `config --hash` and container creation hash different inputs. The controller now hashes the running image reference with the resolved service environment and clears `env_file` in a transient stdin-only hash input. It does not write secrets or mutate the managed Compose or runtime env. The check still rejects actual environment drift. The later jobless run did not expose an actionable CI error; it is tracked separately from this confirmed fault.

- Created on PR #11: `.github/workflows/backend-production.yml`, `deploy/BACKEND_PRODUCTION_CD.md`, `deploy/compose.relay.yml`, `deploy/scripts/backend-production.py`, `deploy/tests/smoke_backend_production.py`, and this handoff.
- Modified delivery files: `.github/workflows/ci.yml`, `.github/workflows/deploy-production.yml`, `deploy/README.md`, `deploy/compose.prod.yml`, `deploy/scripts/release-manager.py`, `deploy/tests/smoke_compose.py`, and `deploy/tests/validate_compose.py`. The [PR diff](https://github.com/tron-ai-team/terafes_07/pull/11/files) lists every application file brought in from PR #8. The backend tree differs from the live commit only in readiness code and its test; `frontend/` and `vercel.json` match `main`.
- In this follow-up, `deploy/tests/smoke_backend_production.py` now writes a synthetic MySQL row and an upload-volume marker before replacement and reads both after rollback. `.github/workflows/ci.yml` and `.github/workflows/backend-production.yml` pin hosted runners to Ubuntu 24.04, removing the moving `ubuntu-latest` alias during its announced OS transition. **NOT VERIFIED:** that the runner alias caused incomplete job scheduling. Existing tests and required checks were retained. This handoff is the only new file in the follow-up.
- Confirmed locally: Linux/amd64 image build, Compose hash behavior on 2.40.3 and 5.6.1, real Compose backend replacement and exact image rollback, rejected env drift, unchanged dependency container IDs and backend mounts, and restored health. The follow-up local run also read back the preexisting synthetic MySQL row and upload-volume marker. The local fixture maps its public probe to loopback; this does not verify the production Cloudflare route. Python compilation and `git diff --check` were also run on the new test.

## D. Production architecture

Operator verified on Ubuntu: Compose `/home/thushan/Desktop/x/tron-ai-github/deploy/compose.prod.yml`, backend container `tron-ai-backend`, image `ghcr.io/tron-ai-team/terafes_07/tron-ai-backend:sha-43d1f3f12a24`, source `43d1f3f12a24182e863342be27bb5059b5185edc`; dependencies `tron-ai-mysql` and `tron-ai-gotenberg`. Operator-provided architecture: React on Vercel, Ubuntu backend exposed only on `127.0.0.1:18080` → container `8080`, and Cloudflare Tunnel publishes `https://api.tronai.tech`. The reviewed Compose file defines `tron_ai_internal`, private MySQL and Gotenberg, and the named data, upload, storage and log volumes. The existing runtime env is `/etc/tron-ai/tron-ai.env`.

Verified in Git: `main` is four commits behind the live revision, and that exact revision is an ancestor of PR #11. The managed Compose snapshot source and migrations are byte-identical to the live revision in Git. **NOT VERIFIED** on host during this work: the actual Compose byte comparison, container labels and mount IDs, Compose version, Cloudflare/cache settings, GHCR pull permissions, SSH, current health, and backup quality. Do not infer these from CI.

## E. Release workflow

After activation, a `main` push or a dispatch on `main` in the canonical repository reruns all five CI jobs. A successful CI run allows a separate hosted job to build and smoke-test the exact Linux/amd64 image, publish its full SHA tag to GHCR, and attest its immutable digest. Only the publishing job can write packages and attestations. The deployment job needs the successful publish and independent `backend-production` approval. It verifies environment rules and current `main` before obtaining short-lived Tailscale access and sending a commit and digest over pinned SSH. The Ubuntu controller independently verifies provenance, current head, live image ancestry, stable configuration, unchanged Flyway files and healthy baseline. It runs `docker compose ... up -d --no-deps --no-build --pull never backend`, then verifies the candidate image ID, Docker health, local readiness and local/public Actuator. A failed release returns nonzero even when recovery succeeds.

## F. Security and safety

- Protected `main`: keep the five strict checks and review workflow/controller changes. After approval, use **Create a merge commit** for #11 to preserve the live SHA. Do not squash/rebase or merge #8 separately. Do not bypass branch protection.
- Runtime credentials stay on Ubuntu. Use a dedicated expiring verifier credential and read-only GHCR access, a separate registry config, restricted SSH key, pinned host key and ephemeral Tailscale OIDC. Do not expose credentials, Docker inspection output or rendered Compose in shared logs.
- Cloudflare Tunnel and unrelated deployments stay as they are. Never grant the runner public SSH, interactive SSH, forwarding, the Docker group, or general sudo.
- Flyway resources must match byte for byte; changed migration content requires a separate plan. The controller does not roll back a database. Root and Docker daemon compromise can affect all workloads on the shared host. Keep package writers, SSH keys and reviewer access limited and rotate credentials.

## G. Rollback and recovery

Before replacement the controller retains the exact running image ID under a local rollback alias and journals the target and configuration fingerprint. Failed health checks restore the prior image, verify it and close the journal. A host lock serializes releases; a transient systemd unit survives SSH disconnect. A pending journal remains if rollback cannot complete or the host loses power. The exact image restore, dependency IDs, mount equality and health were observed in the disposable local fixture. The follow-up regression also checks data sentinels. **NOT VERIFIED:** live restart, production credentials, Cloudflare, and interruption recovery on the actual host. No Docker volume or database was deleted.

With separate approval for host access, inspect `sudo journalctl -u tron-backend-release.service --since today` and the root-only journal. Run `sudo /usr/local/sbin/tron-backend-release rollback` for a pending transaction or to revert the latest recorded release, then verify local and public health. If the env/Compose fingerprint changed, stop and reconcile with an operator. Preserve the rollback image and existing volumes. Do not run `down -v` or prune the image before sign-off.

## H. Ordered manual setup after approval

Keep activation unset through all steps. The [operator runbook](../../deploy/BACKEND_PRODUCTION_CD.md#setup-after-explicit-approval) is the source of truth for setup commands and acceptance checks.

1. **GitHub environment.** Keep all five checks strict. After checks and review, use a merge commit and verify `git merge-base --is-ancestor 43d1f3f12a24182e863342be27bb5059b5185edc origin/main`. Under **Settings → Environments**, create `backend-production`, add an independent required reviewer, prevent self-review, disable admin bypass, and select only a `main` branch rule with no tag rules. Grant the repository Actions write access in the existing GHCR package.
2. **Environment secrets.** Add `TS_FEDERATED_CLIENT_ID`, `TS_FEDERATED_AUDIENCE`, `BACKEND_SSH_HOST` (full MagicDNS `*.ts.net` name), `BACKEND_SSH_KEY` (dedicated Ed25519 private key) and `BACKEND_SSH_KNOWN_HOSTS` (one pinned line for that exact name). Get Tailscale and SSH values from steps 3–4; never paste them into a report or repository-level secret.
3. **Tailscale.** Preserve existing node settings. Use `tag:tron-backend-prod` for the target and `tag:tron-backend-ci` for ephemeral CI. Allow only `tcp:22` from CI to the production tag and verify wildcard grants do not widen access. In **Settings → Trust credentials → Federated identities**, use issuer `https://token.actions.githubusercontent.com`, a dedicated audience, Auth Keys write, and only the CI tag. Bind the immutable subject `repo:tron-ai-team@347857149/terafes_07@1386554663:environment:backend-production`, `repository_id=1386554663`, `ref=refs/heads/main`, and `workflow_ref=tron-ai-team/terafes_07/.github/workflows/backend-production.yml@refs/heads/main`. Verify current claims before using the policy.
4. **Ubuntu controller.** Via an approved admin channel, compare `deploy/compose.prod.yml` from the reviewed commit to the existing Desktop file using `cmp -s`. Stop on a difference. Use the runbook's `install` commands to create the root-owned `/etc/tron-ai/backend-release/compose.prod.yml`, `/var/lib/tron-backend-release` state/registry directories, and `/usr/local/sbin/tron-backend-release`. Leave the original Desktop file and `/etc/tron-ai/tron-ai.env` in place. Add the root-only verifier token (Contents and Attestations read), dedicated GHCR pull credentials if required, and the `tron-backend-cd` account with the runbook's forced command and sole `sudo ... from-ssh` rule. Pin the Ubuntu host key via an independently verified fingerprint.
5. **Preflight.** Run `sudo /usr/local/sbin/tron-backend-release preflight` after authorization, and verify the currently running image label, source SHA ancestry, project/network/volumes and dependency IDs. Check supported Compose commands, Python, systemd and GitHub CLI. Verify restricted SSH rejects unauthorized commands and forwarding. Stop on any mismatch; do not fix production configuration by replacing it.
6. **Rehearsal.** Use a separate host with the same versions and a separate identity/key. Verify backup restore, candidate attestation, a known-good candidate, forced unhealthy candidate, exact image rollback, data and volume preservation, stale SHA rejection, and interrupted journal recovery. Check Cloudflare health behavior, Vercel login/CORS, uploads and PDF conversion in the test environment.
7. **Activation.** Only after separate explicit approval, set `TRON_BACKEND_CD_ENABLED=true` under repository Actions variables. During an approved window, dispatch `gh workflow run backend-production.yml --ref main -R tron-ai-team/terafes_07`, independently verify the published digest while the job waits, and have the independent environment reviewer approve. Verify health and the application flows again. Setting the variable false prevents future runs; it does not stop an already started host transaction.

## I. Risks and blockers

- Required GitHub evidence must be green at the current head; Vercel Preview and local Docker evidence do not satisfy branch protection. If GitHub again produces a jobless run, preserve the run/attempt IDs and check-suite data for a GitHub administrator or Support.
- Protected environment, GHCR package ACLs, OIDC claims, private route, SSH restrictions, Ubuntu installation and rehearsal are **NOT VERIFIED**. A live Compose label, env or version mismatch stops preflight and needs operator review.
- Single-backend replacement can interrupt traffic. Image rollback cannot undo schema changes; an unhealthy public route can trigger rollback. Verify backup/restore and public probe cache behavior before release.

## J. Next ChatGPT handoff

Start with PR #11's exact head, its five GitHub checks and the operator runbook. The safe next action is to confirm complete GitHub CI and keep the draft and activation variable disabled until review. Do not merge, activate, log in to Ubuntu, replace runtime configuration, alter Cloudflare or Vercel production, or touch NijoTours, TechTitans or TTComputers without separate authorization. Preserve all data and volumes. The live commit must remain an ancestor after an approved merge.
