package com.tronai.interview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.career.cvbuilder.gotenberg.GotenbergPdfClient;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InterviewReportEndpointTest {

    private static final byte[] MINIMAL_PDF = new byte[]{
            '%', 'P', 'D', 'F', '-', '1', '.', '4', '\n',
            '%', (byte) 0xE2, (byte) 0xE3, (byte) 0xCF, (byte) 0xD3, '\n',
            '1', ' ', '0', ' ', 'o', 'b', 'j', '<', '<', '>', '>', 'e', 'n', 'd', 'o', 'b', 'j', '\n',
            't', 'r', 'a', 'i', 'l', 'e', 'r', '<', '<', '>', '>', '\n',
            '%', '%', 'E', 'O', 'F'
    };

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private GotenbergPdfClient gotenbergPdfClient;

    private String ownerAuthHeader;
    private String otherAuthHeader;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        when(aiProvider.getProviderName()).thenReturn("ollama");
        when(aiProvider.isAvailable()).thenReturn(true);
        when(gotenbergPdfClient.convertHtmlProductionSafe(any())).thenReturn(MINIMAL_PDF);

        com.tronai.user.User owner = userRepository.findByEmailIgnoreCase("tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("tester@tron.ai")
                        .displayName("Tester")
                        .role("USER")
                        .enabled(true)
                        .createdAt(java.time.Instant.now())
                        .updatedAt(java.time.Instant.now())
                        .build()));
        com.tronai.user.User other = userRepository.findByEmailIgnoreCase("other@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("other@tron.ai")
                        .displayName("Other")
                        .role("USER")
                        .enabled(true)
                        .createdAt(java.time.Instant.now())
                        .updatedAt(java.time.Instant.now())
                        .build()));

        ownerAuthHeader = "Bearer " + jwtService.generateAccessToken(owner.getId(), owner.getEmail(), owner.getRole(), owner.getDisplayName());
        otherAuthHeader = "Bearer " + jwtService.generateAccessToken(other.getId(), other.getEmail(), other.getRole(), other.getDisplayName());
    }

    @Test
    @DisplayName("Unauthenticated report download returns HTTP 401")
    void unauthenticatedReportReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/interviews/{id}/report.pdf", "missing-id"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Owner can download PDF; other user receives 404")
    void ownerOnlyReportDownload() throws Exception {
        InterviewConfigDto config = new InterviewConfigDto();
        config.setQuestionCount(2);

        MvcResult start = mockMvc.perform(post("/api/v1/interviews/start")
                        .header("Authorization", ownerAuthHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isOk())
                .andReturn();
        String interviewId = objectMapper.readTree(start.getResponse().getContentAsString()).get("interviewId").asText();

        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", ownerAuthHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(0, "自己紹介です。Java経験があります。"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/interviews/{id}/answers", interviewId)
                        .header("Authorization", ownerAuthHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InterviewAnswerRequest(1, "チーム開発でAPIを設計しました。"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/interviews/{id}/report.pdf", interviewId)
                        .header("Authorization", ownerAuthHeader))
                .andExpect(status().isOk())
                .andExpect(result -> org.assertj.core.api.Assertions.assertThat(
                        result.getResponse().getContentType()).contains("application/pdf"));

        mockMvc.perform(get("/api/v1/interviews/{id}/report.pdf", interviewId)
                        .header("Authorization", otherAuthHeader))
                .andExpect(status().isNotFound());
    }
}
