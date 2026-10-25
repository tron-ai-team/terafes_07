package com.tronai.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.auth.JwtService;
import com.tronai.chat.dto.ChatMessageIn;
import com.tronai.chat.dto.ChatRequest;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChatProfileLockTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private com.tronai.hybrid.HybridRoutingService hybrid;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    private String authHeader;

    @BeforeEach
    void setUp() {
        // Provider generation is mocked: keep routing hermetic too.
        org.mockito.Mockito.when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.when(hybrid.tryAcquireAiSlot()).thenReturn(true);
        org.mockito.Mockito.when(hybrid.allowsCloudInference()).thenReturn(false);
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        lenient().when(aiProvider.generate(any(ChatGenerationRequest.class))).thenReturn(
                ChatGenerationResult.builder().text("Mock AI response text").truncated(false).build()
        );
        com.tronai.user.User u = userRepository.findByEmailIgnoreCase("chat-lock-tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("chat-lock-tester@tron.ai")
                        .displayName("Chat Lock Tester")
                        .role("USER")
                        .passwordHash("hashed")
                        .enabled(true)
                        .createdAt(java.time.Instant.now())
                        .updatedAt(java.time.Instant.now())
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(u.getId(), u.getEmail(), u.getRole(), u.getDisplayName());
    }

    @Test
    @DisplayName("Starting new chat with FAST profile routes to fast model and locks profile")
    void testStartChatWithFastProfile() throws Exception {
        String sessionId = "sess-lock-fast-" + UUID.randomUUID();

        ChatRequest request = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("FAST")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Hello in Fast mode").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.aiProfile").value("FAST"))
                .andExpect(jsonPath("$.locked").value(true));

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getModel()).isEqualTo("qwen3:8b");
    }

    @Test
    @DisplayName("Starting new chat with QUALITY profile routes to quality model and locks profile")
    void testStartChatWithQualityProfile() throws Exception {
        String sessionId = "sess-lock-qual-" + UUID.randomUUID();

        ChatRequest request = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("QUALITY")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Hello in Quality mode").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.aiProfile").value("QUALITY"))
                .andExpect(jsonPath("$.locked").value(true));

        ArgumentCaptor<ChatGenerationRequest> captor = ArgumentCaptor.forClass(ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getModel()).isEqualTo("gemma3:12b");
    }

    @Test
    @DisplayName("Changing profile mid-session returns HTTP 409 Conflict")
    void testProfileChangeMidSessionReturns409() throws Exception {
        String sessionId = "sess-conflict-" + UUID.randomUUID();

        // 1. Initial message with QUALITY
        ChatRequest msg1 = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("QUALITY")
                .messages(List.of(ChatMessageIn.builder().role("user").content("First query in Quality").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiProfile").value("QUALITY"));

        // 2. Second message attempting to switch to FAST -> 409 Conflict
        ChatRequest msg2 = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("FAST")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Try switching to Fast").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("AI profile cannot be changed after this chat has started."));

        // 3. Third message continuing with QUALITY -> 200 OK
        ChatRequest msg3 = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("QUALITY")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Continue with Quality").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiProfile").value("QUALITY"));
    }

    @Test
    @DisplayName("Chat session detail returns persisted aiProfile, modelId, and locked status")
    void testSessionDetailReturnsLockedProfile() throws Exception {
        String sessionId = "sess-detail-lock-" + UUID.randomUUID();

        ChatRequest msg = ChatRequest.builder()
                .sessionId(sessionId)
                .aiProfile("QUALITY")
                .messages(List.of(ChatMessageIn.builder().role("user").content("Init session").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/chat/sessions/" + sessionId)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiProfile").value("QUALITY"))
                .andExpect(jsonPath("$.modelId").value("tron-quality"))
                .andExpect(jsonPath("$.modelDisplayName").value("gemma3:12b"))
                .andExpect(jsonPath("$.locked").value(true));
    }
}
