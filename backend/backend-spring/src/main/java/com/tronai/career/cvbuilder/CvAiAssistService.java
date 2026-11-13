package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.career.profile.CandidateProfileEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * CV field rewrite via AI Gateway with privacy-aware cloud gating.
 * Never fabricates experience; language follows the draft template.
 */
@Service
public class CvAiAssistService {

    private static final Logger log = LoggerFactory.getLogger(CvAiAssistService.class);
    private static final int LANGUAGE_RETRY_LIMIT = 2;

    private final AiGateway aiGateway;
    private final AiGatewayProperties gatewayProperties;
    private final ObjectMapper objectMapper;

    public CvAiAssistService(AiGateway aiGateway, AiGatewayProperties gatewayProperties, ObjectMapper objectMapper) {
        this.aiGateway = aiGateway;
        this.gatewayProperties = gatewayProperties;
        this.objectMapper = objectMapper;
    }

    public record AssistResult(String proposedText, String reason, String engine, boolean clarificationNeeded) {
    }

    public AssistResult improve(
            Long userId,
            String fieldKey,
            String original,
            String instruction,
            String languageIgnored,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile,
            boolean requestAllowCloud) {
        return improve(userId, fieldKey, original, instruction, languageIgnored, draftPayload, profile,
                requestAllowCloud, null);
    }

    public AssistResult improve(
            Long userId,
            String fieldKey,
            String original,
            String instruction,
            String languageIgnored,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile,
            boolean requestAllowCloud,
            String templateCode) {

        if (original == null || original.isBlank()) {
            return new AssistResult("",
                    "Empty field — nothing to rewrite. Add content first.",
                    "none",
                    true);
        }

        String language = templateCode != null && !templateCode.isBlank()
                ? CvDocumentLanguage.requiredLanguage(templateCode)
                : (languageIgnored == null || languageIgnored.isBlank() ? "en" : languageIgnored.toLowerCase(Locale.ROOT));
        if (language.startsWith("ja")) language = "ja";
        else language = "en";

        boolean allowCloud = requestAllowCloud || gatewayProperties.isCvAssistCloudEnabled();
        Exception last = null;
        for (int attempt = 0; attempt <= LANGUAGE_RETRY_LIMIT; attempt++) {
            boolean strict = attempt > 0;
            try {
                AiRequestContext ctx = AiRequestContext.builder()
                        .userId(userId)
                        .feature(AiFeature.CV_GENERATION)
                        .quotaMeterHint("CV_AI_ASSIST")
                        .mode(AiMode.SMART)
                        .allowCloud(allowCloud)
                        .jsonMode(true)
                        .temperature(strict ? 0.05 : 0.3)
                        .maxTokens(1200)
                        .messages(List.of(
                                new ChatMessage("system", systemPrompt(language, templateCode, strict)),
                                new ChatMessage("user", userPrompt(fieldKey, original, instruction, language,
                                        draftPayload, profile, templateCode, strict))
                        ))
                        .build();
                AiGenerationResult result = aiGateway.generate(ctx);
                AssistResult parsed = parse(result.getText(), original, language);
                String engine = (result.getProvider() == null ? "gateway" : result.getProvider().name())
                        + "/" + (result.getModelId() == null ? "?" : result.getModelId());

                if (!parsed.proposedText().isBlank()
                        && !CvDocumentLanguage.matchesRequiredLanguage(parsed.proposedText(), language)) {
                    log.warn("AI Assist language mismatch field={} attempt={} required={}",
                            fieldKey, attempt, language);
                    if (attempt == LANGUAGE_RETRY_LIMIT) {
                        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                                "AI returned wrong language for " + CvDocumentLanguage.languageLabel(language)
                                        + " document. Please retry.");
                    }
                    continue;
                }
                return new AssistResult(parsed.proposedText(), parsed.reason(), engine, parsed.clarificationNeeded());
            } catch (ResponseStatusException e) {
                throw e;
            } catch (GatewayProviderException e) {
                log.info("CV AI assist provider unavailable category={} localFallback=true", e.getCategory());
                return heuristic(original, instruction, language, "fallback_heuristic:" + e.getCategory());
            } catch (Exception e) {
                last = e;
                log.info("CV AI assist failed ({}); attempt={}", e.getClass().getSimpleName(), attempt);
            }
        }
        if (last != null) {
            return heuristic(original, instruction, language, "fallback_heuristic");
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "AI Assist language validation failed for " + CvDocumentLanguage.languageLabel(language));
    }

    private AssistResult parse(String raw, String original, String language) {
        if (raw == null || raw.isBlank()) {
            return heuristic(original, "", language, "empty_model_output");
        }
        try {
            String json = extractJson(raw);
            JsonNode node = objectMapper.readTree(json);
            String proposed = node.path("proposedText").asText("").trim();
            String reason = node.path("reason").asText("").trim();
            boolean clarify = node.path("clarificationNeeded").asBoolean(false);
            if (proposed.isBlank()) {
                return heuristic(original, "", language, "model_returned_blank");
            }
            if (reason.isBlank()) {
                reason = language.startsWith("ja")
                        ? "表現を整理しました。事実は追加していません。"
                        : "Rewrote for clarity; no new facts added.";
            }
            return new AssistResult(proposed, reason, "gateway", clarify);
        } catch (Exception e) {
            String cleaned = raw.trim();
            if (cleaned.length() < 8) {
                return heuristic(original, "", language, "unparseable_output");
            }
            return new AssistResult(cleaned,
                    language.startsWith("ja")
                            ? "モデル出力を提案として提示（要確認）。事実の追加がないか確認してください。"
                            : "Model prose returned as suggestion — verify no new facts.",
                    "gateway_raw",
                    true);
        }
    }

    private AssistResult heuristic(String original, String instruction, String language, String engine) {
        String trimmed = original.trim().replaceAll("\\s+", " ");
        String lower = instruction == null ? "" : instruction.toLowerCase(Locale.ROOT);
        boolean polish = lower.contains("professional") || (instruction != null && instruction.contains("丁寧"));
        String proposed = polish
                ? trimmed + (language.startsWith("ja")
                ? "（表現を整理しました。事実は追加していません。）"
                : " (rephrased for clarity; no new facts added)")
                : trimmed;
        String reason = language.startsWith("ja")
                ? "ローカル/フォールバック整形。AIゲートウェイ利用不可またはクラウド未許可。"
                : "Local/fallback rewrite. Gateway unavailable or cloud not permitted.";
        return new AssistResult(proposed, reason, engine, false);
    }

    private String systemPrompt(String language, String templateCode, boolean strict) {
        boolean ja = language != null && language.toLowerCase(Locale.ROOT).startsWith("ja");
        if (ja) {
            String base = """
                    あなたは就職活動向けの日本語文書校正アシスタントです。
                    ルール:
                    - proposedText は必ず日本語で書く。英語の文章は禁止（技術固有名詞のみ英語可）。
                    - 文法・表記・ビジネス文書としての丁寧さを改善する。
                    - 自己PR・志望動機は事実の範囲でのみ磨く。
                    - 経験・スキル・資格・実績を新たに作ってはならない。
                    - 原文が意味不明な場合は clarificationNeeded=true とし、proposedText は原文に近い安全な整形に留める。
                    - 必ず JSON のみを返す: {"proposedText":"...","reason":"...","clarificationNeeded":false}
                    """;
            if (templateCode != null) base += " Template=" + templateCode + " は日本語文書です。";
            if (strict) base += " 前回は言語不一致で却下。今回は全文を日本語で書け。";
            return base;
        }
        String base = """
                You are a professional resume writing assistant.
                Rules:
                - proposedText MUST be professional English. Do not write Japanese.
                - Fix grammar/spelling and improve clarity.
                - Preserve factual meaning; never invent experience, skills, qualifications, or achievements.
                - If the text is unintelligible, set clarificationNeeded=true and keep proposedText close to the original.
                - Return JSON only: {"proposedText":"...","reason":"...","clarificationNeeded":false}
                """;
        if (templateCode != null) base += " Template=" + templateCode + " requires English.";
        if (strict) base += " PREVIOUS OUTPUT REJECTED FOR WRONG LANGUAGE. Write only English.";
        return base;
    }

    private String userPrompt(
            String fieldKey,
            String original,
            String instruction,
            String language,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile,
            String templateCode,
            boolean strict) {
        Map<String, Object> confirmed = new LinkedHashMap<>();
        if (profile != null) {
            confirmed.put("fullName", profile.getFullName());
            confirmed.put("nameJa", profile.getNameJa());
            confirmed.put("nationality", profile.getNationality());
            confirmed.put("confirmedFieldsJson", profile.getConfirmedFieldsJson());
        }
        List<String> safeDraftKeys = List.of("education", "workExperience", "skills", "certifications", "selfPr");
        Map<String, Object> draftSlice = new LinkedHashMap<>();
        if (draftPayload != null) {
            for (String k : safeDraftKeys) {
                if (draftPayload.containsKey(k)) {
                    draftSlice.put(k, draftPayload.get(k));
                }
            }
        }
        return """
                Template: %s
                Field: %s
                REQUIRED output language: %s (%s)%s
                User instruction: %s
                Confirmed profile facts (do not invent beyond these): %s
                Related draft excerpt (context only): %s
                Original field text:
                ---
                %s
                ---
                """.formatted(
                templateCode == null ? "" : templateCode,
                fieldKey,
                CvDocumentLanguage.languageLabel(language),
                language,
                strict ? "\nSTRICT RETRY: previous answer used the wrong language." : "",
                instruction == null ? "" : instruction,
                String.valueOf(confirmed),
                String.valueOf(draftSlice),
                original);
    }

    private static String extractJson(String raw) {
        String t = raw.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('{');
            int end = t.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return t.substring(start, end + 1);
            }
        }
        int start = t.indexOf('{');
        int end = t.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return t.substring(start, end + 1);
        }
        return t;
    }
}
