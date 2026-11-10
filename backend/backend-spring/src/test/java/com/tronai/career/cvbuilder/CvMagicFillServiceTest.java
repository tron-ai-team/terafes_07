package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.career.profile.CandidateProfileEntity;
import com.tronai.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvMagicFillServiceTest {

    @Mock AiGateway aiGateway;
    CvMagicFillService service;

    @BeforeEach
    void setUp() {
        service = new CvMagicFillService(aiGateway, new ObjectMapper());
    }

    @Test
    void fillsBlankDobFromProfileWithoutAiInvention() {
        CandidateProfileEntity profile = CandidateProfileEntity.builder()
                .user(User.builder().id(1L).email("a@t").passwordHash("x").role("USER").enabled(true).build())
                .fullName("Taro")
                .dateOfBirth(LocalDate.of(2002, 12, 2))
                .selfPr("")
                .build();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("fullName", "");
        payload.put("dateOfBirth", "");
        payload.put("selfPr", "");

        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, profile, "en", "", false);

        assertThat(result.suggestions()).anyMatch(s ->
                "dateOfBirth".equals(s.fieldKey()) && "2002-12-02".equals(s.proposedText())
                        && "PROFILE_FACT".equals(s.category()));
        assertThat(result.suggestions()).anyMatch(s ->
                "fullName".equals(s.fieldKey()) && "Taro".equals(s.proposedText()));
        assertThat(result.ollamaUsed()).isFalse();
    }

    @Test
    void aiRewriteDoesNotAutoApplyAndRejectsInventedJlpt() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.OLLAMA)
                .modelId("qwen3:8b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"I hold JLPT N1 and led a Fortune 500 team.","reason":"stronger","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "I study Java and Spring Boot.");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RESUME_EN", payload, null, "en", "", false);

        assertThat(result.ollamaUsed()).isTrue();
        // Invented JLPT should be rejected → original kept / UNCHANGED filtered from apply list
        assertThat(result.suggestions()).noneMatch(s ->
                s.proposedText() != null && s.proposedText().toLowerCase().contains("jlpt n1"));
    }

    @Test
    void acceptsLocalOllamaRewriteWhenNoNewFacts() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.OLLAMA)
                .modelId("qwen3:8b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"I am studying Java and Spring Boot for backend development.","reason":"clarity","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "I study Java and Spring Boot.");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RESUME_EN", payload, null, "en", "", false);

        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.suggestions().get(0).category()).isEqualTo("AI_REWRITE");
        assertThat(result.suggestions().get(0).proposedText()).contains("Spring Boot");
        // Magic Fill returns suggestions only — never mutates draft here.
        assertThat(result.suggestions().get(0).requiresConfirmation()).isTrue();
    }

    @Test
    void japaneseTemplateIgnoresClientLanguageAndAcceptsJapaneseSelfPr() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.OLLAMA)
                .modelId("qwen3:8b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"大学でJavaとSpring Bootを学び、責任感を持ってチームに貢献できます。","reason":"日本語で整理","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "I study Java. 大学で学びました。");
        // Client sends language=en — must still produce Japanese for RIREKISHO_JA
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "en", "", false);

        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.suggestions().get(0).proposedText()).contains("学び");
        assertThat(CvDocumentLanguage.matchesRequiredLanguage(
                result.suggestions().get(0).proposedText(), "ja")).isTrue();
    }

    @Test
    void japaneseTemplateRejectsPersistentEnglishAiOutput() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.OLLAMA)
                .modelId("qwen3:8b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"I am a highly motivated software engineer with strong communication skills.","reason":"improved","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "自己PRの下書きです。Javaを勉強しています。");
        // Wrong language after retries → clear error (never silently accept English on 履歴書)
        assertThatThrownBy(() -> service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("wrong language");
    }
}
