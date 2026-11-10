package com.tronai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.engine.InterviewAnswerQuality;
import com.tronai.interview.engine.InterviewTurnAction;
import com.tronai.interview.engine.InterviewTurnDecision;
import com.tronai.interview.engine.InterviewTurnEngine;
import com.tronai.interview.session.InterviewSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class InterviewTurnEngineTest {

    private AiGateway aiGateway;
    private AiGatewayProperties properties;
    private InterviewTurnEngine engine;

    @BeforeEach
    void setUp() {
        aiGateway = Mockito.mock(AiGateway.class);
        properties = new AiGatewayProperties();
        properties.setInterviewCloudEnabled(true);
        engine = new InterviewTurnEngine(aiGateway, properties, new ObjectMapper());
    }

    @Test
    @DisplayName("FAST interview routing upgrades to SMART")
    void fastUpgradesToSmart() {
        assertThat(InterviewTurnEngine.resolveInterviewRoutingProfile("FAST").name()).isEqualTo("SMART");
        assertThat(InterviewTurnEngine.resolveInterviewRoutingProfile("QUALITY").name()).isEqualTo("SMART");
        assertThat(InterviewTurnEngine.resolveInterviewRoutingProfile("ULTRA").name()).isEqualTo("ULTRA");
    }

    @Test
    @DisplayName("Good Japanese answer produces grounded follow-up from AI JSON")
    void goodJapaneseAnswerFollowUp() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "ADEQUATE",
                          "nextAction": "FOLLOW_UP",
                          "spokenReply": "Javaを勉強されているのですね。",
                          "nextQuestion": "Javaを使って、何か開発した経験はありますか？",
                          "currentTopic": "technical_skills",
                          "coverage": ["self_intro"],
                          "internalScores": {"relevance":80,"clarity":70,"specificity":55,"technicalAccuracy":70,"consistency":75},
                          "assessmentNotes": "Mentions Java study"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewSession session = japaneseSession(8);
        session.recordAskedQuestion("自己紹介をお願いします。", "self_intro");
        session.addTurn("interviewer", "自己紹介をお願いします。");
        session.addTurn("candidate", "Javaを勉強しています。");

        InterviewTurnDecision decision = engine.decide(session, "Javaを勉強しています。");

        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.FOLLOW_UP);
        assertThat(decision.getAnswerQuality()).isEqualTo(InterviewAnswerQuality.ADEQUATE);
        assertThat(decision.interviewerUtterance()).contains("Java");
        assertThat(decision.interviewerUtterance()).contains("開発");
        assertThat(decision.isUsedAi()).isTrue();
        assertThat(decision.getModelId()).isEqualTo("openai/gpt-oss-120b");
        assertThat(decision.interviewerUtterance()).doesNotContain("具体的に言ってください");
    }

    @Test
    @DisplayName("Short but correct answer is not auto-criticized in heuristic fallback")
    void shortCorrectAnswerNoCriticism() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("cloud down"));

        InterviewSession session = japaneseSession(5);
        session.recordAskedQuestion("自己紹介をお願いします。", "self_intro");
        session.addTurn("interviewer", "自己紹介をお願いします。");

        InterviewTurnDecision decision = engine.decide(session, "Javaです。");

        assertThat(decision.isAiUnavailable()).isTrue();
        assertThat(decision.getAnswerQuality()).isIn(InterviewAnswerQuality.ADEQUATE, InterviewAnswerQuality.STRONG);
        assertThat(decision.getSpokenReply() + decision.getNextQuestion()).doesNotContain("批判");
        assertThat(decision.getNextAction()).isIn(InterviewTurnAction.FOLLOW_UP, InterviewTurnAction.CLARIFY, InterviewTurnAction.NEXT_TOPIC);
        assertThat(decision.interviewerUtterance().toLowerCase()).contains("java");
    }

    @Test
    @DisplayName("Incorrect technical answer triggers appropriate follow-up")
    void incorrectTechnicalAnswer() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("cloud down"));

        InterviewSession session = japaneseSession(5);
        session.setActiveTopic("technical_skills");
        session.recordAskedQuestion("HTMLについて教えてください。", "technical_skills");

        InterviewTurnDecision decision = engine.decide(session, "HTML is a programming language");

        assertThat(decision.getAnswerQuality()).isEqualTo(InterviewAnswerQuality.INCORRECT);
        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.FOLLOW_UP);
        assertThat(decision.interviewerUtterance()).containsAnyOf("技術", "確認", "根拠");
    }

    @Test
    @DisplayName("Irrelevant answer is politely redirected")
    void irrelevantRedirect() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("cloud down"));

        InterviewSession session = japaneseSession(5);
        session.setActiveTopic("project_experience");
        session.recordAskedQuestion("プロジェクト経験を教えてください。", "project_experience");

        InterviewTurnDecision decision = engine.decide(session, "今日の天気はいいですね anime game");

        assertThat(decision.getAnswerQuality()).isEqualTo(InterviewAnswerQuality.IRRELEVANT);
        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.REDIRECT);
        assertThat(decision.interviewerUtterance()).containsAnyOf("戻", "経験");
    }

    @Test
    @DisplayName("Vague answer asks a specific clarification, not generic 具体的に")
    void vagueClarification() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("cloud down"));

        InterviewSession session = japaneseSession(5);
        session.setActiveTopic("project_experience");
        session.recordAskedQuestion("プロジェクト経験を教えてください。", "project_experience");

        InterviewTurnDecision decision = engine.decide(session, "いろいろです");

        assertThat(decision.getAnswerQuality()).isEqualTo(InterviewAnswerQuality.VAGUE);
        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.CLARIFY);
        assertThat(decision.interviewerUtterance()).doesNotContain("具体的に言ってください");
        assertThat(decision.interviewerUtterance()).containsAnyOf("プロジェクト", "業務");
    }

    @Test
    @DisplayName("Multiple follow-ups preserve conversation context via gateway prompt")
    void multipleFollowUpsPreserveContext() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "STRONG",
                          "nextAction": "FOLLOW_UP",
                          "spokenReply": "認証を担当されたのですね。",
                          "nextQuestion": "認証機能を実装する際、どのようなセキュリティ対策を行いましたか？",
                          "currentTopic": "technical_skills",
                          "coverage": ["self_intro","project_experience"],
                          "internalScores": {"relevance":90,"clarity":85,"specificity":80,"technicalAccuracy":85,"consistency":88},
                          "assessmentNotes": "Auth ownership"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewSession session = japaneseSession(10);
        session.setActiveTopic("project_experience");
        session.addTurn("interviewer", "自己紹介をお願いします。");
        session.addTurn("candidate", "Javaを勉強しています。");
        session.addTurn("interviewer", "Javaを使って、何か開発した経験はありますか？");
        session.addTurn("candidate", "Spring BootでECサイトを作りました。");
        session.addTurn("interviewer", "そのECサイトでは、どのような機能を担当しましたか？");
        session.addTurn("candidate", "Login authentication.");

        InterviewTurnDecision decision = engine.decide(session, "Login authentication.");
        assertThat(decision.getNextQuestion()).contains("セキュリティ");

        ArgumentCaptor<AiRequestContext> captor = ArgumentCaptor.forClass(AiRequestContext.class);
        Mockito.verify(aiGateway).generate(captor.capture());
        String prompt = captor.getValue().getMessages().get(1).getContent();
        assertThat(prompt).contains("Spring Boot");
        assertThat(prompt).contains("Login authentication");
    }

    @Test
    @DisplayName("English interview returns English follow-up")
    void englishInterview() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "ADEQUATE",
                          "nextAction": "FOLLOW_UP",
                          "spokenReply": "Thanks for sharing your Java background.",
                          "nextQuestion": "Have you built any applications with Java?",
                          "currentTopic": "technical_skills",
                          "coverage": ["self_intro"],
                          "internalScores": {"relevance":78,"clarity":70,"specificity":60,"technicalAccuracy":70,"consistency":72},
                          "assessmentNotes": "Java study"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("english");
        config.setAiProfile("SMART");
        InterviewSession session = new InterviewSession("en-1", config, 5, "SMART", "gateway-smart");
        session.recordAskedQuestion("Please introduce yourself.", "self_intro");

        InterviewTurnDecision decision = engine.decide(session, "I have been studying Java.");
        assertThat(decision.interviewerUtterance()).containsIgnoringCase("java");
        assertThat(decision.interviewerUtterance()).doesNotContain("ですか");
    }

    @Test
    @DisplayName("Cloud AI failure is transparent and safe")
    void cloudFailureTransparent() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("No AI provider route"));

        InterviewSession session = japaneseSession(5);
        session.recordAskedQuestion("自己紹介をお願いします。", "self_intro");

        InterviewTurnDecision decision = engine.decide(session, "Spring BootでAPIを作りました。");
        assertThat(decision.isAiUnavailable()).isTrue();
        assertThat(decision.isUsedAi()).isFalse();
        assertThat(decision.interviewerUtterance()).containsAnyOf("不安定", "unavailable");
    }

    @Test
    @DisplayName("Completion closes without repetitive questions")
    void completionClosesCleanly() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "ADEQUATE",
                          "nextAction": "CLOSE",
                          "spokenReply": "本日はありがとうございました。面接は以上です。",
                          "nextQuestion": "",
                          "currentTopic": "reverse_questions",
                          "coverage": ["self_intro","motivation","project_experience"],
                          "internalScores": {"relevance":75,"clarity":70,"specificity":65,"technicalAccuracy":70,"consistency":72},
                          "assessmentNotes": "Done"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewSession session = japaneseSession(2);
        session.addTurn("candidate", "一次回答");
        session.addTurn("candidate", "最終回答");

        InterviewTurnDecision decision = engine.decide(session, "最終回答");
        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.CLOSE);
        assertThat(decision.getNextQuestion()).isBlank();
        assertThat(decision.interviewerUtterance()).contains("ありがとう");
    }

    @Test
    @DisplayName("CLOSE action spoken reply is grounded and does not invent a new follow-up question")
    void closeActionNoInventedFollowUp() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "STRONG",
                          "nextAction": "CLOSE",
                          "spokenReply": "本日は貴重なお時間をありがとうございました。",
                          "nextQuestion": "",
                          "currentTopic": "reverse_questions",
                          "coverage": ["self_intro","technical_skills"],
                          "internalScores": {"relevance":88,"clarity":85,"specificity":80,"technicalAccuracy":86,"consistency":87},
                          "assessmentNotes": "Session complete"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewSession session = japaneseSession(3);
        session.recordAskedQuestion("Javaの経験を教えてください。", "technical_skills");
        session.addTurn("candidate", "Spring Bootで認証APIを実装しました。");

        InterviewTurnDecision decision = engine.decide(session, "Spring Bootで認証APIを実装しました。");
        assertThat(decision.getNextAction()).isEqualTo(InterviewTurnAction.CLOSE);
        assertThat(decision.getNextQuestion()).isBlank();
        assertThat(decision.interviewerUtterance()).contains("ありがとう");
        assertThat(decision.interviewerUtterance()).doesNotContain("具体的に言ってください");
    }

    private static InterviewSession japaneseSession(int questionCount) {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("japanese");
        config.setCompanyName("LINEヤフー株式会社");
        config.setJobPosition("Backend Engineer");
        config.setDifficulty("intermediate");
        config.setType("technical");
        config.setAiProfile("SMART");
        return new InterviewSession("ja-test", config, questionCount, "SMART", "gateway-smart");
    }
}
