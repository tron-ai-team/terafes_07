package com.tronai.chat;

import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.model.ModelProviderType;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileResolver;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.hybrid.HybridRoutingService;
import com.tronai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatHybridRoutingUnitTest {

    @Mock ModelManager modelManager;
    @Mock AiProfileService aiProfileService;
    @Mock AiProfileResolver aiProfileResolver;
    @Mock AiGateway aiGateway;
    @Mock HybridRoutingService hybrid;
    @Mock LanguageService languageService;
    @Mock ChatSessionRepository chatSessionRepository;
    @Mock ChatMessageRepository chatMessageRepository;
    @Mock UserRepository userRepository;
    @Mock AiProvider localProvider;

    AiGatewayProperties gatewayProperties;
    ChatService chatService;
    ModelProfile localProfile;

    @BeforeEach
    void setUp() {
        gatewayProperties = new AiGatewayProperties();
        gatewayProperties.setGtxFastModeEnabled(false);
        chatService = new ChatService(
                modelManager,
                aiProfileService,
                aiProfileResolver,
                aiGateway,
                gatewayProperties,
                hybrid,
                languageService,
                chatSessionRepository,
                chatMessageRepository,
                userRepository);
        localProfile = new ModelProfile();
        localProfile.setProvider(ModelProviderType.OLLAMA);
        localProfile.setProviderModelName("tron-fast");
        lenient().when(hybrid.tryAcquireAiSlot()).thenReturn(true);
    }

    @Test
    @DisplayName("FAST uses local ModelManager when hybrid selects LOCAL_OLLAMA (legacy, GTX off)")
    void fastUsesLocalWhenHybridAllows() {
        when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        when(modelManager.getProvider(ModelProviderType.OLLAMA)).thenReturn(localProvider);
        when(localProvider.generate(any())).thenReturn(ChatGenerationResult.builder()
                .text("local-ok")
                .logicalProfile("FAST")
                .providerType(com.tronai.ai.ProviderType.LOCAL)
                .actualModelId("tron-fast")
                .build());

        ChatGenerationResult result = invokeGenerate(AiProfile.FAST, localProfile);

        assertThat(result.getText()).isEqualTo("local-ok");
        assertThat(result.getActualModelId()).isEqualTo("tron-fast");
        verify(aiGateway, never()).generate(any());
        verify(hybrid).releaseAiSlot();
    }

    @Test
    @DisplayName("GTX FAST mode always uses gateway even when hybrid selects LOCAL_OLLAMA")
    void gtxFastModeBypassesLocalModelManager() {
        gatewayProperties.setGtxFastModeEnabled(true);
        when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .text("GTX_FAST_OK")
                .provider(GatewayProviderId.OLLAMA_GTX)
                .modelId("qwen3:8b")
                .mode(AiMode.FAST)
                .build());

        ChatGenerationResult result = invokeGenerate(AiProfile.FAST, localProfile);

        assertThat(result.getText()).isEqualTo("GTX_FAST_OK");
        ArgumentCaptor<AiRequestContext> captor = ArgumentCaptor.forClass(AiRequestContext.class);
        verify(aiGateway).generate(captor.capture());
        assertThat(captor.getValue().getMode()).isEqualTo(AiMode.FAST);
        verify(modelManager, never()).getProvider(any());
        verify(hybrid).releaseAiSlot();
    }

    @Test
    @DisplayName("FAST uses cloud gateway when hybrid FORCE_OFFLINE / CLOUD_GATEWAY (legacy, GTX off)")
    void fastUsesCloudWhenLocalForcedOffline() {
        when(hybrid.selectInferenceRoute()).thenReturn("CLOUD_GATEWAY");
        when(hybrid.allowsCloudInference()).thenReturn(true);
        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .text("cloud-ok")
                .provider(GatewayProviderId.GROQ)
                .modelId("groq-fast")
                .mode(AiMode.FAST)
                .build());

        ChatGenerationResult result = invokeGenerate(AiProfile.FAST, localProfile);

        assertThat(result.getText()).isEqualTo("cloud-ok");
        ArgumentCaptor<AiRequestContext> captor = ArgumentCaptor.forClass(AiRequestContext.class);
        verify(aiGateway).generate(captor.capture());
        assertThat(captor.getValue().getMode()).isEqualTo(AiMode.FAST);
        assertThat(captor.getValue().getFeature()).isEqualTo(AiFeature.CHAT);
        verify(modelManager, never()).getProvider(any());
        verify(hybrid).releaseAiSlot();
    }

    @Test
    @DisplayName("UNAVAILABLE route rejects FAST before local or cloud call")
    void unavailableRejectsFast() {
        when(hybrid.selectInferenceRoute()).thenReturn("UNAVAILABLE");

        assertThatThrownBy(() -> invokeGenerate(AiProfile.FAST, localProfile))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("unavailable");
        verify(aiGateway, never()).generate(any());
        verify(modelManager, never()).getProvider(any());
    }

    @Test
    @DisplayName("PAUSED route rejects before inference")
    void pausedRejects() {
        when(hybrid.selectInferenceRoute()).thenReturn("PAUSED");

        assertThatThrownBy(() -> invokeGenerate(AiProfile.SMART, localProfile))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("paused");
    }

    @SuppressWarnings("unchecked")
    private ChatGenerationResult invokeGenerate(AiProfile profile, ModelProfile modelProfile) {
        List<ChatMessage> messages = List.of(
                ChatMessage.builder().role("user").content("ping").build());
        return (ChatGenerationResult) ReflectionTestUtils.invokeMethod(
                chatService,
                "generateWithGatewayOrLocal",
                profile,
                modelProfile,
                messages,
                64,
                1L);
    }
}
