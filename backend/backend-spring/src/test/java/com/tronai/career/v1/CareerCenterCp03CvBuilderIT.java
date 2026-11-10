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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CareerCenterCp03CvBuilderIT {

    @MockitoBean AiProvider aiProvider;
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
        User a = userRepository.findByEmailIgnoreCase("cp03-cv-a@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp03-cv-a@tron.ai")
                        .displayName("CP03 A")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        User b = userRepository.findByEmailIgnoreCase("cp03-cv-b@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("cp03-cv-b@tron.ai")
                        .displayName("CP03 B")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authA = "Bearer " + jwtService.generateAccessToken(a.getId(), a.getEmail(), "USER", a.getDisplayName());
        authB = "Bearer " + jwtService.generateAccessToken(b.getId(), b.getEmail(), "USER", b.getDisplayName());
        evidenceDir = Paths.get("../../_cp03_cv_evidence").toAbsolutePath().normalize();
        Files.createDirectories(evidenceDir);
    }

    @Test
    @DisplayName("CP-03 — DOB + education mapping, sanitize overflow, templates, versions, XLSX/PDF, isolation")
    void cp03BuilderJourney() throws Exception {
        mockMvc.perform(put("/api/v1/career/profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Thushan Test",
                                  "nameJa":"トゥシャーン",
                                  "furigana":"トゥシャーン",
                                  "email":"cp03-a@example.com",
                                  "phone":"090-1111-2222",
                                  "dateOfBirth":"2002/12/02",
                                  "nationality":"Sri Lanka",
                                  "addressText":"東京都中野区",
                                  "selfPr":"JavaとSpringで学習中です。",
                                  "careerGoals":"Backend engineer in Japan",
                                  "skills":[{"name":"Java"},{"name":"Spring Boot"}],
                                  "education":[
                                    {"schoolName":"Taxila Central College","schoolType":"High School","startYear":2013,"endYear":2021,"status":"Graduated"},
                                    {"schoolName":"東京テクニカルカレッジ","schoolType":"Vocational / Specialized School","department":"情報処理科","startYear":2025,"endYear":2027,"status":"Expected graduation"}
                                  ],
                                  "certifications":[{"name":"JLPT N3"}]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dateOfBirth").value("2002-12-02"));

        // New RIREKISHO draft inherits DOB + education from profile
        MvcResult draftRes = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RIREKISHO_JA\",\"versionLabel\":\"cp03-ri\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RIREKISHO_JA"))
                .andExpect(jsonPath("$.payload.dateOfBirth").value("2002-12-02"))
                .andExpect(jsonPath("$.payload.fullName").value("Thushan Test"))
                .andReturn();
        String draftId = objectMapper.readTree(draftRes.getResponse().getContentAsString()).get("id").asText();
        JsonNode payload = objectMapper.readTree(draftRes.getResponse().getContentAsString()).get("payload");
        assertThat(payload.get("education").isArray()).isTrue();
        assertThat(payload.get("education").size()).isEqualTo(2);

        // Polluted OCR education (44-like) → sanitize keeps real schools
        List<Map<String, Object>> polluted = new ArrayList<>();
        polluted.add(Map.of("school", "2013 5", "detail", ""));
        polluted.add(Map.of("school", "学　歴", "detail", ""));
        polluted.add(Map.of("school", "現住所", "detail", ""));
        polluted.add(Map.of("school", "生年月日", "detail", ""));
        polluted.add(Map.of("school", "専門学校東京テクニカルカレッジ情報処理科　入学", "detail", ""));
        polluted.add(Map.of("school", "専門学校東京テクニカルカレッジ情報処理科　卒業見込", "detail", ""));
        polluted.add(Map.of("school", "タクシラー学校、ガンパハ 高等学校　卒業 (スリランカ)", "detail", ""));
        polluted.add(Map.of("school", "職　歴", "detail", ""));
        polluted.add(Map.of("school", "な　し", "detail", ""));
        for (int i = 0; i < 35; i++) {
            polluted.add(Map.of("school", "国", "detail", ""));
        }
        Map<String, Object> updateBody = new LinkedHashMap<>();
        Map<String, Object> updatePayload = objectMapper.convertValue(payload, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        updatePayload.put("education", polluted);
        updateBody.put("payload", updatePayload);
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateBody)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId + "/education-preview")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inputCount").value(44))
                .andExpect(jsonPath("$.keptCount").value(3))
                .andExpect(jsonPath("$.overflow").value(false));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/sanitize-education")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.education.length()").value(3));

        // Refresh from profile restores DOB + structured education (does not invent)
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"payload\":{\"fullName\":\"Thushan Test\",\"dateOfBirth\":\"\",\"education\":[],\"selfPr\":\"x\",\"hobbies\":\"keep-me\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.dateOfBirth").value(""));

        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/refresh-from-profile")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"replaceAll\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.dateOfBirth").value("2002-12-02"))
                .andExpect(jsonPath("$.payload.education.length()").value(2))
                .andExpect(jsonPath("$.payload.hobbies").value("keep-me"));

        // Version save + restore
        MvcResult ver = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionId").isNotEmpty())
                .andReturn();
        String versionId = objectMapper.readTree(ver.getResponse().getContentAsString()).get("versionId").asText();
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId + "/versions")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].versionId").value(versionId));

        // Template change is explicit and must stay consistent
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RESUME_EN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RESUME_EN"));
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RIREKISHO_JA\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RIREKISHO_JA"));

        // Unknown template rejected
        mockMvc.perform(put("/api/v1/career/cv-builder/drafts/" + draftId)
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"NOT_A_TEMPLATE\"}"))
                .andExpect(status().isBadRequest());

        // XLSX + PDF for RIREKISHO
        byte[] xlsx = exportAndDownload(draftId, "xlsx", authA);
        assertThat(xlsx.length).isGreaterThan(1000);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            assertThat(wb.getSheet("1面")).isNotNull();
        }
        Files.write(evidenceDir.resolve("cp03_rirekisho.xlsx"), xlsx);

        byte[] pdf = exportAndDownload(draftId, "pdf", authA);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        }
        Files.write(evidenceDir.resolve("cp03_rirekisho.pdf"), pdf);

        // SHOKUMU + RESUME_EN drafts
        String shokumuId = createDraft("SHOKUMU_JA", "cp03-sh");
        byte[] shXlsx = exportAndDownload(shokumuId, "xlsx", authA);
        Files.write(evidenceDir.resolve("cp03_shokumu.xlsx"), shXlsx);
        assertThat(shXlsx.length).isGreaterThan(500);

        String resumeId = createDraft("RESUME_EN", "cp03-en");
        byte[] enXlsx = exportAndDownload(resumeId, "xlsx", authA);
        Files.write(evidenceDir.resolve("cp03_resume_en.xlsx"), enXlsx);
        assertThat(enXlsx.length).isGreaterThan(500);

        // AI assist does not overwrite until accept
        MvcResult assist = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/ai-assist")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fieldKey\":\"selfPr\",\"instruction\":\"丁寧に\",\"language\":\"ja\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        String sid = objectMapper.readTree(assist.getResponse().getContentAsString()).get("suggestionId").asText();
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/suggestions/" + sid + "/reject")
                        .header("Authorization", authA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        // Isolation — user B cannot read user A draft; user B can create own draft
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId).header("Authorization", authB))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/career/cv-builder/drafts").header("Authorization", authB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"RESUME_EN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value("RESUME_EN"));
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authB))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/career/cv-builder/drafts/" + draftId))
                .andExpect(status().isUnauthorized());
    }

    private String createDraft(String template, String label) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/career/cv-builder/drafts")
                        .header("Authorization", authA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"templateCode\":\"" + template + "\",\"versionLabel\":\"" + label + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateCode").value(template))
                .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("id").asText();
    }

    private byte[] exportAndDownload(String draftId, String format, String auth) throws Exception {
        MvcResult meta = mockMvc.perform(post("/api/v1/career/cv-builder/drafts/" + draftId + "/export?format=" + format)
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").isNotEmpty())
                .andReturn();
        String docId = objectMapper.readTree(meta.getResponse().getContentAsString()).get("documentId").asText();
        return mockMvc.perform(get("/api/v1/career/cv-builder/documents/" + docId + "/download")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
    }
}
