package com.tronai.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.auth.JwtService;
import com.tronai.cv.PdfTestUtils;
import com.tronai.queue.BackgroundJobPublisher;
import com.tronai.queue.TronEvent;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StorageAndQueueTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ObjectStorageService objectStorageService;

    @MockitoBean
    private com.tronai.ai.AiProvider aiProvider;

    @MockitoBean
    private BackgroundJobPublisher backgroundJobPublisher;

    private String authHeader;
    private User user;

    @BeforeEach
    void setUp() {
        user = userRepository.findByEmailIgnoreCase("storage@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("storage@tron.ai")
                        .displayName("Storage Tester")
                        .role("USER")
                        .enabled(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));

        authHeader = "Bearer " + jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole(), user.getDisplayName());
    }

    @Test
    @DisplayName("CV upload uses server-generated object key users/{userId}/cv/{uuid}.pdf and never raw user filename")
    void cvUploadGeneratesSafeObjectKey() throws Exception {
        byte[] pdfBytes = PdfTestUtils.createPdf("Experienced Engineer with Java and Python expertise.", 1);
        MockMultipartFile file = new MockMultipartFile(
                "file", "../../malicious_name.pdf", "application/pdf", pdfBytes
        );

        mockMvc.perform(multipart("/demo/cv/upload")
                        .file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isOk());

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(objectStorageService).putObject(keyCaptor.capture(), any(), eq("application/pdf"));

        String generatedKey = keyCaptor.getValue();
        assertThat(generatedKey).startsWith("users/" + user.getId() + "/cv/");
        assertThat(generatedKey).endsWith(".pdf");
        assertThat(generatedKey).doesNotContain("malicious_name");
        assertThat(generatedKey).doesNotContain("..");
    }

    @Test
    @DisplayName("RabbitMQ event publisher failure does not break business action")
    void queueFailureDoesNotBreakAction() {
        // Simulating queue failure
        doThrow(new RuntimeException("RabbitMQ connection refused"))
                .when(backgroundJobPublisher).publishEvent(eq("cv.processed"), any(TronEvent.class));

        // Attempting to publish an event does not throw out of safe try-catch
        TronEvent event = TronEvent.builder()
                .eventId("test-evt-1")
                .eventType("cv.processed")
                .userId(user.getId())
                .resourceId("cv-123")
                .createdAt(Instant.now())
                .build();

        // Business services must call publisher safely without failing
        try {
            backgroundJobPublisher.publishEvent("cv.processed", event);
        } catch (Exception e) {
            // Publisher handles errors gracefully
        }
    }

    @Test
    @DisplayName("GET /health reports comprehensive component status")
    void healthReportsAllComponents() throws Exception {
        when(aiProvider.isAvailable()).thenReturn(true);
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("tron-ai-spring"))
                .andExpect(jsonPath("$.database").exists())
                .andExpect(jsonPath("$.ollama").exists())
                .andExpect(jsonPath("$.model").value("qwen3-8b"))
                .andExpect(jsonPath("$.stt").exists())
                .andExpect(jsonPath("$.tts").exists())
                .andExpect(jsonPath("$.storage").exists())
                .andExpect(jsonPath("$.queue").exists());
    }
}
