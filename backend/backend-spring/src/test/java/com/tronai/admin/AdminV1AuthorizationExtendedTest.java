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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminV1AuthorizationExtendedTest {

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

    User owner;
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

        owner = users.save(User.builder()
                .email("owner-admin@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Owner")
                .role("OWNER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        admin = users.save(User.builder()
                .email("admin-ext@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Admin")
                .role("ADMIN")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        normal = users.save(User.builder()
                .email("user-ext@example.com")
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
    @DisplayName("Anonymous cannot access admin user search")
    void anonymousUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/search"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("USER cannot access admin quotas policies")
    void userForbiddenOnQuotas() throws Exception {
        mockMvc.perform(get("/api/v1/admin/quotas/policies").header("Authorization", bearer(normal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN can search users with loginMethods and no passwordHash")
    void adminSearchOk() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/search").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].loginMethods").exists())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("ADMIN cannot change roles")
    void adminCannotChangeRole() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/" + normal.getId() + "/role")
                        .header("Authorization", bearer(admin))
                        .contentType("application/json")
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OWNER can change USER role to ADMIN")
    void ownerCanChangeRole() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/" + normal.getId() + "/role")
                        .header("Authorization", bearer(owner))
                        .contentType("application/json")
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }
}
