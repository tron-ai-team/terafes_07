package com.tronai.cv;

import com.tronai.ai.AiProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser
class CvEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    private String authHeader;

    @MockitoBean
    private AiProvider aiProvider;

    @BeforeEach
    void setUp() {
        lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        lenient().when(aiProvider.isAvailable()).thenReturn(true);
        com.tronai.user.User user = userRepository.findByEmailIgnoreCase("cv-tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("cv-tester@tron.ai")
                        .displayName("CV Tester")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), "USER", user.getDisplayName());
    }

    @Test
    @DisplayName("Unauthenticated upload to /demo/cv/upload returns HTTP 401")
    void unauthenticatedUploadReturns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/demo/cv/upload").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Valid PDF upload to /demo/cv/upload returns HTTP 200 with exact frontend schema")
    void validPdfUploadReturns200() throws Exception {
        String cvText = """
                Taro Yamada
                Software Engineer
                
                Education:
                Tokyo Institute of Technology, 2017-2021, Computer Science
                
                Skills:
                Java, Spring Boot, MySQL, Docker, Kubernetes
                
                Work Experience:
                CyberAgent, Backend Engineer, 2021-Present, High-throughput API design
                """;
        byte[] pdfBytes = PdfTestUtils.createPdf(cvText, 1);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "taro_resume.pdf",
                "application/pdf",
                pdfBytes
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.filename").value("taro_resume.pdf"))
                .andExpect(jsonPath("$.page_count").value(1))
                .andExpect(jsonPath("$.text_characters").isNumber())
                .andExpect(jsonPath("$.education").isArray())
                .andExpect(jsonPath("$.skills").isArray())
                .andExpect(jsonPath("$.work_experience").isArray())
                .andExpect(jsonPath("$.extraction_notes").isArray());
    }

    @Test
    @DisplayName("Valid TXT upload to /demo/cv/upload returns HTTP 200 with extracted sections")
    void validTxtUploadReturns200() throws Exception {
        String cvText = """
                Hanako Suzuki
                
                Education:
                Kyoto University, 2018-2022, Informatics
                
                Skills:
                Python, FastAPI, PyTorch, Docker
                
                Work Experience:
                Sony, AI Engineer, 2022-Present, Computer Vision R&D
                """;
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hanako_cv.txt",
                "text/plain",
                cvText.getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").value("hanako_cv.txt"))
                .andExpect(jsonPath("$.page_count").value(1))
                .andExpect(jsonPath("$.skills[0]").value("Python"))
                .andExpect(jsonPath("$.education[0].school").value("Kyoto University"))
                .andExpect(jsonPath("$.work_experience[0].organization").value("Sony"));
    }

    @Test
    @DisplayName("Corrupt DOCX bytes return HTTP 400 (DOCX is an accepted type but must be valid OOXML)")
    void corruptDocxReturns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "fake docx content".getBytes()
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The DOCX structure could not be read"));
    }

    @Test
    @DisplayName("Unsupported file format (.png) returns HTTP 415 with PDF/DOCX acceptance message")
    void imageFileReturns415() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "photo.png",
                "image/png",
                new byte[]{1, 2, 3, 4}
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.detail").value("Only PDF or DOCX files are accepted"));
    }

    @Test
    @DisplayName("Empty file returns HTTP 400 with {detail: 'The file is not a valid PDF'}")
    void emptyFileReturns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The file is not a valid PDF"));
    }

    @Test
    @DisplayName("Malformed document not starting with %PDF- returns HTTP 400 with {detail: 'The file is not a valid PDF'}")
    void malformedPdfReturns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "corrupt.pdf",
                "application/pdf",
                "NOT A VALID PDF FILE HEADER".getBytes()
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The file is not a valid PDF"));
    }

    @Test
    @DisplayName("Scanned PDF with < 20 characters returns HTTP 422 with legacy Japanese error detail")
    void shortTextPdfReturns422() throws Exception {
        byte[] shortPdf = PdfTestUtils.createPdf("Short", 1);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "scanned.pdf",
                "application/pdf",
                shortPdf
        );

        mockMvc.perform(multipart("/demo/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("このPDFからテキストを抽出できませんでした。スキャン画像のみのPDFの可能性があります。テキストを選択できるPDFをアップロードしてください。"));
    }

    @Test
    @DisplayName("POST /api/cv/upload also accepts valid PDF and returns identical schema")
    void apiRouteAlsoWorks() throws Exception {
        String cvText = "Candidate Name with more than twenty characters of plain text content in English.";
        byte[] pdfBytes = PdfTestUtils.createPdf(cvText, 1);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "api_cv.pdf",
                "application/pdf",
                pdfBytes
        );

        mockMvc.perform(multipart("/api/cv/upload").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").value("api_cv.pdf"))
                .andExpect(jsonPath("$.page_count").value(1))
                .andExpect(jsonPath("$.education").isArray());
    }
}
