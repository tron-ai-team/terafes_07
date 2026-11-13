package com.tronai.admin.announcement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.UserSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
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
class AdminAnnouncementTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired UserSettingsRepository settings;
    @Autowired AdminAnnouncementRepository announcements;
    @Autowired JwtService jwtService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    User admin;
    User normal;

    @BeforeEach
    void clean() {
        announcements.deleteAll();
        settings.deleteAll();
        users.deleteAll();
        admin = users.save(User.builder()
                .email("ann-admin@example.com")
                .passwordHash(passwordEncoder.encode("password12345"))
                .displayName("Admin")
                .role("ADMIN")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        normal = users.save(User.builder()
                .email("ann-user@example.com")
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
    void publishAndListActive() throws Exception {
        String body = """
                {"titleEn":"Maintenance","titleJa":"メンテ","bodyEn":"Tonight","bodyJa":"今夜",
                "severity":"INFO","audience":"ALL"}
                """;
        var createResult = mockMvc.perform(post("/api/v1/admin/announcements")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn();
        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long id = created.get("id").asLong();

        mockMvc.perform(post("/api/v1/admin/announcements/" + id + "/publish")
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/announcements/active")
                        .header("Authorization", bearer(normal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].titleEn").value("Maintenance"));
    }
}
