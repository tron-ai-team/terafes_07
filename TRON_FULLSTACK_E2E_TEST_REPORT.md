# TRON Full-Stack E2E Test Report

**Date:** 2026-10-25  
**Evidence:** `_tron_final_integration_evidence/`  
**Classification:** PASS / FAIL / BLOCKED / NOT_TESTED / PARTIAL

---

## A. Startup

| Test | Result | Notes |
|---|---|---|
| Clean rebuild start | **PASS** | `-Restart -ForceRebuild`; Spring + Vite healthy |
| Idempotent repeated start | **PASS** | `ALREADY RUNNING` reuse |
| Frontend HTTP 200 | **PASS** | `http://localhost:5174/` |
| Backend providers fingerprint | **PASS** | `/api/v1/auth/providers` |
| OpenAPI Career V1 routes | **PASS** | 23 `/api/v1/career/*` paths after rebuild |
| Stale Spring without rebuild | **FAIL→FIXED** | Pre-rebuild Career APIs 404; forced rebuild required |
| Desktop Agent duplicate protection | **NOT_TESTED** | `TRON_DESKTOP_MODE=none` this run |
| Stop/restart cycle | **PARTIAL** | Restart path exercised via `-Restart` |

---

## B. Frontend build / TypeScript

| Test | Result |
|---|---|
| `tsc -b` | **PASS** |
| `vite build` production | **PASS** (≈10.7s) |
| Landing page render | **PASS** (browser + screenshot) |
| Premium landing / robot preserved | **PASS** |

---

## C. Authentication

| Test | Result | Evidence |
|---|---|---|
| Register | **PASS** | `api_curl_results.txt` |
| JWT access token issued | **PASS** | token_len=351 |
| Authenticated Career calls | **PASS** | profile/cv/jobs/interview |
| Session refresh / logout UI | **NOT_TESTED** (this run) | Existing `httpClient` single-flight refresh retained |

---

## D. Career Center journey (API — live)

| Step | Result | Evidence |
|---|---|---|
| Candidate Profile PUT/GET | **PASS** | score=100; `nameJa=山田 太郎` |
| CV templates list | **PASS** | |
| Create RIREKISHO_JA draft | **PASS** | draftId recorded |
| AI assist + accept | **PASS** | suggestion accepted |
| Save version | **PASS** | |
| Export XLSX | **PASS** | 17128 bytes; ZIP magic OK |
| XLSX contains profile text | **PASS** | sharedStrings hits: `太郎`, `ヤマダ`, `Spring`, `React` |
| Export PDF | **PASS** | 17656 bytes; `%PDF` magic |
| PDF text extract | **PARTIAL** | Binary/compressed streams; page objects present; full glyph extract needs pdftotext/LibreOffice |
| Jobs search (Mynavi/CareerMap providers) | **PASS** (honest empty) | HTTP 200 body `[]` — no fabricated jobs |
| Ops status | **PASS** | mynavi=`AVAILABLE`/`LIVE_OK`; careermap=`PUBLIC_ONLY` |
| Company analysis | **PASS** | analysis id saved |
| Transfer suggestions → CV | **PASS** | draft unchanged until accept (contract) |
| Interview start with `companyAnalysisId` | **PASS** | |
| Interview answer submit | **PASS** | |

### Browser UI Career pages

| Page | Result |
|---|---|
| `/` landing | **PASS** |
| `/career/profile` etc. | **WIRED** — TypeScript/build OK; authenticated browser click-through **NOT_TESTED** end-to-end in this automation (API contracts verified) |

---

## E. Other modules

| Module | Result | Notes |
|---|---|---|
| AI Chat | **PARTIAL** | OpenAPI paths present; deep inference smoke not completed this run |
| Voice (Whisper/VOICEVOX) | **NOT_TESTED** | VOICEVOX/STT marked OK at startup; no mic E2E |
| Coding Agent / OpenCode | **NOT_TESTED** | Desktop mode `none`; prior V5 repair preserved (no `--standalone`) |
| Settings model selection | **NOT_TESTED** | |
| Language switching UI | **PASS** (landing languages visible) | Backend langs `en/ja/si/bn/ne/my` supported on Career APIs |

---

## F. Known limitations (honest)

1. **Stale Spring process** can serve an older classpath without Career V1 — use `START_TRON.cmd -Restart -ForceRebuild` after Career backend updates.
2. **Job search may return `[]`** even when ops reports Mynavi LIVE_OK (query/scrape variability). UI must show genuine empty state — implemented.
3. **CareerMap school-linked** remains OAuth-blocked / public-empty as previously documented.
4. **PDF visual fidelity** vs Excel master is partial (PDFBox path); XLSX uses owner master template.
5. **Matches / applications / dashboard** backend endpoints exist but have no dedicated FE screens yet.
6. **Audio interview** not verified in this mission (text interview **PASS**).

---

## Summary counts

- Critical Career API workflow: **PASS**
- One-click start + idempotent reuse: **PASS**
- Frontend production build: **PASS**
- Full authenticated browser Career UI click-path: **NOT_TESTED** (API-backed pages shipped)
- Voice / Desktop coding smoke: **NOT_TESTED** / optional deps
