# TRON AI V2 — Remaining Issues

Prioritized unfinished / limited items after the Interview V2 full development push.

## P0 / High

1. **Live browser E2E not run here**  
   Login→Online, idle session redirect, Japanese/English interview rooms, and PDF download should be verified with Playwright (or manual QA) against a local stack before merge to production.

2. **Gotenberg required for real PDF bytes**  
   `GET /api/v1/interviews/{id}/report.pdf` returns **503** when Gotenberg is down. HTML generation and auth are covered; production/dev must keep Gotenberg healthy for downloads.

3. **Production deploy still blocked by policy**  
   This branch must not be merged or deployed without owner review. Flyway **V22** (`engine_state_json`) is additive and required on next backend deploy.

## P1 / Medium

4. **Cross-tab refresh-token rotation**  
   Single-flight refresh is per-tab. Two tabs refreshing simultaneously can revoke each other’s cookie. Consider BroadcastChannel coordination later.

5. **Interview UI still partially cosmetic for question cards**  
   Engine drives dynamic follow-ups, but some room UI cards remain count-based placeholders. Surface `nextAction` / `answerQuality` more explicitly in the room.

6. **Opening TTS length cap**  
   Shared speak path truncates ~400 characters. Very long interviewer prompts may be shortened.

7. **Full Maven suite**  
   Selected interview/auth suites passed; a full module `mvn test` on CI should still be reviewed after PR open.

## P2 / Lower

8. **History detail depth**  
   History links with `interviewId` and PDF download are wired; richer transcript detail UX can still be expanded.

9. **SSE / binary clients**  
   Career photo/download and SSE now participate in refresh; other raw `fetch` call sites should be audited opportunistically.

10. **Cloud cost / live AI quota**  
    Avoid broad live AI regression loops; prefer mocks for CI and sparse live smoke tests.
