# Admin Data Migration & Rollback

## Version

- **V23** `V23__admin_control_center.sql` (additive)
- Does **not** modify V1–V22 scripts

## Added

- `users.deleted_at`, `users.delete_reason`
- `admin_audit_logs.result_status`, `request_id`, `actor_role`
- Tables: `admin_quota_policies`, `admin_user_quota_overrides`, `ai_feature_daily_counters`, `ai_feature_quota_reservations`, `admin_quota_adjustments`, `admin_announcements`, `admin_cost_pricing`, `admin_budget_policies`, `admin_security_events`, `admin_user_invitations`
- Seed: global OBSERVE policies + disabled budget policy

## Compatibility

- Old app binaries without V23 code can run against V23 schema (extra columns/tables unused)
- New app requires V23 applied (Flyway)
- Historic Ultra UTC rows untouched

## Rollback reality

Flyway is forward-only. Rolling back a deploy image does **not** undo schema.

Manual safe rollback (if required after review):

1. Stop new feature-quota ENFORCE usage (set policies to OBSERVE / disable)
2. Redeploy previous application image that ignores V23 tables
3. Leave V23 tables in place (preferred) OR, only with backup + owner approval, drop V23-only tables
4. Do **not** drop `users.deleted_at` if soft-deletes already recorded

## Production safety

- No seed of real OWNER credentials
- No destructive rewrite of usage events
- Enforcement OFF/OBSERVE by default
