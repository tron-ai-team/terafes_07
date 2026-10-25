package com.tronai.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.*;
import com.tronai.chat.dto.ChatMessageIn;
import com.tronai.chat.dto.ChatRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser
class ChatEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private com.tronai.hybrid.HybridRoutingService hybrid;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    private String authHeader;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        // Provider generation is mocked: keep routing hermetic too.
        org.mockito.Mockito.when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.when(hybrid.tryAcquireAiSlot()).thenReturn(true);
        org.mockito.Mockito.when(hybrid.allowsCloudInference()).thenReturn(false);
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        // JWT filter loads User from DB for suspension checks — seed a real enabled user.
        com.tronai.user.User user = userRepository.findByEmailIgnoreCase("chat-tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("chat-tester@tron.ai")
                        .displayName("Chat Tester")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(
                user.getId(), user.getEmail(), "USER", user.getDisplayName());
    }

    @Test
    @DisplayName("Unauthenticated chat request returns HTTP 401")
    void unauthenticatedChatRequestReturns401() throws Exception {
        ChatRequest request = ChatRequest.builder()
                .sessionId("sess-anon")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Hello").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Valid chat request returns HTTP 200 with compatible frontend schema")
    void validChatRequestReturns200() throws Exception {
        ChatGenerationResult mockResult = ChatGenerationResult.builder()
                .text("Interfaces in Java define contracts.")
                .finishReason("stop")
                .truncated(false)
                .evalCount(42)
                .promptEvalCount(18)
                .build();

        when(aiProvider.generate(any())).thenReturn(mockResult);

        ChatRequest request = ChatRequest.builder()
                .sessionId("sess-123")
                .language("en")
                .searchMode("auto")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Explain Java interfaces simply.").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value("sess-123"))
                .andExpect(jsonPath("$.reply").value("Interfaces in Java define contracts."))
                .andExpect(jsonPath("$.content").value("Interfaces in Java define contracts."))
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.truncated").value(false))
                .andExpect(jsonPath("$.finishReason").value("stop"))
                .andExpect(jsonPath("$.evalCount").value(42))
                .andExpect(jsonPath("$.promptEvalCount").value(18))
                .andExpect(jsonPath("$.search.mode").value("auto"))
                .andExpect(jsonPath("$.search.performed").value(false))
                .andExpect(jsonPath("$.search.status").value("unavailable"))
                .andExpect(jsonPath("$.search.detail").value("Search provider not configured"));
    }

    @Test
    @DisplayName("Requested language influences system instructions and echoes in response")
    void languageFieldInfluencesPrompt() throws Exception {
        ChatGenerationResult mockResult = ChatGenerationResult.builder()
                .text("Javaのインターフェースは...")
                .finishReason("stop")
                .evalCount(30)
                .promptEvalCount(20)
                .build();

        when(aiProvider.generate(any())).thenReturn(mockResult);

        ChatRequest request = ChatRequest.builder()
                .sessionId("sess-ja")
                .language("ja")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("インターフェースとは？").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("ja"))
                .andExpect(jsonPath("$.reply").value("Javaのインターフェースは..."));

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        ChatMessage systemMsg = captor.getValue().getMessages().get(0);
        assertThat(systemMsg.getContent()).contains("Reply only in Japanese");
    }

    @Test
    @DisplayName("SearchMode off returns skipped search status")
    void searchModeOffReturnsSkipped() throws Exception {
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("Reply").build());

        ChatRequest request = ChatRequest.builder()
                .searchMode("off")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Hello").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.search.mode").value("off"))
                .andExpect(jsonPath("$.search.performed").value(false))
                .andExpect(jsonPath("$.search.status").value("skipped"));
    }

    @Test
    @DisplayName("Invalid request with empty messages returns HTTP 422 with {detail}")
    void emptyMessagesReturns422WithDetail() throws Exception {
        String body = "{\"messages\": []}";

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    @DisplayName("Latest message not from user returns HTTP 422 with {detail}")
    void latestMessageNotUserReturns422() throws Exception {
        ChatRequest request = ChatRequest.builder()
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Hi").build(),
                        ChatMessageIn.builder().role("assistant").content("Hello").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("The latest chat message must be from the user"));
    }

    @Test
    @DisplayName("Local AI unavailable with cloud fallback disabled returns the privacy error")
    void ollamaUnavailableReturns503() throws Exception {
        when(aiProvider.generate(any())).thenThrow(
                new AiProviderUnavailableException(com.tronai.ai.FallbackAiProvider.LOCAL_UNAVAILABLE_DETAIL));

        ChatRequest request = ChatRequest.builder()
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Test").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value(
                        com.tronai.ai.FallbackAiProvider.LOCAL_UNAVAILABLE_DETAIL));
    }

    @Test
    @DisplayName("Ollama timeout returns HTTP 504 with {detail: 'Ollama timed out'}")
    void ollamaTimeoutReturns504() throws Exception {
        when(aiProvider.generate(any())).thenThrow(new AiProviderTimeoutException("Socket read timeout"));

        ChatRequest request = ChatRequest.builder()
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Test timeout").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.detail").value("Ollama timed out"));
    }

    @Test
    @DisplayName("SearchMode on returns unavailable search status matching contract")
    void searchModeOnReturnsUnavailable() throws Exception {
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("Reply").build());

        ChatRequest request = ChatRequest.builder()
                .searchMode("on")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Search query").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.search.mode").value("on"))
                .andExpect(jsonPath("$.search.performed").value(false))
                .andExpect(jsonPath("$.search.status").value("unavailable"))
                .andExpect(jsonPath("$.search.detail").value("Search provider not configured"))
                .andExpect(jsonPath("$.search.results").isArray());
    }

    @Test
    @DisplayName("Invalid language returns HTTP 422 with FastAPI detail error")
    void invalidLanguageReturns422() throws Exception {
        ChatRequest request = ChatRequest.builder()
                .language("fr")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Bonjour").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("language must be en, ja, si, bn, ne, or my"));
    }

    @Test
    @DisplayName("Sinhala and Bengali languages configure appropriate system instructions")
    void multilingualSinhalaAndBengali() throws Exception {
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("පිළිතුර").build());

        ChatRequest siRequest = ChatRequest.builder()
                .language("si")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Java interface එක පැහැදිලි කරන්න").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(siRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("si"))
                .andExpect(jsonPath("$.reply").value("පිළිතුර"));

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getMessages().get(0).getContent()).contains("Reply only in Sinhala");

        reset(aiProvider);
        when(aiProvider.getProviderName()).thenReturn("ollama");
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("উত্তর").build());

        ChatRequest bnRequest = ChatRequest.builder()
                .language("bn")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Java interface ব্যাখ্যা করুন").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bnRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("bn"))
                .andExpect(jsonPath("$.reply").value("উত্তর"));

        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getMessages().get(0).getContent()).contains("Reply only in Bengali");
    }

    @Test
    @DisplayName("Malformed JSON payload returns HTTP 422 with {detail}")
    void malformedJsonReturns422() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json-body"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Invalid request payload"));
    }

    @Test
    @DisplayName("Chat resolves default model qwen3-8b and passes provider model name to provider")
    void chatResolvesDefaultModel() throws Exception {
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("OK").build());

        ChatRequest request = ChatRequest.builder()
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Hello").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getModel()).isEqualTo("qwen3:8b");
    }

    @Test
    @DisplayName("Chat accepts explicit valid model qwen3-8b and maps to provider model name")
    void chatAcceptsExplicitValidModel() throws Exception {
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("OK").build());

        ChatRequest request = ChatRequest.builder()
                .model("qwen3-8b")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Test explicit model").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getModel()).isEqualTo("qwen3:8b");
    }

    @Test
    @DisplayName("Chat with unknown model returns HTTP 422 with {detail: 'Model not found: ...'}")
    void chatWithUnknownModelReturns422() throws Exception {
        ChatRequest request = ChatRequest.builder()
                .model("unknown-model-xyz")
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("Test unknown model").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Model not found: unknown-model-xyz"));
    }
}
