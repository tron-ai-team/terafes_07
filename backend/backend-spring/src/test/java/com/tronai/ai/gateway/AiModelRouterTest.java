package com.tronai.ai.gateway;

import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.provider.GatewayProvider;
import com.tronai.hybrid.HybridRoutingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiModelRouterTest {

    @Mock
    private AiProviderRegistry providerRegistry;
    @Mock
    private AiModelCatalog modelCatalog;
    @Mock
    private GatewayProvider ollamaProvider;
    @Mock
    private GatewayProvider groqProvider;
    @Mock
    private GatewayProvider geminiProvider;
    @Mock
    private HybridRoutingService hybrid;

    private AiGatewayProperties properties;
    private AiModelRouter router;

    @BeforeEach
    void setUp() {
        properties = new AiGatewayProperties();
        properties.setGroqModelFast("groq-fast");
        properties.setGroqModelSmart("groq-smart");
        properties.setGeminiModelUltra("gemini-ultra");
        router = new AiModelRouter(properties, providerRegistry, modelCatalog, null);

        lenient().when(providerRegistry.find(GatewayProviderId.OLLAMA)).thenReturn(Optional.of(ollamaProvider));
        lenient().when(providerRegistry.find(GatewayProviderId.GROQ)).thenReturn(Optional.of(groqProvider));
        lenient().when(providerRegistry.find(GatewayProviderId.GEMINI)).thenReturn(Optional.of(geminiProvider));

        lenient().when(ollamaProvider.isConfigured()).thenReturn(true);
        lenient().when(groqProvider.isConfigured()).thenReturn(true);
        lenient().when(geminiProvider.isConfigured()).thenReturn(true);

        lenient().when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.AVAILABLE);
        lenient().when(groqProvider.health()).thenReturn(ProviderHealthStatus.CONFIGURED);
        lenient().when(geminiProvider.health()).thenReturn(ProviderHealthStatus.CONFIGURED);

        lenient().when(ollamaProvider.knownModels()).thenReturn(List.of("ollama-fast", "ollama-quality"));
        lenient().when(groqProvider.knownModels()).thenReturn(List.of("groq-fast", "groq-smart"));
        lenient().when(geminiProvider.knownModels()).thenReturn(List.of("gemini-ultra"));

        lenient().when(modelCatalog.isAllowed(any(), any())).thenReturn(true);
    }

    @Test
    @DisplayName("FAST prefers Ollama when available")
    void fastPrefersOllama() {
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.FAST);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.OLLAMA);
        assertThat(route.modelId()).isEqualTo("ollama-fast");
    }

    @Test
    @DisplayName("FAST falls back to Groq when Ollama unavailable")
    void fastFallsBackToGroq() {
        when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.UNAVAILABLE);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.FAST);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-fast");
    }

    @Test
    @DisplayName("FAST skips Ollama when hybrid force-offline (no local inference)")
    void fastSkipsOllamaWhenHybridBlocksLocal() {
        when(hybrid.allowsLocalInference()).thenReturn(false);
        router = new AiModelRouter(properties, providerRegistry, modelCatalog, hybrid);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.FAST);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-fast");
    }

    @Test
    @DisplayName("SMART prefers OpenRouter when configured, else Groq smart")
    void smartPrefersOpenRouterThenGroq() {
        properties.setOpenrouterModelSmart("or-smart");
        when(providerRegistry.find(GatewayProviderId.OPENROUTER)).thenReturn(Optional.of(groqProvider));
        when(groqProvider.isConfigured()).thenReturn(true);
        when(groqProvider.health()).thenReturn(ProviderHealthStatus.CONFIGURED);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CV_REVIEW).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.SMART);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.OPENROUTER);
        assertThat(route.modelId()).isEqualTo("or-smart");
    }

    @Test
    @DisplayName("SMART falls back to Groq when OpenRouter unavailable")
    void smartFallsBackToGroq() {
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CV_REVIEW).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.SMART);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-smart");
    }

    @Test
    @DisplayName("ULTRA prefers Gemini ultra when configured")
    void ultraPrefersGemini() {
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.ULTRA);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GEMINI);
        assertThat(route.modelId()).isEqualTo("gemini-ultra");
    }

    @Test
    @DisplayName("ULTRA throws when no ultra providers are available")
    void ultraThrowsWhenMissing() {
        when(geminiProvider.isConfigured()).thenReturn(false);

        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.ULTRA))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Ultra AI mode is not available");
    }

    @Test
    @DisplayName("AUTO maps chat to FAST and CV to SMART")
    void autoModeByFeature() {
        AiRequestContext chat = AiRequestContext.builder()
                .mode(AiMode.AUTO)
                .feature(AiFeature.CHAT)
                .build();
        assertThat(router.resolveEffectiveMode(chat)).isEqualTo(AiMode.FAST);

        AiRequestContext cv = AiRequestContext.builder()
                .mode(AiMode.AUTO)
                .feature(AiFeature.CV_REVIEW)
                .build();
        assertThat(router.resolveEffectiveMode(cv)).isEqualTo(AiMode.SMART);
    }

    @Test
    @DisplayName("AUTO uses SMART for coding when complexity hint is present")
    void autoComplexityUsesSmart() {
        AiRequestContext context = AiRequestContext.builder()
                .mode(AiMode.AUTO)
                .feature(AiFeature.CODING_AGENT)
                .jsonMode(true)
                .messages(List.of(ChatMessage.builder().role("user").content("short").build()))
                .build();
        assertThat(router.resolveEffectiveMode(context)).isEqualTo(AiMode.SMART);
    }

    @Test
    @DisplayName("Unsupported model override is rejected")
    void unsupportedModelOverrideRejected() {
        when(modelCatalog.isAllowed(any(), eq("unknown-model"))).thenReturn(false);
        AiRequestContext context = AiRequestContext.builder()
                .modelOverride("unknown-model")
                .build();
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.SMART))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported model override");
    }
}
