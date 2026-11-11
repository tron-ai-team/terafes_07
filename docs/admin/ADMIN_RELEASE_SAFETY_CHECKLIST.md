# Admin Release Safety Checklist

**No deployment executed in this mission.**

## Pre-merge

- [ ] PR targets `main`, not auto-merged
- [ ] CI green for backend tests
- [ ] V23 migration reviewed (additive only)
- [ ] Feature quota policies remain OBSERVE
- [ ] No frontend Antigravity WIP accidentally included
- [ ] No secrets/env files in diff
- [ ] OWNER bootstrap path documented (manual DB / offline invite)

## Pre-production enablement (separate approval)

- [ ] Staging ENFORCE test on synthetic users only
- [ ] Confirm STT/TTS undercount acceptable or metered
- [ ] Pricing catalog curated before showing costs as estimates
- [ ] Announcement XSS/sanitization verified in UI
- [ ] Backup / rollback plan acknowledged (schema forward-only)
- [ ] Existing ports 8080–8082 and prod `127.0.0.1:18080` undisturbed

## Explicit non-actions

- Do not push to `main` without review
- Do not toggle production CD
- Do not write against `api.tronai.tech` for admin smoke tests
- Do not mass-delete accounts
