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
    private GatewayProvider gtxOllamaProvider;
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
        properties.setGtxFastModel("qwen3:8b");
        router = new AiModelRouter(properties, providerRegistry, modelCatalog, null);

        lenient().when(providerRegistry.find(GatewayProviderId.OLLAMA)).thenReturn(Optional.of(ollamaProvider));
        lenient().when(providerRegistry.find(GatewayProviderId.OLLAMA_GTX)).thenReturn(Optional.of(gtxOllamaProvider));
        lenient().when(providerRegistry.find(GatewayProviderId.GROQ)).thenReturn(Optional.of(groqProvider));
        lenient().when(providerRegistry.find(GatewayProviderId.GEMINI)).thenReturn(Optional.of(geminiProvider));

        lenient().when(ollamaProvider.isConfigured()).thenReturn(true);
        lenient().when(gtxOllamaProvider.isConfigured()).thenReturn(true);
        lenient().when(groqProvider.isConfigured()).thenReturn(true);
        lenient().when(geminiProvider.isConfigured()).thenReturn(true);

        lenient().when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.AVAILABLE);
        lenient().when(gtxOllamaProvider.health()).thenReturn(ProviderHealthStatus.AVAILABLE);
        lenient().when(groqProvider.health()).thenReturn(ProviderHealthStatus.CONFIGURED);
        lenient().when(geminiProvider.health()).thenReturn(ProviderHealthStatus.CONFIGURED);

        lenient().when(ollamaProvider.knownModels()).thenReturn(List.of("ollama-fast", "ollama-quality"));
        lenient().when(gtxOllamaProvider.knownModels()).thenReturn(List.of("qwen3:8b"));
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
    @DisplayName("SMART prefers Groq when preferGroqForSmart=true (default)")
    void smartPrefersGroqByDefault() {
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CV_REVIEW).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.SMART);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-smart");
    }

    @Test
    @DisplayName("RTX smart mode routes SMART exclusively to Ollama RTX model")
    void rtxSmartModeUsesOllamaOnly() {
        properties.setRtxSmartModeEnabled(true);
        properties.setRtxSmartModel("qwen3.5:9b-q4_K_M");
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.SMART);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.OLLAMA);
        assertThat(route.modelId()).isEqualTo("qwen3.5:9b-q4_K_M");
        assertThat(router.fallbackCandidates(context, AiMode.SMART)).isEmpty();
    }

    @Test
    @DisplayName("RTX smart mode fails closed when Ollama is offline (no cloud fallback)")
    void rtxSmartModeFailsWhenOllamaOffline() {
        properties.setRtxSmartModeEnabled(true);
        properties.setRtxSmartModel("qwen3.5:9b-q4_K_M");
        when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.UNAVAILABLE);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.SMART))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RTX Ollama");
    }

    @Test
    @DisplayName("CLOUD mode uses cloud providers and never Ollama as primary")
    void cloudModeUsesCloudProviders() {
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.CLOUD);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-smart");
    }

    @Test
    @DisplayName("FAST unavailable under RTX exhibition mode when GTX not enabled")
    void fastUnavailableWhenGtxNotConfigured() {
        properties.setRtxSmartModeEnabled(true);
        properties.setGtxFastModeEnabled(false);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.FAST))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GTX");
    }

    @Test
    @DisplayName("GTX fast mode routes FAST exclusively to GTX Qwen3 8B")
    void gtxFastModeUsesGtxOllamaOnly() {
        properties.setRtxSmartModeEnabled(true);
        properties.setGtxFastModeEnabled(true);
        properties.setGtxFastModel("qwen3:8b");
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.FAST);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.OLLAMA_GTX);
        assertThat(route.modelId()).isEqualTo("qwen3:8b");
        assertThat(router.fallbackCandidates(context, AiMode.FAST)).isEmpty();
    }

    @Test
    @DisplayName("GTX fast mode fails closed when GTX is offline (no RTX/cloud fallback)")
    void gtxFastModeFailsWhenGtxOffline() {
        properties.setRtxSmartModeEnabled(true);
        properties.setGtxFastModeEnabled(true);
        properties.setGtxFastModel("qwen3:8b");
        when(gtxOllamaProvider.health()).thenReturn(ProviderHealthStatus.UNAVAILABLE);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.FAST))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GTX Ollama");
    }

    @Test
    @DisplayName("GTX fast mode keeps SMART on RTX and CLOUD on cloud providers")
    void gtxFastDoesNotCrossRouteSmartOrCloud() {
        properties.setRtxSmartModeEnabled(true);
        properties.setRtxSmartModel("qwen3.5:9b-q4_K_M");
        properties.setGtxFastModeEnabled(true);
        properties.setGtxFastModel("qwen3:8b");

        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThat(router.resolveRoute(context, AiMode.FAST).provider()).isEqualTo(GatewayProviderId.OLLAMA_GTX);
        assertThat(router.resolveRoute(context, AiMode.SMART).provider()).isEqualTo(GatewayProviderId.OLLAMA);
        assertThat(router.resolveRoute(context, AiMode.SMART).modelId()).isEqualTo("qwen3.5:9b-q4_K_M");
        assertThat(router.resolveRoute(context, AiMode.CLOUD).provider()).isEqualTo(GatewayProviderId.GROQ);
    }

    @Test
    @DisplayName("Feature flag disabled preserves legacy FAST cloud fallback when RTX smart is off")
    void gtxFlagDisabledKeepsLegacyFastWhenRtxOff() {
        properties.setRtxSmartModeEnabled(false);
        properties.setGtxFastModeEnabled(false);
        when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.UNAVAILABLE);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.FAST);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.GROQ);
        assertThat(route.modelId()).isEqualTo("groq-fast");
    }

    @Test
    @DisplayName("RTX offline does not steal FAST traffic from healthy GTX")
    void rtxOfflineDoesNotAffectGtxFast() {
        properties.setRtxSmartModeEnabled(true);
        properties.setGtxFastModeEnabled(true);
        when(ollamaProvider.health()).thenReturn(ProviderHealthStatus.UNAVAILABLE);
        AiRequestContext context = AiRequestContext.builder().feature(AiFeature.CHAT).build();
        assertThat(router.resolveRoute(context, AiMode.FAST).provider()).isEqualTo(GatewayProviderId.OLLAMA_GTX);
        assertThatThrownBy(() -> router.resolveRoute(context, AiMode.SMART))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RTX Ollama");
    }

    @Test
    @DisplayName("SMART prefers OpenRouter when preferGroqForSmart=false")
    void smartPrefersOpenRouterWhenConfigured() {
        properties.setPreferGroqForSmart(false);
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
    @DisplayName("SMART local-only refuses cloud and uses Ollama")
    void smartLocalOnlyUsesOllama() {
        AiRequestContext context = AiRequestContext.builder()
                .feature(AiFeature.CV_GENERATION)
                .allowCloud(false)
                .build();
        AiModelRouter.Route route = router.resolveRoute(context, AiMode.SMART);
        assertThat(route.provider()).isEqualTo(GatewayProviderId.OLLAMA);
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
    @DisplayName("AUTO maps chat to FAST, voice to SMART, and CV to SMART")
    void autoModeByFeature() {
        AiRequestContext chat = AiRequestContext.builder()
                .mode(AiMode.AUTO)
                .feature(AiFeature.CHAT)
                .build();
        assertThat(router.resolveEffectiveMode(chat)).isEqualTo(AiMode.FAST);

        AiRequestContext voice = AiRequestContext.builder()
                .mode(AiMode.AUTO)
                .feature(AiFeature.VOICE_REASONING)
                .build();
        assertThat(router.resolveEffectiveMode(voice)).isEqualTo(AiMode.SMART);

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
