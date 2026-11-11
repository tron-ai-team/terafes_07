# Admin Security Threat Model

## Assets

- User PII (email, display name, login methods)
- Role privileges (ADMIN/OWNER)
- AI usage/cost metadata
- Refresh sessions
- Provider credentials (must never enter admin JSON)

## Threats & controls

| Threat | Control |
|---|---|
| Ordinary USER hits admin API | Class/method `@PreAuthorize` + SecurityConfig `/api/v1/admin/**` |
| JWT role claim spoofing | Filter hydrates role from DB user record |
| Suspended/deleted account reuse of access JWT | Filter rejects disabled/suspended/`deletedAt` |
| ADMIN elevates to OWNER | OWNER-only role change + invite forbid OWNER |
| Last OWNER demotion/lockout | Count owners; forbid self demotion / last OWNER demotion |
| ADMIN suspends OWNER | Forbidden for non-OWNER actors |
| Self-suspend / self soft-delete | Forbidden |
| Password / Google secret exposure | DTO allowlist; identities omit `providerSubject`; invite stores hash |
| Cascade delete of CV/interview history | Soft-delete only; no FK cascade purge |
| Quota race / replica bypass | DB pessimistic lock + unique counter row (not JVM-only) |
| MFA checkbox theater | Security overview returns `NOT_IMPLEMENTED` |
| Provider key leakage via admin providers API | Boolean configured + health only |
| Audit tampering via API | No update/delete audit endpoints |

## Deferred / residual

- Full TOTP/WebAuthn step-up for high-risk actions
- Email delivery for invites/resets
- Dedicated failed-login rate analytics store (partial via security events table)
- Cross-instance quota proof beyond single-process IT (DB locks intended for multi-node)
