package com.tronai.career;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.auth.JwtService;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.repo.CareerJobRepository;
import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.ExternalJobListing;
import com.tronai.career.service.provider.MynaviJobProvider;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterJourneyIT {

    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired CareerJobRepository careerJobRepository;
    @Autowired ObjectMapper objectMapper;

    @MockitoBean AiProvider aiProvider;
    @MockitoBean MynaviJobProvider mynaviJobProvider;
    @MockitoBean CareerMapJobProvider careerMapJobProvider;

    private String authA;
    private String authB;
    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);

        ExternalJobListing listing = ExternalJobListing.builder()
                .provider("mynavi")
                .sourceId("fixture-1")
                .sourceUrl("https://job.mynavi.jp/27/pc/search/query.html?FW:word=Java")
                .title("Java Spring Boot Engineer")
                .company("Example Tech KK")
                .location("Tokyo, Japan")
                .employmentType("full_time")
                .description("Java Spring Boot MySQL Tokyo new graduate welcome 大卒 日本語")
                .tags(List.of("Java", "Spring Boot", "MySQL"))
                .publishedAt(Instant.now())
                .build();

        when(mynaviJobProvider.isAvailable()).thenReturn(true);
        when(mynaviJobProvider.fetchJobs()).thenReturn(List.of(listing));
        when(mynaviJobProvider.providerId()).thenReturn("mynavi");
        when(careerMapJobProvider.isAvailable()).thenReturn(true);
        when(careerMapJobProvider.fetchJobs()).thenReturn(List.of());
        when(careerMapJobProvider.providerId()).thenReturn("careermap");

        userA = userRepository.findByEmailIgnoreCase("career-a@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-a@tron.ai")
                        .displayName("Career A")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        userB = userRepository.findByEmailIgnoreCase("career-b@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-b@tron.ai")
                        .displayName("Career B")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authA = "Bearer " + jwtService.generateAccessToken(userA.getId(), userA.getEmail(), "USER", userA.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(userB.getId(), userB.getEmail(), "USER", userB.getDisplayName());
    }

    @Test
    @DisplayName("TEST B/C/I/J/K/N — career search, match, application, dashboard, isolation")
    void careerJourney() throws Exception {
        String searchBody = """
                {
                  "query": "Java Developer",
                  "location": "Tokyo",
                  "keywords": ["Java", "Spring Boot"],
                  "maxResults": 5,
                  "language": "en"
                }
                """;

        MvcResult searchResult = mockMvc.perform(post("/api/v1/career/jobs/search")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(searchBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        JsonNode searchJson = objectMapper.readTree(searchResult.getResponse().getContentAsString());
        assertThat(searchJson.size()).isGreaterThan(0);
        String jobId = searchJson.get(0).get("id").asText();
        String sourceUrl = searchJson.get(0).get("sourceUrl").asText();
        assertThat(sourceUrl).startsWith("https://");
        assertThat(sourceUrl).contains("mynavi.jp");

        mockMvc.perform(post("/api/v1/career/jobs/" + jobId + "/save")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"saved\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.saved").value(true));

        CareerJobEntity owned = careerJobRepository.findByIdAndUser_Id(jobId, userA.getId()).orElseThrow();
        assertThat(owned.getSourceUrl()).isEqualTo(sourceUrl);

        String appBody = """
                {
                  "jobId": "%s",
                  "company": "Example Tech KK",
                  "position": "Java Spring Boot Engineer",
                  "sourceUrl": "%s",
                  "status": "SAVED",
                  "notes": "Shortlisted from career search"
                }
                """.formatted(jobId, sourceUrl);

        MvcResult appResult = mockMvc.perform(post("/api/v1/career/applications")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("SAVED"))
                .andReturn();
        String appId = objectMapper.readTree(appResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/v1/career/applications/" + appId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PLANNING_TO_APPLY\",\"nextAction\":\"Prepare CV\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLANNING_TO_APPLY"));

        mockMvc.perform(get("/api/v1/career/applications")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(appId));

        mockMvc.perform(get("/api/v1/career/dashboard?language=ja")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedJobs").isNumber())
                .andExpect(jsonPath("$.applicationCount").isNumber());

        mockMvc.perform(get("/api/v1/career/ops/status")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.providers").isArray());

        mockMvc.perform(get("/api/v1/career/applications/" + appId)
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());

        // Cross-user job ownership isolation
        assertThat(careerJobRepository.findByIdAndUser_Id(jobId, userB.getId())).isEmpty();
    }

    @Test
    @DisplayName("TEST L — empty Mynavi/CareerMap fail gracefully without fabricated jobs")
    void emptyProvidersNoFabrication() throws Exception {
        when(mynaviJobProvider.fetchJobs()).thenReturn(List.of());
        when(careerMapJobProvider.fetchJobs()).thenReturn(List.of());

        mockMvc.perform(post("/api/v1/career/jobs/search")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "SE",
                                  "location": "Tokyo",
                                  "keywords": ["Java"],
                                  "maxResults": 5,
                                  "language": "ja"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
