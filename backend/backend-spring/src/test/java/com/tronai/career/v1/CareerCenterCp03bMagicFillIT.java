package com.tronai.career.v1;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.GatewayProviderId;
import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterCp03bMagicFillIT {

    @MockitoBean AiProvider aiProvider;
    @MockitoBean AiGateway aiGateway;
    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired ObjectMapper objectMapper;

    private String authA;
    private String authB;
    private Path evidenceDir;

    @BeforeEach
    void setUp() throws Exception {
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        User a = userRepository.findByEmailIgnoreCase("cp03b-magic-a@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp03b-magic-a@tron.ai")
                        .displayName("CP03B A")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        User b = userRepository.findByEmailIgnoreCase("cp03b-magic-b@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp03b-magic-b@tron.ai")
                        .displayName("CP03B B")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authA = "Bearer " + jwtService.generateAccessToken(a.getId(), a.getEmail(), "USER", a.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(b.getId(), b.getEmail(), "USER", b.getDisplayName());
        evidenceDir = Paths.get("../../_cp03b_magic_evidence").toAbsolutePath().normalize();
        Files.createDirectories(evidenceDir);

        when(aiGateway.generate(any())).thenReturn(AiGenerationResult.builder()
                .provider(GatewayProviderId.OLLAMA)
                .modelId("qwen3:8b")
                .text("""
                        {"fields":{"selfPr":{"proposedText":"JavaとSpring Bootでバックエンド開発を学習しています。","reason":"丁寧な表現","clarificationNeeded":false}}}
                        """)
                .build());
    }

    @Test
    @DisplayName("CP-03B — magic fill, approve, delete, year/month mapping, preview PDF, isolation")
    void magicFillPreviewDeleteAndMapping() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Magic User",
                                  "nameJa":"マジック",
                                  "furigana":"マジック",
                                  "dateOfBirth":"2002-12-02",
                                  "email":"magic@example.com",
                                  "phone":"090-2222-3333",
                                  "addressText":"東京都中野区",
                                  "postalCode":"164-0001",
                                  "selfPr":"JavaとSpring Bootを勉強しています。",
                                  "education":[
                                    {"schoolName":"東京テクニカルカレッジ","department":"情報処理科","startYear":2025,"startMonth":4,"status":"入学"}
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        MvcResult draftRes = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RIREKISHO_JA\",\"versionLabel\":\"cp03b-mf\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.dateOfBirth").value("2002-12-02"))
                .andReturn();
        String draftId = objectMapper.readTree(draftRes.getResponse().getContentAsString()).get("id").asText();

        // Clear DOB on draft to force PROFILE_FACT suggestion + keep selfPr for AI
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":{
                                  "fullName":"Magic User",
                                  "nameJa":"マジック",
                                  "dateOfBirth":"",
                                  "selfPr":"JavaとSpring Bootを勉強しています。",
                                  "education":[{"schoolName":"東京テクニカルカレッジ","department":"情報処理科","startYear":2025,"startMonth":4,"status":"入学"}]
                                }}
                                """))
                .andExpect(status().isOk());

        MvcResult magic = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/magic-fill")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\":\"ja\",\"allowCloud\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applied").value(false))
                .andExpect(jsonPath("$.ollamaUsed").value(true))
                .andExpect(jsonPath("$.suggestions").isArray())
                .andReturn();
        JsonNode magicJson = objectMapper.readTree(magic.getResponse().getContentAsString());
        assertThat(magicJson.get("suggestions").size()).isGreaterThan(0);
        // Draft DOB still blank until accept
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.dateOfBirth").value(""));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/magic-fill/decide")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"acceptAll\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").isNumber());

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.dateOfBirth").value("2002-12-02"));

        // XLSX mapping: year in B, month in C, school in D
        MvcResult xlsxMeta = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/export?format=xlsx")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andReturn();
        String xlsxDoc = objectMapper.readTree(xlsxMeta.getResponse().getContentAsString()).get("documentId").asText();
        byte[] xlsx = mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + xlsxDoc + "/download")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        Files.write(evidenceDir.resolve("cp03b_rirekisho.xlsx"), xlsx);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            Sheet s1 = wb.getSheet("1面");
            assertThat(s1).isNotNull();
            // Excel row 15 = index 14
            assertThat(s1.getRow(14).getCell(1).getStringCellValue()).isEqualTo("2025");
            assertThat(s1.getRow(14).getCell(2).getStringCellValue()).isEqualTo("4");
            assertThat(s1.getRow(14).getCell(3).getStringCellValue()).contains("テクニカル");
            // 〒 preserved / postal in F7
            assertThat(s1.getRow(6).getCell(2).getStringCellValue()).contains("〒");
        }

        // Preview PDF (same pipeline as export) — require real PDF when Gotenberg is up
        MvcResult preview = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/preview?format=pdf")
                        .header("Authorization", authA))
                .andReturn();
        int previewStatus = preview.getResponse().getStatus();
        if (previewStatus == 503 || previewStatus == 502) {
            Files.writeString(evidenceDir.resolve("cp03b_preview_blocked.txt"),
                    "Gotenberg unavailable: " + preview.getResponse().getContentAsString());
        } else {
            assertThat(previewStatus).as(preview.getResponse().getContentAsString()).isEqualTo(200);
            JsonNode previewJson = objectMapper.readTree(preview.getResponse().getContentAsString());
            assertThat(previewJson.path("preview").asBoolean()).isTrue();
            String pdfDoc = previewJson.get("documentId").asText();
            byte[] pdf = mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + pdfDoc + "/download")
                            .header("Authorization", authA))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
            try (PDDocument doc = Loader.loadPDF(pdf)) {
                assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            }
            Files.write(evidenceDir.resolve("cp03b_preview.pdf"), pdf);
        }

        // Soft delete + isolation
        mockMvc.perform(delete("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authB))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true));
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authA))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts").header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id=='" + draftId + "')]").doesNotExist());
    }
}
