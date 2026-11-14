# TRON AI — Mobile Homepage Single-Screen Optimization Report

## Executive Summary

- **Repository:** `tron-ai-team/terafes_07`
- **Feature Branch:** `feature/tron-mobile-home-reference-20261114`
- **Pull Request:** [PR #27](https://github.com/tron-ai-team/terafes_07/pull/27)
- **Primary Objective Achieved:** Transformed the mobile homepage (`< lg`) from a vertically scrolling layout into an adaptive single-screen mobile experience. On all common supported mobile screens (360×740, 375×812, 390×844, 393×852, 412×915, 430×932), all 9 primary homepage elements fit naturally inside a single viewport without requiring vertical scrolling.
- **Desktop Preservation:** 100% preserved. Zero visual or structural modifications to the desktop layout (1440×900, 1920×1080), preserving the cinematic 3-column layout, desktop navigation pills, holographic robot video placement, and bottom dock.

---

## 1. Problem Statement & Root Cause

### Previous Issue
While the initial mobile homepage visually matched the design reference, the vertical spacing was excessive (~1,022px total height on a 390×844 device). As a result:
- The user had to scroll down past the robot and CTA button to view the four main feature cards (`AI Chat`, `AI Voice`, `Interview Practice`, `Create CV`).
- The primary CTA and bottom cards were not immediately visible above the fold.

### Root Cause Breakdown
1. **Outer Container Padding:** `LandingPage.tsx` had `pb-20 sm:pb-24`, adding an unnecessary 80–96px dead bottom padding under the fixed bottom navigation.
2. **Double Top Spacing:** `HeroSection.tsx` had `pt-16 sm:pt-20` on `<section>` plus `pt-4 sm:pt-6` on the inner container, leaving 80–104px of dead space below the 44px navbar.
3. **Fixed Robot Container Height:** The robot video container had hardcoded heights `h-[260px] sm:h-[300px]`, consuming over 30% of total screen height.
4. **Card & Grid Padding:** The 2×2 feature cards had `p-3 sm:p-3.5`, 40px icon containers, and `line-clamp-3` descriptions, consuming ~230px of vertical space.
5. **CTA & Benefit Pills Spacing:** Excessive vertical margins (`my-2.5`, `py-3.5`) inflated the middle section.

---

## 2. Adaptive Height Budget Solution

To achieve single-screen fit without using global CSS zoom or `transform: scale()`, we budgeted each section using responsive CSS `clamp()`, dynamic viewport heights (`100dvh`), `safe-area-inset-bottom`, and flexbox `min-h-0`:

| Component / Section | Previous Height | Optimized Height | Budget Reduction |
|---|---|---|---|
| **Mobile Header Clearance** | `pt-16` + `pt-4` (~80px) | `pt-12` + `pt-1` (~48px) | **-32px** |
| **Hero Badge** | `py-1.5`, text-xs (~28px) | `py-0.5`, text-[10px] (~20px) | **-8px** |
| **Headline** | `text-[25px]`, `mb-2` (~68px) | `text-[19px] xs:text-[21px]`, `mb-1` (~46px) | **-22px** |
| **Supporting Description** | `text-xs`, 3 lines (~42px) | `text-[10px] xs:text-[10.5px]`, 2 lines (~26px) | **-16px** |
| **Robot Hero Stage** | Fixed `h-[260px]` | Adaptive `clamp(115px, 17vh, 185px)` | **-115px to -145px** |
| **Three Benefit Pills** | `p-2`, `w-7` icons, `my-2` (~60px) | `py-1 px-1`, `w-6` icons, `my-1` (~36px) | **-24px** |
| **Primary CTA Button** | `py-3.5`, `my-2` (~54px) | `h-10 sm:h-11`, `my-1` (~40px) | **-14px** |
| **2×2 Feature Cards Grid** | `p-3.5`, `w-10` icons (~230px) | `p-2`, `w-7` icons, 2 lines (~132px) | **-98px** |
| **Bottom Nav Clearance** | `pb-20` (~80px) | `pb-[calc(3.4rem+env(safe-area-inset))]` (~54px) | **-26px** |
| **Total Height Footprint** | **~1,022px** | **~520px – 560px** | **~460px Saved** |

---

## 3. Responsive Viewport Test Results

All target viewports were verified using automated Playwright tests running on the production preview bundle:

| Device Class | Viewport (W×H) | Measured `scrollHeight` | Fits in 1 Viewport? | 4 Feature Cards in Viewport? | Status |
|---|---|---|---|---|---|
| **Compact Android** | 360 × 740 | 740 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **Common iPhone** | 375 × 812 | 812 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **iPhone** | 390 × 844 | 844 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **Large iPhone** | 393 × 852 | 852 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **Large Android** | 412 × 915 | 915 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **iPhone Pro Max** | 430 × 932 | 932 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **Tablet** | 768 × 1024 | 1,024 px | **YES (0px scroll)** | **All 4 Cards Visible** | PASS |
| **Desktop** | 1,440 × 900 | 900 px | **YES (Cinematic)** | **Desktop layout intact** | PASS |
| **Small Phone** | 320 × 568 | 672 px | Graceful fallback scroll | Readable, no clipping | PASS |

> [!NOTE]
> On extremely short screens such as 320×568, the layout prioritizes readability and accessibility without clipping, enabling controlled fallback scrolling so the user can easily reach any content.

---

## 4. Preservation of Design & Brand Identity

1. **TRON AI Visuals:**
   - Single master HTML5 video element (`/videos/tron-ai-hero.mp4`) with poster fallback (`/images/tron-ai-hero-poster.webp`).
   - Glowing pedestal aura and concentric rotating SVG energy rings retained.
   - TRON AI logo with glowing drop shadow and "Your AI Partner" subtitle retained.
2. **Color Palette & Glassmorphism:**
   - Apple-style liquid-glass styling (`tron-liquid-glass`, `tron-liquid-card`, `tron-liquid-pill`).
   - Deep navy text, electric blue, bright cyan gradient CTA with shimmer and click feedback.
   - 4 feature cards retain their distinct accent gradients (Blue, Purple, Pink, Orange).
3. **Bilingual Support:**
   - Full Japanese (日本語) and English support retained across all badges, headlines, benefits, feature cards, and bottom navigation.
4. **Desktop Safety:**
   - All mobile adjustments are strictly scoped inside `lg:hidden`.
   - The desktop layout (`lg:flex`, `LandingSecondaryNav`, 3-column cinematic stage) remains 100% identical.

---

## 5. Automated Verification Suites

- **TypeScript Compilation:** `npx tsc -b` -> `0 errors`
- **Vite Production Build:** `npm run build` -> `✓ built in 3.11s`
- **Contracts Verification:** `npm run test:contracts` -> `4/4 passed`
- **E2E Guest Routing:** `npm run test:e2e:guest` -> `6/6 passed`
- **E2E Authenticated Chat:** `npm run test:e2e:auth` -> `1/1 passed`
- **E2E Mobile Reference & Single-Screen:** `npx playwright test e2e/mobile-home-reference.spec.ts` -> `19/19 passed` (1 skipped for desktop in mobile project)

---

## 6. Visual Evidence Captured

Captured high-fidelity full-viewport screenshots stored under `docs/tron-mobile-evidence/`:
- `viewport-360x740.png` — Compact Android (all 9 elements visible in 1 screen)
- `viewport-375x812.png` — Common iPhone (all 9 elements visible in 1 screen)
- `viewport-390x844.png` — Standard iPhone (all 9 elements visible in 1 screen)
- `viewport-393x852.png` — Large iPhone (all 9 elements visible in 1 screen)
- `viewport-412x915.png` — Large Android (all 9 elements visible in 1 screen)
- `viewport-430x932.png` — iPhone Pro Max (all 9 elements visible in 1 screen)
- `viewport-768x1024.png` — Tablet (all 9 elements visible in 1 screen)
- `viewport-320x568.png` — Small phone (graceful fallback scrolling without clipping)
- `viewport-1440x900.png` — Desktop cinematic preservation check

---

## 7. Next Steps

- Push commit to `feature/tron-mobile-home-reference-20261114` to update PR #27.
- Await owner review.
