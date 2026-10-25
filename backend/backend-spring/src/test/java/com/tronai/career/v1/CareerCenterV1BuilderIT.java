package com.tronai.career.v1;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.auth.JwtService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
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
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterV1BuilderIT {

    @MockitoBean AiProvider aiProvider;
    @Autowired MockMvc mockMvc;
    @Autowired JwtService jwtService;
    @Autowired UserRepository userRepository;
    @Autowired ObjectMapper objectMapper;

    private String auth;
    private String authB;
    private Path evidenceDir;

    @BeforeEach
    void setUp() throws Exception {
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        User user = userRepository.findByEmailIgnoreCase("career-v1-builder@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-v1-builder@tron.ai")
                        .displayName("Career V1 Builder")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        User other = userRepository.findByEmailIgnoreCase("career-v1-other@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("career-v1-other@tron.ai")
                        .displayName("Other")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        auth = "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), "USER", user.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(other.getId(), other.getEmail(), "USER", other.getDisplayName());
        evidenceDir = Paths.get("../../_career_center_v1_evidence").toAbsolutePath().normalize();
        Files.createDirectories(evidenceDir);
    }

    @Test
    @DisplayName("TEST A/B/C/D/E/N — profile, draft, AI assist, version, XLSX+PDF export, isolation")
    void builderJourney() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Taro Yamada",
                                  "nameJa":"山田 太郎",
                                  "furigana":"ヤマダ タロウ",
                                  "email":"taro@example.com",
                                  "phone":"090-0000-0000",
                                  "dateOfBirth":"2003-04-01",
                                  "nationality":"日本",
                                  "addressText":"東京都新宿区1-1-1",
                                  "selfPr":"JavaとSpring Bootでチーム開発経験があります。",
                                  "skills":["Java","Spring Boot"],
                                  "education":[{"school":"○○大学","detail":"○○大学 情報工学科 卒業"}]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completenessScore").isNumber());

        MvcResult draftResult = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RIREKISHO_JA\",\"versionLabel\":\"v1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        String draftId = objectMapper.readTree(draftResult.getResponse().getContentAsString()).get("id").asText();

        MvcResult assist = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/ai-assist")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fieldKey\":\"selfPr\",\"instruction\":\"Make this more professional\",\"language\":\"ja\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.suggestionId").isNotEmpty())
                .andReturn();
        JsonNode assistJson = objectMapper.readTree(assist.getResponse().getContentAsString());
        String suggestionId = assistJson.path("suggestionId").asText();
        String original = assistJson.path("originalText").asText("");
        assertThat(suggestionId).isNotBlank();

        // Reject leaves draft unchanged
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + suggestionId + "/reject")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        MvcResult getDraft = mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(getDraft.getResponse().getContentAsString())
                .path("payload").path("selfPr").asText("")).isEqualTo(original);

        // New suggestion + accept
        MvcResult assist2 = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/ai-assist")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fieldKey\":\"selfPr\",\"instruction\":\"丁寧\",\"language\":\"ja\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String sid2 = objectMapper.readTree(assist2.getResponse().getContentAsString()).get("suggestionId").asText();
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + sid2 + "/accept")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionId").isNotEmpty());

        MvcResult xlsxMeta = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/export?format=xlsx")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").isNotEmpty())
                .andExpect(jsonPath("$.contentType").value("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn();
        String xlsxDocId = objectMapper.readTree(xlsxMeta.getResponse().getContentAsString()).get("documentId").asText();

        MvcResult xlsxBytes = mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + xlsxDocId + "/download")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn();
        byte[] xlsx = xlsxBytes.getResponse().getContentAsByteArray();
        assertThat(xlsx.length).isGreaterThan(1000);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            assertThat(wb.getSheet("1面")).isNotNull();
            assertThat(wb.getSheet("2面 ")).isNotNull();
        }
        Files.write(evidenceDir.resolve("generated_rirekisho.xlsx"), xlsx);

        MvcResult pdfMeta = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/export?format=pdf")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andReturn();
        String pdfDocId = objectMapper.readTree(pdfMeta.getResponse().getContentAsString()).get("documentId").asText();
        byte[] pdf = mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + pdfDocId + "/download")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(pdf.length).isGreaterThan(500);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
        }
        Files.write(evidenceDir.resolve("generated_rirekisho.pdf"), pdf);

        // Isolation
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + pdfDocId + "/download")
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("TEST I/J — company analysis on example.com + transfer pending to CV")
    void companyAnalysisAndTransfer() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Taro\",\"selfPr\":\"Team Java projects\"}"))
                .andExpect(status().isOk());

        MvcResult draft = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RIREKISHO_JA\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String draftId = objectMapper.readTree(draft.getResponse().getContentAsString()).get("id").asText();

        MvcResult analysis = mockMvc.perform(post("/api/v1/career/company-analyses")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "companyName":"Example Company",
                                  "websiteUrl":"https://example.com",
                                  "cvDraftId":"%s",
                                  "language":"ja"
                                }
                                """.formatted(draftId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.sources").isArray())
                .andReturn();
        JsonNode a = objectMapper.readTree(analysis.getResponse().getContentAsString());
        String analysisId = a.get("id").asText();
        Files.writeString(evidenceDir.resolve("company_analysis_example.json"), a.toPrettyString());

        mockMvc.perform(get("/api/v1/career/company-analyses/" + analysisId)
                        .header("Authorization", authB))
                .andExpect(status().isNotFound());

        MvcResult transfer = mockMvc.perform(post("/api/v1/career/company-analyses/" + analysisId + "/transfer-to-cv")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"draftId\":\"" + draftId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draftUnchanged").value(true))
                .andReturn();
        assertThat(objectMapper.readTree(transfer.getResponse().getContentAsString())
                .get("transferred").size()).isGreaterThan(0);

        // Draft payload still original until accept
        MvcResult after = mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(after.getResponse().getContentAsString())
                .path("payload").path("selfPr").asText("")).doesNotContain("事業領域との接点");
    }
}
