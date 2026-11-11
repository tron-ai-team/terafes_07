package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.career.profile.CandidateProfileEntity;
import com.tronai.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvMagicFillServiceTest {

    @Mock AiGateway aiGateway;
    AiGatewayProperties properties;
    CvMagicFillService service;

    @BeforeEach
    void setUp() {
        properties = new AiGatewayProperties();
        properties.setCvAssistCloudEnabled(true);
        service = new CvMagicFillService(aiGateway, properties, new ObjectMapper());
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
                service.magicFill(1L, "RIREKISHO_JA", payload, profile, "en", "", true);

        assertThat(result.suggestions()).anyMatch(s ->
                "dateOfBirth".equals(s.fieldKey()) && "2002-12-02".equals(s.proposedText())
                        && "PROFILE_FACT".equals(s.category()));
        assertThat(result.suggestions()).anyMatch(s ->
                "fullName".equals(s.fieldKey()) && "Taro".equals(s.proposedText()));
        assertThat(result.ollamaUsed()).isFalse();
    }

    @Test
    void cloudSmartIsDefaultAndAllowCloudTrueOnGateway() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"大学でJavaとSpring Bootを学び、責任感を持ってチームに貢献できます。","reason":"日本語で整理","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "JavaとSpring Bootを勉強しています。");
        boolean allowCloud = service.resolveAllowCloud(Map.of());
        assertThat(allowCloud).isTrue();

        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", allowCloud);

        ArgumentCaptor<AiRequestContext> cap = ArgumentCaptor.forClass(AiRequestContext.class);
        verify(aiGateway).generate(cap.capture());
        assertThat(cap.getValue().isAllowCloud()).isTrue();
        assertThat(cap.getValue().getMode().name()).contains("SMART");
        assertThat(result.cloudUsed()).isTrue();
        assertThat(result.ollamaUsed()).isFalse();
        assertThat(result.engine()).contains("GROQ");
        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.suggestions().get(0).requiresConfirmation()).isTrue();
    }

    @Test
    void localOnlyDisablesCloud() {
        assertThat(service.resolveAllowCloud(Map.of("localOnly", true))).isFalse();
        assertThat(service.resolveAllowCloud(Map.of("allowCloud", false))).isFalse();
    }

    @Test
    void aiRewriteDoesNotAutoApplyAndRejectsInventedJlpt() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"JLPT N1を取得し、Fortune 500でリードしました。","reason":"stronger","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "JavaとSpring Bootを学習中です。");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true);

        assertThat(result.suggestions()).noneMatch(s ->
                s.proposedText() != null && s.proposedText().toLowerCase().contains("jlpt"));
    }

    @Test
    void acceptsCloudRewriteWhenNoNewFacts() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"大学でJavaとSpring Bootを学び、バックエンド開発に取り組んでいます。","reason":"clarity","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "JavaとSpring Bootを勉強しています。");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true);

        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.suggestions().get(0).category()).isEqualTo("AI_REWRITE");
        assertThat(result.suggestions().get(0).proposedText()).contains("Spring Boot");
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
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"I am a highly motivated software engineer with strong communication skills.","reason":"improved","clarificationNeeded":false}}}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "自己PRの下書きです。Javaを勉強しています。");
        assertThatThrownBy(() -> service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("wrong language");
    }

    @Test
    void malformedJsonDoesNotCorruptAndFailsSafely() {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("not-json at all")
                .build());

        Map<String, Object> payload = Map.of("selfPr", "自己PRです。");
        assertThatThrownBy(() -> service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("malformed JSON");
    }

    @Test
    void providerUnavailableSurfacesServiceUnavailable() {
        when(aiGateway.generate(any())).thenThrow(
                new GatewayProviderException(GatewayProviderException.UNAVAILABLE, 503, "down"));

        Map<String, Object> payload = Map.of("selfPr", "自己PRです。");
        assertThatThrownBy(() -> service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value()).isEqualTo(503));
    }

    @Test
    void insufficientNarrativeWarnsWithoutFabrication() {
        Map<String, Object> payload = Map.of("fullName", "Taro");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true);
        assertThat(result.suggestions()).isEmpty();
        assertThat(result.warnings()).isNotEmpty();
    }

    @Test
    void ignoresUnexpectedAiFields() throws Exception {
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{
                          "selfPr":{"proposedText":"大学でJavaを学び、着実に成長しています。","reason":"ok","clarificationNeeded":false},
                          "secretSalary":{"proposedText":"年収1000万円","reason":"hack","clarificationNeeded":false}
                        }}
                        """)
                .build());

        Map<String, Object> payload = Map.of("selfPr", "Javaを学んでいます。");
        CvMagicFillService.MagicFillResult result =
                service.magicFill(1L, "RIREKISHO_JA", payload, null, "ja", "", true);
        assertThat(result.suggestions()).hasSize(1);
        assertThat(result.suggestions().get(0).fieldKey()).isEqualTo("selfPr");
    }
}
