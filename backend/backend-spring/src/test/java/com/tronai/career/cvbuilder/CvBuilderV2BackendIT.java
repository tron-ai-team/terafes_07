package com.tronai.career.cvbuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CvBuilderV2BackendIT {

    @MockitoBean AiProvider aiProvider;
    @MockitoBean AiGateway aiGateway;
    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired ObjectMapper objectMapper;
    @Autowired CvBuilderVersionRepository versionRepository;

    private String authA;
    private String authB;

    @BeforeEach
    void setUp() {
        lenient().when(aiProvider.getProviderName()).thenReturn("mock");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        User a = userRepository.findByEmailIgnoreCase("cvv2-a@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cvv2-a@tron.ai")
                        .displayName("CV V2 A")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        User b = userRepository.findByEmailIgnoreCase("cvv2-b@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cvv2-b@tron.ai")
                        .displayName("CV V2 B")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authA = "Bearer " + jwtService.generateAccessToken(a.getId(), a.getEmail(), "USER", a.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(b.getId(), b.getEmail(), "USER", b.getDisplayName());

        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.GROQ)
                .modelId("openai/gpt-oss-120b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"大学でJavaとSpring Bootを学び、責任感を持って貢献できます。","reason":"表現整理","clarificationNeeded":false}}}
                        """)
                .build());
    }

    @Test
    @DisplayName("Magic Fill defaults to cloud SMART and requires human approval")
    void magicFillCloudFirstHumanApproval() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{
                                  "fullName":"CV V2 A",
                                  "nameJa":"シーブイ",
                                  "dateOfBirth":"2002-12-02",
                                  "selfPr":"Javaを勉強しています。"
                                }}
                                """))
                .andExpect(status().isOk());

        MvcResult magic = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/magic-fill")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(false))
                .andExpect(jsonPath("$.cloudAllowed").value(true))
                .andExpect(jsonPath("$.cloudUsed").value(true))
                .andExpect(jsonPath("$.suggestions").isArray())
                .andReturn();

        ArgumentCaptor<AiRequestContext> cap = ArgumentCaptor.forClass(AiRequestContext.class);
        verify(aiGateway, atLeastOnce()).generate(cap.capture());
        assertThat(cap.getValue().isAllowCloud()).isTrue();

        JsonNode magicJson = objectMapper.readTree(magic.getResponse().getContentAsString());
        JsonNode selfPrSuggestion = null;
        for (JsonNode s : magicJson.get("suggestions")) {
            if ("selfPr".equals(s.path("fieldKey").asText())) {
                selfPrSuggestion = s;
                break;
            }
        }
        assertThat(selfPrSuggestion).isNotNull();
        String suggestionId = selfPrSuggestion.get("suggestionId").asText();
        String original = selfPrSuggestion.get("originalText").asText();
        assertThat(original).isEqualTo("Javaを勉強しています。");

        // Draft unchanged until accept
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.selfPr").value("Javaを勉強しています。"));

        // Reject preserves original
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + suggestionId + "/reject")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.selfPr").value(original));
    }

    @Test
    @DisplayName("Accept Magic Fill applies suggestion; cross-user denied")
    void magicFillAcceptAndAuthz() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{"fullName":"A","nameJa":"エー","dateOfBirth":"2002-01-01","selfPr":"Spring Bootを学習中です。"}}
                                """))
                .andExpect(status().isOk());

        MvcResult magic = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/magic-fill")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode suggestions = objectMapper.readTree(magic.getResponse().getContentAsString()).get("suggestions");
        String sid = null;
        for (JsonNode s : suggestions) {
            if ("selfPr".equals(s.path("fieldKey").asText())) {
                sid = s.get("suggestionId").asText();
                break;
            }
        }
        assertThat(sid).isNotBlank();

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + sid + "/accept")
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/magic-fill")
                        .header("Authorization", authB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + sid + "/accept")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.selfPr").value(org.hamcrest.Matchers.containsString("Spring Boot")));
    }

    @Test
    @DisplayName("Profile sync FILL_BLANK preserves manual CV edits")
    void profileSyncPreservesManualEdits() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{
                                  "fullName":"Manual Name",
                                  "nameJa":"マニュアル",
                                  "dateOfBirth":"",
                                  "email":"",
                                  "selfPr":"手動自己PR",
                                  "hobbies":"読書",
                                  "education":[{"schoolName":"Manual School","startYear":2024,"startMonth":4}]
                                }}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/refresh-from-profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"FILL_BLANK\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.syncMode").value("FILL_BLANK"))
                .andExpect(jsonPath("$.payload.fullName").value("Manual Name"))
                .andExpect(jsonPath("$.payload.selfPr").value("手動自己PR"))
                .andExpect(jsonPath("$.payload.hobbies").value("読書"))
                .andExpect(jsonPath("$.payload.dateOfBirth").value("2002-12-02"))
                .andExpect(jsonPath("$.payload.email").value("cvv2@example.com"))
                .andExpect(jsonPath("$.syncReport.preserved", org.hamcrest.Matchers.hasItem("fullName")))
                .andExpect(jsonPath("$.syncReport.filled", org.hamcrest.Matchers.hasItems("dateOfBirth", "email")));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/refresh-from-profile")
                        .header("Authorization", authB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("History: create/save/version/restore/soft-delete preserves later versions")
    void historyVersionRestoreSoftDelete() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{"fullName":"V1","nameJa":"ブイイチ","dateOfBirth":"2002-12-02","selfPr":"version1"}}
                                """))
                .andExpect(status().isOk());
        MvcResult v1 = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(1))
                .andReturn();
        String version1Id = objectMapper.readTree(v1.getResponse().getContentAsString()).get("versionId").asText();

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{"fullName":"V2","nameJa":"ブイニ","dateOfBirth":"2002-12-02","selfPr":"version2"}}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(2));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/versions/" + version1Id + "/restore")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.selfPr").value("version1"))
                .andExpect(jsonPath("$.historyPreserved").value(true));

        List<CvBuilderVersionEntity> versions = versionRepository.findByDraftIdOrderByVersionNumberDesc(draftId);
        assertThat(versions).hasSize(2);

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(delete("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true));

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isNotFound());

        // Soft-delete does not wipe version rows
        assertThat(versionRepository.findByDraftIdOrderByVersionNumberDesc(draftId)).hasSize(2);
    }

    @Test
    @DisplayName("Concurrent update with expectedUpdatedAt returns 409")
    void optimisticConcurrencyConflict() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);
        MvcResult get = mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andReturn();
        String updatedAt = objectMapper.readTree(get.getResponse().getContentAsString()).get("updatedAt").asText();

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{"fullName":"First","nameJa":"イチ","dateOfBirth":"2002-12-02"}}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"expectedUpdatedAt":"%s","payload":{"fullName":"Stale","nameJa":"イチ","dateOfBirth":"2002-12-02"}}
                                """.formatted(updatedAt)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("HTML preview remains authorized and Japanese")
    void previewHtmlRegression() throws Exception {
        seedProfile(authA);
        String draftId = createDraft(authA);
        MvcResult preview = mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId + "/preview-html")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/html")))
                .andReturn();
        String html = preview.getResponse().getContentAsString();
        assertThat(html).contains("履歴書");

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId + "/preview-html")
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Public templates include RIREKISHO_JA and RESUME_EN; create accepts both; SHOKUMU_JA blocked for new drafts")
    void publicTemplatesAndCreateResumeEn() throws Exception {
        mockMvc.perform(get("/api/v1/career/cv-builder/templates").header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code=='RIREKISHO_JA')]").exists())
                .andExpect(jsonPath("$[?(@.code=='RESUME_EN')]").exists())
                .andExpect(jsonPath("$[?(@.code=='SHOKUMU_JA')]").doesNotExist());

        MvcResult en = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RESUME_EN\",\"versionLabel\":\"en-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RESUME_EN"))
                .andReturn();
        assertThat(objectMapper.readTree(en.getResponse().getContentAsString()).get("id").asText()).isNotBlank();

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"SHOKUMU_JA\"}"))
                .andExpect(status().isBadRequest());
    }

    private void seedProfile(String auth) throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Profile Name",
                                  "nameJa":"プロフィール",
                                  "furigana":"プロフィール",
                                  "dateOfBirth":"2002-12-02",
                                  "email":"cvv2@example.com",
                                  "phone":"09012345678",
                                  "postalCode":"1640001",
                                  "addressText":"東京都中野区",
                                  "selfPr":"プロフィール自己PR",
                                  "education":[{"schoolName":"東京テクニカルカレッジ","department":"情報処理科","startYear":2025,"startMonth":4,"status":"在学"}],
                                  "skills":[{"name":"Java"},{"name":"Spring Boot"}],
                                  "certifications":[{"name":"基本情報技術者"}],
                                  "projects":[{"name":"TRON AI"}],
                                  "allowOverwriteConfirmed":true
                                }
                                """))
                .andExpect(status().isOk());
    }

    private String createDraft(String auth) throws Exception {
        MvcResult draftRes = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"versionLabel\":\"cv-v2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RIREKISHO_JA"))
                .andReturn();
        return objectMapper.readTree(draftRes.getResponse().getContentAsString()).get("id").asText();
    }
}
