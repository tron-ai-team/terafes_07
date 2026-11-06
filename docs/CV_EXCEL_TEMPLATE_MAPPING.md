# CV Excel Template Mapping — 履歴書 master

**Master file (immutable):**  
`backend/backend-spring/src/main/resources/career/templates/rirekisho_master.xlsx`  
(copied from owner `履歴書フォーマット.xlsx`)

**Instruction on sheet:** `※設定済みのフォントサイズは変更しないこと。` — filler only sets cell **values**, never font sizes or styles.

---

## Workbook structure

| Sheet name | Notes |
|------------|--------|
| `1面` | Page 1 — identity, contact, education, work, awards |
| `2面 ` | Page 2 — **trailing space in sheet name** — self-PR, licenses, hobbies, etc. |

Inspect dump: `_career_center_v1_evidence/template_structure.txt`  
Merges: 37 on sheet 1, 27 on sheet 2. Print layout preserved by copying the workbook bytes then writing values.

---

## Field → cell mapping (`RirekishoExcelFiller`)

Coordinates are 0-based (POI).

### Sheet `1面`
| Payload field | Cell | Notes |
|---------------|------|--------|
| (today era label) | I1 | JapaneseChronology era name (令和/平成/…) |
| (today era year) | J1 | Year of era |
| (today month/day) | L1 / N1 | |
| `furigana` | C2 | |
| `nameJa` / `fullName` | C3 | |
| `dateOfBirth` era | C4 | Dynamic wareki, not hardcoded 平成 |
| `dateOfBirth` y/m/d | D4 / F4 / H4 | |
| age | H5 area | Computed from DOB |
| `nationality` | L4 | |
| `addressFurigana` | C6 | |
| `postalCode` | F7 | |
| `addressText` | C7 | |
| `email` | C9 | |
| `phone` | L9 | |
| `education[]` | D15+ | Up to ~row 22; `detail` preferred |
| `workExperience[]` | D25+ | Empty → `な　し` |

### Sheet `2面 `
| Payload field | Cell | Notes |
|---------------|------|--------|
| `selfPr` | C7 | 自己PR area |
| `certifications[].name` | E14+ | 免許・資格 |
| `favoriteSubjects` | C20 | 得意科目 |
| `hobbies` | F20 | 趣味・特技 |
| `healthStatus` | C22 | 健康状態 |
| `extracurricular` | C24 | 課外活動 |
| `sports` | F24 | 愛好するスポーツ |

---

## Export process

1. Load classpath master (never mutate resource file).  
2. `XSSFWorkbook` copy in memory.  
3. `setCellValue` only on target cells.  
4. Write bytes → object storage → `cv_generated_documents`.  
5. Download via `/api/v1/career/cv-builder/documents/{id}/download`.

### Other templates
- `SHOKUMU_JA` / `RESUME_EN`: separate workbooks via `AlternateCvWorkbookExporter` (not disguised 履歴書).

### PDF (primary: Gotenberg v8)
1. Apache POI fills `rirekisho_master.xlsx` (or alternate SHOKUMU / RESUME workbooks).  
2. Spring posts the XLSX to local Gotenberg `POST /forms/libreoffice/convert` (`GOTENBERG_URL`, default `http://localhost:3000`).  
3. Optional fallback: local LibreOffice headless only when it yields a valid PDF (never PDFBox text-dump as “professional” PDF).  
4. Docker: `docker compose up -d gotenberg` (container `tron-gotenberg`, bound to `127.0.0.1:3000`).

### Preservation checks
- Sheet names unchanged after fill (unit + IT).  
- Merged regions intact (workbook reopened in tests).  
- Font sizes: not modified by filler.  
- Overflow: **rejected** with a clear API error when education/work/certs exceed template row caps (no silent drop).

### 志望動機
Not a dedicated labeled area on this master; keep as profile/motivation field or supplementary note — do not overwrite unrelated template cells.
