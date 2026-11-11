package com.tronai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.engine.InterviewTurnEngine;
import com.tronai.interview.generator.InterviewQuestionGenerator;
import com.tronai.interview.session.InterviewSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class InterviewQuestionGeneratorTest {

    private InterviewQuestionGenerator generator;
    private AiGateway aiGateway;

    @BeforeEach
    void setUp() {
        aiGateway = Mockito.mock(AiGateway.class);
        AiGatewayProperties properties = new AiGatewayProperties();
        properties.setInterviewCloudEnabled(true);
        InterviewTurnEngine engine = new InterviewTurnEngine(aiGateway, properties, new ObjectMapper());
        generator = new InterviewQuestionGenerator(engine);
    }

    @Test
    @DisplayName("Generates natural Japanese first question containing self-introduction request")
    void japaneseFirstQuestion() {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("LINEヤフー株式会社");
        config.setLanguage("japanese");

        String q = generator.generateFirstQuestion(config);

        assertThat(q).contains("LINEヤフー株式会社");
        assertThat(q).contains("自己紹介");
    }

    @Test
    @DisplayName("Generates natural English first question containing introduction request")
    void englishFirstQuestion() {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("Sony");
        config.setLanguage("english");

        String q = generator.generateFirstQuestion(config);

        assertThat(q).contains("Sony");
        assertThat(q).contains("introducing yourself");
    }

    @Test
    @DisplayName("Next question uses turn engine and avoids repeating Q1")
    void nextQuestionUsesTurnEngine() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("""
                        {
                          "answerQuality": "ADEQUATE",
                          "nextAction": "FOLLOW_UP",
                          "spokenReply": "ありがとうございます。",
                          "nextQuestion": "Javaを使って、どのようなシステムを開発しましたか？",
                          "currentTopic": "project_experience",
                          "coverage": ["self_intro"],
                          "internalScores": {"relevance":80,"clarity":70,"specificity":60,"technicalAccuracy":70,"consistency":70},
                          "assessmentNotes": "ok"
                        }
                        """)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("japanese");
        InterviewSession session = new InterviewSession("sess-1", config, 5, "SMART", "gateway-smart");
        session.recordAskedQuestion("1分程度で自己紹介をお願いできますか？", "self_intro");

        String nextQ = generator.generateNextQuestion(session, "私は大学でJavaとSpring Bootを学んだ山田です。");

        assertThat(nextQ).isNotEqualTo("1分程度で自己紹介をお願いできますか？");
        assertThat(nextQ).contains("Java");
    }

    @Test
    @DisplayName("Vague answer no longer uses length-only 具体的な場面 template")
    void vagueAnswerDoesNotUseLegacyTemplate() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("offline"));

        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("japanese");
        InterviewSession session = new InterviewSession("sess-2", config, 5, "SMART", "gateway-smart");
        session.setActiveTopic("project_experience");
        session.recordAskedQuestion("プロジェクト経験を教えてください。", "project_experience");

        String nextQ = generator.generateNextQuestion(session, "はい。");

        assertThat(nextQ).doesNotContain("具体的な場面を一つ教えてください");
        assertThat(nextQ).isNotEmpty();
    }

    @Test
    @DisplayName("Offline AI falls back transparently without crashing")
    void offlineLlmFallback() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenThrow(new IllegalStateException("offline"));

        InterviewConfigDto config = new InterviewConfigDto();
        config.setLanguage("japanese");
        InterviewSession session = new InterviewSession("sess-3", config, 5, "SMART", "gateway-smart");

        String nextQ = generator.generateNextQuestion(session, "バックエンドAPIのマイクロサービス開発を担当しました。");

        assertThat(nextQ).isNotEmpty();
        assertThat(nextQ).containsAnyOf("不安定", "API", "開発", "経験", "教えて");
    }
}
