package com.tronai.interview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.interview.dto.CategoryAssessmentDto;
import com.tronai.interview.dto.InterviewAnalysisResultDto;
import com.tronai.interview.dto.RadarDataDto;
import com.tronai.interview.dto.StarSuggestionDto;
import com.tronai.interview.session.InterviewSession;
import com.tronai.interview.session.InterviewTurn;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Generates comprehensive interview performance analysis using ModelManager and AiProfileService with deterministic fallbacks.
 * Preserves the session's locked AI Profile (FAST vs QUALITY).
 */
@Service
public class InterviewAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(InterviewAnalysisService.class);

    private final ModelManager modelManager;
    private final AiProfileService aiProfileService;
    private final AiGateway aiGateway;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd")
            .withZone(ZoneId.systemDefault());

    @Autowired
    public InterviewAnalysisService(
            ModelManager modelManager,
            @Autowired(required = false) AiProfileService aiProfileService,
            @Autowired(required = false) AiGateway aiGateway) {
        this.modelManager = modelManager;
        this.aiProfileService = aiProfileService;
        this.aiGateway = aiGateway;
    }

    public InterviewAnalysisService(ModelManager modelManager) {
        this(modelManager, null, null);
    }

    public InterviewAnalysisService() {
        this(null, null, null);
    }

    public InterviewAnalysisResultDto analyze(InterviewSession session) {
        com.tronai.language.ExperienceLanguage selected = com.tronai.language.ExperienceLanguage.parseOrDefault(
                session.getConfig().getLanguage(), com.tronai.language.ExperienceLanguage.JA);
        boolean isEnglish = selected != com.tronai.language.ExperienceLanguage.JA;
        String company = session.getConfig().getCompanyNameJa() != null && !session.getConfig().getCompanyNameJa().isBlank()
                ? session.getConfig().getCompanyNameJa()
                : (session.getConfig().getCompanyName() != null ? session.getConfig().getCompanyName() : "LINEヤフー株式会社");
        String role = session.getConfig().getJobPositionJa() != null && !session.getConfig().getJobPositionJa().isBlank()
                ? session.getConfig().getJobPositionJa()
                : (session.getConfig().getJobPosition() != null ? session.getConfig().getJobPosition() : "Software Engineer");

        long minutes = Math.max(1, Duration.between(session.getStartedAt(), Instant.now()).toMinutes());
        String completionDate = DATE_FORMATTER.format(Instant.now());

        InterviewAnalysisResultDto result = new InterviewAnalysisResultDto();
        result.setInterviewId(session.getInterviewId());
        result.setCompanyName(company);
        result.setJobPosition(role);
        result.setInterviewType(session.getConfig().getType() != null ? session.getConfig().getType() : "technical");
        result.setDifficulty(session.getConfig().getDifficulty() != null ? session.getConfig().getDifficulty() : "intermediate");
        result.setDurationMinutes((int) minutes);
        result.setCompletionDate(completionDate);
        result.setTranscript(session.getTranscript());

        // Count candidate turns
        List<InterviewTurn> turns = session.getTurns();
        long candidateTurnCount = turns.stream().filter(t -> "candidate".equalsIgnoreCase(t.getRole())).count();

        if (candidateTurnCount == 0) {
            populateEmptyCandidateAnalysis(session, result, isEnglish);
            return result;
        }

        // Try AI analysis via cloud gateway (Interview V2)
        try {
            if (performAiAnalysis(session, result, selected)) {
                if (result.getAiOverallFeedback() == null || result.getAiOverallFeedback().isBlank()
                        || result.getStrongPoints() == null || result.getStrongPoints().isEmpty()) {
                    populateDeterministicAnalysis(session, result, isEnglish);
                }
                return result;
            }
        } catch (Exception e) {
            log.info("AI interview analysis fell back to deterministic scoring: {}", e.getMessage());
        }

        // Deterministic fallback scoring based on answers
        populateDeterministicAnalysis(session, result, isEnglish);
        ensureCategoryAssessments(session, result, isEnglish);
        return result;
    }

    private boolean performAiAnalysis(InterviewSession session, InterviewAnalysisResultDto result,
                                      com.tronai.language.ExperienceLanguage language) {
        if (aiGateway == null) {
            return false;
        }

        StringBuilder dialogue = new StringBuilder();
        for (InterviewTurn turn : session.getTurns()) {
            dialogue.append("candidate".equalsIgnoreCase(turn.getRole()) ? "候補者: " : "面接官: ")
                    .append(turn.getContent()).append("\n");
        }

        String assessmentsBlock = formatAssessmentsForPrompt(session.getAssessments());

        String prompt = """
                あなたは採用面接の専門評価者です。以下の面接対話ログと各ターン評価メモだけを根拠にして、JSON形式で評価を返してください。
                発話にない架空の経歴や資格は言及しないでください。根拠のない項目は "not_assessed" とし、score は null にしてください。
                必ず以下のJSON構造のみを返してください。
                {
                  "overallScore": 85,
                  "communicationScore": 82,
                  "japaneseScore": 88,
                  "technicalScore": 86,
                  "confidenceScore": 84,
                  "radarData": [
                    {"metric": "Japanese Fluency", "metricJa": "日本語", "score": 88, "benchmark": 75},
                    {"metric": "Technical Logic", "metricJa": "論理性", "score": 86, "benchmark": 70},
                    {"metric": "Problem Solving", "metricJa": "課題解決", "score": 84, "benchmark": 70},
                    {"metric": "STAR Structure", "metricJa": "回答構成", "score": 80, "benchmark": 65},
                    {"metric": "Company Fit", "metricJa": "適性", "score": 85, "benchmark": 70}
                  ],
                  "categoryAssessments": [
                    {"category": "Answer Relevance", "categoryJa": "回答の関連性", "level": "adequate", "score": 78, "evidence": "対話ログから引用した根拠"},
                    {"category": "Communication Clarity", "categoryJa": "伝達の明確さ", "level": "not_assessed", "score": null, "evidence": "根拠不足"}
                  ],
                  "strongPoints": ["良かった点1", "良かった点2"],
                  "weakPoints": ["改善点1", "改善点2"],
                  "aiOverallFeedback": "面接全体の総評と今後のアドバイス",
                  "starSuggestion": {
                    "situation": "状況のまとめ",
                    "task": "課題のまとめ",
                    "action": "とった行動のまとめ",
                    "result": "成果のまとめ"
                  }
                }
                categoryAssessments には必ず次の7カテゴリを含めてください（根拠不足時は level=not_assessed, score=null）:
                Answer Relevance / 回答の関連性,
                Communication Clarity / 伝達の明確さ,
                Technical Understanding / 技術理解,
                Problem Solving / 課題解決,
                Specificity / 具体性,
                Consistency / 一貫性,
                Role Readiness / 職務適性
                --- 各ターン評価メモ (per-turn assessments) ---
                """ + assessmentsBlock + """
                --- 面接対話ログ ---
                """ + dialogue;

        String system = language == com.tronai.language.ExperienceLanguage.JA
                ? "あなたは厳格かつ建設的な面接評価AIです。JSONのみを返します。"
                : "You are a strict interview evaluator. Return JSON only. Write strongPoints, weakPoints, aiOverallFeedback, and STAR prose in "
                + language.englishName() + ". Do not translate company names, skill names, code, or the candidate's quoted words.";
        List<ChatMessage> messages = List.of(
                ChatMessage.builder().role("system").content(system).build(),
                ChatMessage.builder().role("user").content(prompt).build()
        );

        // Interview V2: prefer cloud SMART/ULTRA via gateway; do not silently use dead local FAST.
        ChatGenerationResult response;
        AiProfile logical = com.tronai.interview.engine.InterviewTurnEngine
                .resolveInterviewRoutingProfile(session.getAiProfile());
        if (aiGateway == null) {
            return false;
        }
        response = aiGateway.generate(AiRequestContext.builder()
                .feature(AiFeature.INTERVIEW_FEEDBACK)
                .mode(logical == AiProfile.ULTRA ? AiMode.ULTRA : AiMode.SMART)
                .userId(com.tronai.auth.SecurityUtils.getCurrentUser().map(u -> u.getId()).orElse(null))
                .messages(messages)
                .temperature(0.2)
                .maxTokens(800)
                .jsonMode(true)
                .allowCloud(true)
                .idempotencyKey(UUID.randomUUID().toString())
                .build()).toChatGenerationResult();
        if (response == null || response.getText() == null || response.getText().isBlank()) {
            return false;
        }

        boolean parsed = parseAnalysisJson(response.getText(), result);
        ensureCategoryAssessments(session, result, language != com.tronai.language.ExperienceLanguage.JA);
        return parsed;
    }

    private String formatAssessmentsForPrompt(List<Map<String, Object>> assessments) {
        if (assessments == null || assessments.isEmpty()) {
            return "(なし / none)\n";
        }
        StringBuilder sb = new StringBuilder();
        int i = 1;
        for (Map<String, Object> a : assessments) {
            sb.append(i++).append(". quality=").append(a.getOrDefault("quality", ""))
                    .append(" action=").append(a.getOrDefault("action", ""))
                    .append(" topic=").append(a.getOrDefault("topic", ""))
                    .append(" notes=").append(a.getOrDefault("notes", ""))
                    .append(" scores=").append(a.getOrDefault("scores", Map.of()))
                    .append("\n");
        }
        return sb.toString();
    }

    private static AiMode toMode(AiProfile profile) {
        return switch (profile) {
            case FAST -> AiMode.FAST;
            case QUALITY -> AiMode.QUALITY;
            case SMART -> AiMode.SMART;
            case CLOUD -> AiMode.CLOUD;
            case ULTRA -> AiMode.ULTRA;
            case AUTO -> AiMode.AUTO;
        };
    }

    private static AiProfile safeProfile(String value) {
        try {
            return AiProfile.fromString(value);
        } catch (RuntimeException ex) {
            return AiProfile.FAST;
        }
    }

    private boolean parseAnalysisJson(String raw, InterviewAnalysisResultDto result) {
        String clean = raw.trim();
        if (clean.startsWith("```")) {
            int firstNewline = clean.indexOf('\n');
            int lastBackticks = clean.lastIndexOf("```");
            if (firstNewline >= 0 && lastBackticks > firstNewline) {
                clean = clean.substring(firstNewline + 1, lastBackticks).trim();
            }
        }
        int start = clean.indexOf('{');
        int end = clean.lastIndexOf('}');
        if (start >= 0 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        try {
            JsonNode root = objectMapper.readTree(clean);

            result.setOverallScore(clampScore(root.path("overallScore").asInt(80)));
            result.setCommunicationScore(clampScore(root.path("communicationScore").asInt(78)));
            result.setJapaneseScore(clampScore(root.path("japaneseScore").asInt(82)));
            result.setTechnicalScore(clampScore(root.path("technicalScore").asInt(80)));
            result.setConfidenceScore(clampScore(root.path("confidenceScore").asInt(78)));

            if (root.has("radarData") && root.get("radarData").isArray()) {
                List<RadarDataDto> radarList = new ArrayList<>();
                for (JsonNode node : root.get("radarData")) {
                    radarList.add(new RadarDataDto(
                            node.path("metric").asText("Performance"),
                            node.path("metricJa").asText("能力"),
                            clampScore(node.path("score").asInt(80)),
                            clampScore(node.path("benchmark").asInt(70))
                    ));
                }
                if (!radarList.isEmpty()) {
                    result.setRadarData(radarList);
                }
            }

            if (root.has("strongPoints") && root.get("strongPoints").isArray()) {
                List<String> strong = new ArrayList<>();
                for (JsonNode n : root.get("strongPoints")) {
                    if (!n.asText().isBlank()) strong.add(n.asText().trim());
                }
                if (!strong.isEmpty()) result.setStrongPoints(strong);
            }

            if (root.has("weakPoints") && root.get("weakPoints").isArray()) {
                List<String> weak = new ArrayList<>();
                for (JsonNode n : root.get("weakPoints")) {
                    if (!n.asText().isBlank()) weak.add(n.asText().trim());
                }
                if (!weak.isEmpty()) result.setWeakPoints(weak);
            }

            if (root.has("aiOverallFeedback") && !root.get("aiOverallFeedback").asText().isBlank()) {
                result.setAiOverallFeedback(root.get("aiOverallFeedback").asText().trim());
            }

            if (root.has("starSuggestion") && root.get("starSuggestion").isObject()) {
                JsonNode star = root.get("starSuggestion");
                result.setStarSuggestion(new StarSuggestionDto(
                        star.path("situation").asText(""),
                        star.path("task").asText(""),
                        star.path("action").asText(""),
                        star.path("result").asText("")
                ));
            }

            if (root.has("categoryAssessments") && root.get("categoryAssessments").isArray()) {
                List<CategoryAssessmentDto> categories = new ArrayList<>();
                for (JsonNode node : root.get("categoryAssessments")) {
                    String level = node.path("level").asText("not_assessed");
                    Integer score = node.has("score") && !node.get("score").isNull()
                            ? clampScore(node.path("score").asInt(-1))
                            : null;
                    if ("not_assessed".equalsIgnoreCase(level)) {
                        score = null;
                    }
                    categories.add(new CategoryAssessmentDto(
                            node.path("category").asText("Category"),
                            node.path("categoryJa").asText("カテゴリ"),
                            level,
                            score,
                            node.path("evidence").asText("")
                    ));
                }
                if (!categories.isEmpty()) {
                    result.setCategoryAssessments(categories);
                }
            }
            return true;
        } catch (Exception e) {
            log.warn("Failed to parse AI analysis JSON: {}", e.getMessage());
            return false;
        }
    }

    private void populateDeterministicAnalysis(InterviewSession session, InterviewAnalysisResultDto result, boolean isEnglish) {
        List<InterviewTurn> turns = session.getTurns();
        int totalChars = 0;
        int candidateTurns = 0;
        for (InterviewTurn turn : turns) {
            if ("candidate".equalsIgnoreCase(turn.getRole())) {
                totalChars += turn.getContent().length();
                candidateTurns++;
            }
        }
        int avgLength = candidateTurns > 0 ? totalChars / candidateTurns : 0;

        // Base scores calculation
        int baseScore = Math.min(92, Math.max(65, 70 + (avgLength / 10)));
        int commScore = Math.min(90, Math.max(60, baseScore - 2));
        int techScore = Math.min(95, Math.max(65, baseScore + 3));
        int langScore = Math.min(92, Math.max(65, baseScore + 1));
        int confScore = Math.min(88, Math.max(60, baseScore - 4));

        result.setOverallScore(baseScore);
        result.setCommunicationScore(commScore);
        result.setJapaneseScore(langScore);
        result.setTechnicalScore(techScore);
        result.setConfidenceScore(confScore);

        List<RadarDataDto> radar = new ArrayList<>();
        radar.add(new RadarDataDto("Japanese Fluency", "日本語", langScore, 75));
        radar.add(new RadarDataDto("Technical Logic", "論理性", techScore, 70));
        radar.add(new RadarDataDto("Problem Solving", "課題解決", baseScore, 70));
        radar.add(new RadarDataDto("STAR Structure", "回答構成", commScore, 65));
        radar.add(new RadarDataDto("Company Fit", "適性", baseScore - 1, 70));
        result.setRadarData(radar);

        if (isEnglish) {
            result.setStrongPoints(List.of(
                    "Clear, concise communication aligned with the technical requirements.",
                    "Demonstrated good awareness of modern architecture and engineering practices."
            ));
            result.setWeakPoints(List.of(
                    "Include more concrete numerical metrics and quantifiable results when describing achievements.",
                    "Structure technical problem-solving narratives more explicitly using the STAR method."
            ));
            result.setAiOverallFeedback("Overall, you presented your technical background well. " +
                    "To further strengthen your interview performance, focus on detailing your specific personal contributions in team settings " +
                    "and quantify the impact of your engineering solutions.");
            result.setStarSuggestion(new StarSuggestionDto(
                    "A complex backend service encountered high latency under peak traffic.",
                    "Required optimizing DB queries and redesigning caching layers.",
                    "Implemented Redis caching and optimized Spring Data JPA queries.",
                    "Reduced p99 response times by 40% and improved throughput significantly."
            ));
        } else {
            result.setStrongPoints(List.of(
                    "面接の質問意図を的確に捉え、礼儀正しい丁寧な回答ができています。",
                    "これまでの開発経験や学習意欲について、論理的かつ前向きに表現されています。"
            ));
            result.setWeakPoints(List.of(
                    "実績や成果について、数値や定量的指標を交えるとより説得力が増します。",
                    "困難に直面した際の意思決定プロセスや自身の工夫をSTAR構成でより明確に伝えると効果的です。"
            ));
            result.setAiOverallFeedback("全体を通して落ち着いて的確な受け答えができており、好印象な面接でした。" +
                    "特に技術的な基礎力と学ぶ姿勢が伝わってきます。今後は成果の数値化と、チーム開発における自身の具体的な役割を深掘りして話せるように練習を重ねましょう。");
            result.setStarSuggestion(new StarSuggestionDto(
                    "ピーク時のAPIレイテンシが増加し、データベースへの負荷が高まる課題に直面した状況。",
                    "レスポンス速度を改善し、スループットを維持する要件。",
                    "クエリの最適化と適切なキャッシュ戦略を自ら設計・実装した取り組み。",
                    "レスポンスタイムの40%削減を達成し、安定したシステム稼働を実現した成果。"
            ));
        }
    }

    private void ensureCategoryAssessments(InterviewSession session, InterviewAnalysisResultDto result, boolean isEnglish) {
        if (result.getCategoryAssessments() != null && result.getCategoryAssessments().size() >= 7) {
            return;
        }
        List<CategoryAssessmentDto> categories = buildCategoryAssessmentsFromTurns(session, isEnglish);
        if (!categories.isEmpty()) {
            result.setCategoryAssessments(categories);
        }
    }

    private List<CategoryAssessmentDto> buildCategoryAssessmentsFromTurns(InterviewSession session, boolean isEnglish) {
        List<Map<String, Object>> assessments = session.getAssessments();
        Map<String, List<Integer>> scoreBuckets = new LinkedHashMap<>();
        for (String key : List.of(
                "relevance", "clarity", "technicalAccuracy", "specificity", "consistency")) {
            scoreBuckets.put(key, new ArrayList<>());
        }

        int candidateTurns = 0;
        for (InterviewTurn turn : session.getTurns()) {
            if ("candidate".equalsIgnoreCase(turn.getRole())) {
                candidateTurns++;
            }
        }

        if (assessments != null) {
            for (Map<String, Object> a : assessments) {
                Object scoresObj = a.get("scores");
                if (scoresObj instanceof Map<?, ?> scores) {
                    accumulateScore(scoreBuckets.get("relevance"), scores.get("relevance"));
                    accumulateScore(scoreBuckets.get("clarity"), scores.get("clarity"));
                    accumulateScore(scoreBuckets.get("technicalAccuracy"), scores.get("technicalAccuracy"));
                    accumulateScore(scoreBuckets.get("specificity"), scores.get("specificity"));
                    accumulateScore(scoreBuckets.get("consistency"), scores.get("consistency"));
                }
            }
        }

        List<CategoryAssessmentDto> out = new ArrayList<>();
        out.add(categoryFromAggregate("Answer Relevance", "回答の関連性", scoreBuckets.get("relevance"), candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Communication Clarity", "伝達の明確さ", scoreBuckets.get("clarity"), candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Technical Understanding", "技術理解", scoreBuckets.get("technicalAccuracy"), candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Problem Solving", "課題解決",
                mergeLists(scoreBuckets.get("technicalAccuracy"), scoreBuckets.get("relevance")),
                candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Specificity", "具体性", scoreBuckets.get("specificity"), candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Consistency", "一貫性", scoreBuckets.get("consistency"), candidateTurns, isEnglish));
        out.add(categoryFromAggregate("Role Readiness", "職務適性",
                mergeLists(scoreBuckets.get("relevance"), scoreBuckets.get("clarity"), scoreBuckets.get("technicalAccuracy")),
                candidateTurns, isEnglish));
        return out;
    }

    private static void accumulateScore(List<Integer> bucket, Object raw) {
        if (bucket == null || raw == null) {
            return;
        }
        try {
            int v = Integer.parseInt(String.valueOf(raw));
            if (v >= 0) {
                bucket.add(v);
            }
        } catch (NumberFormatException ignored) {
            // skip
        }
    }

    @SafeVarargs
    private static List<Integer> mergeLists(List<Integer>... lists) {
        List<Integer> merged = new ArrayList<>();
        if (lists != null) {
            for (List<Integer> l : lists) {
                if (l != null) {
                    merged.addAll(l);
                }
            }
        }
        return merged;
    }

    private CategoryAssessmentDto categoryFromAggregate(
            String en, String ja, List<Integer> values, int candidateTurns, boolean isEnglish) {
        if (candidateTurns == 0 || values == null || values.isEmpty()) {
            String evidence = isEnglish
                    ? "Not assessed — insufficient candidate responses in transcript."
                    : "評価不可 — 対話ログに十分な候補者回答がありません。";
            return new CategoryAssessmentDto(en, ja, "not_assessed", null, evidence);
        }
        int avg = values.stream().mapToInt(Integer::intValue).sum() / values.size();
        String level = avg >= 80 ? "strong" : avg >= 65 ? "adequate" : "weak";
        String evidence = isEnglish
                ? "Aggregated from " + values.size() + " turn assessment score(s); average " + avg + "."
                : "各ターン評価スコア " + values.size() + " 件の平均 " + avg + " から集計。";
        return new CategoryAssessmentDto(en, ja, level, clampScore(avg), evidence);
    }

    private void populateEmptyCandidateAnalysis(InterviewSession session, InterviewAnalysisResultDto result, boolean isEnglish) {
        result.setOverallScore(50);
        result.setCommunicationScore(50);
        result.setJapaneseScore(50);
        result.setTechnicalScore(50);
        result.setConfidenceScore(50);

        List<RadarDataDto> radar = new ArrayList<>();
        radar.add(new RadarDataDto("Japanese Fluency", "日本語", 50, 75));
        radar.add(new RadarDataDto("Technical Logic", "論理性", 50, 70));
        radar.add(new RadarDataDto("Problem Solving", "課題解決", 50, 70));
        radar.add(new RadarDataDto("STAR Structure", "回答構成", 50, 65));
        radar.add(new RadarDataDto("Company Fit", "適性", 50, 70));
        result.setRadarData(radar);

        if (isEnglish) {
            result.setStrongPoints(List.of("Interview session initialized."));
            result.setWeakPoints(List.of("No candidate speech or answers were recorded before completing."));
            result.setAiOverallFeedback("No candidate answers were recorded. Please practice answering questions before viewing the final analysis.");
        } else {
            result.setStrongPoints(List.of("面接セッションが開始されました。"));
            result.setWeakPoints(List.of("回答発話が記録される前に終了されました。"));
            result.setAiOverallFeedback("候補者の回答がまだないため、評価できる発話がありません。回答を話してから再度終了してください。");
        }
        ensureCategoryAssessments(session, result, isEnglish);
    }

    private int clampScore(int score) {
        return Math.min(100, Math.max(0, score));
    }
}
