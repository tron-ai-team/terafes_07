package com.tronai.interview;

import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.model.ModelManager;
import com.tronai.interview.dto.InterviewAnalysisResultDto;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.service.InterviewAnalysisService;
import com.tronai.interview.session.InterviewSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class InterviewAnalysisServiceTest {

    private AiGateway aiGateway;
    private InterviewAnalysisService analysisService;

    @BeforeEach
    void setUp() {
        aiGateway = Mockito.mock(AiGateway.class);
        ModelManager modelManager = Mockito.mock(ModelManager.class);
        analysisService = new InterviewAnalysisService(modelManager, null, aiGateway);
    }

    @Test
    @DisplayName("Empty candidate answers return baseline evaluation without crashing")
    void emptyCandidateAnswers() {
        InterviewConfigDto config = new InterviewConfigDto();
        InterviewSession session = new InterviewSession("sess-empty", config, 5);

        InterviewAnalysisResultDto result = analysisService.analyze(session);

        assertThat(result.getInterviewId()).isEqualTo("sess-empty");
        assertThat(result.getOverallScore()).isEqualTo(50);
        assertThat(result.getAiOverallFeedback()).contains("候補者の回答がまだないため");
    }

    @Test
    @DisplayName("Valid AI JSON output parses correctly and clamps scores to 0-100")
    void validAiAnalysisParses() {
        String json = """
                {
                  "overallScore": 88,
                  "communicationScore": 85,
                  "japaneseScore": 90,
                  "technicalScore": 92,
                  "confidenceScore": 84,
                  "radarData": [
                    {"metric": "Japanese Fluency", "metricJa": "日本語", "score": 90, "benchmark": 75},
                    {"metric": "Technical Logic", "metricJa": "論理性", "score": 92, "benchmark": 70}
                  ],
                  "strongPoints": ["論理的な説明", "Javaの深い知識"],
                  "weakPoints": ["数値の具体化"],
                  "aiOverallFeedback": "大変素晴らしい面接パフォーマンスでした。",
                  "starSuggestion": {
                    "situation": "状況S",
                    "task": "課題T",
                    "action": "行動A",
                    "result": "成果R"
                  }
                }
                """;
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text(json)
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .build());

        InterviewConfigDto config = new InterviewConfigDto();
        config.setAiProfile("SMART");
        InterviewSession session = new InterviewSession("sess-valid", config, 5, "SMART", "gateway-smart");
        session.addTurn("interviewer", "自己紹介をお願いします。");
        session.addTurn("candidate", "Javaエンジニアの山田です。API開発を行ってきました。");

        InterviewAnalysisResultDto result = analysisService.analyze(session);

        assertThat(result.getOverallScore()).isEqualTo(88);
        assertThat(result.getTechnicalScore()).isEqualTo(92);
        assertThat(result.getStrongPoints()).contains("論理的な説明");
        assertThat(result.getStarSuggestion().getSituation()).isEqualTo("状況S");
    }

    @Test
    @DisplayName("Malformed AI output falls back to deterministic analysis without throwing error")
    void malformedAiOutputFallback() {
        when(aiGateway.generate(any(AiRequestContext.class))).thenReturn(AiGenerationResult.builder()
                .text("THIS IS NOT JSON")
                .build());

        InterviewConfigDto config = new InterviewConfigDto();
        InterviewSession session = new InterviewSession("sess-bad", config, 5, "SMART", "gateway-smart");
        session.addTurn("interviewer", "自己紹介をお願いします。");
        session.addTurn("candidate", "Spring BootでRESTful APIを設計・構築し、MySQLのクエリチューニングを実施しました。");

        InterviewAnalysisResultDto result = analysisService.analyze(session);

        assertThat(result.getOverallScore()).isBetween(60, 95);
        assertThat(result.getRadarData()).isNotEmpty();
        assertThat(result.getStrongPoints()).isNotEmpty();
        assertThat(result.getWeakPoints()).isNotEmpty();
        assertThat(result.getAiOverallFeedback()).isNotEmpty();
    }

    @Test
    @DisplayName("Gateway unavailable falls back smoothly to deterministic analysis")
    void gatewayUnavailableFallback() {
        analysisService = new InterviewAnalysisService(Mockito.mock(ModelManager.class), null, null);

        InterviewConfigDto config = new InterviewConfigDto();
        InterviewSession session = new InterviewSession("sess-unavail", config, 5);
        session.addTurn("interviewer", "質問1");
        session.addTurn("candidate", "回答1です。十分に詳細な回答です。");

        InterviewAnalysisResultDto result = analysisService.analyze(session);

        assertThat(result.getOverallScore()).isGreaterThan(0);
        assertThat(result.getRadarData()).hasSize(5);
    }
}
