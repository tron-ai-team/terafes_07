package com.tronai.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.auth.dto.*;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.UserSettingsRepository;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserSettingsRepository userSettingsRepository;

    @Autowired
    private com.tronai.ai.gateway.usage.AiUsageEventRepository aiUsageEventRepository;

    @Autowired
    private com.tronai.ai.gateway.usage.AiQuotaReservationRepository aiQuotaReservationRepository;

    @Autowired
    private com.tronai.admin.quota.AiFeatureQuotaReservationRepository featureQuotaReservationRepository;

    @Autowired
    private com.tronai.admin.quota.AiFeatureDailyCounterRepository featureDailyCounterRepository;

    @Autowired
    private com.tronai.admin.quota.AdminUserQuotaOverrideRepository userQuotaOverrideRepository;

    @Autowired
    private com.tronai.admin.quota.AdminQuotaAdjustmentRepository quotaAdjustmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void cleanUp() {
        // Child tables without ON DELETE CASCADE must be cleared before users.
        featureQuotaReservationRepository.deleteAll();
        featureDailyCounterRepository.deleteAll();
        userQuotaOverrideRepository.deleteAll();
        quotaAdjustmentRepository.deleteAll();
        aiQuotaReservationRepository.deleteAll();
        aiUsageEventRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userSettingsRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Registration succeeds, normalizes email to lowercase, hashes password with BCrypt, and issues tokens")
    void registerSuccess() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("Test.User@Example.COM")
                .password("securePassword123")
                .displayName("Test User")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("tron_refresh_token"))
                .andExpect(cookie().httpOnly("tron_refresh_token", true))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.email").value("test.user@example.com"))
                .andExpect(jsonPath("$.user.displayName").value("Test User"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.user.password_hash").doesNotExist())
                .andReturn();

        // Verify DB state
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase("test.user@example.com");
        assertThat(userOpt).isPresent();
        User user = userOpt.get();
        assertThat(user.getEmail()).isEqualTo("test.user@example.com");
        assertThat(passwordEncoder.matches("securePassword123", user.getPasswordHash())).isTrue();
        assertThat(user.getPasswordHash()).doesNotContain("securePassword123");
    }

    @Test
    @DisplayName("Registration rejects duplicate email case-insensitively with HTTP 409")
    void registerDuplicateEmail409() throws Exception {
        RegisterRequest req1 = RegisterRequest.builder()
                .email("duplicate@example.com")
                .password("password123")
                .displayName("First")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        RegisterRequest req2 = RegisterRequest.builder()
                .email("DUPLICATE@example.com")
                .password("differentPassword123")
                .displayName("Second")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Email already registered"));
    }

    @Test
    @DisplayName("Login with valid credentials issues access token and hashed refresh token cookie")
    void loginSuccess() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("login@example.com")
                .password("password123")
                .displayName("Login User")
                .build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)));

        LoginRequest login = LoginRequest.builder()
                .email("LOGIN@example.com")
                .password("password123")
                .build();

        MvcResult loginRes = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("tron_refresh_token"))
                .andExpect(cookie().httpOnly("tron_refresh_token", true))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("login@example.com"))
                .andReturn();

        // Verify refresh token in DB is hashed and not plaintext
        Cookie refreshCookie = loginRes.getResponse().getCookie("tron_refresh_token");
        assertThat(refreshCookie).isNotNull();
        String rawToken = refreshCookie.getValue();

        var tokens = refreshTokenRepository.findAll();
        assertThat(tokens).isNotEmpty();
        assertThat(tokens.get(0).getTokenHash()).isNotEqualTo(rawToken);
    }

    @Test
    @DisplayName("Login with incorrect password returns HTTP 401 with {detail}")
    void loginWrongPassword401() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("wrongpass@example.com")
                .password("correctPassword")
                .displayName("Wrong Pass")
                .build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)));

        LoginRequest login = LoginRequest.builder()
                .email("wrongpass@example.com")
                .password("totallyWrongPassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    @DisplayName("Refresh token rotates token, returns new access token, and rejects revoked token")
    void refreshTokenRotationAndRevocation() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("refresh@example.com")
                .password("password123")
                .displayName("Refresher")
                .build();
        MvcResult regRes = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andReturn();

        Cookie originalCookie = regRes.getResponse().getCookie("tron_refresh_token");
        assertThat(originalCookie).isNotNull();

        // First refresh succeeds
        MvcResult refreshRes = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(originalCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(cookie().exists("tron_refresh_token"))
                .andReturn();

        // Second refresh with old rotated cookie fails
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(originalCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Logout revokes refresh token and clears refresh cookie")
    void logoutRevokesToken() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("logout@example.com")
                .password("password123")
                .displayName("Logouter")
                .build();
        MvcResult regRes = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andReturn();

        Cookie refreshCookie = regRes.getResponse().getCookie("tron_refresh_token");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("tron_refresh_token", 0));

        // Attempting to refresh now fails
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns current user, 401 when unauthenticated")
    void meEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        RegisterRequest reg = RegisterRequest.builder()
                .email("me@example.com")
                .password("password123")
                .displayName("Me User")
                .build();
        MvcResult regRes = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andReturn();

        String token = objectMapper.readTree(regRes.getResponse().getContentAsString()).get("accessToken").asText();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@example.com"))
                .andExpect(jsonPath("$.displayName").value("Me User"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    @DisplayName("User settings endpoint supports GET and PATCH for authenticated user")
    void userSettingsEndpoint() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("settings@example.com")
                .password("password123")
                .displayName("Settings User")
                .build();
        MvcResult regRes = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andReturn();

        String token = objectMapper.readTree(regRes.getResponse().getContentAsString()).get("accessToken").asText();

        // 1. Initial settings
        mockMvc.perform(get("/api/v1/users/me/settings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferredLanguage").value("ja"))
                .andExpect(jsonPath("$.preferredModel").value("qwen3:8b"));

        // 2. Patch settings
        mockMvc.perform(patch("/api/v1/users/me/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"preferredLanguage\":\"en\",\"preferredModel\":\"qwen3-8b\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferredLanguage").value("en"));

        // 3. Verify persisted
        mockMvc.perform(get("/api/v1/users/me/settings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferredLanguage").value("en"));
    }

    @Test
    @DisplayName("Logout with refresh cookie returns 200, clears cookie, and rejects subsequent refresh")
    void logoutWithCookieReturns200AndRevokesRefresh() throws Exception {
        RegisterRequest reg = RegisterRequest.builder()
                .email("logout-cookie@example.com")
                .password("password123")
                .displayName("Logout Cookie")
                .build();
        MvcResult loginRes = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refresh = loginRes.getResponse().getCookie("tron_refresh_token");
        assertThat(refresh).isNotNull();
        assertThat(refresh.getValue()).isNotBlank();

        mockMvc.perform(post("/api/v1/auth/logout").cookie(refresh))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detail").value("Logged out successfully"))
                .andExpect(cookie().maxAge("tron_refresh_token", 0));

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refresh))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Logout without body or cookie still returns 200 (idempotent)")
    void logoutWithoutBodyReturns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detail").value("Logged out successfully"))
                .andExpect(cookie().maxAge("tron_refresh_token", 0));
    }

    @Test
    @DisplayName("Logout tolerates form-urlencoded POST without JSON body (scripted clients)")
    void logoutFormUrlEncodedReturns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detail").value("Logged out successfully"));
    }
}
