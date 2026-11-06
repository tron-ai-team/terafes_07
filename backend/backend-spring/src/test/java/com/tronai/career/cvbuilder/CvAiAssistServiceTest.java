package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvAiAssistServiceTest {

    @Mock
    private AiGateway aiGateway;

    @Test
    void emptyOriginalAsksClarification() {
        CvAiAssistService svc = new CvAiAssistService(aiGateway, new AiGatewayProperties(), new ObjectMapper());
        CvAiAssistService.AssistResult r = svc.improve(1L, "selfPr", "  ", "丁寧", "ja", Map.of(), null, false);
        assertThat(r.clarificationNeeded()).isTrue();
        assertThat(r.proposedText()).isEmpty();
    }

    @Test
    void gatewayUnavailableFallsBackWithoutThrowing() {
        when(aiGateway.generate(any())).thenThrow(
                new GatewayProviderException(GatewayProviderException.UNAVAILABLE, 503, "down"));
        CvAiAssistService svc = new CvAiAssistService(aiGateway, new AiGatewayProperties(), new ObjectMapper());
        CvAiAssistService.AssistResult r = svc.improve(
                1L, "selfPr", "Spring Bootを学習中です。", "丁寧", "ja", Map.of("selfPr", "x"), null, false);
        assertThat(r.proposedText()).contains("Spring Boot");
        assertThat(r.engine()).startsWith("fallback_heuristic");
    }

    @Test
    void parsesStructuredGatewayJson() {
        AiGenerationResult gen = new AiGenerationResult();
        gen.setText("{\"proposedText\":\"Improved PR\",\"reason\":\"clarity\",\"clarificationNeeded\":false}");
        gen.setProvider(GatewayProviderId.OLLAMA);
        gen.setModelId("qwen3:8b");
        when(aiGateway.generate(any())).thenReturn(gen);
        CvAiAssistService svc = new CvAiAssistService(aiGateway, new AiGatewayProperties(), new ObjectMapper());
        CvAiAssistService.AssistResult r = svc.improve(
                1L, "selfPr", "raw text", "professional", "en", Map.of(), null, false);
        assertThat(r.proposedText()).isEqualTo("Improved PR");
        assertThat(r.reason()).isEqualTo("clarity");
        assertThat(r.engine()).contains("OLLAMA");
    }
}
