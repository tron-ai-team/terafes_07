# Branching and release freeze

```text
develop  →  PR + CI  →  main  →  GitHub Actions  →  GHCR  →  Ubuntu deploy
```

## Branches

| Branch | Purpose |
|--------|---------|
| `develop` | Active feature work (Cuser). Staging deploy workflow may run here. |
| `main` | Approved, releasable commits. Production deploy workflow. |
| `release/frozen-<date>` | Optional snapshot of the version first deployed to the server. |

## Rules

1. Do not force-push `main` or `develop`.
2. Do not mix unfinished feature work into the first deployment freeze commit set if avoidable — prefer a `release/frozen-*` tag/branch from a known-good SHA.
3. Experimental `develop` commits must not deploy directly to public production.
4. After staging validation, merges into `main` may deploy automatically (with GitHub Environment protection recommended).

## Creating a freeze snapshot (on a machine with git)

```bash
# After the repo is on GitHub and the chosen commit is known:
git checkout -b release/frozen-YYYYMMDD <COMMIT_SHA>
git push -u origin release/frozen-YYYYMMDD
git tag -a tron-deploy-freeze-YYYYMMDD -m "Frozen deployment snapshot"
git push origin tron-deploy-freeze-YYYYMMDD
```

Ongoing development continues on `develop` without changing the frozen tag.
