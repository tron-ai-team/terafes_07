# TRON GitHub integration report

Date: 2026-10-26 (Asia/Tokyo)

## Repository and identity

Repository: https://github.com/tron-ai-team/terafes_07

The existing full-history clone at `/home/thushan/Desktop/x/tron-ai-github` was reused. A fresh fetch confirmed `origin/main` at `319ba0bb8007cbe60322f6e91557f0615f72791a`, including merged team PRs #1 and #2. Integration branch: `integrate/tron-usb-resume-20261026`, based directly on that commit.

GitHub CLI authenticated as `tt25304025-dev`, account ID 243481452. Local commit identity: Thushan Theekshana <243481452+tt25304025-dev@users.noreply.github.com>. This is the GitHub account-linked noreply address; private verified-email enumeration requires a token scope not currently granted. No global Git identity was changed.

## Integration

Complete non-runtime USB project source integrated. Eight team-only files remain: seven backend migration reports and `frontend/src/services/careerAgentClient.ts`. Sinhala AI selection and its English UI fallback are preserved alongside the USB translations. Existing team commits and authors remain unchanged in branch ancestry.

Previously tracked frontend/node_modules dependencies are removed from the Git index; package.json and package-lock.json retain reproducible installation. Generated build, runtime, Python and evidence artifacts are ignored. No team application source files were deleted.

Linux fixes: executable Maven wrapper, normalized wrapper line endings, removal of a Java test UTF-8 BOM, and replacement of its hardcoded Windows evidence path with JUnit temporary storage. The Docker runtime includes wget for its health check. Production deployment workflow remains manual with both confirmation gates.

## Validation

| Check | Result |
| --- | --- |
| Backend production package | PASS: `./mvnw -B -DskipTests package` |
| Backend documented hermetic suite | FAIL in GitHub CI: 247 tests, 20 failures, 0 errors, 0 skipped |
| Frontend clean install and production build | PASS after platform lockfile repair; `npm ci` then empty VITE_CORE_API_URL/VITE_LEGACY_API_URL `npm run build` |
| Production Docker Compose configuration | PASS with example env and validation image; no services started |
| Docker image build | BLOCKED: Docker daemon context deadline exceeded; CI Docker job skipped after backend failure |
| Gitleaks 8.30.1 working-tree secret scan | PASS, no leaks found (redacted output) |
| Tracked sensitive-file heuristic | PASS, no .env/credentials.json/PEM/private-key files tracked |
| Fresh npm audit | 3 moderate development-tool findings; 0 high/critical (postcss-nested, postcss-selector-parser, tailwindcss) |
| Whitespace | Existing/USB Markdown hard breaks, CRLF and trailing-space findings remain in the full staged diff; wrapper normalization verified |

CI evidence: https://github.com/tron-ai-team/terafes_07/actions/runs/40211513281 (initial integration commit). Failures include chat/provider routing and profile lock expectations, durability/persistence, health component expectations, two voice cases returning HTTP 400, and two CommandPolicyEngine path/approval cases. These need triage before merge; the suite was not weakened or further excluded to make it pass. This run also reproduced the frontend native-binding lockfile failure; the follow-up repair passes locally and requires a fresh CI result.

The Linux lockfile repair adds 50 missing optional platform dependency entries generated from the exact declared versions using npm. No existing locked package version changed. Clean install/build succeeded in memory-backed temporary storage; bundle-size warning remains (~1.34 MB JavaScript before gzip). Local full backend runs were bounded because severe host I/O pressure stalled progress; the complete GitHub CI result above is authoritative for the 247-test count. Live-service exclusions match the handoff documentation.

Evidence is outside Git at `/tmp/tron-resume-final` and `/dev/shm/tron-*`; temporary evidence is not a durable deployment record.

## Pull request

- PR: https://github.com/tron-ai-team/terafes_07/pull/3
- Base: main
- Status: DRAFT / OPEN, intentionally unmerged because backend CI fails.
- Application integration commit: `d0774f443d6629bf3d516458298675489de8d5a6`.
- A subsequent commit on the same branch contains the Linux lockfile repair and this finalized report. Its exact head SHA is available on the PR; a report cannot embed the SHA of its own commit.
- Push used normal feature-branch updates, with no force push or history rewrite.

## Remaining deployment requirements

PR review and green CI are required before merge. No merge or production deployment was performed. Before a separately authorized deployment: inspect resources and available ports; configure protected GitHub Environments and SSH/GHCR secrets; supply the real domain, OAuth redirects and private Ollama endpoint; create the dedicated TRON schema/user; secure runtime environment and storage; add the TRON Nginx site and Cloudflare hostname while preserving existing configuration; verify HTTPS, auth, PDF conversion, persistence and rollback. Live desktop, Gotenberg, provider and Career journey tests require their documented external services.

Existing production applications, Docker services, MySQL databases, Nginx sites and Cloudflare configuration were not modified. No deployment workflow was dispatched.
