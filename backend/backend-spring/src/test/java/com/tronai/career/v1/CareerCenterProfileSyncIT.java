package com.tronai.career.v1;

import com.tronai.ai.AiProvider;
import com.tronai.auth.JwtService;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterProfileSyncIT {

    @MockitoBean AiProvider aiProvider;
    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;

    private String authA;
    private String authB;

    @BeforeEach
    void setUp() {
        User a = userRepository.findByEmailIgnoreCase("cp02-sync-a@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp02-sync-a@tron.ai")
                        .displayName("CP02 User A")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        User b = userRepository.findByEmailIgnoreCase("cp02-sync-b@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp02-sync-b@tron.ai")
                        .displayName("CP02 User B")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authA = "Bearer " + jwtService.generateAccessToken(a.getId(), a.getEmail(), "USER", a.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(b.getId(), b.getEmail(), "USER", b.getDisplayName());
    }

    @Test
    @DisplayName("Candidate Profile save is reflected on GET /api/v1/users/me summary")
    void candidateSaveAppearsOnUserMe() throws Exception {
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("cp02-sync-a@tron.ai"))
                .andExpect(jsonPath("$.candidateProfile").exists());

        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Sync Test User",
                                  "email":"candidate-contact@example.com",
                                  "skills":["Java","React"],
                                  "education":[{"schoolName":"Tokyo Tech","schoolType":"University","endYear":2026,"status":"Expected graduation"}],
                                  "certifications":[{"name":"基本情報","status":"Obtained"}],
                                  "languages":[{"language":"Japanese","certification":"JLPT N2","verified":true}],
                                  "projects":[{"name":"TRON Demo"}],
                                  "preferences":{
                                    "desiredJobTitles":["Backend Engineer"],
                                    "preferredPrefectures":["Tokyo"],
                                    "expectedGraduationYear":"2026"
                                  },
                                  "selfPr":"Reliable engineer.",
                                  "allowOverwriteConfirmed":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Sync Test User"));

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("cp02-sync-a@tron.ai"))
                .andExpect(jsonPath("$.candidateProfile.profileExists").value(true))
                .andExpect(jsonPath("$.candidateProfile.fullName").value("Sync Test User"))
                .andExpect(jsonPath("$.candidateProfile.contactEmail").value("candidate-contact@example.com"))
                .andExpect(jsonPath("$.candidateProfile.skills", hasItems("Java", "React")))
                .andExpect(jsonPath("$.candidateProfile.targetJobs", hasItem("Backend Engineer")))
                .andExpect(jsonPath("$.candidateProfile.preferredLocations", hasItem("Tokyo")))
                .andExpect(jsonPath("$.candidateProfile.expectedGraduationYear").value("2026"))
                .andExpect(jsonPath("$.candidateProfile.jlptLevel").value("N2"))
                .andExpect(jsonPath("$.candidateProfile.projects", hasItem("TRON Demo")))
                .andExpect(jsonPath("$.candidateProfile.certifications", hasItem("基本情報")))
                .andExpect(jsonPath("$.candidateProfile.completenessScore").value(greaterThan(0)))
                .andExpect(jsonPath("$.candidateProfile.education", not(empty())));

        // Update candidate profile → user me must show new values
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Sync Test User Updated",
                                  "skills":["Java","Spring Boot"],
                                  "preferences":{
                                    "desiredJobTitles":["Full Stack Engineer"],
                                    "preferredPrefectures":["Osaka"],
                                    "expectedGraduationYear":"2027"
                                  },
                                  "allowOverwriteConfirmed":true
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateProfile.fullName").value("Sync Test User Updated"))
                .andExpect(jsonPath("$.candidateProfile.targetJobs", hasItem("Full Stack Engineer")))
                .andExpect(jsonPath("$.candidateProfile.preferredLocations", hasItem("Osaka")))
                .andExpect(jsonPath("$.candidateProfile.expectedGraduationYear").value("2027"))
                .andExpect(jsonPath("$.candidateProfile.skills", hasItem("Spring Boot")));
    }

    @Test
    @DisplayName("User isolation: User B cannot see User A candidate summary")
    void userIsolationOnUserMe() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Private Owner Name","selfPr":"secret-pr","skills":["SecretSkill"],"allowOverwriteConfirmed":true}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", authB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("cp02-sync-b@tron.ai"))
                .andExpect(jsonPath("$.candidateProfile.profileExists").value(false))
                .andExpect(jsonPath("$.candidateProfile.fullName").doesNotExist())
                .andExpect(jsonPath("$.candidateProfile.skills", empty()));
    }

    @Test
    @DisplayName("Unauthenticated /users/me rejected")
    void unauthenticatedRejected() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }
}
