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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
    }

    public List<Map<String, Object>> listTemplates() {
        return List.of(
                Map.of("code", "RIREKISHO_JA", "displayName", "履歴書（日本語）", "locale", "ja"),
                Map.of("code", "SHOKUMU_JA", "displayName", "職務経歴書（日本語）", "locale", "ja"),
                Map.of("code", "RESUME_EN", "displayName", "Resume (English)", "locale", "en")
        );
    }

    public Map<String, Object> templateSchema(String code) {
        return Map.of("code", code, "fields", List.of(
                "fullName", "nameJa", "furigana", "dateOfBirth", "nationality", "addressText",
                "email", "phone", "education", "workExperience", "certifications", "selfPr",
                "favoriteSubjects", "hobbies", "healthStatus", "extracurricular", "sports"
        ));
    }

    @Transactional
    public Map<String, Object> createDraft(Long userId, Map<String, Object> body) {
        User user = userRepository.findById(userId).orElseThrow();
        String template = String.valueOf(body.getOrDefault("templateCode", "RIREKISHO_JA"));
        Map<String, Object> payload = body.containsKey("payload")
                ? castMap(body.get("payload"))
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
        if (body.get("payload") != null) draft.setPayloadJson(write(castMap(body.get("payload"))));
        if (body.get("versionLabel") != null) draft.setVersionLabel(String.valueOf(body.get("versionLabel")));
        if (body.get("templateCode") != null) draft.setTemplateCode(String.valueOf(body.get("templateCode")));
        draftRepository.save(draft);
        return toDraftDto(draft);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listDrafts(Long userId) {
        return draftRepository.findByUser_IdOrderByUpdatedAtDesc(userId).stream().map(this::toDraftDto).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDraft(Long userId, String draftId) {
        return toDraftDto(requireDraft(userId, draftId));
    }

    @Transactional
    public Map<String, Object> aiAssist(Long userId, String draftId, Map<String, Object> body) {
        CvBuilderDraftEntity draft = requireDraft(userId, draftId);
        String field = String.valueOf(body.getOrDefault("fieldKey", "selfPr"));
        String instruction = String.valueOf(body.getOrDefault("instruction", ""));
        String language = languageHelper.normalize(String.valueOf(body.getOrDefault("language", "en")));
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        String original = String.valueOf(payload.getOrDefault(field, ""));
        // Non-fabricating assist: structural rewrite only; no new facts.
        String proposed = improveText(original, instruction, language);
        CvAiSuggestionEntity sugg = CvAiSuggestionEntity.builder()
                .id(UUID.randomUUID().toString())
                .draftId(draftId)
                .user(draft.getUser())
                .fieldKey(field)
                .originalText(original)
                .proposedText(proposed)
                .reason(languageHelper.message("match.title", language) + ": pending user approval — no silent overwrite")
                .status("PENDING")
                .language(language)
                .build();
        suggestionRepository.save(sugg);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("suggestionId", sugg.getId());
        out.put("fieldKey", field);
        out.put("originalText", original == null ? "" : original);
        out.put("proposedText", proposed == null ? "" : proposed);
        out.put("reason", sugg.getReason());
        out.put("status", "PENDING");
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
            payload.put(sugg.getFieldKey(), sugg.getProposedText());
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
        Map<String, Object> payload = readMap(draft.getPayloadJson());
        byte[] bytes;
        String contentType;
        String filename;
        String fmt = format == null ? "xlsx" : format.toLowerCase(Locale.ROOT);
        String shortId = draftId.length() >= 8 ? draftId.substring(0, 8) : draftId;
        if ("pdf".equals(fmt)) {
            // Always build the authoritative office document first (POI), then convert via Gotenberg.
            validateTemplateCapacity(draft.getTemplateCode(), payload);
            byte[] office = buildWorkbookBytes(draft.getTemplateCode(), payload);
            String officeName = "cv-" + shortId + ".xlsx";
            try {
                CvGotenbergExportService.PdfExportResult pdf =
                        gotenbergExportService.convertOfficeDocument(office, officeName);
                bytes = pdf.bytes();
            } catch (GotenbergException ge) {
                HttpStatus status = ge.isUnavailable() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
                throw new ResponseStatusException(status,
                        "PDF generation is temporarily unavailable. XLSX export still works. "
                                + "Start local Gotenberg (Docker: tron-gotenberg on port 3000). "
                                + ge.getMessage(),
                        ge);
            }
            contentType = "application/pdf";
            filename = "cv-" + shortId + ".pdf";
        } else {
            validateTemplateCapacity(draft.getTemplateCode(), payload);
            bytes = buildWorkbookBytes(draft.getTemplateCode(), payload);
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            filename = "cv-" + shortId + ".xlsx";
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

    private String improveText(String original, String instruction, String language) {
        if (original == null || original.isBlank()) {
            return "";
        }
        String trimmed = original.trim().replaceAll("\\s+", " ");
        if (instruction.toLowerCase(Locale.ROOT).contains("professional")
                || instruction.contains("丁寧") || instruction.contains("professional")) {
            return trimmed + (language.startsWith("ja") ? "（表現を整理しました。事実は追加していません。）" : " (rephrased for clarity; no new facts added)");
        }
        return trimmed;
    }

    private Map<String, Object> payloadFromProfile(Long userId) {
        return profileRepository.findByUser_Id(userId).map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fullName", nullToEmpty(p.getFullName()));
            m.put("nameJa", nullToEmpty(p.getNameJa()));
            m.put("furigana", nullToEmpty(p.getFurigana()));
            m.put("dateOfBirth", p.getDateOfBirth() == null ? "" : p.getDateOfBirth().toString());
            m.put("nationality", nullToEmpty(p.getNationality()));
            m.put("addressText", nullToEmpty(p.getAddressText()));
            m.put("email", nullToEmpty(p.getEmail()));
            m.put("phone", nullToEmpty(p.getPhone()));
            m.put("selfPr", nullToEmpty(p.getSelfPr()));
            m.put("education", readAny(p.getEducationJson()));
            m.put("workExperience", readAny(p.getCareerJson()));
            m.put("skills", readAny(p.getSkillsJson()));
            m.put("certifications", List.of());
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
            return empty;
        });
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private byte[] buildWorkbookBytes(String templateCode, Map<String, Object> payload) throws Exception {
        return switch (templateCode) {
            case "SHOKUMU_JA" -> alternateExporter.exportShokumuKeirekisho(payload);
            case "RESUME_EN" -> alternateExporter.exportEnglishResume(payload);
            default -> excelFiller.fill(payload);
        };
    }

    /**
     * Refuse exports that would silently drop rows the Japanese master cannot hold.
     */
    private void validateTemplateCapacity(String templateCode, Map<String, Object> payload) {
        if ("SHOKUMU_JA".equals(templateCode) || "RESUME_EN".equals(templateCode)) {
            return;
        }
        List<?> education = payload.get("education") instanceof List<?> l ? l : List.of();
        List<?> work = payload.get("workExperience") instanceof List<?> l ? l : List.of();
        List<?> certs = payload.get("certifications") instanceof List<?> l ? l : List.of();
        if (education.size() > RirekishoExcelFiller.MAX_EDUCATION_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Education history has " + education.size() + " entries; Japanese 履歴書 template holds at most "
                            + RirekishoExcelFiller.MAX_EDUCATION_ROWS
                            + ". Reduce entries or split into another CV draft — TRON will not silently drop rows.");
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

    private CvBuilderDraftEntity requireDraft(Long userId, String draftId) {
        return draftRepository.findByIdAndUser_Id(draftId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
    }

    private Map<String, Object> toDraftDto(CvBuilderDraftEntity d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("templateCode", d.getTemplateCode());
        m.put("versionLabel", d.getVersionLabel());
        m.put("status", d.getStatus());
        m.put("primary", d.isPrimary());
        m.put("payload", readMap(d.getPayloadJson()));
        m.put("updatedAt", d.getUpdatedAt());
        return m;
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
