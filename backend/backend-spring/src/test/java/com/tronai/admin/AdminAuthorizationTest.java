package com.tronai.admin;

import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.UserSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAuthorizationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired UserSettingsRepository settings;
    @Autowired JwtService jwtService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired com.tronai.auth.RefreshTokenRepository refreshTokens;
    @Autowired com.tronai.ai.gateway.usage.AiUsageEventRepository usageEvents;
    @Autowired com.tronai.ai.gateway.usage.AiQuotaReservationRepository reservations;
    @Autowired com.tronai.admin.quota.AiFeatureQuotaReservationRepository featureReservations;
    @Autowired com.tronai.admin.quota.AiFeatureDailyCounterRepository featureCounters;

    User admin;
    User normal;

    @BeforeEach
    void clean() {
        featureReservations.deleteAll();
        featureCounters.deleteAll();
        reservations.deleteAll();
        usageEvents.deleteAll();
        refreshTokens.deleteAll();
        settings.deleteAll();
        users.deleteAll();

        admin = users.save(User.builder()
                .email("admin-v4@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Admin")
                .role("ADMIN")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        normal = users.save(User.builder()
                .email("user-v4@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("User")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    private String bearer(User u) {
        return "Bearer " + jwtService.generateAccessToken(u.getId(), u.getEmail(), u.getRole(), u.getDisplayName());
    }

    @Test
    @DisplayName("USER role cannot access admin dashboard")
    void userForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard").header("Authorization", bearer(normal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN can load dashboard with real counters")
    void adminOk() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registeredUsers").isNumber())
                .andExpect(jsonPath("$.secretsVisible").value(false))
                .andExpect(jsonPath("$.hybrid").exists());
    }

    @Test
    @DisplayName("ADMIN can suspend a USER")
    void suspendUser() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + normal.getId() + "/suspend")
                        .header("Authorization", bearer(admin))
                        .contentType("application/json")
                        .content("{\"reason\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }
}
