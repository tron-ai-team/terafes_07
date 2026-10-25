# TRON Gotenberg Integration Report

**Date:** 2026-10-25 (live verification completed)  
**Decision:** Gotenberg v8 + Apache POI (primary CV PDF path)  
**Commit/push/deploy:** Not performed

---

## Service status

```text
WSL 2:          PASS (default Ubuntu, WSL version 2; docker-desktop distro Running)
Docker Engine:  PASS (Server 29.9.2, OSType=linux, amd64)
Gotenberg:      PASS (tron-gotenberg Up; 127.0.0.1:3000→3000; /health up; LibreOffice up)
Spring Boot:    PASS (http://localhost:8080 actuator UP; MySQL UP)
React:          PASS (http://localhost:5174 HTTP 200)
MySQL:          PASS (actuator db component UP)
```

---

## PDF status

```text
Japanese Rirekisho XLSX:  PASS
Japanese Rirekisho PDF:   PASS
Japanese Shokumu PDF:     PASS
English Resume PDF:       PASS
Frontend PDF Download:    PASS
```

All PDFs above were produced by **Gotenberg LibreOffice** (`POST /forms/libreoffice/convert`), not PDFBox.

---

## A. Implementation (unchanged from prior mission)

### Files created

| Path | Role |
|---|---|
| `backend/.../gotenberg/GotenbergProperties.java` | `tron.pdf.*` config |
| `backend/.../gotenberg/GotenbergException.java` | Unavailable / conversion / invalid response |
| `backend/.../gotenberg/GotenbergPdfClient.java` | Multipart client → `/forms/libreoffice/convert` (+ HTML helper) |
| `backend/.../gotenberg/CvGotenbergExportService.java` | Primary convert + optional local LibreOffice fallback |
| `docker-compose.yml` | `tron-gotenberg` on `127.0.0.1:3000` |
| `scripts/Ensure-Gotenberg.ps1` | Start/reuse container; warn if Docker missing |
| `docs/GOTENBERG.md` | Operator notes |
| `.../GotenbergPdfClientValidateTest.java` | PDF magic validation unit tests |
| `.../GotenbergLiveConvertIT.java` | Live convert IT (runs when Gotenberg up) |
| `.../RirekishoEvidenceWriteTest.java` | Writes sample XLSX evidence |

### Classes kept (not deleted)

- `CvPdfExporter` (PDFBox text layout) — retained for rollback; **not** used as silent professional PDF success
- `CvPdfExportService` LibreOffice headless path — optional fallback only when valid PDF produced

### Configuration

```yaml
tron:
  pdf:
    engine: gotenberg
    allow-local-libre-office-fallback: true
    gotenberg:
      base-url: ${GOTENBERG_URL:http://localhost:3000}
      connect-timeout-ms: 5000
      read-timeout-ms: 120000
      max-retries: 1
```

---

## B. CV Architecture

```text
React CV Builder
    → POST /api/v1/career/cv-builder/drafts/{id}/export?format=pdf|xlsx
Spring CvBuilderService
    → load authorized draft payload
    → validate RIREKISHO row capacity
    → Apache POI:
         RIREKISHO_JA → rirekisho_master.xlsx (sheets 1面 / "2面 ")
         SHOKUMU_JA   → AlternateCvWorkbookExporter
         RESUME_EN    → AlternateCvWorkbookExporter
    → if XLSX: store + return downloadPath
    → if PDF: GotenbergPdfClient POST /forms/libreoffice/convert
         → validate %PDF + non-empty
         → store + same download API
    → if Gotenberg down: optional local LibreOffice PDF;
         else HTTP 503 with clear message (XLSX still works)
```

---

## C. Live verification (2026-10-25 evening)

### Environment steps completed

1. Confirmed Docker Linux engine (`docker info` → `linux`).
2. `docker compose up -d gotenberg` — image `gotenberg/gotenberg:8` pulled; container `tron-gotenberg` started.
3. `curl.exe http://127.0.0.1:3000/health` → `{"status":"up",...,"libreoffice":{"status":"up"}}`.
4. `START_TRON.cmd -NoPause -NoBrowser` → MySQL / Spring / React / Gotenberg ensure all OK.
5. `mvnw -Dtest=GotenbergLiveConvertIT test` → **1 run, 0 fail, 0 skip**.
6. Authenticated API export for `RIREKISHO_JA`, `SHOKUMU_JA`, `RESUME_EN` (synthetic user).

### Evidence paths (`_gotenberg_verify_evidence/`)

| File | Size | Engine | Notes |
|---|---:|---|---|
| `RIREKISHO_JA.xlsx` | 17 109 | POI | API download; ZIP/`PK` magic |
| `RIREKISHO_JA.pdf` | 98 744 | **Gotenberg** | API download; `%PDF-1.7` |
| `sample_rirekisho.xlsx` / `.pdf` | 17 137 / 100 943 | POI / **Gotenberg** | Live IT |
| `rirekisho_page_1.png` / `_2.png` | — | render of IT PDF | 2 pages; 山田 太郎, JA grid OK |
| `SHOKUMU_JA.pdf` | 30 503 | **Gotenberg** | API download |
| `shokumu_page_1.png` | 40 737 | render | 職務経歴書; 山田 太郎; JA OK |
| `RESUME_EN.pdf` | 27 696 | **Gotenberg** | API download |
| `sample_resume_en.pdf` | 17 804 | **Gotenberg** | Live IT (clean EN synthetic) |
| `resume_en_page_1.png` | — | IT render | Taro Yamada EN layout readable |
| `resume_en_api_page_1.png` | 44 845 | API render | Readable; profile JA fields may appear when set |

### Gotenberg access log proof (Java → LibreOffice convert, HTTP 200)

Container `tron-gotenberg` logged five successful `POST /forms/libreoffice/convert` from `User-Agent: Java/21.0.7`, including `bytes_out` matching:

- 100 943 (IT rirekisho)
- 17 804 (IT resume EN)
- 98 744 (API RIREKISHO_JA.pdf)
- 30 503 (API SHOKUMU_JA.pdf)
- 27 696 (API RESUME_EN.pdf)

Port binding remains localhost-only: `127.0.0.1:3000->3000/tcp`.

### API checks

| Call | Result |
|---|---|
| `POST .../drafts/{id}/export?format=xlsx` | **PASS** (documentId + download) |
| `POST .../drafts/{id}/export?format=pdf` | **PASS** (documentId + download; Gotenberg path) |
| `GET .../documents/{documentId}/download` | **PASS** (HTTP 200; correct magic/size) |

### Visual QA notes

- **RIREKISHO_JA:** Two-sheet master → two PDF pages; CJK fonts render; name/furigana/education/work/self-PR/cert/hobby present. Minor phone-cell colon artifact on page 1 — not treated as FAIL.
- **SHOKUMU_JA:** Japanese title and body clear; candidate + skills present.
- **RESUME_EN:** Readable structured layout via Gotenberg. IT sample is English-only synthetic; API sample reflects profile content (may include Japanese address/summary when those fields are set).

---

## D. Known limitations

1. WSL may show NAT networking warnings; Docker Linux engine is confirmed healthy for this stack.
2. Template row caps — Education ≤9, work ≤4, certs ≤6 on RIREKISHO; overflow returns **400**. Longer careers → SHOKUMU_JA.
3. **RESUME_EN** remains structured XLSX → LibreOffice convert (Chromium HTML helper available for future polish).
4. Low-fidelity PDFBox dump is **not** returned as a successful professional PDF.
5. PDFBox / local LibreOffice paths retained only for rollback / optional fallback.

---

## E. Startup commands

```powershell
docker compose up -d gotenberg
curl.exe http://127.0.0.1:3000/health
START_TRON.cmd
# Live IT
cd backend\backend-spring
.\mvnw.cmd -Dtest=GotenbergLiveConvertIT test
```

Stop Gotenberg only: `docker compose stop gotenberg`

---

## F. Final status

| Item | Status |
|---|---|
| Gotenberg installed & running | **PASS** (v8.38.1 image; container healthy) |
| Spring integration complete | **YES** |
| XLSX generation functional | **YES** |
| Japanese PDF quality verified | **YES** (basic visual QA on rendered pages) |
| English PDF quality verified | **YES** (basic visual QA; layout simple but readable) |
| Frontend download functional | **YES** (same download API used by FE; verified authenticated) |

**Honest summary:** Docker Linux engine, Gotenberg, Spring Boot, React, and MySQL are running together. CV Builder PDF export uses Gotenberg LibreOffice conversion end-to-end (confirmed by container access logs and `%PDF` downloads). Japanese Rirekisho (XLSX+PDF), Shokumu PDF, and English Resume PDF samples are under `_gotenberg_verify_evidence/` with page PNG previews.
