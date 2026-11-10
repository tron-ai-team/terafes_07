package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.cvbuilder.gotenberg.CvGotenbergExportService;
import com.tronai.career.cvbuilder.gotenberg.GotenbergException;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.profile.CandidateProfileEntity;
import com.tronai.career.profile.CandidateProfileRepository;
import com.tronai.storage.ObjectStorageService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class CvBuilderService {

    private final CvBuilderDraftRepository draftRepository;
    private final CvBuilderVersionRepository versionRepository;
    private final CvAiSuggestionRepository suggestionRepository;
    private final CvGeneratedDocumentRepository generatedDocumentRepository;
    private final CandidateProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ObjectStorageService objectStorageService;
    private final RirekishoExcelFiller excelFiller;
    private final AlternateCvWorkbookExporter alternateExporter;
    private final CvGotenbergExportService gotenbergExportService;
    private final CvHtmlPdfRenderer htmlPdfRenderer;
    private final CvAiAssistService cvAiAssistService;
    private final CvMagicFillService magicFillService;
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;

    public CvBuilderService(CvBuilderDraftRepository draftRepository,
                            CvBuilderVersionRepository versionRepository,
                            CvAiSuggestionRepository suggestionRepository,
                            CvGeneratedDocumentRepository generatedDocumentRepository,
                            CandidateProfileRepository profileRepository,
                            UserRepository userRepository,
                            ObjectStorageService objectStorageService,
                            RirekishoExcelFiller excelFiller,
                            AlternateCvWorkbookExporter alternateExporter,
                            CvGotenbergExportService gotenbergExportService,
                            CvHtmlPdfRenderer htmlPdfRenderer,
                            CvAiAssistService cvAiAssistService,
                            CvMagicFillService magicFillService,
                            ObjectMapper objectMapper,
                            CareerLanguageHelper languageHelper) {
        this.draftRepository = draftRepository;
        this.versionRepository = versionRepository;
        this.suggestionRepository = suggestionRepository;
        this.generatedDocumentRepository = generatedDocumentRepository;
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.objectStorageService = objectStorageService;
        this.excelFiller = excelFiller;
        this.alternateExporter = alternateExporter;
        this.gotenbergExportService = gotenbergExportService;
        this.htmlPdfRenderer = htmlPdfRenderer;
        this.cvAiAssistService = cvAiAssistService;
        this.magicFillService = magicFillService;
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
    }

    /** User-facing templates only (SHOKUMU_JA kept for existing drafts / backend compat). */
    public List<Map<String, Object>> listTemplates() {
        return List.of(
                Map.of(
                        "code", "RIREKISHO_JA",
                        "displayName", "履歴書（日本語）",
                        "locale", "ja",
                        "description", "Japanese companies — standard 履歴書"),
                Map.of(
                        "code", "RESUME_EN",
                        "displayName", "Resume (English)",
                        "locale", "en",
                        "description", "English-language job applications")
        );
    }

    public Map<String, Object> templateSchema(String code) {
        return Map.of("code", code, "fields", List.of(
                "fullName", "nameJa", "furigana", "dateOfBirth", "nationality", "addressText",
                "email", "phone", "education", "workExperience", "certifications", "selfPr",
                "favoriteSubjects", "hobbies", "healthStatus", "extracurricular", "sports"
        ));
    }

    private static final Set<String> KNOWN_TEMPLATES = Set.of("RIREKISHO_JA", "SHOKUMU_JA", "RESUME_EN");

    @Transactional
    public Map<String, Object> createDraft(Long userId, Map<String, Object> body) {
        User user = userRepository.findById(userId).orElseThrow();
        String template = normalizeTemplateCode(String.valueOf(body.getOrDefault("templateCode", "RIREKISHO_JA")));
        Map<String, Object> payload = body.containsKey("payload")
                ? preparePayload(castMap(body.get("payload")), false)
                : payloadFromProfile(userId);
        CvBuilderDraftEntity draft = CvBuilderDraftEntity.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .profileId(profileRepository.findByUser_Id(userId).map(CandidateProfileEntity::getId).orElse(null))
                .templateCode(template)
                .versionLabel(String.valueOf(body.getOrDefault("versionLabel", "draft-1")))
                .status("DRAFT")
                .payloadJson(write(payload))
                .build();
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    @Transactional
    public Map<String, Object> updateDraft(Long userId, String draftId, Map<String, Object> body) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        if (body.get("payload") != null) {
            draft.setPayloadJson(write(preparePayload(castMap(body.get("payload")), false)));
        }
        if (body.get("versionLabel") != null) draft.setVersionLabel(String.valueOf(body.get("versionLabel")));
        if (body.get("templateCode") != null) {
            String next = normalizeTemplateCode(String.valueOf(body.get("templateCode")));
            // Changing template keeps payload; never invent/drop fields silently.
            // Client must confirm; we only reject unknown codes.
            draft.setTemplateCode(next);
        }
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    /**
     * Explicitly refresh draft fields from Candidate Profile.
     * Preserves draft-only fields (hobbies, health, favoriteSubjects, sports, extracurricular,
     * educationExportIds, company-specific motivation) unless {@code replaceAll=true}.
     */
    @Transactional
    public Map<String, Object> refreshFromProfile(Long userId, String draftId, Map<String, Object> body) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        boolean replaceAll = Boolean.TRUE.equals(body.get("replaceAll"))
                || "true".equalsIgnoreCase(String.valueOf(body.getOrDefault("replaceAll", "false")));
        Map<String, Object> fromProfile = payloadFromProfile(userId);
        Map<String, Object> current = readMap(draft.getPayloadJson());
        Map<String, Object> merged = new LinkedHashMap<>();
        if (replaceAll) {
            merged.putAll(fromProfile);
            // Keep export selection if user already chose entries.
            if (current.get("educationExportIds") != null) {
                merged.put("educationExportIds", current.get("educationExportIds"));
            }
        } else {
            merged.putAll(current);
            for (Map.Entry<String, Object> e : fromProfile.entrySet()) {
                String key = e.getKey();
                if (isDraftOnlyField(key)) continue;
                Object incoming = e.getValue();
                Object existing = current.get(key);
                // Fill blanks always; overwrite non-list scalars from profile on refresh.
                if (incoming instanceof List<?> || incoming instanceof Map<?, ?>
                        || existing == null || String.valueOf(existing).isBlank()) {
                    merged.put(key, incoming);
                } else {
                    merged.put(key, incoming);
                }
            }
        }
        draft.setPayloadJson(write(preparePayload(merged, true)));
        draft.setProfileId(profileRepository.findByUser_Id(userId).map(CandidateProfileEntity::getId).orElse(draft.getProfileId()));
        draftRepository.save(draft);
        Map<String, Object> dto = toDraftDto(draft);
        dto.put("refreshedFromProfile", true);
        dto.put("replaceAll", replaceAll);
        return dto;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> educationPreview(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        int capacity = "RIREKISHO_JA".equals(normalizeTemplateCode(draft.getTemplateCode()))
                ? RirekishoExcelFiller.MAX_EDUCATION_ROWS
                : Integer.MAX_VALUE;
        Map<String, Object> preview = CvEducationSanitizer.preview(payload, capacity == Integer.MAX_VALUE ? 10_000 : capacity);
        preview.put("draftId", draftId);
        preview.put("templateCode", normalizeTemplateCode(draft.getTemplateCode()));
        return preview;
    }

    /**
     * Persist sanitized education into the draft (removes OCR/template noise).
     * Does not touch Candidate Profile. Requires explicit client action.
     */
    @Transactional
    public Map<String, Object> sanitizeEducation(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        CvEducationSanitizer.SanitizeResult edu = CvEducationSanitizer.sanitize(payload.get("education"));
        payload.put("education", edu.kept());
        payload.put("educationSanitized", Map.of(
                "inputCount", edu.inputCount(),
                "keptCount", edu.kept().size(),
                "rejectedCount", edu.rejected().size(),
                "duplicateCount", edu.duplicateCount()
        ));
        // Clear stale selection that may reference removed rows.
        payload.remove("educationExportIds");
        payload.remove("educationExportSelection");
        draft.setPayloadJson(write(payload));
        draftRepository.save(draft);
        Map<String, Object> dto = toDraftDto(draft);
        dto.put("sanitizedEducation", true);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listVersions(Long userId, String draftId) {
        requireDraft(userId, draftId);
        return versionRepository.findByDraftIdOrderByVersionNumberDesc(draftId).stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("versionId", v.getId());
            m.put("versionNumber", v.getVersionNumber());
            m.put("versionLabel", v.getVersionLabel());
            m.put("templateCode", normalizeTemplateCode(v.getTemplateCode()));
            m.put("createdAt", v.getCreatedAt());
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> restoreVersion(Long userId, String draftId, String versionId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        CvBuilderVersionEntity version = versionRepository.findByIdAndUser_Id(versionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found"));
        if (!draftId.equals(version.getDraftId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Version does not belong to draft");
        }
        draft.setPayloadJson(version.getPayloadJson());
        draft.setTemplateCode(normalizeTemplateCode(version.getTemplateCode()));
        draft.setVersionLabel(version.getVersionLabel());
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDrafts(Long userId) {
        return draftRepository.findByUser_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(userId).stream()
                .map(this::toDraftDto).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDraft(Long userId, String draftId) {
        return toDraftDto(requireDraft(userId, draftId));
    }

    /**
     * Soft-delete an owned draft. Does not touch Candidate Profile, templates, or other users' data.
     */
    @Transactional
    public Map<String, Object> deleteDraft(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        draft.setDeletedAt(Instant.now());
        draft.setStatus("DELETED");
        draftRepository.save(draft);
        return Map.of(
                "id", draftId,
                "deleted", true,
                "status", "DELETED",
                "message", "Draft soft-deleted. Candidate Profile and templates unchanged."
        );
    }

    /**
     * Magic Fill — generates pending suggestions only (no silent overwrite).
     * Local Ollama by default; cloud only when allowCloud=true explicitly.
     */
    @Transactional
    public Map<String, Object> magicFill(Long userId, String draftId, Map<String, Object> body) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        if (body != null && body.get("payload") != null) {
            draft.setPayloadJson(write(preparePayload(castMap(body.get("payload")), false)));
            draftRepository.save(draft);
        }
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        String templateCode = normalizeTemplateCode(draft.getTemplateCode());
        // Language from template — ignore client/UI language for document narrative.
        String language = CvDocumentLanguage.requiredLanguage(templateCode);
        String companyContext = body == null ? "" : String.valueOf(body.getOrDefault("companyContext", ""));
        boolean allowCloud = body != null && (Boolean.TRUE.equals(body.get("allowCloud"))
                || "true".equalsIgnoreCase(String.valueOf(body.getOrDefault("allowCloud", "false"))));
        CandidateProfileEntity profile = profileRepository.findByUser_Id(userId).orElse(null);
        CvMagicFillService.MagicFillResult result = magicFillService.magicFill(
                userId,
                templateCode,
                payload,
                profile,
                language,
                companyContext,
                allowCloud);

        List<Map<String, Object>> suggestionDtos = new ArrayList<>();
        for (CvMagicFillService.FieldSuggestion fs : result.suggestions()) {
            if ("UNCHANGED".equals(fs.category())) continue;
            CvAiSuggestionEntity sugg = CvAiSuggestionEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .draftId(draftId)
                    .user(draft.getUser())
                    .fieldKey(fs.fieldKey())
                    .originalText(fs.originalText())
                    .proposedText(fs.proposedText())
                    .reason(fs.reason() + " | magic-fill pending approval — no silent overwrite")
                    .status("PENDING")
                    .language(language)
                    .build();
            suggestionRepository.save(sugg);
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("suggestionId", sugg.getId());
            dto.put("fieldKey", fs.fieldKey());
            dto.put("originalText", fs.originalText());
            dto.put("proposedText", fs.proposedText());
            dto.put("reason", sugg.getReason());
            dto.put("category", fs.category());
            dto.put("requiresConfirmation", fs.requiresConfirmation());
            dto.put("clarificationNeeded", fs.clarificationNeeded());
            dto.put("status", "PENDING");
            suggestionDtos.add(dto);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("draftId", draftId);
        out.put("templateCode", result.templateCode());
        out.put("documentLanguage", language);
        out.put("suggestions", suggestionDtos);
        out.put("missingRequired", result.missingRequired());
        out.put("warnings", result.warnings());
        out.put("engine", result.engine());
        out.put("ollamaUsed", result.ollamaUsed());
        out.put("cloudUsed", allowCloud && result.ollamaUsed() == false && result.engine() != null
                && !result.engine().startsWith("none"));
        out.put("applied", false);
        out.put("message", suggestionDtos.isEmpty()
                ? "No suggestions generated. Check warnings / missing fields."
                : "Review and accept/reject each suggestion. Draft unchanged until you approve.");
        return out;
    }

    /**
     * Accept or reject Magic Fill suggestions in batch.
     * Body: { acceptIds?: string[], rejectIds?: string[], acceptAll?: boolean, rejectAll?: boolean }
     */
    @Transactional
    public Map<String, Object> decideMagicFillBatch(Long userId, String draftId, Map<String, Object> body) {
        requireDraft(userId, draftId);
        boolean acceptAll = Boolean.TRUE.equals(body.get("acceptAll"));
        boolean rejectAll = Boolean.TRUE.equals(body.get("rejectAll"));
        Set<String> acceptIds = toIdSet(body.get("acceptIds"));
        Set<String> rejectIds = toIdSet(body.get("rejectIds"));
        List<CvAiSuggestionEntity> pending = suggestionRepository
                .findByDraftIdAndUser_IdOrderByCreatedAtDesc(draftId, userId).stream()
                .filter(s -> "PENDING".equals(s.getStatus()))
                .toList();
        int accepted = 0;
        int rejected = 0;
        for (CvAiSuggestionEntity s : pending) {
            boolean doAccept = acceptAll || acceptIds.contains(s.getId());
            boolean doReject = rejectAll || rejectIds.contains(s.getId());
            if (acceptAll && rejectIds.contains(s.getId())) {
                doAccept = false;
                doReject = true;
            }
            if (!doAccept && !doReject) continue;
            Map<String, Object> decided = decideSuggestion(userId, draftId, s.getId(), doAccept && !doReject);
            if ("ACCEPTED".equals(String.valueOf(decided.get("status")))) accepted++;
            else rejected++;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("draftId", draftId);
        out.put("accepted", accepted);
        out.put("rejected", rejected);
        out.put("draft", toDraftDto(requireDraft(userId, draftId)));
        return out;
    }

    private static Set<String> toIdSet(Object raw) {
        Set<String> out = new LinkedHashSet<>();
        if (raw instanceof List<?> list) {
            for (Object o : list) if (o != null) out.add(String.valueOf(o));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> aiAssist(Long userId, String draftId, Map<String, Object> body) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        String field = String.valueOf(body.getOrDefault("fieldKey", "selfPr"));
        String instruction = String.valueOf(body.getOrDefault("instruction", ""));
        String templateCode = normalizeTemplateCode(draft.getTemplateCode());
        String language = CvDocumentLanguage.requiredLanguage(templateCode);
        boolean allowCloud = Boolean.TRUE.equals(body.get("allowCloud"))
                || "true".equalsIgnoreCase(String.valueOf(body.getOrDefault("allowCloud", "false")));
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        String original = String.valueOf(payload.getOrDefault(field, ""));
        CandidateProfileEntity profile = profileRepository.findByUser_Id(userId).orElse(null);
        CvAiAssistService.AssistResult assist = cvAiAssistService.improve(
                userId, field, original, instruction, language, payload, profile, allowCloud, templateCode);
        CvAiSuggestionEntity sugg = CvAiSuggestionEntity.builder()
                .id(UUID.randomUUID().toString())
                .draftId(draftId)
                .user(draft.getUser())
                .fieldKey(field)
                .originalText(original)
                .proposedText(assist.proposedText())
                .reason(assist.reason() + " | pending user approval — no silent overwrite")
                .status("PENDING")
                .language(language)
                .build();
        suggestionRepository.save(sugg);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("suggestionId", sugg.getId());
        out.put("fieldKey", field);
        out.put("originalText", original == null ? "" : original);
        out.put("proposedText", assist.proposedText() == null ? "" : assist.proposedText());
        out.put("reason", sugg.getReason());
        out.put("status", "PENDING");
        out.put("engine", assist.engine());
        out.put("documentLanguage", language);
        out.put("clarificationNeeded", assist.clarificationNeeded());
        out.put("cloudUsed", allowCloud && assist.engine() != null && !assist.engine().startsWith("fallback")
                && !assist.engine().contains("OLLAMA"));
        return out;
    }

    @Transactional
    public Map<String, Object> decideSuggestion(Long userId, String draftId, String suggestionId, boolean accept) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        CvAiSuggestionEntity sugg = suggestionRepository.findByIdAndUser_Id(suggestionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suggestion not found"));
        if (!draftId.equals(sugg.getDraftId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suggestion does not belong to draft");
        }
        if (!"PENDING".equals(sugg.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Suggestion already decided");
        }
        if (accept) {
            Map<String, Object> payload = readMap(draft.getPayloadJson());
            applySuggestionValue(payload, sugg.getFieldKey(), sugg.getProposedText());
            draft.setPayloadJson(write(payload));
            draftRepository.save(draft);
            sugg.setStatus("ACCEPTED");
        } else {
            sugg.setStatus("REJECTED");
        }
        sugg.setDecidedAt(Instant.now());
        suggestionRepository.save(sugg);
        return Map.of("suggestionId", sugg.getId(), "status", sugg.getStatus());
    }

    @Transactional
    public Map<String, Object> saveVersion(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        int next = versionRepository.countByDraftId(draftId) + 1;
        CvBuilderVersionEntity version = CvBuilderVersionEntity.builder()
                .id(UUID.randomUUID().toString())
                .draftId(draftId)
                .user(draft.getUser())
                .templateCode(draft.getTemplateCode())
                .versionNumber(next)
                .versionLabel(draft.getVersionLabel() + "-v" + next)
                .payloadJson(draft.getPayloadJson())
                .build();
        versionRepository.save(version);
        return Map.of("versionId", version.getId(), "versionNumber", next);
    }

    @Transactional
    public Map<String, Object> export(Long userId, String draftId, String format) throws Exception {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = prepareExportPayload(readMap(draft.getPayloadJson()));
        String templateCode = normalizeTemplateCode(draft.getTemplateCode());
        byte[] bytes;
        String contentType;
        String filename;
        String fmt = format == null ? "xlsx" : format.toLowerCase(Locale.ROOT);
        String shortId = draftId.length() >= 8 ? draftId.substring(0, 8) : draftId;
        if ("pdf".equals(fmt)) {
            validateTemplateCapacity(templateCode, payload);
            // CP-03F: Japanese + English PDF = HTML/CSS → Gotenberg Chromium only.
            // Do NOT silently fall back to Excel→LibreOffice (different layout).
            // Legacy LibreOffice path remains available via convertOfficeDocument for rollback tooling.
            try {
                String photoUri = resolvePhotoDataUri(userId, templateCode, payload);
                byte[] html = htmlPdfRenderer.renderHtml(templateCode, payload, photoUri);
                CvGotenbergExportService.PdfExportResult pdf = gotenbergExportService.convertHtmlDocument(html);
                bytes = pdf.bytes();
            } catch (GotenbergException ge) {
                HttpStatus status = ge.isUnavailable() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
                throw new ResponseStatusException(status,
                        "PDF generation is temporarily unavailable. XLSX export still works. "
                                + "Start local Gotenberg Chromium (Docker: tron-gotenberg on port 3000). "
                                + ge.getMessage(),
                        ge);
            }
            contentType = "application/pdf";
            filename = "cv-" + shortId + "-" + templateCode.toLowerCase(Locale.ROOT) + ".pdf";
        } else {
            validateTemplateCapacity(templateCode, payload);
            bytes = buildWorkbookBytes(templateCode, payload, resolvePhotoBytes(userId, templateCode, payload));
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            filename = "cv-" + shortId + "-" + templateCode.toLowerCase(Locale.ROOT) + ".xlsx";
        }
        String objectKey = "users/" + userId + "/cv-builder/" + draftId + "/" + UUID.randomUUID() + "." + fmt;
        objectStorageService.putObject(objectKey, bytes, contentType);
        String sha = sha256(bytes);
        CvGeneratedDocumentEntity gen = CvGeneratedDocumentEntity.builder()
                .id(UUID.randomUUID().toString())
                .draftId(draftId)
                .user(draft.getUser())
                .format(fmt.toUpperCase(Locale.ROOT))
                .objectKey(objectKey)
                .filename(filename)
                .contentType(contentType)
                .sizeBytes(bytes.length)
                .sha256(sha)
                .build();
        generatedDocumentRepository.save(gen);
        return Map.of(
                "documentId", gen.getId(),
                "format", gen.getFormat(),
                "filename", filename,
                "contentType", contentType,
                "sizeBytes", bytes.length,
                "sha256", sha,
                "downloadPath", "/api/v1/career/cv-builder/documents/" + gen.getId() + "/download"
        );
    }

    @Transactional(readOnly = true)
    public byte[] download(Long userId, String documentId) {
        CvGeneratedDocumentEntity gen = generatedDocumentRepository.findByIdAndUser_Id(documentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        return objectStorageService.getObject(gen.getObjectKey());
    }

    @Transactional(readOnly = true)
    public CvGeneratedDocumentEntity requireDocument(Long userId, String documentId) {
        return generatedDocumentRepository.findByIdAndUser_Id(documentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private Map<String, Object> payloadFromProfile(Long userId) {
        return profileRepository.findByUser_Id(userId).map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fullName", nullToEmpty(p.getFullName()));
            m.put("nameJa", nullToEmpty(p.getNameJa()));
            m.put("furigana", nullToEmpty(p.getFurigana()));
            // Always ISO LocalDate string when present — FE + Excel filler expect YYYY-MM-DD.
            m.put("dateOfBirth", p.getDateOfBirth() == null ? "" : p.getDateOfBirth().toString());
            m.put("nationality", nullToEmpty(p.getNationality()));
            m.put("gender", nullToEmpty(p.getGender()));
            String address = nullToEmpty(p.getAddressText());
            if (address.isBlank()) {
                address = composeAddress(p);
            }
            m.put("addressText", address);
            m.put("postalCode", nullToEmpty(p.getPostalCode()));
            m.put("prefecture", nullToEmpty(p.getPrefecture()));
            m.put("city", nullToEmpty(p.getCity()));
            m.put("streetAddress", nullToEmpty(p.getStreetAddress()));
            m.put("building", nullToEmpty(p.getBuilding()));
            m.put("email", nullToEmpty(p.getEmail()));
            m.put("phone", nullToEmpty(p.getPhone()));
            m.put("selfPr", nullToEmpty(p.getSelfPr()));
            m.put("careerGoals", nullToEmpty(p.getCareerGoals()));
            // Master-profile general motivation only — company-specific 志望動機 stays on CV draft / company analysis.
            m.put("motivationGeneral", nullToEmpty(p.getMotivation()));
            // Structured + sanitized — exclude OCR/template noise that may have been stored historically.
            CvEducationSanitizer.SanitizeResult edu =
                    CvEducationSanitizer.sanitize(readAny(p.getEducationJson()));
            m.put("education", edu.kept());
            m.put("educationSanitized", Map.of(
                    "inputCount", edu.inputCount(),
                    "keptCount", edu.kept().size(),
                    "rejectedCount", edu.rejected().size()
            ));
            m.put("workExperience", p.isNoWorkExperience() ? List.of() : readAny(p.getCareerJson()));
            m.put("noWorkExperience", p.isNoWorkExperience());
            m.put("skills", skillNamesForCv(p.getSkillsJson()));
            m.put("languages", readAny(p.getLanguagesJson()));
            m.put("projects", readAny(p.getProjectsJson()));
            m.put("certifications", readAny(p.getCertificationsJson()));
            m.put("careerStories", readMap(p.getCareerStoriesJson()));
            m.put("favoriteSubjects", "");
            m.put("hobbies", "");
            m.put("healthStatus", "");
            m.put("extracurricular", "");
            m.put("sports", "");
            return m;
        }).orElseGet(() -> {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("selfPr", "");
            empty.put("fullName", "");
            empty.put("dateOfBirth", "");
            empty.put("education", List.of());
            empty.put("workExperience", List.of());
            empty.put("skills", List.of());
            empty.put("certifications", List.of());
            empty.put("projects", List.of());
            empty.put("languages", List.of());
            empty.put("careerGoals", "");
            return empty;
        });
    }

    private String composeAddress(CandidateProfileEntity p) {
        StringBuilder sb = new StringBuilder();
        if (p.getPostalCode() != null && !p.getPostalCode().isBlank()) sb.append("〒").append(p.getPostalCode()).append(' ');
        if (p.getPrefecture() != null) sb.append(p.getPrefecture());
        if (p.getCity() != null) sb.append(p.getCity());
        if (p.getStreetAddress() != null) sb.append(p.getStreetAddress());
        if (p.getBuilding() != null && !p.getBuilding().isBlank()) sb.append(' ').append(p.getBuilding());
        return sb.toString().trim();
    }

    private Object skillNamesForCv(String skillsJson) {
        Object raw = readAny(skillsJson);
        if (!(raw instanceof List<?> list)) return List.of();
        List<String> names = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof String s) {
                if (!s.isBlank()) names.add(s.trim());
            } else if (item instanceof Map<?, ?> map) {
                Object name = map.get("name") != null ? map.get("name") : map.get("skill");
                if (name != null && !String.valueOf(name).isBlank()) names.add(String.valueOf(name).trim());
            }
        }
        return names;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private byte[] buildWorkbookBytes(String templateCode, Map<String, Object> payload) throws Exception {
        return buildWorkbookBytes(templateCode, payload, null);
    }

    private byte[] buildWorkbookBytes(String templateCode, Map<String, Object> payload, byte[] photoBytes) throws Exception {
        return switch (templateCode) {
            case "SHOKUMU_JA" -> alternateExporter.exportShokumuKeirekisho(payload);
            case "RESUME_EN" -> alternateExporter.exportEnglishResume(payload);
            default -> excelFiller.fill(payload, photoBytes);
        };
    }

    /**
     * Refuse exports that would silently drop rows the Japanese master cannot hold.
     * Education count uses sanitized / explicitly selected export rows only.
     */
    private void validateTemplateCapacity(String templateCode, Map<String, Object> payload) {
        String code = normalizeTemplateCode(templateCode);
        if ("SHOKUMU_JA".equals(code) || "RESUME_EN".equals(code)) {
            return;
        }
        List<?> education = payload.get("education") instanceof List<?> l ? l : List.of();
        List<?> work = payload.get("workExperience") instanceof List<?> l ? l : List.of();
        List<?> certs = payload.get("certifications") instanceof List<?> l ? l : List.of();
        // Expanded 入学/卒業 lines share the same 9-row grid — refuse overflow before write.
        int expandedEdu = estimateExpandedEducationRows(payload);
        if (expandedEdu > RirekishoExcelFiller.MAX_EDUCATION_ROWS) {
            Map<String, Object> preview = CvEducationSanitizer.preview(payload, RirekishoExcelFiller.MAX_EDUCATION_ROWS);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Education history expands to " + expandedEdu + " year/month lines (from "
                            + education.size() + " schools); Japanese 履歴書 template holds at most "
                            + RirekishoExcelFiller.MAX_EDUCATION_ROWS
                            + ". Select fewer entries (educationExportIds) or use SHOKUMU_JA — TRON will not silently drop rows."
                            + " Preview kept=" + preview.get("keptCount")
                            + " rejectedNoise=" + preview.get("rejectedCount") + ".");
        }
        if (work.size() > RirekishoExcelFiller.MAX_WORK_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Work history has " + work.size() + " entries; Japanese 履歴書 template holds at most "
                            + RirekishoExcelFiller.MAX_WORK_ROWS
                            + ". Reduce entries or use 職務経歴書 (SHOKUMU_JA) for longer careers.");
        }
        if (certs.size() > RirekishoExcelFiller.MAX_CERT_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Certifications have " + certs.size() + " entries; template holds at most "
                            + RirekishoExcelFiller.MAX_CERT_ROWS + ".");
        }
    }

    /** Estimate 学歴 grid lines after 入学/卒業 expansion (matches RirekishoExcelFiller). */
    private static int estimateExpandedEducationRows(Map<String, Object> payload) {
        List<Map<String, Object>> edu = CvEducationSanitizer.resolveForExport(payload);
        int lines = 0;
        for (Map<String, Object> row : edu) {
            Integer sy = asEstimateInt(row.get("startYear"));
            Integer ey = asEstimateInt(row.get("endYear"));
            if (ey == null) ey = asEstimateInt(row.get("year"));
            int n = 0;
            if (sy != null) n++;
            if (ey != null) n++;
            lines += n == 0 ? 1 : n;
        }
        return lines;
    }

    private static Integer asEstimateInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        String s = String.valueOf(o).trim();
        if (s.isBlank() || "null".equalsIgnoreCase(s)) return null;
        try {
            return Integer.parseInt(s.replaceAll("\\.0$", "").replaceAll("[^0-9-]", ""));
        } catch (Exception e) {
            return null;
        }
    }

    /** Build export payload: education replaced with sanitized/selected rows only. */
    private Map<String, Object> prepareExportPayload(Map<String, Object> payload) {
        Map<String, Object> out = new LinkedHashMap<>(payload);
        List<Map<String, Object>> edu = CvEducationSanitizer.resolveForExport(payload);
        out.put("education", edu);
        return out;
    }

    /**
     * Optionally sanitize education in stored payload (create/refresh), preserving selection ids.
     */
    private Map<String, Object> preparePayload(Map<String, Object> payload, boolean sanitizeEducation) {
        Map<String, Object> out = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        // Normalize DOB to ISO string if present as nested value.
        Object dob = out.get("dateOfBirth");
        if (dob != null && !(dob instanceof String)) {
            out.put("dateOfBirth", String.valueOf(dob).trim());
        }
        if (sanitizeEducation && out.get("education") != null) {
            CvEducationSanitizer.SanitizeResult edu = CvEducationSanitizer.sanitize(out.get("education"));
            out.put("education", edu.kept());
            out.put("educationSanitized", Map.of(
                    "inputCount", edu.inputCount(),
                    "keptCount", edu.kept().size(),
                    "rejectedCount", edu.rejected().size(),
                    "duplicateCount", edu.duplicateCount()
            ));
        }
        return out;
    }

    private static boolean isDraftOnlyField(String key) {
        return Set.of(
                "favoriteSubjects", "hobbies", "healthStatus", "extracurricular", "sports",
                "educationExportIds", "educationExportSelection", "motivationCompany", "careerSummary"
        ).contains(key);
    }

    private String normalizeTemplateCode(String raw) {
        if (raw == null || raw.isBlank()) return "RIREKISHO_JA";
        String t = raw.trim();
        // Legacy aliases from early drafts — map without corrupting payload.
        if ("rirekisho_jp".equalsIgnoreCase(t) || "rirekisho".equalsIgnoreCase(t) || "履歴書".equals(t)) {
            return "RIREKISHO_JA";
        }
        if ("shokumu_jp".equalsIgnoreCase(t) || "shokumu".equalsIgnoreCase(t) || "職務経歴書".equals(t)) {
            return "SHOKUMU_JA";
        }
        if ("resume".equalsIgnoreCase(t) || "resume_en".equalsIgnoreCase(t) || "english".equalsIgnoreCase(t)) {
            return "RESUME_EN";
        }
        String upper = t.toUpperCase(Locale.ROOT);
        if (!KNOWN_TEMPLATES.contains(upper)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown templateCode '" + raw + "'. Use RIREKISHO_JA, SHOKUMU_JA, or RESUME_EN.");
        }
        return upper;
    }

    private CvBuilderDraftEntity requireDraft(Long userId, String draftId) {
        return draftRepository.findByIdAndUser_IdAndDeletedAtIsNull(draftId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
    }

    /**
     * Apply accepted suggestion. List-valued fields stored as JSON strings are parsed back to objects.
     */
    private void applySuggestionValue(Map<String, Object> payload, String fieldKey, String proposedText) {
        if (fieldKey == null) return;
        Set<String> listFields = Set.of(
                "education", "workExperience", "skills", "certifications", "projects", "languages");
        if (listFields.contains(fieldKey)) {
            try {
                Object parsed = objectMapper.readValue(
                        proposedText == null ? "[]" : proposedText, Object.class);
                payload.put(fieldKey, parsed);
                return;
            } catch (Exception e) {
                // fall through to raw string
            }
        }
        payload.put(fieldKey, proposedText == null ? "" : proposedText);
    }

    private Map<String, Object> toDraftDto(CvBuilderDraftEntity d) {
        Map<String, Object> m = new LinkedHashMap<>();
        String template = normalizeTemplateCode(d.getTemplateCode());
        Map<String, Object> payload = readMap(d.getPayloadJson());
        m.put("id", d.getId());
        m.put("templateCode", template);
        m.put("versionLabel", d.getVersionLabel());
        m.put("status", d.getStatus());
        m.put("primary", d.isPrimary());
        m.put("payload", payload);
        m.put("updatedAt", d.getUpdatedAt());
        // Capacity hint for FE (does not mutate payload).
        if ("RIREKISHO_JA".equals(template)) {
            m.put("educationPreview", CvEducationSanitizer.preview(payload, RirekishoExcelFiller.MAX_EDUCATION_ROWS));
        }
        m.put("photo", photoMeta(d.getUser().getId(), payload));
        return m;
    }

    /**
     * Upload a draft-scoped photo (does not overwrite Candidate Profile unless requested).
     */
    @Transactional
    public Map<String, Object> uploadDraftPhoto(Long userId, String draftId, MultipartFile file, boolean alsoUpdateProfile) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        CvPhotoSupport.PhotoData photo = CvPhotoSupport.validateAndNormalize(file);
        String ext = "image/png".equals(photo.contentType()) ? "png" : "jpg";
        String key = "users/" + userId + "/cv-builder/" + draftId + "/photo-" + UUID.randomUUID() + "." + ext;
        objectStorageService.putObject(key, photo.bytes(), photo.contentType());
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        payload.put("cvPhotoObjectKey", key);
        payload.put("photoIncluded", true);
        payload.put("photoSource", "DRAFT");
        draft.setPayloadJson(write(payload));
        draftRepository.save(draft);
        if (alsoUpdateProfile) {
            profileRepository.findByUser_Id(userId).ifPresent(profile -> {
                profile.setPhotoObjectKey(key);
                profileRepository.save(profile);
            });
        }
        return toDraftDto(draft);
    }

    /** Use Candidate Profile photo for this draft (clears draft-specific override). */
    @Transactional
    public Map<String, Object> useProfilePhoto(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        payload.remove("cvPhotoObjectKey");
        payload.put("photoIncluded", true);
        payload.put("photoSource", "PROFILE");
        draft.setPayloadJson(write(payload));
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    /** Remove photo from this CV draft only (Candidate Profile untouched). */
    @Transactional
    public Map<String, Object> removeDraftPhoto(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        payload.put("photoIncluded", false);
        payload.put("photoSource", "NONE");
        // Keep key for potential restore but mark excluded
        draft.setPayloadJson(write(payload));
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    @Transactional(readOnly = true)
    public OptionalPhotoBytes getDraftPhoto(Long userId, String draftId) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        if (!CvPhotoSupport.isPhotoIncluded(payload)) {
            return null;
        }
        String draftKey = CvPhotoSupport.draftPhotoKey(payload);
        if (!draftKey.isBlank()) {
            if (!draftKey.startsWith("users/" + userId + "/") && !draftKey.startsWith("profiles/" + userId + "/")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Photo access denied");
            }
            byte[] data = objectStorageService.getObject(draftKey);
            String type = CvPhotoSupport.detectImageType(data);
            return new OptionalPhotoBytes(data, type == null ? MediaType.IMAGE_JPEG_VALUE : type);
        }
        return profileRepository.findByUser_Id(userId)
                .filter(p -> p.getPhotoObjectKey() != null && !p.getPhotoObjectKey().isBlank())
                .map(p -> {
                    byte[] data = objectStorageService.getObject(p.getPhotoObjectKey());
                    String type = CvPhotoSupport.detectImageType(data);
                    return new OptionalPhotoBytes(data, type == null ? MediaType.IMAGE_JPEG_VALUE : type);
                })
                .orElse(null);
    }

    public record OptionalPhotoBytes(byte[] data, String contentType) {}

    private Map<String, Object> photoMeta(Long userId, Map<String, Object> payload) {
        Map<String, Object> meta = new LinkedHashMap<>();
        boolean included = CvPhotoSupport.isPhotoIncluded(payload);
        meta.put("included", included);
        String draftKey = CvPhotoSupport.draftPhotoKey(payload);
        boolean profileHas = profileRepository.findByUser_Id(userId)
                .map(p -> p.getPhotoObjectKey() != null && !p.getPhotoObjectKey().isBlank())
                .orElse(false);
        meta.put("hasDraftPhoto", !draftKey.isBlank());
        meta.put("hasProfilePhoto", profileHas);
        meta.put("source", String.valueOf(payload.getOrDefault("photoSource",
                draftKey.isBlank() ? (profileHas ? "PROFILE" : "NONE") : "DRAFT")));
        meta.put("available", included && (!draftKey.isBlank() || profileHas));
        return meta;
    }

    private String resolvePhotoDataUri(Long userId, String templateCode, Map<String, Object> payload) {
        byte[] bytes = resolvePhotoBytes(userId, templateCode, payload);
        if (bytes == null || bytes.length == 0) return null;
        return CvPhotoSupport.toDataUri(bytes, CvPhotoSupport.detectImageType(bytes));
    }

    /** Load CV photo bytes for embedding (Japanese 履歴書 / optional EN). Null when excluded or missing. */
    private byte[] resolvePhotoBytes(Long userId, String templateCode, Map<String, Object> payload) {
        if ("RESUME_EN".equalsIgnoreCase(templateCode)) {
            Object optIn = payload.get("includePhotoOnEnglishResume");
            boolean enPhoto = Boolean.TRUE.equals(optIn) || "true".equalsIgnoreCase(String.valueOf(optIn));
            if (!enPhoto) return null;
        }
        if (!CvPhotoSupport.isPhotoIncluded(payload)) return null;
        try {
            String draftKey = CvPhotoSupport.draftPhotoKey(payload);
            byte[] bytes = null;
            if (!draftKey.isBlank()) {
                if (draftKey.startsWith("users/" + userId + "/") || draftKey.startsWith("profiles/" + userId + "/")) {
                    bytes = objectStorageService.getObject(draftKey);
                }
            } else {
                CandidateProfileEntity profile = profileRepository.findByUser_Id(userId).orElse(null);
                if (profile != null && profile.getPhotoObjectKey() != null && !profile.getPhotoObjectKey().isBlank()) {
                    bytes = objectStorageService.getObject(profile.getPhotoObjectKey());
                }
            }
            if (bytes == null || bytes.length == 0) return null;
            // Fit to Japanese ID photo aspect (3:4) without stretching.
            return CvPhotoSupport.fitIdPhoto(bytes);
        } catch (Exception e) {
            return null;
        }
    }

    private String write(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }

    private Map<String, Object> readMap(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return new LinkedHashMap<>(); }
    }

    private Object readAny(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, Object.class); } catch (Exception e) { return List.of(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object o) {
        if (o instanceof Map<?, ?> m) return new LinkedHashMap<>((Map<String, Object>) m);
        return new LinkedHashMap<>();
    }

    private String sha256(byte[] data) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
