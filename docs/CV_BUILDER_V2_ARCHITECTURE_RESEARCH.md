# TRON AI — CV Builder V2 Architecture Research

**Phase:** 1 — Deep technical research and root-cause investigation only  
**Date:** 2026-11-11  
**Repo / workspace:** `tron-ai-team/terafes_07` · local checkout `Group7`  
**GitHub account context:** `tt25304025-dev`  
**Production site:** https://www.tronai.tech  
**Production API:** https://api.tronai.tech  
**Scope:** Research only — no production changes, no deploy, no Magic Fill changes, no secret exposure  

---

## Verdict (executive)

| Problem | Status | Primary cause class |
|---------|--------|---------------------|
| Preview not working (production) | **Confirmed root cause** | CV preview = PDF export via **Gotenberg Chromium**; production Gotenberg has **`--chromium-disable-routes=true`** → Chromium route **HTTP 404** |
| PDF download not working (production) | **Confirmed root cause** | Same Chromium-only path in `CvBuilderService.export` / `CvGotenbergExportService.convertHtmlDocument` |
| Browser “Failed to fetch” | **Separate cause family** | Native `fetch` network/CORS/host failure — **not** the same as Gotenberg 502/404 API errors |
| Excel output “incorrect” | **Confirmed historical + structural** | Excel is a **different** presentation path (POI cell fill). CP-03F documented layout defects; 志望動機 has no dedicated master cell |
| Save/reload data loss | **Mostly sound; UI gaps** | Backend `payload_json` round-trips intact; editor exposes a **subset** of payload fields |

**Recommended production architecture:** Keep **one canonical HTML/CSS document** (`CvHtmlPdfRenderer` + `rirekisho_print.css` / `resume_en.css`) for preview and PDF. For PDF, use **Gotenberg Chromium HTML→PDF** with a **controlled re-enable** of Chromium on the Ubuntu host (resource-capped). Do **not** silently fall back to Excel→LibreOffice for Japanese PDF (already rejected by CP-03F). Do **not** assume LibreOffice can print the current absolute-positioned 履歴書 CSS. Remove Excel from the **user-facing** CV Builder UI; keep backend XLSX APIs until an explicit compatibility sunset.

---

## 1. Existing architecture

### 1.1 End-to-end data flow (as implemented today)

```text
React CvBuilderPage (/career/cv-builder)
  → careerCenterClient + apiFetch (Bearer JWT + credentials)
  → Spring CvBuilderController  /api/v1/career/cv-builder/*
  → CvBuilderService (draft CRUD, photo, export)
       ├─ payload_json  ↔  MySQL cv_builder_drafts (+ versions)
       ├─ photo        ↔  ObjectStorage (MinIO / local FS)
       ├─ PDF path:    CvHtmlPdfRenderer → CvGotenbergExportService.convertHtmlDocument
       │                 → GotenbergPdfClient.convertHtml
       │                 → POST /forms/chromium/convert/html
       │                 → object storage → cv_generated_documents
       └─ XLSX path:   RirekishoExcelFiller / AlternateCvWorkbookExporter (POI)
  → GET /documents/{id}/download  (binary blob)
  → Preview: object URL → <iframe> PDF
     Download: temporary <a download>
```

### 1.2 Frontend map (reusable)

| Asset | Path | Role |
|-------|------|------|
| Builder UI (monolith) | `frontend/src/pages/CvBuilderPage.tsx` | Create/save/load drafts, JA/EN template switch, photo, preview, PDF/Excel, Magic Fill UI |
| API client | `frontend/src/services/careerCenterClient.ts` | All `/api/v1/career/cv-builder/*` calls |
| Types | `frontend/src/types/careerCenter.ts` | `CvDraft`, `CvExportMeta`, photo/version types |
| Auth HTTP | `frontend/src/services/httpClient.ts` | `apiFetch`, 401 refresh single-flight |
| API base | `frontend/src/config/api.ts` | Dev `localhost:8080`; prod build default `https://api.tronai.tech` |
| Hub link | `frontend/src/pages/CareerCenterPage.tsx` | Card into builder |
| Adjacent (not builder) | `frontend/src/pages/CVManagementPage.tsx` | Interview CV upload studio (`/career/cv`) — **do not confuse** |

**Preview model today:** There is **no** live HTML preview. Preview saves draft → `POST .../preview?format=pdf` → authenticated download → PDF blob iframe. Preview and PDF therefore share the **identical** Gotenberg Chromium failure mode.

### 1.3 Backend map (reusable)

| Asset | Path | Role |
|-------|------|------|
| Controller | `.../cvbuilder/CvBuilderController.java` | JWT-protected REST surface |
| Service | `.../cvbuilder/CvBuilderService.java` | Draft lifecycle, export orchestration |
| HTML renderer | `.../cvbuilder/CvHtmlPdfRenderer.java` | Canonical JA/EN HTML string builder |
| Gotenberg wrapper | `.../cvbuilder/gotenberg/CvGotenbergExportService.java` | CV Chromium HTML convert |
| Gotenberg client | `.../cvbuilder/gotenberg/GotenbergPdfClient.java` | Chromium + LibreOffice + `convertHtmlProductionSafe` |
| Photo | `.../cvbuilder/CvPhotoSupport.java` | JPEG/PNG ≤2MB, 3:4 ID crop |
| Excel JA | `.../cvbuilder/RirekishoExcelFiller.java` + `rirekisho_master.xlsx` | XLSX fill |
| Excel EN/SHOKUMU | `.../cvbuilder/AlternateCvWorkbookExporter.java` | Programmatic workbooks |
| Entities | Draft / Version / GeneratedDocument / Template / AiSuggestion | Soft-delete drafts (V20) |
| Migrations | `V17`, `V18`, `V20` | Career Center + templates + soft delete |

**Auth:** All CV Builder routes require authentication (`SecurityConfig` → authenticated). Ownership via `SecurityUtils.getRequiredUserId()`.

**Interview PDF contrast (important):** Interview reports already use `convertHtmlProductionSafe` (LibreOffice-first) because production disables Chromium. **CV Builder intentionally still calls Chromium-only `convertHtml`** (comment in `GotenbergPdfClient` and `CvBuilderService`).

### 1.4 Database (preserve intact)

| Table | Purpose |
|-------|---------|
| `cv_builder_drafts` | `payload_json` LONGTEXT, `template_code`, soft `deleted_at` |
| `cv_builder_versions` | Snapshots |
| `cv_generated_documents` | Export artifacts (`object_key`, sha256, format) |
| `cv_templates` | Seeded codes (RIREKISHO_JA, SHOKUMU_JA, RESUME_EN) |
| `cv_ai_suggestions` | Magic Fill / AI assist (out of scope for change) |
| `candidate_profiles.photo_object_key` | Shared profile photo |

**Do not migrate away or wipe these tables.** New CV creation already works; preserve create/update/list/get/delete + photo APIs.

### 1.5 Template codes

| Code | UI for new CVs | PDF HTML | Excel |
|------|----------------|----------|-------|
| `RIREKISHO_JA` | Yes | Absolute 履歴書 (`rirekisho_print.css`) | Master XLSX |
| `RESUME_EN` | Yes | Flowing EN resume (`resume_en.css`) | Programmatic workbook |
| `SHOKUMU_JA` | Hidden (legacy drafts) | **Falls through to 履歴書 HTML** (quirk) | Separate workbook |

---

## 2. Existing reusable templates

### 2.1 Production / classpath (reuse)

| Asset | Reuse decision |
|-------|----------------|
| `career/templates/pdf/rirekisho_print.css` | **Primary JA print CSS** — A4 `@page`, absolute geometry, photo box, page breaks. Reuse; polish, don’t rewrite from scratch |
| `CvHtmlPdfRenderer.buildRirekisho` | **Primary JA HTML generator** — server-side binding, wareki, photo, history caps. Reuse as canonical document source |
| `career/templates/pdf/resume_en.css` + `buildResumeEn` | **Primary EN resume** — reuse; strengthen sections as needed |
| `TRON_Rirekisho_Reference_Template.html` | **Design reference** (browser `data-field` + JS). Geometry source for Antigravity; not the runtime PDF binder |
| `career/templates/pdf/rirekisho.css` | **Orphan fallback** — CP-03D table CSS; current HTML uses `.paper`/`.portrait`. Keep on disk; do not delete |
| `rirekisho_master.xlsx` | Keep for backend compatibility / rollback; **not** user-facing primary after Excel UI removal |
| Photo pipeline (`CvPhotoSupport`, draft/profile object keys) | Reuse unchanged |

### 2.2 Evidence / history (do not delete)

| Era | Location | Notes |
|-----|----------|-------|
| CP-03C | `evidence/cp03c/` | Simplified 1-page JA; first HTML→Chromium |
| CP-03D | `rirekisho.css` + evidence PDFs | Table 履歴書 + photo |
| CP-03E | Excel→LibreOffice reconstruction | Documented PDF layout failures |
| CP-03F/G | `evidence/cp03f/`, `evidence/cp03g/` | Owner absolute geometry + polish |

### 2.3 Template fitness checklist (current JA HTML)

| Requirement | Assessment |
|-------------|------------|
| A4 | Yes (`@page` + 595.28×841.89 pt `.paper`) |
| Japanese fonts (CSS stack) | Declares Noto Serif/Sans CJK + system fallbacks |
| Photo positioning | Yes — 30×40 mm `.portrait` |
| Multi-page | Two `.paper` sections + `page-break-after` |
| Long content | Soft Self-PR split; hard caps edu≤9 / work≤2 / cert≤6 |
| Empty optional fields | Renderer leaves blanks / placeholders; does not invent candidate data |
| English separate layout | Yes — different HTML+CSS |
| LibreOffice CSS compatibility | **Poor** — heavy `position: absolute`. Interview HTML deliberately uses tables for LibreOffice |

### 2.4 Production font evidence (read-only SSH)

Inside `tron-ai-gotenberg` (2026-11-11):

- Health: `{"status":"up","details":{"chromium":{"status":"up"},"libreoffice":{"status":"up"}}}`
- `POST /forms/chromium/convert/html` → **HTTP 404** (routes disabled)
- Fonts present include **Noto Serif CJK** (`NotoSerifCJK-*.ttc`) among Noto packs

Chromium process may report “up” while **routes remain disabled** — do not treat `/health` chromium=up as “HTML convert works.”

---

## 3. Confirmed root causes vs hypotheses

### 3.1 Preview / PDF failure on production — **CONFIRMED**

**Evidence chain:**

1. `CvBuilderService.export` PDF branch calls `gotenbergExportService.convertHtmlDocument(html)`.
2. `CvGotenbergExportService.convertHtmlDocument` → `gotenbergPdfClient.convertHtml` only.
3. `GotenbergPdfClient.convertHtml` → `POST /forms/chromium/convert/html` with A4 paper fields.
4. `deploy/compose.prod.yml` Gotenberg command includes `--chromium-disable-routes=true` (LibreOffice-only by design to save RAM).
5. Live Ubuntu inspection (`ssh tron-ubuntu`): container cmd includes that flag; in-container Chromium convert returns **404**.
6. Frontend preview **is** that PDF pipeline + blob iframe — not a separate HTML preview.

**Expected production symptom:** API `502/503` with message like “PDF generation is temporarily unavailable… Start local Gotenberg Chromium…”, or conversion-failed wrapping HTTP 404. UI may rewrite that into “PDF preview unavailable (Gotenberg). XLSX download still works.”

**Local contrast:** Root `docker-compose.yml` does **not** disable Chromium. Local PDF/preview can work when `tron-gotenberg` is up — which explains “worked in engineering / fails in production.”

**Not claimed fixed:** No code or compose change was made in this research phase.

### 3.2 “Failed to fetch” — **CONFIRMED separate family**

| Mechanism | Why |
|-----------|-----|
| `apiFetch` → raw `fetch` with no outer try/catch | Browser throws `TypeError: Failed to fetch` when no HTTP response |
| Typical triggers | Backend down, wrong `VITE_CORE_API_URL`, DNS/TLS, offline, CORS preflight failure |
| **Not** typical for Gotenberg-down | Backend still returns HTTP JSON error → `ApiError` with detail string |

CORS: prod uses `cors.allowed-origins: ${CORS_ALLOWED_ORIGINS}`. Misconfigured origins for `https://www.tronai.tech` (or preview domains) can surface as “Failed to fetch.” JWT expiry usually yields **401 → refresh → retry** or a structured auth error — not the bare fetch TypeError — unless refresh cookie path also fails.

**Hypothesis (needs user-session repro):** Occasional “Failed to fetch” during CV use when API host unreachable or CORS mismatch; may be misattributed to PDF bugs.

### 3.3 Excel format incorrect — **CONFIRMED structural + historical**

From `docs/CV_EXCEL_TEMPLATE_MAPPING.md` + CP-03F report:

- Excel is **cell-value fill** of owner master; presentation ≠ HTML PDF.
- Sheet `2面 ` has a **trailing space** in the name (fragile).
- **志望動機** has **no dedicated labeled area** on the master — risk of wrong-cell overwrite if forced.
- CP-03F listed defects A–F (name wrap, postal duplication, phone misplacement, Self-PR overflow into licenses, supplemental mix-ups, photo anchor instability) for Excel→LibreOffice PDF era.
- English Excel is a separate programmatic sheet — not the HTML resume layout.

Owner decision to **remove Excel from UI** is consistent with treating HTML/PDF as the professional product.

### 3.4 CV data survive save/reload — **MOSTLY CONFIRMED OK; UI coverage gaps**

| Layer | Finding |
|-------|---------|
| Persist | `PUT` writes full `payload` map via `preparePayload` → `payload_json` |
| Load | `GET` returns full payload map in DTO |
| Template switch | Keeps payload; only changes `templateCode` |
| Soft delete | `deleted_at`; active queries exclude deleted |
| Versions | Snapshot/restore APIs exist |

**UI gap (confirmed in code):** `TEXT_FIELDS` in `CvBuilderPage` is a **partial** editor (name, DOB, addressText, email, phone, selfPr, careerGoals, hobbies…). Fields used by renderer such as `postalCode`, `addressFurigana`, holiday contacts, split phones, `personalRequests` / 本人希望, structured `workExperience` / `certifications` / `projects` editing are largely profile-driven or incomplete in the form. Data can **survive** in JSON yet appear “missing” in the editor or blank on PDF if never entered.

**Not inventing data:** Backend/renderer use empty strings / placeholders; Magic Fill is out of scope and must not be used to fabricate values in V2 implementation.

### 3.5 Stale documentation — **CONFIRMED**

| Doc | Drift |
|-----|-------|
| `docs/ARCHITECTURE.md` | Still says PDF = XLSX → LibreOffice |
| `docs/CV_EXCEL_TEMPLATE_MAPPING.md` PDF section | Describes Excel→LibreOffice as primary PDF |
| `CvBuilderController` preview comment | Still mentions POI→Gotenberg |
| Reality (CP-03F+) | HTML → Chromium for CV PDF |

---

## 4. Recommended rendering technology

### 4.1 Options compared (evidence-based)

| Option | Visual accuracy for current JA template | Prod Gotenberg fit | CPU/RAM | Security | Spring integration |
|--------|----------------------------------------|--------------------|---------|----------|-------------------|
| **A. Gotenberg Chromium HTML→PDF** | **Best** — designed for this CSS | Routes currently **disabled** | Higher (Chromium); needs caps | Keep internal-only; deny public | Already implemented |
| **B. Gotenberg LibreOffice (HTML or XLSX)** | HTML absolute CSS: **poor**. XLSX: valid PDF but **wrong professional layout** (CP-03F) | **Works today** | Lower / already sized | Same internal Docker net | Interview uses LO HTML; CV XLSX path exists |
| **C. Other server engines** (OpenHTMLToPDF, WeasyPrint, Playwright sidecar) | Chromium-class only if browser-based; Java engines struggle with modern absolute print CSS | New ops surface | Mixed | New dependency risk | Extra work; little gain vs Gotenberg Chromium |
| **D. Browser print / client PDF** | Good on user’s machine if HTML preview shipped | Avoids server Chromium | Client-side | Auth/blob/photo complexity; inconsistent downloads | Weak for “Download PDF” product requirement |

### 4.2 Decision

**Primary recommendation: Option A — Gotenberg Chromium HTML→PDF**, with production Chromium **re-enabled under resource controls**, because:

1. Canonical JA template is **absolute-positioned print CSS** measured from owner PDF — Chromium is the matching renderer.
2. CP-03F explicitly rejected silent Excel→LibreOffice fallback for professional output.
3. Code, CSS, evidence (`evidence/cp03f`, `cp03g`), and unit/IT harness already assume Chromium.
4. Production already runs Gotenberg 8 with **Noto CJK fonts installed**.
5. Host snapshot at investigation time: ~15 GiB RAM, ~11 GiB available, 4 CPUs — Chromium is **feasible if capped**, not “impossible.” Re-enable must still be deliberate.

**Rejected as primary PDF path:** LibreOffice conversion of current `rirekisho_print.css` HTML (CSS fidelity) and Excel→PDF (layout defects).

**Accepted secondary:** LibreOffice remains for **interview reports** and any office conversion; not the CV professional path unless Antigravity delivers a **new LibreOffice-compatible table template** that owner accepts visually (see risks).

### 4.3 Official Gotenberg notes (research)

- Chromium HTML convert: `POST /forms/chromium/convert/html`, part name **`index.html`**, A4 via `paperWidth=8.27` / `paperHeight=11.7` (already set in client) — docs: https://gotenberg.dev/docs/8.x/convert-with-chromium/convert-html-to-pdf  
- Disable Chromium: `--chromium-disable-routes=true` / `CHROMIUM_DISABLE_ROUTES` — docs: https://gotenberg.dev/docs/8.x/configuration  
- LibreOffice: font substitution is the #1 layout breaker; CJK fonts must be present — already true on our image for Noto CJK.

---

## 5. Production Gotenberg compatibility

### 5.1 Current production posture

```text
gotenberg/gotenberg:8
  --api-timeout=120s
  --libreoffice-restart-after=10
  --libreoffice-max-queue-size=2
  --chromium-disable-routes=true
mem_limit ≈ 1024m, cpus ≈ 1.0
No host ports (Docker internal only)
```

### 5.2 Compatibility matrix

| Caller | Route | Prod today |
|--------|-------|------------|
| CV PDF / preview | Chromium HTML | **Broken (404)** |
| Interview PDF | LibreOffice HTML (`convertHtmlProductionSafe`) | Compatible |
| Legacy CV office convert | LibreOffice file convert | Compatible if used |

### 5.3 Recommended prod Chromium profile (implementation phase — not applied now)

If owner approves Chromium for CV quality:

1. Remove `--chromium-disable-routes=true` **or** replace with controlled enable.
2. Cap Chromium: e.g. `--chromium-max-concurrency=1`, `--chromium-auto-start=false`, `--chromium-idle-shutdown-timeout=30s` (exact flags per Gotenberg 8.x docs at implement time).
3. Raise `mem_limit` modestly (e.g. 1536–2048m) and measure peak under one concurrent CV convert.
4. Keep Gotenberg **off public internet** (no host publish) — already correct.
5. Verify Japanese 履歴書 + EN resume + photo + 2-page PDF before declaring fixed.
6. Do **not** route untrusted remote URLs through Chromium without allow-list hardening.

**Alternative if Chromium must stay off:** Antigravity redesign JA template to LibreOffice-safe **table** HTML (interview pattern), then CV calls `convertHtmlProductionSafe`. This is a **visual redesign project**, not a one-line client switch — absolute CSS will not “just work.”

---

## 6. Japanese CV (履歴書) template requirements

### 6.1 Content / layout

- Traditional Japanese application form, **two A4 pages**
- Candidate photo (縦4cm × 横3cm), placeholder if absent
- Personal: ふりがな, 氏名, 生年月日・満年齢, 国籍, 現住所 (+ 〒), 連絡先, E-mail, 携帯
- 学歴・職歴 table with chronological markers; empty work → な　し pattern
- 免許・資格
- 自己PR (+ overflow continuation, not overlapping licenses)
- 志望動機 / 本人希望 in continuation region when present — **never invent**
- Supplemental: 得意科目, 健康, 課外, 趣味, スポーツ
- Wareki dates for as-of and DOB
- Correct Japanese typography (Mincho labels / Gothic values stacks already in CSS)

### 6.2 Technical constraints

| Constraint | Rule |
|------------|------|
| Capacity | edu ≤ 9, work ≤ 2, cert ≤ 6 (reject overflow with clear API error) |
| Empty fields | Leave blank / labeled empty — no fabricated schools, employers, or prose |
| Photo | Existing draft/profile object storage + data-URI embed in HTML |
| Gender UI | Current HTML shows static ※男・女 chrome; do not invent gender data |
| Source of truth | Same HTML used for preview and PDF |

### 6.3 Reuse vs redesign

- **Reuse** CP-03F/G geometry + `CvHtmlPdfRenderer` + `rirekisho_print.css`.
- Antigravity may polish alignment/typography and missing editor-bound fields **without** discarding measured coordinates.
- Only redesign to table layout if Chromium remains permanently disabled.

---

## 7. English Resume requirements

### 7.1 Content / layout

- Professional single-column A4 resume (`resume_en.css`)
- Contact details, professional summary (`selfPr`), career goals when present
- Education, technical skills, projects, experience, certifications
- Photo **off by default**; only if `includePhotoOnEnglishResume` (backend already gated)
- Empty sections omitted or empty — **never invent** projects/experience

### 7.2 Gaps to address in implementation

- EN CSS has weak multi-page break strategy vs JA (flowing page) — add explicit section page-break rules for long histories
- Editor field set is JA-leaning; EN needs clearer skills/projects/experience editing surfaces (Cursor + Antigravity contract)
- Excel EN workbook is not the visual target after Excel UI removal

---

## 8. Exact implementation plan (phased)

> Research phase ends at this document. Implementation is for Cursor / Antigravity under owner approval. **No production change until reviewed.**

### Phase 0 — Freeze / safety

1. Do not alter existing `payload_json` rows.
2. Do not change Magic Fill providers or prompts.
3. Do not delete Excel backend classes or master XLSX yet.
4. Branch: e.g. `feature/cv-builder-v2-html-pdf` from agreed base.

### Phase 1 — Single document contract

1. Formalize **Template Contract v1** (JSON payload keys + HTML fragment IDs) — §9–10.
2. Ensure `CvHtmlPdfRenderer.renderHtml` is the **only** document builder for preview + PDF.
3. Add `GET /drafts/{id}/preview-html` (JWT) returning `text/html` from the same renderer (photo data-URI resolved server-side).
4. Frontend: live HTML preview via authenticated fetch → `iframe srcDoc` (or blob URL of HTML). Keep PDF preview optional.

### Phase 2 — Production PDF path

1. Owner decision gate: **Enable Chromium (recommended)** vs **LibreOffice-safe redesign**.
2. If Chromium: update `deploy/compose.prod.yml` (+ relay if used) with capped Chromium; smoke-test on staging/Ubuntu.
3. Keep `convertHtml` as CV path; optionally add health probe that checks Chromium **route** not just `/health`.
4. Improve API error messages (remove “use XLSX” after Excel UI removal).

### Phase 3 — Excel UI removal

1. Remove Excel NeonButton + hub copy that advertises Excel.
2. Remove XLSX fallback messaging in preview/export errors.
3. Leave `export?format=xlsx` API intact initially (compatibility); document deprecation.
4. Do not delete historical `cv_generated_documents` XLSX rows.

### Phase 4 — Editor completeness (no invention)

1. Expand form fields to match Template Contract (postal, furigana address, holiday contacts, certifications, work, projects/skills for EN).
2. Validation: capacity, empty optional OK, language hints per template.
3. Preserve create-new-CV and draft list behavior.

### Phase 5 — Verification

1. Execute §11 test plan locally with Chromium-enabled Gotenberg.
2. Execute production-safe smoke after approved Chromium enable (or LibreOffice template acceptance).
3. Visual PDF inspection against `evidence/cp03f` / owner reference PDF — automated `%PDF` checks are necessary but **not sufficient**.

---

## 9. Antigravity task specification (UI / template design)

### Mission

Deliver **print-faithful HTML/CSS** for Japanese 履歴書 and English Resume that is the **same document** users see in live preview and that Chromium prints to PDF. Professional visual quality is the success metric.

### Inputs (must use — do not delete)

- `TRON_Rirekisho_Reference_Template.html`
- `backend/.../career/templates/pdf/rirekisho_print.css`
- `backend/.../career/templates/pdf/resume_en.css`
- `evidence/cp03f/`, `evidence/cp03g/`
- Owner refs: `x履歴書フォーマット.pdf`, `TRON_Rirekisho_HTML_Preview.pdf`

### Deliverables

1. **Updated JA print CSS + static HTML mock** (filled with clearly labeled **sample** data only in mocks; production binding remains server-side).
2. **Updated EN print CSS + static HTML mock**.
3. **Template Contract v1** Markdown table: payload key → visible region → empty behavior → max length / row caps.
4. **Print checklist** screenshots: A4, 2-page JA, photo present/absent, long Self-PR, long education, EN multi-section.
5. Explicit note whether design assumes **Chromium** (absolute CSS OK) or **LibreOffice** (tables only). Default assumption: **Chromium**.

### Hard rules

- Do not invent real candidate PII in production templates.
- Do not remove existing CSS files; supersede via versioned edits.
- Preserve A4 dimensions and JA photo 30×40 mm box.
- No Excel/XLSX design work.
- No Magic Fill UX redesign (leave controls as-is unless Cursor asks for copy-only Excel removal adjacency).
- Compatible with server-side string binding (no required browser JS for PDF). Optional `data-field` attributes OK for preview tooling if they do not break print.

### Acceptance

- Side-by-side vs owner 履歴書 reference: alignment, borders, photo box, history grid.
- EN resume: readable professional hierarchy, A4 margins, section spacing.
- Empty fields do not collapse critical chrome incorrectly.
- Page 2 starts on a clean A4 canvas.

---

## 10. Cursor implementation specification (Spring / React)

### Mission

Wire Antigravity’s canonical HTML/CSS into Spring + React so **create/save/reload**, **HTML preview**, and **PDF download** work against production Gotenberg constraints, and remove Excel from the user workflow.

### Backend tasks

1. Keep draft CRUD, photo, versions, soft-delete **behavior**.
2. Add HTML preview endpoint using `CvHtmlPdfRenderer` + photo URI resolution (same as export).
3. PDF export continues via Chromium `convertHtml` once prod allows it; surface clear errors if Chromium route 404.
4. Do **not** silently convert CV HTML through LibreOffice while JA CSS remains absolute-positioned.
5. Optional: shared helper `assertChromiumAvailable()` for operator diagnostics.
6. Excel: no UI dependency; mark controller `xlsx` as deprecated in comments/OpenAPI if present; do not break callers yet.
7. Expand schema endpoint if used so frontend field lists match Template Contract.
8. Tests: renderer unit tests; IT with Gotenberg Chromium when available; do not weaken PDF magic validation.
9. Magic Fill: **no provider or prompt changes**.

### Frontend tasks

1. Remove Excel button and Excel marketing copy (`CvBuilderPage`, `CareerCenterPage`).
2. Implement live HTML preview from new HTML endpoint (auth blob/`srcDoc`).
3. Keep PDF download path; fix error copy (no XLSX fallback advice).
4. Expand editor fields per Template Contract; education selection for RIREKISHO cap retained.
5. Preserve new CV creation + draft picker + template switch.
6. Ensure all CV calls use `apiFetch` (Bearer + refresh); never put JWT in query strings or logs.
7. Improve empty-state UX for missing optional fields (indicators in editor only).

### Compose / ops (owner-approved only)

1. Propose Chromium-enabled Gotenberg flags + mem limits in PR description.
2. Do not push/restart production from this research phase.
3. Update stale docs (`ARCHITECTURE.md`, `GOTENBERG.md`, Excel mapping PDF section) in the implementation PR.

### Template contract compatibility

Both teams must share:

```text
templateCode: RIREKISHO_JA | RESUME_EN
payload keys: (frozen list in Template Contract v1)
photo: resolved server-side to data URI for HTML
preview-html: identical bytes path as PDF HTML input (minus Gotenberg)
pdf: Gotenberg Chromium(index.html) with preferCssPageSize + A4 inches
```

---

## 11. Testing plan

### 11.1 Automated

| Test | Type | Pass criteria |
|------|------|---------------|
| Create draft JA/EN | API / IT | 201/200, payload seeded or empty as designed |
| Save + reload | API | Byte-stable JSON fields user entered |
| Soft delete | API | Hidden from list; data row retained |
| Capacity overflow | API | Clear 4xx; no silent truncation |
| HTML renderer JA/EN | Unit | Contains expected labels; escapes HTML; empty fields blank |
| Photo include/exclude | Unit/IT | Data URI or placeholder |
| PDF convert (Chromium up) | IT | `%PDF` magic, size > threshold |
| PDF convert (Chromium disabled) | IT | Deterministic failure — no corrupt file |
| Download auth | API | Owner 200; other user 404; anonymous 401 |
| Expired JWT | FE unit + API | Refresh or clean session failure — no token leak |
| Excel UI absent | FE | No Excel button in builder/hub |
| Regression: new CV create | E2E smoke | Unchanged happy path |

### 11.2 Visual / manual (required for “fixed”)

| Check | Method |
|-------|--------|
| A4 page size | PDF page boxes / print preview |
| Japanese glyphs | Visual — Noto CJK, no tofu |
| Photo crop/position | Visual vs reference |
| Two-page JA break | Visual |
| Long Self-PR / edu | Visual — no overlap into 免許 |
| EN long projects | Visual — readable breaks |
| HTML preview vs PDF | Side-by-side same draft |
| Network failure UX | DevTools offline → actionable message ≠ silent hang |

### 11.3 Production smoke (after approved deploy)

1. In-container: Chromium convert returns **200** with tiny HTML fixture.
2. Authenticated CV preview-html + PDF for throwaway test account.
3. Confirm interview PDF still works (LibreOffice path).
4. Memory sample during one CV convert (`docker stats`).

### 11.4 Out of scope for this plan

- Magic Fill quality
- Rotating API keys
- Deleting historical drafts or generated XLSX blobs

---

## 12. Technical risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Chromium RAM/CPU on 4-vCPU Ubuntu | High | Concurrency 1, idle shutdown, mem_limit, queue test |
| Re-enable Chromium without measuring | High | Staging smoke + `docker stats` before calling “fixed” |
| Switching CV to LibreOffice without template redesign | High | Will produce wrong JA layout; forbidden with current CSS |
| Preview/PDF drift if two templates evolve | High | Single `CvHtmlPdfRenderer` + contract tests |
| Editor subset vs payload richness | Medium | Expand fields; show “present in draft but not edited” |
| Excel API leftover confusion | Low | UI removal + deprecation notes |
| SHOKUMU_JA PDF = 履歴書 HTML | Medium | Document quirk; optional later template |
| CORS / wrong API host → “Failed to fetch” | Medium | Verify `CORS_ALLOWED_ORIGINS` + `VITE_CORE_API_URL` |
| Absolute CSS brittle to font metric changes | Medium | Pin font stacks; visual regression evidence folder |
| Security: Chromium SSRF if remote assets allowed | Medium | Keep data-URI photos; no arbitrary URL fetch in templates |
| Docs drift causing wrong ops decisions | Medium | Update ARCHITECTURE/GOTENBERG in implementation PR |

---

## Appendix A — API inventory (CV Builder)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/templates` | Hardcoded JA+EN list |
| GET | `/templates/{code}/schema` | Schema stub — tighten in V2 |
| CRUD | `/drafts`, `/drafts/{id}` | Create works — preserve |
| Photo | `/drafts/{id}/photo` (+ from-profile, DELETE, GET) | Reuse |
| POST | `/drafts/{id}/preview?format=` | Today = export pipeline |
| POST | `/drafts/{id}/export?format=pdf\|xlsx` | PDF Chromium; xlsx POI |
| GET | `/documents/{id}/download` | Auth binary |
| Versions / AI / Magic Fill | existing | Magic Fill out of scope |

**Proposed addition (implementation):** `GET /drafts/{id}/preview-html`.

## Appendix B — Reproduction commands (read-only / local)

```bash
# Production (read-only) — already used in this research
ssh tron-ubuntu
docker inspect tron-ai-gotenberg --format '{{.Config.Cmd}}'
docker exec tron-ai-gotenberg curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST http://127.0.0.1:3000/forms/chromium/convert/html
# Expect: 404 while chromium-disable-routes=true

# Local (when Docker Chromium-enabled gotenberg is running)
curl -s http://127.0.0.1:3000/health
# CV PDF requires Spring + JWT — use existing IT: CvHtmlPdfGotenbergIT / Cp03fHtmlPdfVisualIT
```

Do not paste access tokens into logs, evidence files, or this document.

## Appendix C — Delegation summary

| Tool | Owns |
|------|------|
| **CODEX** (this doc) | Research, architecture, root cause, contracts, risks |
| **Antigravity** | Professional HTML/CSS + Template Contract + visual acceptance |
| **Cursor** | Spring/React integration, Excel UI removal, Gotenberg wiring, automated tests |

**Compatibility rule:** One HTML document source → browser preview + Chromium PDF. Excel is not part of the user-facing V2 product path.

---

## Appendix D — What this phase did / did not do

| Did | Did not |
|-----|---------|
| Inspected real Spring/React/CSS/compose source | Change production |
| Read-only SSH Gotenberg probe | Restart services / edit server config |
| Compared CP-03C–G evidence & official Gotenberg docs | Implement Magic Fill / rotate keys |
| Wrote this research deliverable | Claim preview/PDF “fixed” without verified Chromium path |

**Next gate:** Owner chooses Chromium re-enable vs LibreOffice template redesign; then Antigravity + Cursor execute Phase 1+.
