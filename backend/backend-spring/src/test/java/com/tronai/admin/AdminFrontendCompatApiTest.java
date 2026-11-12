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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminFrontendCompatApiTest {

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
    @Autowired com.tronai.admin.quota.AdminUserQuotaOverrideRepository overrides;

    User owner;
    User admin;
    User normal;

    @BeforeEach
    void clean() {
        featureReservations.deleteAll();
        featureCounters.deleteAll();
        overrides.deleteAll();
        reservations.deleteAll();
        usageEvents.deleteAll();
        refreshTokens.deleteAll();
        settings.deleteAll();
        users.deleteAll();

        owner = users.save(User.builder()
                .email("owner-compat@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Owner")
                .role("OWNER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        admin = users.save(User.builder()
                .email("admin-compat@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Admin")
                .role("ADMIN")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        normal = users.save(User.builder()
                .email("user-compat@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("User")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole(), user.getDisplayName());
    }

    @Test
    @DisplayName("Frontend global quota GET/PUT facade works")
    void globalQuotaFacade() throws Exception {
        mockMvc.perform(get("/api/v1/admin/quotas/global").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiChatDailyLimit").exists())
                .andExpect(jsonPath("$.featuresEnabled.aiChat").exists())
                .andExpect(jsonPath("$.dailyTokenBudget", is("UNAVAILABLE")));

        mockMvc.perform(put("/api/v1/admin/quotas/global")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"aiChatDailyLimit\":42,\"featuresEnabled\":{\"aiChat\":true}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiChatDailyLimit", is(42)));
    }

    @Test
    @DisplayName("Insecure temporaryPassword create is rejected")
    void rejectInsecureCreate() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x@example.com\",\"temporaryPassword\":\"BadPass123!\",\"role\":\"USER\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("INSECURE_PASSWORD_CREATE_DISABLED")));
    }

    @Test
    @DisplayName("Frontend analytics aggregate never fabricates spend")
    void analyticsAggregateHonest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/analytics?range=7d").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overview").exists())
                .andExpect(jsonPath("$.overview.estimatedSpend", is("UNAVAILABLE")))
                .andExpect(jsonPath("$", hasKey("dailyRequests")))
                .andExpect(jsonPath("$.seriesMeasurement", is("unavailable")));
    }

    @Test
    @DisplayName("Security overview + OWNER emergency revoke endpoint exist")
    void securityOverviewAndEmergency() throws Exception {
        mockMvc.perform(get("/api/v1/admin/security/overview").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mfa.status", is("NOT_IMPLEMENTED")));

        mockMvc.perform(post("/api/v1/admin/security/emergency-revoke-all")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/admin/security/emergency-revoke-all")
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownersPreserved", is(true)));
    }

    @Test
    @DisplayName("Provider mutation stays disabled; ping is cached-only")
    void providerSafety() throws Exception {
        mockMvc.perform(put("/api/v1/admin/providers/groq")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/admin/providers").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secretsExposed", is(false)));
    }

    @Test
    @DisplayName("USER cannot hit frontend-compat admin routes")
    void userForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/quotas/global").header("Authorization", bearer(normal)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/analytics").header("Authorization", bearer(normal)))
                .andExpect(status().isForbidden());
    }
}
