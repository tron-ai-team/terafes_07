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
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * CV field rewrite via AI Gateway with privacy-aware cloud gating.
 * Never fabricates experience; falls back to deterministic rewrite when AI unavailable.
 */
@Service
public class CvAiAssistService {

    private static final Logger log = LoggerFactory.getLogger(CvAiAssistService.class);

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
            String language,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile,
            boolean requestAllowCloud) {

        if (original == null || original.isBlank()) {
            return new AssistResult("",
                    "Empty field — nothing to rewrite. Add content first.",
                    "none",
                    true);
        }

        boolean allowCloud = requestAllowCloud || gatewayProperties.isCvAssistCloudEnabled();
        try {
            AiRequestContext ctx = AiRequestContext.builder()
                    .userId(userId)
                    .feature(AiFeature.CV_GENERATION)
                    .mode(AiMode.SMART)
                    .allowCloud(allowCloud)
                    .jsonMode(true)
                    .temperature(0.3)
                    .maxTokens(1200)
                    .messages(List.of(
                            new ChatMessage("system", systemPrompt(language)),
                            new ChatMessage("user", userPrompt(fieldKey, original, instruction, language, draftPayload, profile))
                    ))
                    .build();
            AiGenerationResult result = aiGateway.generate(ctx);
            AssistResult parsed = parse(result.getText(), original, language);
            String engine = (result.getProvider() == null ? "gateway" : result.getProvider().name())
                    + "/" + (result.getModelId() == null ? "?" : result.getModelId());
            return new AssistResult(parsed.proposedText(), parsed.reason(), engine, parsed.clarificationNeeded());
        } catch (GatewayProviderException e) {
            log.info("CV AI assist provider unavailable category={} localFallback=true", e.getCategory());
            return heuristic(original, instruction, language, "fallback_heuristic:" + e.getCategory());
        } catch (Exception e) {
            log.info("CV AI assist failed ({}); using heuristic fallback", e.getClass().getSimpleName());
            return heuristic(original, instruction, language, "fallback_heuristic");
        }
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
            // Model returned prose — use as proposed text only if non-empty and not inventing wildly.
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

    private String systemPrompt(String language) {
        boolean ja = language != null && language.toLowerCase(Locale.ROOT).startsWith("ja");
        if (ja) {
            return """
                    あなたは就職活動向けの日本語文書校正アシスタントです。
                    ルール:
                    - 文法・表記・ビジネス文書としての丁寧さを改善する。
                    - 自己PR・志望動機は事実の範囲でのみ磨く。
                    - 経験・スキル・資格・実績を新たに作ってはならない。
                    - 原文が意味不明な場合は clarificationNeeded=true とし、proposedText は原文に近い安全な整形に留める。
                    - 必ず JSON のみを返す: {"proposedText":"...","reason":"...","clarificationNeeded":false}
                    """;
        }
        return """
                You are a professional resume writing assistant.
                Rules:
                - Fix grammar/spelling and improve clarity.
                - Preserve factual meaning; never invent experience, skills, qualifications, or achievements.
                - If the text is unintelligible, set clarificationNeeded=true and keep proposedText close to the original.
                - Return JSON only: {"proposedText":"...","reason":"...","clarificationNeeded":false}
                """;
    }

    private String userPrompt(
            String fieldKey,
            String original,
            String instruction,
            String language,
            Map<String, Object> draftPayload,
            CandidateProfileEntity profile) {
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
                Field: %s
                Language: %s
                User instruction: %s
                Confirmed profile facts (do not invent beyond these): %s
                Related draft excerpt (context only): %s
                Original field text:
                ---
                %s
                ---
                """.formatted(
                fieldKey,
                language,
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
