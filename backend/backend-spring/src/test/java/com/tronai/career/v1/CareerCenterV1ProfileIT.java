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
                .andExpect(jsonPath("$.completenessScore").value(org.hamcrest.Matchers.greaterThan(0)));
    }
}
