# TRON AI — Complete UI/UX Audit Report

**Date:** 2026-11-15  
**Branch:** `fix/tron-complete-responsive-ui-ux-audit`  
**Base:** `origin/main` @ `87ba9ccc` (PR #31 mobile final integration report)  
**Worktree:** `C:\Users\Thushan\Projects\tron-complete-responsive-ui-ux-audit`  
**Status:** Verified fixes ready for Draft PR (do not merge without owner approval)

---

## A. Scope

### Routes audited

| Route | Notes |
|---|---|
| `/`, `/landing`, `/features`, `/models`, `/pricing` | Landing / Home |
| `/auth`, `/auth/callback` | Authentication |
| `/chat`, `/chat/:id` | Chat (guest gate + mocked authenticated) |
| `/voice` | Voice (guest gate + layout) |
| `/career`, `/career/interview`, `/career/interview/setup|room|feedback` | Interview suite |
| `/career/cv-builder`, `/career/cv`, `/career/profile`, `/career/history` | Career / CV / Profile |
| `/profile`, `/settings`, `/help`, `/about` | Account & support |
| `/workspace/*`, `/mentor`, `/agent` | Feature-unavailable shells |
| `/404`, unknown paths | Branded 404 |

### Viewports

320×568, 360×740, 375×812, 390×844, 414×896, 430×932, 540×720, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 2560×1440  
Plus landscape and ~150% zoom samples.

**Limitation:** Chromium emulation / Playwright projects only. Not equivalent to physical iPhone/Android/WebKit device testing. Firefox/WebKit were not run in this pass (Playwright projects are Chromium desktop + mobile emulation).

Baseline: `docs/TRON_MOBILE_UI_FINAL_INTEGRATION_REPORT.md` (PR #30/#31).

---

## B. Issues Found

### UX-001 — Chat search / truncation metadata dropped from assistant messages
- **Page:** Chat  
- **Screen size:** All  
- **Severity:** High  
- **Root cause:** `AppContext.sendChatMessage` built assistant `ChatMessage` objects with only `content`, omitting `search`, `truncated`, `finishReason`, and `language` returned by the backend.  
- **Screenshot:** N/A (functional; verified via mocked E2E)  
- **Fix:** Persist those fields on the assistant message.  
- **Test result:** PASS — `e2e/ui-ux-audit.spec.ts` markdown/sources case

### UX-002 — Markdown / citation / source rendering incomplete
- **Page:** Chat  
- **Screen size:** Especially mobile 320–430  
- **Severity:** High  
- **Root cause:** `MarkdownContent` only handled fenced code, inline code, and bold. Bare URLs, `[n]` / `[Source][n]` citations, lists, headings, and search result cards were missing or raw.  
- **Screenshot:** `docs/tron-ui-ux-audit-evidence/e2e/chat-markdown-mobile.png`  
- **Fix:** Extended parser for headings, lists, markdown links, bare URLs, citation chips linked to backend `search.results`, and source cards.  
- **Test result:** PASS — contract `test:markdown-inline` + E2E

### UX-003 — Long unbroken URLs / code could overflow chat bubbles
- **Page:** Chat  
- **Screen size:** 320–390  
- **Severity:** Medium  
- **Root cause:** Message bubbles and rich text used `whitespace-pre-wrap` without `break-words` / `overflow-wrap:anywhere` / `min-w-0`.  
- **Fix:** Added break/overflow classes on bubbles, markdown root, and links; constrained code cards.  
- **Test result:** PASS — long-URL E2E + overflow matrix

### UX-004 — Candidate Profile sticky Save overlapped mobile dock
- **Page:** `/career/profile`  
- **Screen size:** Mobile  
- **Severity:** Medium  
- **Root cause:** Sticky bar used `bottom: 3.5rem` while the 6-item dock is taller with safe-area.  
- **Fix:** Raised to `bottom: calc(4.25rem + safe-area-inset-bottom)`.  
- **Test result:** Covered by mobile core layout suite (no regression)

### UX-005 — Mobile bottom nav touch targets below ~44px
- **Page:** Global mobile dock  
- **Screen size:** Mobile  
- **Severity:** Medium (a11y)  
- **Root cause:** Compact icon/label stack lacked min height and focus rings.  
- **Fix:** `min-h-[44px]`, slightly larger active pill, `focus-visible` ring, readable 9px labels.  
- **Test result:** PASS — bottom-nav E2E on mobile-390

### UX-006 — Attachment control looked interactive but did nothing
- **Page:** Chat composer (mobile)  
- **Severity:** Low  
- **Root cause:** Paperclip button used `cursor-default` without `disabled`.  
- **Fix:** Marked `disabled` with honest unavailable labeling.  
- **Test result:** Visual/manual

### UX-007 — CV Builder empty state excessive padding on narrow phones
- **Page:** `/career/cv-builder`  
- **Screen size:** 320–390  
- **Severity:** Low  
- **Root cause:** `p-16` / `my-12` wasted vertical space.  
- **Fix:** Responsive `p-6 sm:p-10 md:p-16` and reduced mobile margin.  
- **Test result:** Build + existing mobile CV checks

### UX-008 — Missing global `prefers-reduced-motion` handling in CSS animations
- **Page:** Global  
- **Severity:** Medium (a11y)  
- **Root cause:** Liquid-glass hover transforms and CSS animations ignored reduced-motion.  
- **Fix:** `@media (prefers-reduced-motion: reduce)` block in `index.css`.  
- **Test result:** CSS present; cinematic identity preserved when motion allowed

---

## C. Responsive Verification

| Class | Result |
|---|---|
| Local preview overflow matrix (13 viewports × 14 routes + extras) | **0 / 184** horizontal overflows |
| Guest E2E overflow matrix | PASS |
| Production smoke (home/chat/voice/cv @ 390 & 1440) | overflow=false |
| Desktop 1440 / 1920 / 2560 | No layout regressions observed |
| Landscape / zoom samples | Captured; no overflow |

Evidence: `docs/tron-ui-ux-audit-evidence/overflow-report.json`, `representative/`, `production/`, `e2e/`.

---

## D. Functional Verification

| Area | Result |
|---|---|
| Navigation (top tabs, sidebar, mobile dock) | PASS |
| Auth gate + returnTo | PASS (existing contracts + guest routing) |
| Chat composer / IME / search cycle | PASS (mobile-chat suite) |
| Chat markdown + sources (mocked backend results) | PASS |
| Voice / Interview / CV / Profile shells | PASS (mobile-core / guest gates) |
| Forms (auth @ 320) | PASS |

**Mocked vs live:** Chat markdown/sources E2E uses mocked auth + mocked `/api/v1/chat` with genuine-shaped search results. Live FAST/SMART inference, live SearXNG, Google Sign-In, and PDF/Excel export were **not** re-executed against production credentials in this mission.

---

## E. Accessibility

| Item | Status |
|---|---|
| Bottom nav touch targets ≥ ~44px | Improved (UX-005) |
| Focus-visible on dock items | Added |
| Reduced motion | Added (UX-008) |
| Semantic headings on Help FAQ | Present in production a11y tree |
| Citation links expose `[n]` labels | Added |
| Full axe/WCAG automated suite | Not run end-to-end; spot checks + Playwright only |

---

## F. Performance

| Finding | Action |
|---|---|
| Main JS chunk ~1.42 MB (gzip ~394 KB) | Noted; no speculative code-splitting in this PR |
| Hero video / cinematic motion | Preserved; reduced-motion respected |
| Layout shift from sticky Save / dock | Mitigated by clearance fix |

No unverified score claims.

---

## G. Security

Pre-build inspection on current tip:

| Check | Result |
|---|---|
| `frontend/init` | Absent |
| `package.json` scripts | Clean (`vite` / contracts / playwright) — no `node init` |
| `tailwind.config.js` | Clean theme only; no obfuscation / `createRequire` payload |
| `vite.config.ts` | Standard proxy config |
| Lifecycle hooks (`preinstall`/`postinstall`) | None |
| Suspicious executables under frontend | None found |

Historical malicious payloads from pre-PR#30 Core tip were **not** reintroduced.

---

## H. Testing

| Command | Result |
|---|---|
| `npm run test:contracts` (incl. new `test:markdown-inline`) | PASS |
| `npx tsc -b` | PASS |
| `npm run build` | PASS |
| Playwright suites (ui-ux-audit, viewport-matrix, guest-routing, mobile-home, mobile-chat, mobile-core, core-features-viewport) | **251 passed, 17 skipped, 0 failed** |
| Local overflow capture script | 184 captures, 0 overflow |
| Production smoke capture | 8 captures, 0 overflow |

Skipped cases are intentional desktop↔mobile `test.skip` scopes, not weakened failures.

---

## I. Remaining Limitations

1. No physical iOS Safari / Android Chrome device lab.  
2. Firefox / WebKit Playwright browsers not installed/run in this pass.  
3. Authenticated production journeys (live GPU chat, real search citations, interview TTS, CV export) not exercised with live credentials.  
4. Virtual keyboard geometry is approximated via `visualViewport` logic already in the dock; true soft-keyboard occlusion on real devices remains a residual risk.  
5. Automated axe-core / Lighthouse CI not added in this PR.

---

## J. Delivery

| Item | Value |
|---|---|
| Branch | `fix/tron-complete-responsive-ui-ux-audit` |
| Worktree | `C:\Users\Thushan\Projects\tron-complete-responsive-ui-ux-audit` |
| Draft PR | https://github.com/tron-ai-team/terafes_07/pull/32 |
| CI / Vercel | Frontend build / Security / Maven / Deployment recovery / Docker (no push) / Vercel Preview: PASS |
| Merge | **Do not merge** without owner approval (`TRON_BACKEND_CD_ENABLED=true`) |

### Primary files changed

- `frontend/src/components/common/MarkdownContent.tsx`
- `frontend/src/context/AppContext.tsx`
- `frontend/src/pages/ChatModePage.tsx`
- `frontend/src/pages/CandidateProfilePage.tsx`
- `frontend/src/pages/CvBuilderPage.tsx`
- `frontend/src/components/landing/LandingMobileBottomNav.tsx`
- `frontend/src/index.css`
- `frontend/package.json` + `scripts/verify-markdown-inline.mjs` + capture/E2E additions
- `docs/tron-ui-ux-audit-evidence/**` + this report
