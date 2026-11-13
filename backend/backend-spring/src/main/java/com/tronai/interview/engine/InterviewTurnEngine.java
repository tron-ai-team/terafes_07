package com.tronai.interview.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.profile.AiProfile;
import com.tronai.interview.session.InterviewSession;
import com.tronai.interview.session.InterviewTurn;
import com.tronai.language.ExperienceLanguage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Interview Mode V2 turn engine: evaluate the candidate answer, decide the next action,
 * and produce a natural interviewer utterance grounded in what was said.
 *
 * Routing: cloud SMART via {@link AiGateway} by default (FAST is upgraded for interviews).
 * Does not invent candidate experience. Internal scores are never spoken.
 */
@Component
public class InterviewTurnEngine {

    private static final Logger log = LoggerFactory.getLogger(InterviewTurnEngine.class);

    public static final List<String> TOPIC_ORDER = List.of(
            "self_intro",
            "motivation",
            "project_experience",
            "technical_skills",
            "teamwork",
            "strengths_weaknesses",
            "career_goals",
            "reverse_questions"
    );

    private static final int MAX_FOLLOW_UPS_PER_TOPIC = 3;
    private static final Pattern JSON_OBJECT = Pattern.compile("\\{[\\s\\S]*}");

    private final AiGateway aiGateway;
    private final AiGatewayProperties gatewayProperties;
    private final ObjectMapper objectMapper;

    @Autowired
    public InterviewTurnEngine(
            @Autowired(required = false) AiGateway aiGateway,
            @Autowired(required = false) AiGatewayProperties gatewayProperties,
            ObjectMapper objectMapper) {
        this.aiGateway = aiGateway;
        this.gatewayProperties = gatewayProperties;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public InterviewTurnEngine() {
        this(null, null, new ObjectMapper());
    }

    /**
     * Interview Mode prefers cloud SMART. ULTRA stays ULTRA. AUTO resolves to SMART.
     * FAST/QUALITY are upgraded so cloud-only production does not hit dead local Ollama.
     */
    public static AiProfile resolveInterviewRoutingProfile(String sessionProfile) {
        AiProfile profile;
        try {
            profile = AiProfile.fromString(sessionProfile);
        } catch (RuntimeException ex) {
            profile = AiProfile.SMART;
        }
        return switch (profile) {
            case ULTRA -> AiProfile.ULTRA;
            case SMART, AUTO -> AiProfile.SMART;
            case CLOUD -> AiProfile.CLOUD;
            case FAST, QUALITY -> AiProfile.SMART;
        };
    }

    public InterviewTurnDecision decide(InterviewSession session, String latestAnswer) {
        ExperienceLanguage language = ExperienceLanguage.parseOrDefault(
                session.getConfig().getLanguage(), ExperienceLanguage.JA);
        boolean english = language != ExperienceLanguage.JA;

        int candidateTurns = (int) session.getTurns().stream()
                .filter(t -> "candidate".equalsIgnoreCase(t.getRole()))
                .count();
        int maxTurns = Math.max(1, session.getQuestionCount());
        boolean mustClose = candidateTurns >= maxTurns;

        String activeTopic = session.getActiveTopic();
        if (activeTopic == null || activeTopic.isBlank()) {
            activeTopic = session.getCoveredTopics().isEmpty() ? "self_intro" : session.getCoveredTopics().get(session.getCoveredTopics().size() - 1);
        }

        InterviewTurnDecision decision;
        try {
            decision = callGateway(session, latestAnswer, language, activeTopic, mustClose);
        } catch (Exception ex) {
            log.warn("Interview V2 AI turn failed; using transparent safe fallback: {}", ex.getMessage());
            decision = transparentFallback(session, latestAnswer, language, activeTopic, mustClose, ex.getMessage());
        }

        if (decision == null) {
            decision = transparentFallback(session, latestAnswer, language, activeTopic, mustClose, "empty AI response");
        }

        normalizeDecision(session, decision, latestAnswer, language, activeTopic, mustClose);
        applySessionMemory(session, decision);
        return decision;
    }

    private InterviewTurnDecision callGateway(
            InterviewSession session,
            String latestAnswer,
            ExperienceLanguage language,
            String activeTopic,
            boolean mustClose) {
        if (aiGateway == null) {
            throw new IllegalStateException("AiGateway is not configured");
        }
        if (gatewayProperties != null && !gatewayProperties.isInterviewCloudEnabled()) {
            throw new IllegalStateException("Interview cloud AI is disabled (TRON_AI_INTERVIEW_CLOUD_ENABLED=false)");
        }

        AiProfile routing = resolveInterviewRoutingProfile(session.getAiProfile());
        AiMode mode = routing == AiProfile.ULTRA ? AiMode.ULTRA : AiMode.SMART;

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content(buildSystemPrompt(session, language, mustClose)).build());
        messages.add(ChatMessage.builder().role("user").content(buildUserPrompt(session, latestAnswer, activeTopic, mustClose, language)).build());

        AiRequestContext context = AiRequestContext.builder()
                .feature(AiFeature.INTERVIEW)
                .mode(mode)
                .userId(com.tronai.auth.SecurityUtils.getCurrentUser().map(u -> u.getId()).orElse(null))
                .messages(messages)
                .temperature(0.35)
                .maxTokens(700)
                .jsonMode(true)
                .allowCloud(true)
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        AiGenerationResult result = aiGateway.generate(context);
        InterviewTurnDecision decision = parseDecision(result.getText());
        if (decision == null) {
            throw new IllegalStateException("Interview AI returned invalid JSON");
        }
        decision.setUsedAi(true);
        decision.setAiUnavailable(false);
        if (result.getProvider() != null) {
            decision.setProvider(result.getProvider().name());
        }
        decision.setModelId(result.getModelId());
        return decision;
    }

    private String buildSystemPrompt(InterviewSession session, ExperienceLanguage language, boolean mustClose) {
        String company = companyName(session);
        String role = roleName(session);
        String difficulty = session.getConfig().getDifficulty() != null ? session.getConfig().getDifficulty() : "intermediate";
        String type = session.getConfig().getType() != null ? session.getConfig().getType() : "technical";

        if (language == ExperienceLanguage.JA) {
            return """
                    あなたは日本のIT企業の採用面接官です。候補者の発話だけを根拠に、自然な面接対話を続けてください。
                    チューターやチャットボットのように教え込まないでください。過度な称賛や過度な批判もしないでください。
                    候補者が話していない経歴・数値・資格を創作しないでください。
                    短い回答でも、内容が正しければ批判せず、必要なら具体の深掘りをしてください。
                    客観的に誤った技術内容だけを INCORRECT とし、主観的な志望動機などは誤り扱いしないでください。
                    音声認識が不確かそうなら UNCLEAR_STT とし、聞き返してください。
                    スコアや評価点を口に出さないでください。
                    必ず次のJSONのみを返してください:
                    {
                      "answerQuality": "STRONG|ADEQUATE|VAGUE|INCORRECT|IRRELEVANT|UNCLEAR_STT",
                      "nextAction": "FOLLOW_UP|NEXT_TOPIC|CLARIFY|REDIRECT|CLOSE",
                      "spokenReply": "候補者の内容に触れた自然な面接官の発話（スコアは言わない）",
                      "nextQuestion": "次に聞く質問。CLOSEのときは空文字可",
                      "currentTopic": "self_intro|motivation|project_experience|technical_skills|teamwork|strengths_weaknesses|career_goals|reverse_questions",
                      "coverage": ["既に十分聞けたトピックID"],
                      "internalScores": {"relevance":0-100,"clarity":0-100,"specificity":0-100,"technicalAccuracy":0-100,"consistency":0-100},
                      "assessmentNotes": "内部メモ（候補者には見せない）"
                    }
                    会社: %s / 職種: %s / 難易度: %s / 面接タイプ: %s
                    %s
                    """.formatted(company, role, difficulty, type,
                    mustClose ? "今回が最終ターンです。nextActionはCLOSEにし、礼を述べて終了してください。" : "同一トピックの深掘りを優先し、十分ならNEXT_TOPICへ。無関係ならREDIRECT。曖昧ならCLARIFY。");
        }

        return """
                You are a professional IT company interviewer. Continue a natural interview using only what the candidate said.
                Do not teach like a chatbot. Do not invent experience, metrics, or credentials.
                Short answers that are correct must not be criticized; ask a grounded follow-up if useful.
                Mark objectively wrong technical claims as INCORRECT; do not treat subjective motivation as incorrect.
                If speech recognition seems uncertain, use UNCLEAR_STT and clarify.
                Never speak scores. Return JSON only:
                {
                  "answerQuality": "STRONG|ADEQUATE|VAGUE|INCORRECT|IRRELEVANT|UNCLEAR_STT",
                  "nextAction": "FOLLOW_UP|NEXT_TOPIC|CLARIFY|REDIRECT|CLOSE",
                  "spokenReply": "Natural interviewer reply that references the candidate (no scores)",
                  "nextQuestion": "Next question; empty allowed for CLOSE",
                  "currentTopic": "self_intro|motivation|project_experience|technical_skills|teamwork|strengths_weaknesses|career_goals|reverse_questions",
                  "coverage": ["topic ids already sufficiently covered"],
                  "internalScores": {"relevance":0-100,"clarity":0-100,"specificity":0-100,"technicalAccuracy":0-100,"consistency":0-100},
                  "assessmentNotes": "internal only"
                }
                Company: %s / Role: %s / Difficulty: %s / Type: %s
                %s
                """.formatted(company, role, difficulty, type,
                mustClose ? "This is the final turn. Set nextAction=CLOSE and thank the candidate." : "Prefer grounded FOLLOW_UP before switching topics. Use REDIRECT for irrelevant answers and CLARIFY for vague ones.");
    }

    private String buildUserPrompt(
            InterviewSession session,
            String latestAnswer,
            String activeTopic,
            boolean mustClose,
            ExperienceLanguage language) {
        StringBuilder sb = new StringBuilder();
        sb.append("Active topic: ").append(activeTopic).append('\n');
        sb.append("Follow-ups on active topic: ").append(session.getFollowUpsOnActiveTopic()).append('/')
                .append(MAX_FOLLOW_UPS_PER_TOPIC).append('\n');
        sb.append("Coverage so far: ").append(session.getTopicCoverage()).append('\n');
        sb.append("Candidate answers so far: ").append(
                session.getTurns().stream().filter(t -> "candidate".equalsIgnoreCase(t.getRole())).count()
        ).append('/').append(session.getQuestionCount()).append('\n');
        sb.append("Must close now: ").append(mustClose).append('\n');
        sb.append("Previously asked questions:\n");
        for (String q : session.getAskedQuestions()) {
            sb.append("- ").append(q).append('\n');
        }
        sb.append("Dialogue:\n");
        List<InterviewTurn> turns = session.getTurns();
        int start = Math.max(0, turns.size() - 12);
        for (int i = start; i < turns.size(); i++) {
            InterviewTurn turn = turns.get(i);
            String who = "candidate".equalsIgnoreCase(turn.getRole()) ? "Candidate" : "Interviewer";
            sb.append(who).append(": ").append(turn.getContent()).append('\n');
        }
        sb.append("Latest candidate answer: ").append(latestAnswer).append('\n');
        if (language == ExperienceLanguage.JA) {
            sb.append("Respond with Japanese spokenReply/nextQuestion.\n");
        } else {
            sb.append("Respond with English spokenReply/nextQuestion in ")
                    .append(language.englishName()).append(".\n");
        }
        return sb.toString();
    }

    private InterviewTurnDecision parseDecision(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String clean = raw.trim();
        if (clean.startsWith("```")) {
            int firstNewline = clean.indexOf('\n');
            int lastTicks = clean.lastIndexOf("```");
            if (firstNewline >= 0 && lastTicks > firstNewline) {
                clean = clean.substring(firstNewline + 1, lastTicks).trim();
            }
        }
        Matcher matcher = JSON_OBJECT.matcher(clean);
        if (matcher.find()) {
            clean = matcher.group();
        }
        try {
            JsonNode root = objectMapper.readTree(clean);
            InterviewTurnDecision decision = new InterviewTurnDecision();
            decision.setAnswerQuality(InterviewAnswerQuality.fromString(text(root, "answerQuality")));
            decision.setNextAction(InterviewTurnAction.fromString(text(root, "nextAction")));
            decision.setSpokenReply(text(root, "spokenReply"));
            decision.setNextQuestion(text(root, "nextQuestion"));
            decision.setCurrentTopic(normalizeTopic(text(root, "currentTopic")));
            decision.setAssessmentNotes(text(root, "assessmentNotes"));

            List<String> coverage = new ArrayList<>();
            if (root.has("coverage") && root.get("coverage").isArray()) {
                for (JsonNode n : root.get("coverage")) {
                    String topic = normalizeTopic(n.asText());
                    if (!topic.isBlank()) {
                        coverage.add(topic);
                    }
                }
            }
            decision.setCoverage(coverage);

            Map<String, Integer> scores = new LinkedHashMap<>();
            JsonNode scoreNode = root.get("internalScores");
            if (scoreNode != null && scoreNode.isObject()) {
                scoreNode.fields().forEachRemaining(entry ->
                        scores.put(entry.getKey(), clamp(entry.getValue().asInt(0))));
            }
            decision.setInternalScores(scores);
            return decision;
        } catch (Exception ex) {
            log.info("Failed to parse interview turn JSON: {}", ex.getMessage());
            return null;
        }
    }

    private void normalizeDecision(
            InterviewSession session,
            InterviewTurnDecision decision,
            String latestAnswer,
            ExperienceLanguage language,
            String activeTopic,
            boolean mustClose) {
        boolean english = language != ExperienceLanguage.JA;

        if (decision.getCurrentTopic() == null || decision.getCurrentTopic().isBlank()) {
            decision.setCurrentTopic(activeTopic);
        }
        decision.setCurrentTopic(normalizeTopic(decision.getCurrentTopic()));

        if (mustClose) {
            decision.setNextAction(InterviewTurnAction.CLOSE);
        }

        // Cap follow-ups per topic to avoid infinite depth on one theme.
        if (decision.getNextAction() == InterviewTurnAction.FOLLOW_UP
                && decision.getCurrentTopic().equals(activeTopic)
                && session.getFollowUpsOnActiveTopic() >= MAX_FOLLOW_UPS_PER_TOPIC) {
            decision.setNextAction(InterviewTurnAction.NEXT_TOPIC);
        }

        if (decision.getNextAction() == InterviewTurnAction.CLOSE) {
            if (decision.getSpokenReply() == null || decision.getSpokenReply().isBlank()) {
                decision.setSpokenReply(english
                        ? "That concludes our interview today. Thank you for your time."
                        : "面接は以上となります。本日はありがとうございました。");
            }
            decision.setNextQuestion("");
            return;
        }

        if (decision.getNextQuestion() == null || decision.getNextQuestion().isBlank()) {
            decision.setNextQuestion(defaultQuestionFor(decision.getCurrentTopic(), latestAnswer, english));
        }

        if (decision.getSpokenReply() == null) {
            decision.setSpokenReply("");
        }

        // Never invent praise/criticism templates; keep reply empty if model omitted it.
        String utterance = decision.interviewerUtterance();
        if (isRepeated(utterance, session.getAskedQuestions())) {
            decision.setNextQuestion(defaultQuestionFor(
                    pickNextTopic(session.getTopicCoverage(), decision.getCurrentTopic()),
                    latestAnswer,
                    english));
            decision.setNextAction(InterviewTurnAction.NEXT_TOPIC);
        }

        // Strip accidental score leakage from spoken fields.
        decision.setSpokenReply(stripScores(decision.getSpokenReply()));
        decision.setNextQuestion(stripScores(decision.getNextQuestion()));
    }

    private void applySessionMemory(InterviewSession session, InterviewTurnDecision decision) {
        Set<String> coverage = new LinkedHashSet<>(session.getTopicCoverage());
        coverage.addAll(decision.getCoverage());

        InterviewTurnAction action = decision.getNextAction();
        String topic = decision.getCurrentTopic();

        if (action == InterviewTurnAction.FOLLOW_UP || action == InterviewTurnAction.CLARIFY) {
            if (topic.equals(session.getActiveTopic())) {
                session.incrementFollowUpsOnActiveTopic();
            } else {
                session.setActiveTopic(topic);
                session.resetFollowUpsOnActiveTopic();
            }
        } else if (action == InterviewTurnAction.NEXT_TOPIC || action == InterviewTurnAction.REDIRECT) {
            if (session.getActiveTopic() != null && !session.getActiveTopic().isBlank()) {
                coverage.add(session.getActiveTopic());
            }
            coverage.add(topic);
            session.setActiveTopic(topic);
            session.resetFollowUpsOnActiveTopic();
        } else if (action == InterviewTurnAction.CLOSE) {
            if (topic != null && !topic.isBlank()) {
                coverage.add(topic);
            }
        }

        session.setTopicCoverage(new ArrayList<>(coverage));
        for (String covered : coverage) {
            session.recordAskedQuestion(null, covered);
        }

        String utterance = decision.interviewerUtterance();
        if (action != InterviewTurnAction.CLOSE) {
            session.recordAskedQuestion(decision.getNextQuestion(), topic);
        } else {
            session.recordAskedQuestion(utterance, topic);
        }

        session.addAssessment(Map.of(
                "quality", decision.getAnswerQuality().name(),
                "action", decision.getNextAction().name(),
                "topic", topic,
                "notes", decision.getAssessmentNotes(),
                "scores", decision.getInternalScores(),
                "provider", decision.getProvider() != null ? decision.getProvider() : "",
                "modelId", decision.getModelId() != null ? decision.getModelId() : "",
                "usedAi", decision.isUsedAi()
        ));
    }

    InterviewTurnDecision transparentFallback(
            InterviewSession session,
            String latestAnswer,
            ExperienceLanguage language,
            String activeTopic,
            boolean mustClose,
            String reason) {
        boolean english = language != ExperienceLanguage.JA;
        InterviewTurnDecision decision = new InterviewTurnDecision();
        decision.setUsedAi(false);
        decision.setAiUnavailable(true);
        decision.setAssessmentNotes("AI unavailable: " + (reason != null ? reason : "unknown"));
        decision.setCurrentTopic(activeTopic);
        decision.setCoverage(session.getTopicCoverage());

        if (mustClose) {
            decision.setNextAction(InterviewTurnAction.CLOSE);
            decision.setAnswerQuality(InterviewAnswerQuality.ADEQUATE);
            decision.setSpokenReply(english
                    ? "Thank you. We will end the interview here. Our AI assistant is temporarily unavailable for deeper follow-ups."
                    : "ありがとうございました。こちらで面接を終了します。ただいまAIの応答が不安定なため、これ以上の深掘りは控えさせていただきます。");
            decision.setNextQuestion("");
            return decision;
        }

        HeuristicAssessment heuristic = assessHeuristically(session, latestAnswer, activeTopic);
        decision.setAnswerQuality(heuristic.quality());
        decision.setNextAction(heuristic.action());
        decision.setCurrentTopic(heuristic.topic());
        decision.setInternalScores(heuristic.scores());

        String notice = english
                ? "Our interview AI is temporarily unavailable, so I will continue with a simpler follow-up. "
                : "ただいまAIの応答が不安定なため、簡易的な進行で続けます。";

        decision.setSpokenReply(notice + heuristic.spoken(english));
        decision.setNextQuestion(heuristic.question(english, latestAnswer));
        return decision;
    }

    private HeuristicAssessment assessHeuristically(InterviewSession session, String answer, String activeTopic) {
        String text = answer == null ? "" : answer.trim();
        String lower = text.toLowerCase(Locale.ROOT);
        Map<String, Integer> scores = baseScores(55);

        List<String> asked = session.getAskedQuestions();
        final String lastQuestion = asked.isEmpty() ? "" : asked.get(asked.size() - 1);

        boolean looksUnclear = text.length() <= 2
                || lower.matches("(?i)^(um+|uh+|ahh+|えー+|あの+|えっと+)$");
        boolean likelyIrrelevant = !text.isBlank()
                && !containsAny(lower, "java", "spring", "api", "db", "sql", "チーム", "開発", "経験", "勉強", "project", "learn", "team")
                && containsAny(lower, "天気", "lunch", "天気", "ご飯", "game", "anime", "天気");

        // Known incorrect-ish technical claim (narrow, objective).
        boolean incorrect = containsAny(lower, "html is a programming language", "htmlはプログラミング言語")
                || (containsAny(lower, "primary key") && containsAny(lower, "duplicate", "重複してよい", "重複して良い"));

        if (looksUnclear) {
            scores.put("clarity", 35);
            return new HeuristicAssessment(
                    InterviewAnswerQuality.UNCLEAR_STT,
                    InterviewTurnAction.CLARIFY,
                    activeTopic,
                    scores,
                    english -> english
                            ? "I may have missed that."
                            : "うまく聞き取れなかったかもしれません。",
                    (english, ans) -> english
                            ? "Could you repeat your answer about " + topicLabel(activeTopic, true) + "?"
                            : topicLabel(activeTopic, false) + "について、もう一度お答えいただけますか？"
            );
        }

        if (incorrect) {
            scores.put("technicalAccuracy", 25);
            scores.put("relevance", 60);
            return new HeuristicAssessment(
                    InterviewAnswerQuality.INCORRECT,
                    InterviewTurnAction.FOLLOW_UP,
                    "technical_skills",
                    scores,
                    english -> english
                            ? "Thank you. I would like to confirm one technical point."
                            : "ありがとうございます。一点、技術面を確認させてください。",
                    (english, ans) -> english
                            ? "What makes you say that, and how would you verify it in a real system?"
                            : "その判断の根拠と、実務でどう検証するかを教えてください。"
            );
        }

        if (likelyIrrelevant) {
            scores.put("relevance", 20);
            return new HeuristicAssessment(
                    InterviewAnswerQuality.IRRELEVANT,
                    InterviewTurnAction.REDIRECT,
                    activeTopic,
                    scores,
                    english -> english
                            ? "Let's bring the discussion back to your engineering experience."
                            : "それでは、ご経験の話に戻しましょう。",
                    (english, ans) -> defaultQuestionFor(activeTopic, ans, english)
            );
        }

        // Short but substantive — never auto-criticize.
        boolean shortButConcrete = text.length() < 30 && containsAny(lower,
                "java", "spring", "boot", "react", "python", "aws", "docker", "api", "sql",
                "認証", "ログイン", "ec", "開発", "学習", "勉強");
        if (shortButConcrete || mentionsPriorContext(text, session)) {
            scores.put("specificity", shortButConcrete ? 45 : 70);
            scores.put("relevance", 75);
            String topic = inferTopicFromAnswer(text, activeTopic);
            return new HeuristicAssessment(
                    shortButConcrete ? InterviewAnswerQuality.ADEQUATE : InterviewAnswerQuality.STRONG,
                    InterviewTurnAction.FOLLOW_UP,
                    topic,
                    scores,
                    english -> groundedAck(text, english),
                    (english, ans) -> groundedFollowUp(ans, lastQuestion, english)
            );
        }

        if (text.length() < 12 && !shortButConcrete) {
            scores.put("specificity", 35);
            scores.put("clarity", 45);
            return new HeuristicAssessment(
                    InterviewAnswerQuality.VAGUE,
                    InterviewTurnAction.CLARIFY,
                    activeTopic,
                    scores,
                    english -> english
                            ? "Thank you."
                            : "ありがとうございます。",
                    (english, ans) -> english
                            ? "What project or task were you referring to just now?"
                            : "今のお話は、どのプロジェクトや業務の話でしょうか？"
            );
        }

        String nextTopic = pickNextTopic(session.getTopicCoverage(), activeTopic);
        scores.put("relevance", 70);
        scores.put("clarity", 65);
        return new HeuristicAssessment(
                InterviewAnswerQuality.ADEQUATE,
                InterviewTurnAction.NEXT_TOPIC,
                nextTopic,
                scores,
                english -> groundedAck(text, english),
                (english, ans) -> defaultQuestionFor(nextTopic, ans, english)
        );
    }

    private boolean mentionsPriorContext(String answer, InterviewSession session) {
        String lower = answer.toLowerCase(Locale.ROOT);
        for (InterviewTurn turn : session.getTurns()) {
            if (!"candidate".equalsIgnoreCase(turn.getRole())) {
                continue;
            }
            for (String token : turn.getContent().split("[\\s、。,.]+")) {
                if (token.length() >= 4 && lower.contains(token.toLowerCase(Locale.ROOT))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String groundedAck(String answer, boolean english) {
        String snippet = extractAnchor(answer);
        if (snippet.isBlank()) {
            return english ? "Thank you." : "ありがとうございます。";
        }
        return english
                ? "Thank you for sharing that about " + snippet + "."
                : snippet + "について、ありがとうございます。";
    }

    private String groundedFollowUp(String answer, String lastQuestion, boolean english) {
        String anchor = extractAnchor(answer);
        if (containsAny(answer.toLowerCase(Locale.ROOT), "java") && !containsAny(answer.toLowerCase(Locale.ROOT), "spring", "project", "開発", "作")) {
            return english
                    ? "Have you built anything with Java so far?"
                    : "Javaを使って、何か開発した経験はありますか？";
        }
        if (containsAny(answer.toLowerCase(Locale.ROOT), "spring", "ec")) {
            return english
                    ? "In that system, which features were you responsible for?"
                    : "そのECサイトでは、どのような機能を担当しましたか？";
        }
        if (containsAny(answer.toLowerCase(Locale.ROOT), "login", "auth", "認証", "ログイン")) {
            return english
                    ? "When implementing authentication, what security measures did you take?"
                    : "認証機能を実装する際、どのようなセキュリティ対策を行いましたか？";
        }
        if (!anchor.isBlank()) {
            return english
                    ? "Could you walk me through how you approached " + anchor + "?"
                    : anchor + "では、具体的にどのように進めましたか？";
        }
        return english
                ? "Could you tell me a bit more about that experience?"
                : "その経験について、もう少し詳しく教えてください。";
    }

    private String extractAnchor(String answer) {
        if (answer == null || answer.isBlank()) {
            return "";
        }
        String[] tokens = answer.split("[\\s、。,.]+");
        for (String token : tokens) {
            String t = token.trim();
            if (t.length() >= 3 && !t.matches("(?i)はい|ええ|yes|yeah|あの|えーと")) {
                return t.length() > 24 ? t.substring(0, 24) : t;
            }
        }
        return "";
    }

    private String inferTopicFromAnswer(String answer, String fallback) {
        String lower = answer.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "志望", "why this", "company", "御社")) return "motivation";
        if (containsAny(lower, "team", "チーム", "レビュー")) return "teamwork";
        if (containsAny(lower, "java", "spring", "api", "db", "aws", "認証", "docker")) return "technical_skills";
        if (containsAny(lower, "project", "開発", "ec", "作")) return "project_experience";
        if (containsAny(lower, "キャリア", "将来", "years")) return "career_goals";
        return fallback != null ? fallback : "self_intro";
    }

    private String pickNextTopic(List<String> coverage, String current) {
        Set<String> covered = new LinkedHashSet<>(coverage != null ? coverage : List.of());
        if (current != null && !current.isBlank()) {
            covered.add(current);
        }
        for (String topic : TOPIC_ORDER) {
            if (!covered.contains(topic)) {
                return topic;
            }
        }
        return "reverse_questions";
    }

    private String defaultQuestionFor(String topic, String answer, boolean english) {
        String t = normalizeTopic(topic);
        if (english) {
            return switch (t) {
                case "motivation" -> "What motivated you to apply for this role and our company?";
                case "project_experience" -> "Tell me about a project you worked on and your responsibilities.";
                case "technical_skills" -> "Which technologies are you most comfortable with, and why?";
                case "teamwork" -> "How do you handle disagreements in a development team?";
                case "strengths_weaknesses" -> "What is a strength you bring, and an area you are improving?";
                case "career_goals" -> "Where do you want to grow as an engineer over the next few years?";
                case "reverse_questions" -> "Do you have any questions for us?";
                default -> "Could you briefly introduce your background?";
            };
        }
        return switch (t) {
            case "motivation" -> "この職種と弊社を志望された理由を教えてください。";
            case "project_experience" -> "これまでに関わった開発プロジェクトと、ご自身の役割を教えてください。";
            case "technical_skills" -> "得意な技術とその理由を教えてください。";
            case "teamwork" -> "チーム開発で意見が分かれたとき、どう合意形成しますか？";
            case "strengths_weaknesses" -> "ご自身の強みと、改善中の点を教えてください。";
            case "career_goals" -> "今後数年で、どのようなエンジニアを目指していますか？";
            case "reverse_questions" -> "最後に、聞いておきたいことはありますか？";
            default -> "それでは、自己紹介をお願いします。";
        };
    }

    private String topicLabel(String topic, boolean english) {
        String t = normalizeTopic(topic);
        if (english) {
            return switch (t) {
                case "motivation" -> "your motivation";
                case "project_experience" -> "your project experience";
                case "technical_skills" -> "your technical skills";
                case "teamwork" -> "teamwork";
                case "career_goals" -> "your career goals";
                default -> "your background";
            };
        }
        return switch (t) {
            case "motivation" -> "志望動機";
            case "project_experience" -> "プロジェクト経験";
            case "technical_skills" -> "技術スキル";
            case "teamwork" -> "チームワーク";
            case "career_goals" -> "キャリア目標";
            default -> "ご経歴";
        };
    }

    private static String normalizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return "self_intro";
        }
        String t = topic.trim().toLowerCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
        return switch (t) {
            case "自己紹介", "selfintro", "introduction" -> "self_intro";
            case "志望動機", "motivation" -> "motivation";
            case "プロジェクト経験", "project", "projects" -> "project_experience";
            case "技術スキル", "technical", "tech" -> "technical_skills";
            case "チームワーク", "team" -> "teamwork";
            case "強み・弱み", "strengths", "weaknesses", "strengths_weaknesses" -> "strengths_weaknesses";
            case "将来のキャリア目標", "career", "career_goals" -> "career_goals";
            case "逆質問", "reverse", "questions" -> "reverse_questions";
            case "自己pr", "自己ｐｒ" -> "strengths_weaknesses";
            default -> TOPIC_ORDER.contains(t) ? t : "self_intro";
        };
    }

    private static boolean isRepeated(String candidate, List<String> asked) {
        if (candidate == null || candidate.isBlank() || asked == null) {
            return false;
        }
        String cleaned = candidate.toLowerCase(Locale.ROOT).replaceAll("[\\s。、？?！!,.]", "");
        for (String prev : asked) {
            if (prev == null) continue;
            String p = prev.toLowerCase(Locale.ROOT).replaceAll("[\\s。、？?！!,.]", "");
            if (!p.isBlank() && (cleaned.equals(p) || cleaned.contains(p) || p.contains(cleaned))) {
                return true;
            }
        }
        return false;
    }

    private static String stripScores(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("(?i)(score|スコア|点数)\\s*[:：]?\\s*\\d+", "").trim();
    }

    private static Map<String, Integer> baseScores(int value) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        scores.put("relevance", value);
        scores.put("clarity", value);
        scores.put("specificity", value);
        scores.put("technicalAccuracy", value);
        scores.put("consistency", value);
        return scores;
    }

    private static int clamp(int score) {
        return Math.min(100, Math.max(0, score));
    }

    private static boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (needle != null && !needle.isBlank() && text.contains(needle.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static String text(JsonNode root, String field) {
        return root.has(field) ? root.get(field).asText("").trim() : "";
    }

    private static String companyName(InterviewSession session) {
        if (session.getConfig().getCompanyNameJa() != null && !session.getConfig().getCompanyNameJa().isBlank()) {
            return session.getConfig().getCompanyNameJa();
        }
        return session.getConfig().getCompanyName() != null ? session.getConfig().getCompanyName() : "";
    }

    private static String roleName(InterviewSession session) {
        if (session.getConfig().getJobPositionJa() != null && !session.getConfig().getJobPositionJa().isBlank()) {
            return session.getConfig().getJobPositionJa();
        }
        return session.getConfig().getJobPosition() != null ? session.getConfig().getJobPosition() : "エンジニア";
    }

    @FunctionalInterface
    private interface SpokenFn {
        String apply(boolean english);
    }

    @FunctionalInterface
    private interface QuestionFn {
        String apply(boolean english, String answer);
    }

    private record HeuristicAssessment(
            InterviewAnswerQuality quality,
            InterviewTurnAction action,
            String topic,
            Map<String, Integer> scores,
            SpokenFn spokenFn,
            QuestionFn questionFn
    ) {
        String spoken(boolean english) {
            return spokenFn.apply(english);
        }

        String question(boolean english, String answer) {
            return questionFn.apply(english, answer);
        }
    }
}
