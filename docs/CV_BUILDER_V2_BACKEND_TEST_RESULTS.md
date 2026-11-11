# CV Builder V2 — Backend Test Results

**Branch:** `feature/cv-builder-v2-backend-complete`  
**Executed:** 2026-11-11 (local Windows, JDK 21, Maven wrapper)  
**AI mode in tests:** Deterministic Mockito stubs (Groq SMART metadata) — not live cloud billing calls

---

## 1. Suites executed (verified)

| Suite | Result |
|-------|--------|
| `CvMagicFillServiceTest` | PASS |
| `CvProfileSyncMergerTest` | PASS |
| `CvBuilderV2BackendIT` | PASS |
| `CvAiAssistServiceTest` | PASS |
| `CvPreviewHtmlContractTest` | PASS |
| `CvHtmlPdfRendererTest` | PASS |
| `CareerCenterCp03bMagicFillIT` | PASS |
| `CareerCenterCp03CvBuilderIT` | PASS (updated for RIREKISHO_JA-only product) |
| `com.tronai.career.**` | PASS |
| `com.tronai.ai.gateway.AiModelRouterTest` | PASS |
| `com.tronai.interview.**` | PASS |

Command examples:

```text
.\mvnw.cmd "-Dtest=CvMagicFillServiceTest,CvProfileSyncMergerTest,CvBuilderV2BackendIT,..." test
.\mvnw.cmd "-Dtest=com.tronai.career.**,com.tronai.ai.gateway.AiModelRouterTest,com.tronai.interview.**" test
```

Exit code **0** for both focused CV suite and career+interview+gateway regression.

---

## 2. Magic Fill coverage

| Case | Covered by | Result |
|------|------------|--------|
| Valid Japanese suggestion | `CvMagicFillServiceTest`, `CvBuilderV2BackendIT` | PASS |
| Grammar / professional rewrite (mock) | unit + IT | PASS |
| Insufficient candidate data | `insufficientNarrativeWarnsWithoutFabrication` | PASS |
| Reject invented qualifications (JLPT) | `aiRewriteDoesNotAutoApplyAndRejectsInventedJlpt` | PASS |
| Valid JSON | multiple | PASS |
| Invalid JSON → 502, no draft corruption | `malformedJsonDoesNotCorruptAndFailsSafely` | PASS |
| Provider unavailable → 503 | `providerUnavailableSurfacesServiceUnavailable` | PASS |
| Cloud SMART `allowCloud=true` by default | `cloudSmartIsDefaultAndAllowCloudTrueOnGateway` + IT | PASS |
| Accept suggestion | `CvBuilderV2BackendIT.magicFillAcceptAndAuthz` | PASS |
| Reject preserves original | `magicFillCloudFirstHumanApproval` | PASS |
| Original draft preservation until accept | IT | PASS |
| Other-user authorization rejection | IT (404) | PASS |
| Unexpected AI field keys ignored | `ignoresUnexpectedAiFields` | PASS |
| Wrong language rejected | `japaneseTemplateRejectsPersistentEnglishAiOutput` | PASS |

**CI (GitHub Actions PR #20):** Backend Maven tests **pass** (run `43028506027`).

**Not executed live:** real Groq/OpenRouter quota calls for Magic Fill. Production model selection is inferred from gateway config (`prefer-groq-for-smart`, SMART catalog) and verified via mocked `AiRequestContext.allowCloud=true`.

**AI timeout:** covered indirectly via provider failure / gateway exception paths; no dedicated long-sleep timeout IT in this run.

---

## 3. Profile Sync coverage

| Case | Covered by | Result |
|------|------------|--------|
| Full / partial profile fill | merger unit + IT | PASS |
| Empty profile | `emptyProfileReportsMissingWithoutWipingDraft` | PASS |
| Manual edits preserved (FILL_BLANK) | unit + `profileSyncPreservesManualEdits` | PASS |
| Education / certifications mapping | IT seed + refresh | PASS |
| Date / phone / postal normalization | `normalizesDatesPhoneAndPostal` | PASS |
| Cross-user rejection | IT | PASS |
| REPLACE_ALL keeps draft-only | unit | PASS |

Photo ownership/size limits reuse existing `CvPhotoSupport` tests (prior suite); no new binary upload IT in this mission run.

---

## 4. History / versions

| Case | Covered by | Result |
|------|------------|--------|
| Create / save / reload / update | `CvBuilderV2BackendIT` + CP-03 | PASS |
| Version snapshot | IT | PASS |
| Restore without deleting later versions | `historyVersionRestoreSoftDelete` | PASS |
| Soft-delete | IT | PASS |
| Multi-user isolation | IT | PASS |
| Concurrent updates (`expectedUpdatedAt`) | `optimisticConcurrencyConflict` → 409 | PASS |

---

## 5. PDF / preview regression

| Case | Covered by | Result |
|------|------------|--------|
| Canonical HTML preview | `previewHtmlRegression`, `CvPreviewHtmlContractTest` | PASS |
| Japanese content | IT asserts `履歴書` | PASS |
| HTML renderer unit | `CvHtmlPdfRendererTest` | PASS |
| PDF export (IT with Gotenberg when available) | `CareerCenterCp03CvBuilderIT` | PASS in this environment |
| Authorization on preview | IT user B → 404 | PASS |

Gotenberg live failure handling remains implemented in `CvBuilderService.export` (503/502). Not force-failed in this run.

---

## 6. Regression (non-CV)

Interview V2 + career packages + AI model router: **PASS** in the combined Maven invocation above.

Login / JWT refresh / Chat / Voice full suites were **not** re-run as a complete `mvn test` of the entire module in this session. Interview package (includes voice answer IT) passed.

---

## 7. Honesty notes

- Unit/IT success ≠ production Magic Fill reliability under live provider outages or quota exhaustion.
- Cloud provider/model “used in production” depends on deployed env keys; tests assert routing flags and mocked provider metadata.
- Do not claim 100% production reliability from these results alone.
