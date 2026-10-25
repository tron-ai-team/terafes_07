package com.tronai.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.auth.JwtService;
import com.tronai.chat.ChatMessageRepository;
import com.tronai.chat.ChatSessionRepository;
import com.tronai.chat.dto.ChatMessageIn;
import com.tronai.chat.dto.ChatRequest;
import com.tronai.interview.InterviewAnalysisRepository;
import com.tronai.interview.InterviewMessageRepository;
import com.tronai.interview.InterviewSessionRepository;
import com.tronai.interview.dto.InterviewAnswerRequest;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.session.InterviewSessionManager;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DurabilityAndPersistenceTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ChatSessionRepository chatSessionRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private InterviewSessionRepository interviewSessionRepository;

    @Autowired
    private InterviewMessageRepository interviewMessageRepository;

    @Autowired
    private InterviewAnalysisRepository interviewAnalysisRepository;

    @Autowired
    private InterviewSessionManager sessionManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private com.tronai.hybrid.HybridRoutingService hybrid;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private String authHeader;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Provider generation is mocked: keep routing hermetic too.
        org.mockito.Mockito.when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.when(hybrid.tryAcquireAiSlot()).thenReturn(true);
        org.mockito.Mockito.when(hybrid.allowsCloudInference()).thenReturn(false);
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        lenient().when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("Persisted response").build());

        testUser = userRepository.findByEmailIgnoreCase("durable@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("durable@tron.ai")
                        .displayName("Durable Tester")
                        .role("USER")
                        .enabled(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));

        authHeader = "Bearer " + jwtService.generateAccessToken(testUser.getId(), testUser.getEmail(), testUser.getRole(), testUser.getDisplayName());
    }

    @Test
    @DisplayName("Chat messages are persisted in MySQL and consecutive turns do not duplicate history")
    void chatPersistenceAndNoDuplicateHistory() throws Exception {
        String sessionId = "sess-persistence-" + System.nanoTime();

        // Turn 1
        ChatRequest req1 = ChatRequest.builder()
                .sessionId(sessionId)
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("First user message").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Verify rows in MySQL
        var sessionOpt = chatSessionRepository.findByUserIdAndClientSessionId(testUser.getId(), sessionId);
        assertThat(sessionOpt).isPresent();
        var messages1 = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionOpt.get().getId());
        assertThat(messages1).hasSize(2); // 1 user turn + 1 assistant turn
        assertThat(messages1.get(0).getContent()).isEqualTo("First user message");
        assertThat(messages1.get(1).getContent()).isEqualTo("Persisted response");

        // Turn 2: frontend sends full accumulated history (user, assistant, new user)
        ChatRequest req2 = ChatRequest.builder()
                .sessionId(sessionId)
                .messages(List.of(
                        ChatMessageIn.builder().role("user").content("First user message").build(),
                        ChatMessageIn.builder().role("assistant").content("Persisted response").build(),
                        ChatMessageIn.builder().role("user").content("Second user message").build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isOk());

        // Verify only 4 messages exist in MySQL now (not 2 + 3 = 5 or 6)
        var messages2 = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionOpt.get().getId());
        assertThat(messages2).hasSize(4);
        assertThat(messages2.get(2).getContent()).isEqualTo("Second user message");
        assertThat(messages2.get(3).getContent()).isEqualTo("Persisted response");
    }

    @Test
    @DisplayName("Interview survives in-memory eviction and restores from MySQL across simulated restart")
    void interviewSurvivesRestart() throws Exception {
        // 1. Start 2-question interview
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("Sony");
        config.setJobPosition("Cloud Architect");
        config.setQuestionCount(2);

        MvcResult startRes = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andReturn();

        String interviewId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("interviewId").asText();

        // Verify saved in MySQL
        var dbSessionOpt = interviewSessionRepository.findById(interviewId);
        assertThat(dbSessionOpt).isPresent();
        assertThat(dbSessionOpt.get().getCurrentQuestionIndex()).isEqualTo(0);

        // 2. Answer Turn 0
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "Answer to Q1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(1))
                .andExpect(jsonPath("$.isFinished").value(false));

        // 3. Simulate application restart: evict session from in-memory cache
        sessionManager.evict(interviewId);

        // Verify session is no longer in RAM
        // 4. Submit Turn 1 (should automatically reload session from MySQL)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(1, "Answer to Q2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(2))
                .andExpect(jsonPath("$.isFinished").value(true));

        // 5. Verify finished and analysis exists in MySQL
        var finishedSession = interviewSessionRepository.findById(interviewId).orElseThrow();
        assertThat(finishedSession.isFinished()).isTrue();
        assertThat(finishedSession.getCompletedAt()).isNotNull();

        var analysisOpt = interviewAnalysisRepository.findBySessionId(interviewId);
        assertThat(analysisOpt).isPresent();
        assertThat(analysisOpt.get().getOverallScore()).isGreaterThan(0);

        // 6. Fetch analysis via API
        mockMvc.perform(get("/api/v1/interviews/{id}/analysis", interviewId)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interviewId").value(interviewId))
                .andExpect(jsonPath("$.overallScore").isNumber());
    }
}
