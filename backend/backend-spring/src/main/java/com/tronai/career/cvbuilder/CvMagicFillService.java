package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.career.profile.CandidateProfileEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Magic Fill: local-AI (Ollama via gateway) grammar/professional polish + profile-backed
 * missing-field suggestions. Never invents factual credentials. Never auto-applies.
 */
@Service
public class CvMagicFillService {

    private static final Logger log = LoggerFactory.getLogger(CvMagicFillService.class);

    /** Descriptive fields eligible for AI wording improvement. */
    public static final List<String> AI_TEXT_FIELDS = List.of(
            "selfPr", "careerGoals", "careerSummary", "motivationCompany", "motivationGeneral"
    );

    /** Factual scalars that may be filled from Candidate Profile when draft blank. */
    private static final List<String> PROFILE_FACT_FIELDS = List.of(
            "fullName", "nameJa", "furigana", "dateOfBirth", "nationality",
            "addressText", "postalCode", "email", "phone", "gender"
    );

    private final AiGateway aiGateway;
    private final ObjectMapper objectMapper;

    public CvMagicFillService(AiGateway aiGateway, ObjectMapper objectMapper) {
        this.aiGateway = aiGateway;
        this.objectMapper = objectMapper;
    }

    public record FieldSuggestion(
            String fieldKey,
            String originalText,
            String proposedText,
            String reason,
            String category, // PROFILE_FACT | AI_REWRITE | MISSING_REQUIRED | UNCHANGED
            boolean requiresConfirmation,
            boolean clarificationNeeded
    ) {}

    public record MagicFillResult(
            List<FieldSuggestion> suggestions,
            List<String> missingRequired,
            List<String> warnings,
            String engine,
            boolean ollamaUsed,
            String templateCode
    ) {}

    /**
     * @param allowCloud must stay false for production Magic Fill privacy (default).
     *                   Cloud is never used silently; only if caller explicitly opts in.
     */
    private static final int LANGUAGE_RETRY_LIMIT = 2;

    public MagicFillResult magicFill(
            Long userId,
            String templateCode,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile,
            String languageIgnored,
            String companyContext,
            boolean allowCloud) {

        // Document language is ALWAYS from template — never UI / browser locale.
        String language = CvDocumentLanguage.requiredLanguage(templateCode);
        List<FieldSuggestion> suggestions = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<String, Object> payload = draftPayload == null ? Map.of() : draftPayload;

        // 1) Fill blank factual fields from Candidate Profile (not AI invention).
        if (profile != null) {
            for (String key : PROFILE_FACT_FIELDS) {
                String current = str(payload.get(key));
                String fromProfile = profileFact(profile, key);
                if (current.isBlank() && !fromProfile.isBlank()) {
                    suggestions.add(new FieldSuggestion(
                            key, current, fromProfile,
                            language.startsWith("ja")
                                    ? "候補者プロフィールの確認済み情報から補完（AIによる創作ではありません）。"
                                    : "Filled from verified Candidate Profile (not AI invention).",
                            "PROFILE_FACT", true, false));
                }
            }
            // Structured lists: only suggest when draft empty and profile has data.
            suggestListIfEmpty(payload, "education", readJsonList(profile.getEducationJson()), suggestions, language);
            if (!profile.isNoWorkExperience()) {
                suggestListIfEmpty(payload, "workExperience", readJsonList(profile.getCareerJson()), suggestions, language);
            }
            suggestListIfEmpty(payload, "skills", readJsonList(profile.getSkillsJson()), suggestions, language);
            suggestListIfEmpty(payload, "certifications", readJsonList(profile.getCertificationsJson()), suggestions, language);
            suggestListIfEmpty(payload, "projects", readJsonList(profile.getProjectsJson()), suggestions, language);
            suggestListIfEmpty(payload, "languages", readJsonList(profile.getLanguagesJson()), suggestions, language);
        }

        // 2) Capacity warnings (no silent truncate).
        if ("RIREKISHO_JA".equalsIgnoreCase(templateCode)) {
            CvEducationSanitizer.SanitizeResult edu = CvEducationSanitizer.sanitize(payload.get("education"));
            if (edu.kept().size() > RirekishoExcelFiller.MAX_EDUCATION_ROWS) {
                warnings.add("Education has " + edu.kept().size() + " exportable rows; 履歴書 holds "
                        + RirekishoExcelFiller.MAX_EDUCATION_ROWS + ". Select entries before export.");
            }
            List<?> work = payload.get("workExperience") instanceof List<?> l ? l : List.of();
            if (work.size() > RirekishoExcelFiller.MAX_WORK_ROWS) {
                warnings.add("Work has " + work.size() + " rows; 履歴書 holds "
                        + RirekishoExcelFiller.MAX_WORK_ROWS + ". Reduce entries before export.");
            }
        }

        // 3) Required-ish blanks for the template.
        for (String req : requiredFields(templateCode)) {
            if (str(payload.get(req)).isBlank()
                    && suggestions.stream().noneMatch(s -> s.fieldKey().equals(req) && !s.proposedText().isBlank())) {
                missing.add(req);
            }
        }

        // 4) AI rewrite for descriptive fields — local Ollama only unless allowCloud explicitly true.
        String engine = "none";
        boolean ollamaUsed = false;
        List<String> textTargets = new ArrayList<>();
        for (String field : AI_TEXT_FIELDS) {
            String original = str(payload.get(field));
            if (original.isBlank() && "selfPr".equals(field) && profile != null && notBlank(profile.getSelfPr())) {
                original = profile.getSelfPr().trim();
            }
            if (original.isBlank() && "careerGoals".equals(field) && profile != null && notBlank(profile.getCareerGoals())) {
                original = profile.getCareerGoals().trim();
            }
            if (original.isBlank()) continue;
            textTargets.add(field);
        }

        if (!textTargets.isEmpty()) {
            try {
                AiRewriteBatch batch = rewriteBatchWithLanguageGuard(
                        userId, templateCode, language, companyContext, payload, profile, textTargets, allowCloud);
                engine = batch.engine();
                ollamaUsed = batch.ollamaUsed();
                for (FieldSuggestion s : batch.suggestions()) {
                    if (!s.proposedText().isBlank() && !s.proposedText().equals(s.originalText())) {
                        suggestions.add(s);
                    }
                }
            } catch (ResponseStatusException e) {
                // If we already have profile-fact suggestions, surface them with a warning instead of failing hard.
                if (!suggestions.isEmpty()) {
                    warnings.add(e.getReason() == null ? e.getMessage() : e.getReason());
                    engine = "profile_facts_only";
                } else {
                    throw e;
                }
            } catch (GatewayProviderException e) {
                String msg = "Magic Fill AI unavailable (local Ollama). You can keep editing manually. " + e.getMessage();
                if (!suggestions.isEmpty()) {
                    warnings.add(msg);
                    engine = "profile_facts_only";
                } else {
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, msg, e);
                }
            } catch (Exception e) {
                log.info("Magic Fill AI failed: {}", e.getClass().getSimpleName());
                String msg = "Magic Fill AI failed. Edit manually or retry when Ollama is ready. " + e.getMessage();
                if (!suggestions.isEmpty()) {
                    warnings.add(msg);
                    engine = "profile_facts_only";
                } else {
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, msg, e);
                }
            }
        } else if (suggestions.isEmpty()) {
            warnings.add(language.startsWith("ja")
                    ? "改善対象の記述欄が空です。自己PRなどを入力するか、プロフィールを充実させてください。"
                    : "No descriptive text to improve. Add Self PR / goals or enrich Candidate Profile.");
        }

        return new MagicFillResult(suggestions, missing, warnings, engine, ollamaUsed, templateCode);
    }

    private record AiRewriteBatch(List<FieldSuggestion> suggestions, String engine, boolean ollamaUsed) {}

    private AiRewriteBatch rewriteBatchWithLanguageGuard(
            Long userId,
            String templateCode,
            String language,
            String companyContext,
            Map<String, Object> payload,
            CandidateProfileEntity profile,
            List<String> fields,
            boolean allowCloud) throws Exception {

        Map<String, String> originals = new LinkedHashMap<>();
        for (String f : fields) {
            String v = str(payload.get(f));
            if (v.isBlank() && profile != null) {
                if ("selfPr".equals(f)) v = str(profile.getSelfPr());
                if ("careerGoals".equals(f)) v = str(profile.getCareerGoals());
            }
            originals.put(f, v);
        }

        Map<String, String> remaining = new LinkedHashMap<>(originals);
        List<FieldSuggestion> accepted = new ArrayList<>();
        String engine = "none";
        boolean ollama = false;

        for (int attempt = 0; attempt <= LANGUAGE_RETRY_LIMIT && !remaining.isEmpty(); attempt++) {
            boolean strict = attempt > 0;
            AiRewriteBatch batch = rewriteBatchOnce(
                    userId, templateCode, language, companyContext, remaining, payload, profile, allowCloud, strict);
            engine = batch.engine();
            ollama = batch.ollamaUsed();

            Map<String, String> failed = new LinkedHashMap<>();
            for (Map.Entry<String, String> e : remaining.entrySet()) {
                FieldSuggestion match = batch.suggestions().stream()
                        .filter(s -> e.getKey().equals(s.fieldKey()))
                        .findFirst()
                        .orElse(null);
                if (match == null) {
                    failed.put(e.getKey(), e.getValue());
                    continue;
                }
                FieldSuggestion safe = validateRewrite(match, profile, language);
                if (!"UNCHANGED".equals(safe.category())
                        && !CvDocumentLanguage.matchesRequiredLanguage(safe.proposedText(), language)) {
                    log.warn("Magic Fill language mismatch field={} attempt={} required={}",
                            e.getKey(), attempt, language);
                    failed.put(e.getKey(), e.getValue());
                    continue;
                }
                accepted.add(safe);
            }
            remaining = failed;
            if (!remaining.isEmpty() && attempt == LANGUAGE_RETRY_LIMIT) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "AI returned wrong language for " + CvDocumentLanguage.languageLabel(language)
                                + " document (" + templateCode + "). Fields: " + remaining.keySet()
                                + ". Please retry Magic Fill.");
            }
        }
        return new AiRewriteBatch(accepted, engine, ollama);
    }

    private AiRewriteBatch rewriteBatchOnce(
            Long userId,
            String templateCode,
            String language,
            String companyContext,
            Map<String, String> originals,
            Map<String, Object> payload,
            CandidateProfileEntity profile,
            boolean allowCloud,
            boolean strictLanguage) throws Exception {

        AiRequestContext ctx = AiRequestContext.builder()
                .userId(userId)
                .feature(AiFeature.CV_GENERATION)
                .mode(AiMode.SMART)
                .allowCloud(allowCloud) // default false from caller — no silent cloud
                .jsonMode(true)
                .temperature(strictLanguage ? 0.05 : 0.25)
                .maxTokens(2500)
                .messages(List.of(
                        new ChatMessage("system", systemPrompt(language, templateCode, strictLanguage)),
                        new ChatMessage("user", userPrompt(templateCode, language, companyContext, originals, payload, profile, strictLanguage))
                ))
                .build();

        AiGenerationResult result = aiGateway.generate(ctx);
        boolean ollama = result.getProvider() == GatewayProviderId.OLLAMA;
        if (!allowCloud && !ollama && result.getProvider() != null) {
            // Privacy: reject non-local when cloud not opted-in.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Magic Fill requires local Ollama. Cloud AI was not enabled for this request.");
        }
        String engine = (result.getProvider() == null ? "gateway" : result.getProvider().name())
                + "/" + (result.getModelId() == null ? "?" : result.getModelId());

        List<FieldSuggestion> parsed = parseBatch(result.getText(), originals, language);
        return new AiRewriteBatch(parsed, engine, ollama);
    }

    private FieldSuggestion validateRewrite(FieldSuggestion s, CandidateProfileEntity profile, String language) {
        String proposed = s.proposedText() == null ? "" : s.proposedText().trim();
        if (proposed.isBlank()) {
            return new FieldSuggestion(s.fieldKey(), s.originalText(), s.originalText(),
                    "Empty AI proposal discarded.", "UNCHANGED", false, true);
        }
        // Block obvious fabricated credential patterns that were not in the original.
        String lowerOrig = s.originalText().toLowerCase(Locale.ROOT);
        String lowerProp = proposed.toLowerCase(Locale.ROOT);
        for (String marker : List.of("jlpt n1", "jlpt n2", "toefl", "phd", "博士", "修士課程修了")) {
            if (lowerProp.contains(marker) && !lowerOrig.contains(marker)) {
                boolean profileHas = profileEvidenceContains(profile, marker);
                if (!profileHas) {
                    return new FieldSuggestion(s.fieldKey(), s.originalText(), s.originalText(),
                            language.startsWith("ja")
                                    ? "AI提案に根拠のない資格・学歴らしき記述があったため却下しました。"
                                    : "Rejected AI proposal that introduced unsupported credentials.",
                            "UNCHANGED", false, true);
                }
            }
        }
        return s;
    }

    private boolean profileEvidenceContains(CandidateProfileEntity profile, String marker) {
        if (profile == null) return false;
        String blob = (str(profile.getSelfPr()) + " " + str(profile.getCareerGoals()) + " "
                + str(profile.getCertificationsJson()) + " " + str(profile.getEducationJson())
                + " " + str(profile.getLanguagesJson())).toLowerCase(Locale.ROOT);
        return blob.contains(marker.toLowerCase(Locale.ROOT));
    }

    private List<FieldSuggestion> parseBatch(String raw, Map<String, String> originals, String language) {
        List<FieldSuggestion> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Magic Fill returned empty model output.");
        }
        try {
            JsonNode root = objectMapper.readTree(extractJson(raw));
            JsonNode fields = root.path("fields");
            if (!fields.isObject()) {
                // single-field fallback
                String proposed = root.path("proposedText").asText("").trim();
                if (!proposed.isBlank() && originals.size() == 1) {
                    String key = originals.keySet().iterator().next();
                    out.add(new FieldSuggestion(key, originals.get(key), proposed,
                            root.path("reason").asText("AI rewrite"), "AI_REWRITE", true,
                            root.path("clarificationNeeded").asBoolean(false)));
                    return out;
                }
                throw new IllegalArgumentException("Missing fields object");
            }
            for (Map.Entry<String, String> e : originals.entrySet()) {
                JsonNode node = fields.path(e.getKey());
                if (node.isMissingNode() || node.isNull()) continue;
                String proposed = node.path("proposedText").asText(node.isTextual() ? node.asText() : "").trim();
                if (proposed.isBlank()) continue;
                String reason = node.path("reason").asText(
                        language.startsWith("ja") ? "表現を整理しました。事実は追加していません。"
                                : "Rewrote for clarity; no new facts added.");
                boolean clarify = node.path("clarificationNeeded").asBoolean(false);
                out.add(new FieldSuggestion(e.getKey(), e.getValue(), proposed, reason, "AI_REWRITE", true, clarify));
            }
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Magic Fill returned malformed JSON. Try again or edit manually.", e);
        }
    }

    private void suggestListIfEmpty(
            Map<String, Object> payload,
            String key,
            List<Map<String, Object>> fromProfile,
            List<FieldSuggestion> suggestions,
            String language) {
        Object cur = payload.get(key);
        boolean empty = cur == null || (cur instanceof List<?> l && l.isEmpty()) || str(cur).equals("[]");
        if (!empty || fromProfile == null || fromProfile.isEmpty()) return;
        try {
            String proposed = objectMapper.writeValueAsString(fromProfile);
            suggestions.add(new FieldSuggestion(
                    key,
                    cur == null ? "[]" : objectMapper.writeValueAsString(cur),
                    proposed,
                    language.startsWith("ja")
                            ? "候補者プロフィールの構造化データから補完。"
                            : "Copied structured list from Candidate Profile.",
                    "PROFILE_FACT", true, false));
        } catch (Exception ignored) {
            // skip list suggestion on serialize failure
        }
    }

    private List<String> requiredFields(String templateCode) {
        if ("RESUME_EN".equalsIgnoreCase(templateCode)) {
            return List.of("fullName", "email");
        }
        if ("SHOKUMU_JA".equalsIgnoreCase(templateCode)) {
            return List.of("nameJa", "fullName", "selfPr");
        }
        return List.of("nameJa", "fullName", "dateOfBirth");
    }

    private String profileFact(CandidateProfileEntity p, String key) {
        return switch (key) {
            case "fullName" -> str(p.getFullName());
            case "nameJa" -> str(p.getNameJa());
            case "furigana" -> str(p.getFurigana());
            case "dateOfBirth" -> p.getDateOfBirth() == null ? "" : p.getDateOfBirth().toString();
            case "nationality" -> str(p.getNationality());
            case "addressText" -> str(p.getAddressText());
            case "postalCode" -> str(p.getPostalCode());
            case "email" -> str(p.getEmail());
            case "phone" -> str(p.getPhone());
            case "gender" -> str(p.getGender());
            default -> "";
        };
    }

    private List<Map<String, Object>> readJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return List.of();
            List<Map<String, Object>> out = new ArrayList<>();
            for (JsonNode item : node) {
                if (item.isObject()) {
                    out.add(objectMapper.convertValue(item, new com.fasterxml.jackson.core.type.TypeReference<>() {}));
                }
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    private String systemPrompt(String language, String templateCode, boolean strict) {
        boolean ja = language != null && language.toLowerCase(Locale.ROOT).startsWith("ja");
        if (ja) {
            String base = """
                    あなたは日本の就職活動向け履歴書の校正アシスタントです。
                    厳守:
                    - proposedText は必ず日本語（ひらがな・カタカナ・漢字）で書く。英語の文章は禁止。
                    - 技術固有名詞（Java, Spring Boot, AWS, MySQL 等）と会社名のみ英語のままでよい。
                    - 文法・表記・ビジネス文書としての丁寧さのみ改善する。
                    - 学歴・職歴・資格・JLPT・企業名・日付・実績を新たに作ってはならない。
                    - 原文にない事実を追加しない。
                    - 必ず JSON のみ:
                    {"fields":{"selfPr":{"proposedText":"...","reason":"...","clarificationNeeded":false}}}
                    - fields のキーは依頼された欄のみ。
                    Template=%s は日本語文書です。
                    """.formatted(templateCode);
            if (strict) {
                base += "前回の出力は言語不一致で却下された。今度は本文をすべて日本語で書け。英語の文は不可。";
            }
            return base;
        }
        String base = """
                You are a professional resume writing assistant for job applications.
                Rules:
                - proposedText MUST be professional English. Do not write Japanese.
                - Improve grammar, spelling, and professional tone only.
                - Never invent education, employers, certifications, scores, dates, or achievements.
                - Do not add facts absent from the original text / confirmed profile.
                - Return JSON only:
                {"fields":{"selfPr":{"proposedText":"...","reason":"...","clarificationNeeded":false}}}
                - Include only requested field keys under fields.
                Template=%s requires English narrative.
                """.formatted(templateCode);
        if (strict) {
            base += " PREVIOUS OUTPUT WAS REJECTED FOR WRONG LANGUAGE. Write only English.";
        }
        return base;
    }

    private String userPrompt(
            String templateCode,
            String language,
            String companyContext,
            Map<String, String> originals,
            Map<String, Object> payload,
            CandidateProfileEntity profile,
            boolean strict) {
        Map<String, Object> confirmed = new LinkedHashMap<>();
        if (profile != null) {
            confirmed.put("fullName", profile.getFullName());
            confirmed.put("skillsJson", abbreviate(profile.getSkillsJson(), 400));
            confirmed.put("educationJson", abbreviate(profile.getEducationJson(), 400));
            confirmed.put("certificationsJson", abbreviate(profile.getCertificationsJson(), 300));
        }
        Set<String> ctxKeys = Set.of("education", "workExperience", "skills", "certifications", "projects");
        Map<String, Object> draftSlice = new LinkedHashMap<>();
        for (String k : ctxKeys) {
            if (payload.containsKey(k)) draftSlice.put(k, payload.get(k));
        }
        return """
                Template: %s
                REQUIRED output language: %s (%s)%s
                Company context (optional, for motivation only): %s
                Confirmed profile facts (do not invent beyond these): %s
                Draft structured excerpt: %s
                Fields to improve (JSON object fieldKey -> originalText): %s
                Return improved wording for each field under "fields".
                """.formatted(
                templateCode,
                CvDocumentLanguage.languageLabel(language),
                language,
                strict ? "\nSTRICT RETRY: previous answer used the wrong language." : "",
                companyContext == null ? "" : companyContext,
                String.valueOf(confirmed),
                String.valueOf(draftSlice),
                String.valueOf(originals));
    }

    private static String abbreviate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static String extractJson(String raw) {
        String t = raw.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('{');
            int end = t.lastIndexOf('}');
            if (start >= 0 && end > start) return t.substring(start, end + 1);
        }
        int start = t.indexOf('{');
        int end = t.lastIndexOf('}');
        if (start >= 0 && end > start) return t.substring(start, end + 1);
        return t;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
