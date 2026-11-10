package com.tronai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.interview.dto.InterviewAnswerRequest;
import com.tronai.interview.dto.InterviewConfigDto;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser
class InterviewEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    private String authHeader;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AiProvider aiProvider;

    @BeforeEach
    void setUp() {
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        com.tronai.user.User u = userRepository.findByEmailIgnoreCase("tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("tester@tron.ai")
                        .displayName("Tester")
                        .role("USER")
                        .enabled(true)
                        .createdAt(java.time.Instant.now())
                        .updatedAt(java.time.Instant.now())
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(u.getId(), u.getEmail(), u.getRole(), u.getDisplayName());
    }

    @Test
    @DisplayName("Unauthenticated start interview returns HTTP 401")
    void unauthenticatedStartReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/interviews/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/interviews/start with Japanese config returns HTTP 200 and schema")
    void startJapaneseInterview() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("LINEヤフー株式会社");
        config.setJobPosition("バックエンドエンジニア");
        config.setLanguage("japanese");
        config.setType("technical");
        config.setDifficulty("intermediate");
        config.setQuestionCount(5);

        mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interviewId").isNotEmpty())
                .andExpect(jsonPath("$.currentQuestionIndex").value(0))
                .andExpect(jsonPath("$.questions").isArray())
                .andExpect(jsonPath("$.questions[0].questionNumber").value(1))
                .andExpect(jsonPath("$.questions[0].textJa").isNotEmpty())
                .andExpect(jsonPath("$.transcript[0].sender").value("ai"))
                .andExpect(jsonPath("$.transcript[0].isFollowUp").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/interviews/start with English config returns English opening")
    void startEnglishInterview() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("Sony");
        config.setJobPosition("Software Engineer");
        config.setLanguage("english");
        config.setQuestionCount(3);

        mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].textJa").value(org.hamcrest.Matchers.containsString("Sony")))
                .andExpect(jsonPath("$.questions[0].textJa").value(org.hamcrest.Matchers.containsString("introducing yourself")));
    }

    @Test
    @DisplayName("Full 5-turn interview completes without generating 6th question")
    void fullFiveTurnInterviewCompletes() throws Exception {
        // 1. Start interview
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("LINEヤフー");
        config.setJobPosition("Backend Engineer");
        config.setQuestionCount(5);

        MvcResult startResult = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andReturn();

        String startJson = startResult.getResponse().getContentAsString();
        String interviewId = objectMapper.readTree(startJson).get("interviewId").asText();

        // 2. Submit Turn 0 (Q1)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "JavaとSpring Bootが得意なエンジニアです。"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(1))
                .andExpect(jsonPath("$.isFinished").value(false));

        // 3. Stale index check: sending 0 again triggers 409 Conflict
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "重複送信のテスト回答です。"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("This interview turn was already submitted"));

        // 4. Submit Turn 1 (Q2)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(1, "高スループットな分散システムを開発したいからです。"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(2))
                .andExpect(jsonPath("$.isFinished").value(false));

        // 5. Submit Turn 2 (Q3)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(2, "課題解決力とパフォーマンスチューニングの粘り強さが強みです。"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(3))
                .andExpect(jsonPath("$.isFinished").value(false));

        // 6. Submit Turn 3 (Q4)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(3, "チーム開発でのコードレビューや設計ディスカッションに注力しました。"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(4))
                .andExpect(jsonPath("$.isFinished").value(false));

        // 7. Submit Turn 4 (Q5 - Final turn)
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(4, "技術力を磨き、大規模インフラを支えるリードエンジニアを目指します。"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextQuestionIndex").value(5))
                .andExpect(jsonPath("$.isFinished").value(true))
                .andExpect(jsonPath("$.aiFollowUpMessage.text").value(org.hamcrest.Matchers.anyOf(
                        org.hamcrest.Matchers.containsString("面接は以上"),
                        org.hamcrest.Matchers.containsString("ありがとうございました"),
                        org.hamcrest.Matchers.containsString("終了")
                )))
                .andExpect(jsonPath("$.nextAction").value("CLOSE"));

        // 8. Submitting after finished triggers 409
        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(5, "終了後の余分な回答"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("This interview has already ended"));

        // 9. Fetch analysis
        mockMvc.perform(get("/api/v1/interviews/{id}/analysis", interviewId)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interviewId").value(interviewId))
                .andExpect(jsonPath("$.overallScore").isNumber())
                .andExpect(jsonPath("$.radarData").isArray())
                .andExpect(jsonPath("$.strongPoints").isArray())
                .andExpect(jsonPath("$.weakPoints").isArray())
                .andExpect(jsonPath("$.aiOverallFeedback").isNotEmpty())
                .andExpect(jsonPath("$.starSuggestion.situation").isNotEmpty())
                .andExpect(jsonPath("$.transcript").isArray());
    }

    @Test
    @DisplayName("Empty answer submission returns HTTP 422")
    void emptyAnswerReturns422() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setQuestionCount(3);
        MvcResult res = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andReturn();
        String id = objectMapper.readTree(res.getResponse().getContentAsString()).get("interviewId").asText();

        mockMvc.perform(post("/api/v1/interviews/{id}/answers", id)
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "   "))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Answer text cannot be empty"));
    }

    @Test
    @DisplayName("Interview V2 upgrades QUALITY/FAST to SMART cloud routing and locks profile")
    void startQualityInterviewLocksProfile() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName("Sony Interactive Entertainment");
        config.setJobPosition("Backend Engineer");
        config.setLanguage("japanese");
        config.setType("technical");
        config.setDifficulty("intermediate");
        config.setQuestionCount(3);
        config.setAiProfile("QUALITY");

        MvcResult res = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interviewId").isNotEmpty())
                .andExpect(jsonPath("$.aiProfile").value("SMART"))
                .andExpect(jsonPath("$.locked").value(true))
                .andReturn();

        String id = objectMapper.readTree(res.getResponse().getContentAsString()).get("interviewId").asText();

        // Query session summary in history list
        mockMvc.perform(get("/api/v1/interviews")
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].aiProfile").value("SMART"))
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].locked").value(true));
    }
}
