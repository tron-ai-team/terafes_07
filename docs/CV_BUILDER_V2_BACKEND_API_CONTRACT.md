# CV Builder V2 — Backend API Contract

**Audience:** Antigravity + Cursor (future frontend redesign)  
**Base path:** `/api/v1/career/cv-builder`  
**Auth:** `Authorization: Bearer <JWT access token>` on every route  
**Supported template (user-facing):** `RIREKISHO_JA` only  
**Date:** 2026-11-11

---

## 1. Authentication & errors

| Condition | HTTP | Notes |
|-----------|------|--------|
| Missing/invalid JWT | 401 | Standard Spring Security |
| Draft/version/doc not owned | 404 | Ownership treated as not-found (no leak) |
| Validation / capacity | 400 | Message in `detail` / reason |
| Concurrent draft update | 409 | When `expectedUpdatedAt` mismatches |
| Cloud AI / Gotenberg down | 503 / 502 | Structured failure — not fake success |

All mutating endpoints require authentication. One user cannot access another user’s drafts, versions, suggestions, photos, or generated documents.

---

## 2. Templates

### `GET /templates`

```json
[
  {
    "code": "RIREKISHO_JA",
    "displayName": "履歴書（JIS規格・2ページ）",
    "locale": "ja",
    "description": "日本標準の2ページ履歴書（学歴・職歴・免許資格・自己PR）。A4判2枚出力。"
  }
]
```

### `GET /templates/{code}/schema`

Returns supported field keys for the template. Frontend should only edit fields listed / known in payload.

---

## 3. Draft lifecycle

### `GET /drafts`

List own non-deleted drafts (newest `updatedAt` first).

### `POST /drafts`

**Request (optional body):**

```json
{
  "versionLabel": "draft-1",
  "payload": { }
}
```

- `templateCode` in body is ignored for creation — always `RIREKISHO_JA`.
- If `payload` omitted, draft is seeded from Candidate Profile (normalized).

**Response:** draft DTO (see below).

### `GET /drafts/{id}`

### `PUT /drafts/{id}`

```json
{
  "versionLabel": "optional",
  "templateCode": "RIREKISHO_JA",
  "expectedUpdatedAt": "2026-11-11T13:00:00.000Z",
  "payload": { }
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `payload` | optional | Full replace of stored JSON object |
| `versionLabel` | optional | |
| `templateCode` | optional | Must be `RIREKISHO_JA` if present |
| `expectedUpdatedAt` | optional | ISO-8601 from last GET; mismatch → **409** |

### `DELETE /drafts/{id}`

Soft-delete. Response:

```json
{
  "id": "...",
  "deleted": true,
  "status": "DELETED",
  "message": "Draft soft-deleted. Candidate Profile and templates unchanged."
}
```

### Draft DTO shape

```json
{
  "id": "uuid",
  "templateCode": "RIREKISHO_JA",
  "versionLabel": "draft-1",
  "status": "DRAFT",
  "primary": false,
  "payload": { },
  "updatedAt": "2026-11-11T13:00:00.000Z",
  "educationPreview": { },
  "photo": {
    "included": true,
    "hasDraftPhoto": false,
    "hasProfilePhoto": true,
    "source": "PROFILE",
    "available": true
  }
}
```

### Important payload keys (RIREKISHO_JA)

**Scalars:** `fullName`, `nameJa`, `furigana`, `dateOfBirth` (ISO `YYYY-MM-DD`), `nationality`, `gender`, `addressText`, `postalCode`, `email`, `phone`, `selfPr`, `careerGoals`, `motivationGeneral`, `motivationCompany`, `careerSummary`, `favoriteSubjects`, `hobbies`, `healthStatus`, `extracurricular`, `sports`

**Arrays:** `education`, `workExperience`, `skills`, `certifications`, `projects`, `languages`

**Photo:** `photoIncluded`, `photoSource` (`DRAFT`|`PROFILE`|`NONE`), `cvPhotoObjectKey` (server-managed)

**Draft-only (not overwritten by profile FILL_BLANK):** hobbies, health, favoriteSubjects, sports, extracurricular, motivationCompany, careerSummary, educationExportIds

---

## 4. Profile Sync

### `POST /drafts/{id}/refresh-from-profile`

```json
{
  "mode": "FILL_BLANK",
  "replaceAll": false
}
```

| Mode | Behavior |
|------|----------|
| `FILL_BLANK` (default) | Fill empty fields only. Preserve manual non-empty edits. Non-empty arrays never replaced. |
| `OVERWRITE_SCALARS` | Overwrite scalars from profile; arrays still fill-only when empty |
| `REPLACE_ALL` / `replaceAll:true` | Replace profile-mapped fields; keep draft-only fields |

**Response extras:**

```json
{
  "refreshedFromProfile": true,
  "syncMode": "FILL_BLANK",
  "replaceAll": false,
  "syncReport": {
    "mode": "FILL_BLANK",
    "filled": ["email", "dateOfBirth"],
    "preserved": ["fullName", "selfPr"],
    "conflicts": ["fullName"],
    "missingInProfile": [],
    "draftOnlyPreserved": ["hobbies"]
  },
  "payload": { }
}
```

Normalization applied on sync: dates → ISO, JP mobile/postal formatting (meaning preserved).

Photo: use dedicated photo endpoints; sync does not invent photo bytes.

---

## 5. Magic Fill (AI suggestions — human approval required)

### `POST /drafts/{id}/magic-fill`

```json
{
  "companyContext": "optional company name for 志望動機",
  "payload": { },
  "allowCloud": true,
  "localOnly": false
}
```

| Field | Default | Notes |
|-------|---------|--------|
| `allowCloud` | from `tron.ai.cv-assist-cloud-enabled` (**true**) | Cloud SMART via existing AiGateway |
| `localOnly` | false | Forces Ollama-only when true |
| `payload` | — | If present, saved before fill |
| `companyContext` | "" | Optional |

**Response:**

```json
{
  "draftId": "...",
  "templateCode": "RIREKISHO_JA",
  "documentLanguage": "ja",
  "suggestions": [
    {
      "suggestionId": "uuid",
      "fieldKey": "selfPr",
      "originalText": "...",
      "proposedText": "...",
      "reason": "... | magic-fill pending approval — no silent overwrite",
      "category": "AI_REWRITE",
      "requiresConfirmation": true,
      "clarificationNeeded": false,
      "status": "PENDING"
    }
  ],
  "missingRequired": [],
  "warnings": [],
  "engine": "GROQ/openai/gpt-oss-120b",
  "ollamaUsed": false,
  "cloudUsed": true,
  "cloudAllowed": true,
  "applied": false,
  "message": "Review and accept/reject each suggestion. Draft unchanged until you approve."
}
```

**Categories:** `PROFILE_FACT` | `AI_REWRITE`

**Critical:** `applied` is always `false`. Draft payload is unchanged until accept.

**AI safety:** Never invents degrees, JLPT, employers, certifications, dates, contact info. Invalid/malformed AI JSON → 502. Provider down → 503 (or warnings if profile facts already exist).

**Preferred production route:** AiGateway `AiMode.SMART` with `allowCloud=true` — typically **Groq `openai/gpt-oss-120b`** when configured, with authorized gateway fallbacks (Mistral / Gemini / OpenRouter).

### `POST /drafts/{id}/magic-fill/decide`

```json
{
  "acceptIds": ["uuid"],
  "rejectIds": ["uuid"],
  "acceptAll": false,
  "rejectAll": false
}
```

Response: `{ "draftId", "accepted", "rejected", "draft": { ... } }`

### Per-suggestion

- `POST /drafts/{id}/suggestions/{sid}/accept` → writes proposed value into draft
- `POST /drafts/{id}/suggestions/{sid}/reject` → status REJECTED; draft unchanged

### Single-field AI Assist

`POST /drafts/{id}/ai-assist`

```json
{
  "fieldKey": "selfPr",
  "instruction": "丁寧に",
  "allowCloud": true
}
```

Same pending-suggestion lifecycle (no silent overwrite). Cloud-first by default.

---

## 6. Versions / history

| Method | Path | Behavior |
|--------|------|----------|
| POST | `/drafts/{id}/versions` | Snapshot current payload → `{ versionId, versionNumber }` |
| GET | `/drafts/{id}/versions` | List newest first |
| POST | `/drafts/{id}/versions/{versionId}/restore` | Copy snapshot into working draft; **later versions preserved** |

Restore response includes `restoredFromVersionId`, `historyPreserved: true`.

Legacy English/SHOKUMU historical rows remain loadable; working restore forces `RIREKISHO_JA` for unsupported codes.

---

## 7. Photo

| Method | Path | Notes |
|--------|------|--------|
| POST multipart | `/drafts/{id}/photo` | `file` + optional `alsoUpdateProfile` |
| POST | `/drafts/{id}/photo/from-profile` | Use profile photo |
| DELETE | `/drafts/{id}/photo` | Exclude from CV |
| GET | `/drafts/{id}/photo` | Binary image (owned) |

Limits: JPEG/PNG, existing ≤2MB pipeline, 3:4 ID crop for preview/PDF. Object keys are never exposed as public URLs in DTO.

---

## 8. Preview & PDF

| Method | Path | Notes |
|--------|------|--------|
| GET | `/drafts/{id}/preview-html` | Canonical HTML (same renderer as PDF) |
| POST | `/drafts/{id}/preview-html` | Body `{ "payload": {...} }` live preview without DB write |
| POST | `/drafts/{id}/export?format=pdf` | Gotenberg Chromium → stored document meta |
| GET | `/documents/{documentId}/download` | Binary PDF/XLSX |

PDF: Japanese A4 2-page via `CvHtmlPdfRenderer` + Gotenberg. Gotenberg failure → 503/502 with clear message (no silent Excel fallback).

XLSX remains API-compatible but is not the user-facing product path.

---

## 9. Frontend integration requirements (Stage 2)

1. Magic Fill UI must show pending suggestions and Accept/Reject — never assume auto-apply.
2. Profile Sync default button must call `FILL_BLANK`; destructive sync needs explicit `REPLACE_ALL` confirmation.
3. Send `expectedUpdatedAt` on save when concurrent editing is possible.
4. Preview via `preview-html`; PDF via `export?format=pdf` + download path.
5. Do not offer EN Resume / Excel as primary UX.
6. Surface `warnings`, `missingRequired`, and HTTP 502/503 distinctly from validation 400.
