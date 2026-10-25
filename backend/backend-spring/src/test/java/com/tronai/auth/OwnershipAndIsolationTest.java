package com.tronai.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.auth.dto.RegisterRequest;
import com.tronai.chat.dto.ChatMessageIn;
import com.tronai.chat.dto.ChatRequest;
import com.tronai.cv.PdfTestUtils;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.dto.InterviewAnswerRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OwnershipAndIsolationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private com.tronai.hybrid.HybridRoutingService hybrid;

    @MockitoBean
    private com.tronai.storage.ObjectStorageService objectStorageService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() throws Exception {
        // Provider generation is mocked: keep routing hermetic too.
        org.mockito.Mockito.when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.when(hybrid.tryAcquireAiSlot()).thenReturn(true);
        org.mockito.Mockito.when(hybrid.allowsCloudInference()).thenReturn(false);
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        lenient().when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder().text("AI Response").build());

        // Register User A
        RegisterRequest reqA = RegisterRequest.builder()
                .email("user-a-" + System.nanoTime() + "@tron.ai")
                .password("passwordA123")
                .displayName("User A")
                .build();
        MvcResult resA = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqA)))
                .andExpect(status().isOk())
                .andReturn();
        tokenA = "Bearer " + objectMapper.readTree(resA.getResponse().getContentAsString()).get("accessToken").asText();

        // Register User B
        RegisterRequest reqB = RegisterRequest.builder()
                .email("user-b-" + System.nanoTime() + "@tron.ai")
                .password("passwordB123")
                .displayName("User B")
                .build();
        MvcResult resB = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqB)))
                .andExpect(status().isOk())
                .andReturn();
        tokenB = "Bearer " + objectMapper.readTree(resB.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    @DisplayName("User B cannot access or view User A's Chat session or messages")
    void userBCannotAccessUserAChat() throws Exception {
        // User A chats
        ChatRequest chatReq = ChatRequest.builder()
                .sessionId("session-user-a")
                .messages(List.of(ChatMessageIn.builder().role("user").content("User A secret message").build()))
                .build();

        mockMvc.perform(post("/api/v1/chat")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(chatReq)))
                .andExpect(status().isOk());

        // User A can see their session
        mockMvc.perform(get("/api/v1/chat/sessions")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.clientSessionId == 'session-user-a')]").isNotEmpty());

        // User B cannot see User A's session in session list
        mockMvc.perform(get("/api/v1/chat/sessions")
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.clientSessionId == 'session-user-a')]").isEmpty());

        // User B cannot fetch User A's session details directly
        mockMvc.perform(get("/api/v1/chat/sessions/session-user-a")
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("User B cannot access, view, or delete User A's CV document")
    void userBCannotAccessUserACv() throws Exception {
        byte[] pdfBytes = PdfTestUtils.createPdf("User A Private Resume with extensive personal details.", 1);
        MockMultipartFile file = new MockMultipartFile("file", "user_a_cv.pdf", "application/pdf", pdfBytes);

        MvcResult uploadRes = mockMvc.perform(multipart("/demo/cv/upload")
                        .file(file)
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();

        String cvId = objectMapper.readTree(uploadRes.getResponse().getContentAsString()).get("cvId").asText();

        // User A can fetch their CV
        mockMvc.perform(get("/api/v1/cv/" + cvId)
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").value("user_a_cv.pdf"));

        // User B cannot fetch User A's CV
        mockMvc.perform(get("/api/v1/cv/" + cvId)
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());

        // User B cannot delete User A's CV
        mockMvc.perform(delete("/api/v1/cv/" + cvId)
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("User B cannot access, answer, or view analysis of User A's Interview session")
    void userBCannotAccessUserAInterview() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("Secret Company");
        config.setJobPosition("Lead Engineer");
        config.setQuestionCount(3);

        MvcResult startRes = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andReturn();

        String interviewId = objectMapper.readTree(startRes.getResponse().getContentAsString()).get("interviewId").asText();

        // User A can view their interview
        mockMvc.perform(get("/api/v1/interviews/" + interviewId)
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(interviewId));

        // User B cannot view User A's interview
        mockMvc.perform(get("/api/v1/interviews/" + interviewId)
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());

        // User B cannot answer User A's interview
        mockMvc.perform(post("/api/v1/interviews/" + interviewId + "/answers")
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "Intruder answer"))))
                .andExpect(status().isNotFound());

        // User B cannot fetch User A's analysis
        mockMvc.perform(get("/api/v1/interviews/" + interviewId + "/analysis")
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());
    }
}
