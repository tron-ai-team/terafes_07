# TRON AI — Mobile All-Pages Audit & Route Inventory

## 1. Branch Ancestry & Topology

- **Grandparent (PR #27):** `feature/tron-mobile-home-reference-20261114` (`e92f3154a7e5fcc5bec275cdb43fbb03defc8e3e`)
- **Direct Upstream Base:** `feature/tron-mobile-chat-ui-20261114` (`0f1b91b93f3ca2b57afc6e7105a9638b01fb35af`)
- **Feature Branch:** `feature/tron-mobile-core-pages-20261115`
- **Isolation:** Dedicated worktree at `C:\Users\Thushan\Projects\tron-mobile-core-pages-20261115`
- **Ancestry Verification:** Verified via `git merge-base --is-ancestor e92f3154 0f1b91b9` (true) and `git merge-base --is-ancestor 0f1b91b9 HEAD` (true). No changes or force-pushes to `main`, and no auto-merge.

---

## 2. Target Route Inventory

| Route | Primary Component | Purpose & Auth | Mobile Status Before Audit |
|---|---|---|---|
| `/voice` | `VoiceModePage.tsx` | Hands-free real-time AI audio dialogue (Fast/Smart/Ultra) | HUD ring oversized (340px) clipping on short phones; manual/auto toggle cramped. |
| `/career/interview` | `DashboardPage.tsx` | Interview practice hub, readiness metrics, quick start | Central orb oversized; mock CV upload misleadingly stated "uploaded/parsed". |
| `/career/interview/setup` | `InterviewSetupPage.tsx` | Interview configuration (company, role, level, language) | Dead link to `/career/company-analysis` (unrouted). Spacing large on narrow phones. |
| `/career/interview/room` | `InterviewRoomPage.tsx` | Live simulated interview session with speech VAD | Bottom nav occluded recording controls; HUD orb pushed questions down. |
| `/career/interview/feedback` | `FeedbackPage.tsx` | Evaluation score, radar chart, actionable tips | Export and retry buttons collided at 320px width. |
| `/career/history` | `HistoryPage.tsx` | Historical interview transcripts and score archive | Fabricated company name "LINEヤフー株式会社" shown when record company is null. |
| `/career/cv-builder` | `CvBuilderPage.tsx` | Japanese JIS / Global Resume CV builder & export | Drafts sidebar stacked vertically above form, creating 1500px scroll barrier. A4 preview non-zoomable. |
| `/career/cv` | `CvManagementPage.tsx` | CV documents list & draft version management | Card layout acceptable, but overflow trap in parent layout prevented scrolling. |
| `/profile` | `ProfilePage.tsx` | User profile overview, plan tier, activity summary | Long email / user names overflowed glass card boundaries horizontally. |
| `/career/profile` | `CandidateProfilePage.tsx` | Japanese career history, skills, certifications form | Multi-section long form required scrolling 2000px back to top/bottom to save. |
| `/auth` | `AuthPage.tsx` | Guest sign in / account registration / OAuth | `overflow-hidden` caused submit button to be trapped off-screen when keyboard opened. |
| `/auth/callback` | `AuthCallbackPage.tsx` | OAuth exchange handler with safe redirect | Similar layout trap on small screens. |
| `/settings` | `SettingsPage.tsx` | Global AI intelligence mode, audio sensitivity, lang | `handleSave` showed false success toast even if backend update returned error. |
| `/help` | `HelpPage.tsx` | FAQ, troubleshooting, microphone setup | Japanese localization missing; untruthful claims about automated CV parsing. |
| `/about` | `AboutPage.tsx` | TRON AI brand philosophy, team members, mission | Required responsive image & team card stacking without changing canonical team roles. |
| `/404` | `NotFoundPage.tsx` | Not found fallback & safe recovery navigation | Clean, verified safe return to `/`. |

---

## 3. Baseline Audit & Defect Discovery

### P0 Issues Found & Fixed
1. **Global AppLayout Mobile Overflow Trap (`src/components/layout/AppLayout.tsx`):**
   - *Behavior:* Mobile main wrapper used `overflow-hidden` at `< md`, completely blocking vertical scrolling for any page without internal scroll containers.
   - *Fix:* Replaced with `overflow-y-auto overflow-x-hidden` and added safe-area padding `pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-[max(1rem,env(safe-area-inset-bottom))]`.

2. **Mobile Bottom Navigation Occlusion in Focus Room (`src/components/landing/LandingMobileBottomNav.tsx`):**
   - *Behavior:* The fixed 6-item bottom dock remained visible on `/career/interview/room`, covering audio mute, answer input, and End buttons.
   - *Fix:* Added `isInterviewRoom` check (`location.pathname.startsWith('/career/interview/room') || location.pathname.startsWith('/interview/room')`) to hide the dock automatically during active interview sessions.

3. **Settings False-Success Bug (`src/pages/SettingsPage.tsx`):**
   - *Behavior:* In `handleSave`, calling `authApi.updateSettings` swallowed errors and displayed "Preferences saved successfully" even when the API threw an exception.
   - *Fix:* Added `try...catch` block around `updateSettings`, surfacing real error message via error toast on failure.

### P1 Issues Found & Fixed
1. **CV Builder Mobile Layout Stacking Barrier (`src/pages/CvBuilderPage.tsx` & `CvBuilderHeader.tsx`):**
   - *Behavior:* On screens `< lg`, the 400px drafts sidebar rendered statically above the editing form, forcing users to scroll past the entire sidebar before reaching the CV form.
   - *Fix:* Introduced mobile mode-based workspace: `Drafts | Edit | Preview` controlled by top segmented tabs. Desktop layout (`>= lg`) remains an untouched 12-column grid.

2. **CV Live Preview Usability on Phone (`src/components/cvBuilder/CvLivePreview.tsx`):**
   - *Behavior:* A4 preview canvas was rendered at fixed scale, unreadable on mobile screens.
   - *Fix:* Surfaced zoom controls (`ZoomIn`, `ZoomOut`, reset 100%) so users can pinch/zoom between 40% and 150%.

3. **Candidate Profile Floating Save Bar (`src/pages/CandidateProfilePage.tsx`):**
   - *Behavior:* Saving changes on mobile required scrolling all the way to the top or bottom of a 2000px+ form.
   - *Fix:* Added floating sticky save pill bar at bottom when form is dirty (`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`), enabling 1-tap save at any scroll position.

4. **Fabricated Company Fallback in Interview History (`src/pages/HistoryPage.tsx`):**
   - *Behavior:* If an interview record lacked a company name, it displayed hardcoded `'LINEヤフー株式会社'`.
   - *Fix:* Replaced with honest localized fallback `'模擬面接（企業未指定）'` (JP) / `'Mock Interview (Unspecified)'` (EN).

5. **Misleading File Upload Claim on Dashboard (`src/pages/DashboardPage.tsx`):**
   - *Behavior:* Selecting a CV file on the dashboard displayed a toast claiming the CV was parsed.
   - *Fix:* Corrected to honestly state the file was selected and navigated directly to `/career/cv-builder` where the candidate can populate/review fields.

6. **Help Page Inaccurate Claims & English Only (`src/pages/HelpPage.tsx`):**
   - *Behavior:* Static English text claiming fully automated CV ingestion and detailed scoring engine, with no Japanese translation.
   - *Fix:* Implemented full Japanese and English bilingual support (`useTranslation`), interactive expandable FAQ accordion, and honest descriptions of existing capabilities.

7. **Auth Page Keyboard Scroll Trap (`src/pages/AuthPage.tsx` & `AuthCallbackPage.tsx`):**
   - *Behavior:* Outer container used `h-screen overflow-hidden`, causing inputs and submit button to be clipped when the mobile soft keyboard opened.
   - *Fix:* Changed to `min-h-[100dvh] overflow-y-auto` with responsive padding.

---

## 4. Architecture & Component Map

```
AppLayout
├── TopBar (desktop navigation & mobile hamburger toggle)
├── Sidebar (desktop left sidebar; mobile slide-out drawer)
├── MobileBottomNav (fixed 6-item bottom dock: Home, Chat, Voice, Interview, CV, Profile)
│     └── Hidden when keyboard is open or inside /interview/room
└── <main> (scrollable viewport container with safe-area padding)
      ├── /voice -> VoiceModePage (responsive HUD orb 170-340px)
      ├── /career/interview -> DashboardPage (responsive orb, quick cards)
      ├── /career/interview/setup -> InterviewSetupPage (compact selectors)
      ├── /career/interview/room -> InterviewRoomPage (dock hidden, focus mode)
      ├── /career/interview/feedback -> FeedbackPage (flex-wrap actions)
      ├── /career/history -> HistoryPage (honest unassigned label)
      ├── /career/cv-builder -> CvBuilderPage (Drafts | Edit | Preview tabs)
      ├── /profile -> ProfilePage (word-break user identity cards)
      ├── /career/profile -> CandidateProfilePage (sticky floating save bar)
      ├── /auth -> AuthPage (scrollable form with clean returnTo)
      ├── /settings -> SettingsPage (truthful error handling, pb-24 spacing)
      ├── /help -> HelpPage (bilingual FAQ accordion)
      └── /about -> AboutPage (responsive team cards, preserved branding)
```
