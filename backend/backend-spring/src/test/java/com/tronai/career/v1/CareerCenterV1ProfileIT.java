package com.tronai.career.v1;

import com.tronai.ai.AiProvider;
import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterV1ProfileIT {

    @MockitoBean AiProvider aiProvider;
    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;

    private String auth;
    private String otherAuth;

    @BeforeEach
    void setUp() {
        User user = userRepository.findByEmailIgnoreCase("career-v1@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-v1@tron.ai")
                        .displayName("Career V1")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        auth = "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), "USER", user.getDisplayName());

        User other = userRepository.findByEmailIgnoreCase("career-v1-other@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-v1-other@tron.ai")
                        .displayName("Career Other")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        otherAuth = "Bearer " + jwtService.generateAccessToken(other.getId(), other.getEmail(), "USER", other.getDisplayName());
    }

    @Test
    void profileCompletenessRoundTrip() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test User","email":"test@example.com","skills":["Java"],"education":[{"school":"U"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completenessScore").isNumber());

        mockMvc.perform(get("/api/v1/career/profile/completeness")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completenessScore").value(greaterThan(0)));
    }

    @Test
    void acceptsSlashDateOfBirthAndPersistsIso() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Date User",
                                  "email":"date-user@example.com",
                                  "dateOfBirth":"2002/12/02",
                                  "phone":"+81-90-1111-2222",
                                  "prefecture":"Tokyo",
                                  "city":"Shibuya",
                                  "education":[{"schoolName":"Tokyo University","schoolType":"University","startYear":2021,"endYear":2025,"status":"Expected graduation"}],
                                  "skills":[{"name":"Java","category":"Programming Languages","proficiency":"Intermediate"}],
                                  "languages":[{"language":"Japanese","proficiency":"N2","certification":"JLPT N2","verified":true}],
                                  "projects":[{"name":"TRON AI","description":"Career support","githubUrl":"https://github.com/example/tron"}],
                                  "certifications":[{"name":"基本情報","status":"Obtained"}],
                                  "preferences":{"desiredJobTitles":["Backend Engineer"],"preferredPrefectures":["Tokyo"],"jobCategory":"新卒","expectedGraduationYear":"2025"},
                                  "selfPr":"I build reliable systems.",
                                  "careerGoals":"Become a backend engineer",
                                  "noWorkExperience":true,
                                  "allowOverwriteConfirmed":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateOfBirth").value("2002-12-02"))
                .andExpect(jsonPath("$.skills[0].name").value("Java"))
                .andExpect(jsonPath("$.languages[0].language").value("Japanese"))
                .andExpect(jsonPath("$.projects[0].name").value("TRON AI"))
                .andExpect(jsonPath("$.noWorkExperience").value(true))
                .andExpect(jsonPath("$.completenessScore").value(greaterThanOrEqualTo(70)))
                .andExpect(jsonPath("$.missingFields", not(hasItem("Date of birth"))));

        mockMvc.perform(get("/api/v1/career/profile")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateOfBirth").value("2002-12-02"))
                .andExpect(jsonPath("$.preferences.expectedGraduationYear").value("2025"));
    }

    @Test
    void invalidDateOfBirthReturnsClearMessage() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Bad Date","dateOfBirth":"not-a-date"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail", containsString("date of birth")));
    }

    @Test
    void userIsolationPreventsCrossRead() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Owner Only","email":"owner@example.com","selfPr":"secret-self-pr","allowOverwriteConfirmed":true}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/career/profile")
                        .header("Authorization", otherAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selfPr").doesNotExist())
                .andExpect(jsonPath("$.fullName").doesNotExist());
    }

    @Test
    void educationDateRangeValidation() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"education":[{"schoolName":"U","startYear":2025,"endYear":2020}]}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail", containsString("Education end date")));
    }

    @Test
    void unauthenticatedProfileRejected() throws Exception {
        mockMvc.perform(get("/api/v1/career/profile"))
                .andExpect(status().isUnauthorized());
    }
}
