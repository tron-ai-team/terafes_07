# TRON AI — Japanese CV Builder Phase 3 Integration Report

**Date:** 2026-11-11  
**Base Antigravity commit:** `bbc2e2ab1afef25eece659bddd376bbaf2404d95`  
**Branch:** `feature/japanese-cv-builder-canonical-v2` (clean replacement of conflicted #18)  
**Backup branch:** `feature/japanese-cv-builder-canonical` (kept until verified)  
**Scope:** Implementation + local verification — **no production deploy**

---

## 1. Antigravity code review findings

| Finding | Severity | Action taken |
|---------|----------|--------------|
| Frontend `rirekishoCanonicalTemplate.ts` generated a **second** HTML document for `srcDoc` preview while PDF used Java `CvHtmlPdfRenderer` | **Critical** (layout drift) | Preview now uses Spring `preview-html` from the same renderer as PDF |
| Antigravity UI correctly removed EN template selection + Excel button | Good | Preserved |
| `listTemplates()` already JA-only | Good | Preserved; create forced to `RIREKISHO_JA` |
| Java change for `additionalNotes` preference | Good | Kept |
| Working-tree formatting noise on `CvBuilderService` | Noise | Discarded before intentional edits |

## 2. Canonical HTML/PDF architecture

```text
Editor payload
  → CvHtmlPdfRenderer + rirekisho_print.css   (ONLY document builder)
       ├─ GET/POST .../preview-html  → browser iframe (blob URL, no JWT in URL)
       └─ POST .../export?format=pdf → Gotenberg Chromium → download
```

TS template file retained for **validation + offline evidence tools only**.

## 3. Preview integration

- `GET/POST /api/v1/career/cv-builder/drafts/{id}/preview-html`
- Optional POST body `{ payload }` renders unsaved editor state **without DB write**
- Photo resolved server-side to data-URI
- CSP: `script-src 'none'`; iframe `sandbox="allow-same-origin allow-modals"`
- Auth via `apiFetch` Bearer + refresh (401 handled by shared client)

## 4. Save / Reload

- Existing draft CRUD preserved
- New drafts always `RIREKISHO_JA`
- Template switch to EN/SHOKUMU rejected on update
- Historical rows not deleted

## 5. PDF result

- Still Chromium-only via `convertHtml` (correct for absolute CSS)
- Local `docker-compose.yml` configures Chromium with concurrency caps
- Production still has `--chromium-disable-routes=true` — **PDF not claimed fixed in production**
- Owner-ready example: `deploy/compose.gotenberg-chromium.example.yml`

## 6. Japanese layout

- Two A4 `.paper` pages from Java renderer
- Escape tests for untrusted content
- No invented health/education defaults in renderer empty-payload path
- Health field placeholder changed to “optional”

## 7. Errors fixed

- Dual-template preview/PDF drift
- Preview depending on PDF/Gotenberg
- Excel/XLSX user messaging on PDF failure
- Create/update allowing EN template codes from UI path
- Distinguishes “Failed to fetch” (network/CORS) vs Gotenberg Chromium failure

## 8. Tests (local)

| Suite | Result |
|-------|--------|
| Frontend `npm run build` (`tsc -b && vite build`) | **PASS** |
| `CvHtmlPdfRendererTest` + `CvPreviewHtmlContractTest` + related unit tests | **PASS** |
| `CvHtmlPdfGotenbergIT`, `GotenbergHtmlProductionSafeIT` (local Chromium Gotenberg) | **PASS** |
| `Cp03fHtmlPdfVisualIT`, `Cp03gFormatPolishIT` | **PASS** |
| Production Chromium PDF on Ubuntu | **NOT DONE** (routes still disabled; owner approval required) |
| Full authenticated browser E2E against live Spring | Not run in this session (API client + unit/IT coverage) |

## 9. GitHub

- PR #18 was **CONFLICTING** with `main` because it still included Interview V2 / Auth commits already merged in #17 (~75 files).
- Clean fix: branch `feature/japanese-cv-builder-canonical-v2` from latest `origin/main` + CV-only cherry-picks (`5760fb0f`, `1f86adc8`) → **28 CV files**, no Interview/Auth noise.
- Old branch retained as backup (no force-push).
- Replacement PR opened against `main` (not merged).

## 10. Remaining production requirements

1. Owner approval to enable Chromium on Ubuntu Gotenberg (example compose provided).
2. Smoke: Chromium convert HTTP 200 + visual JA PDF with photo.
3. Confirm CORS_ALLOWED_ORIGINS includes production SPA origins.
4. Do **not** switch JA layout to LibreOffice without redesign.
