package com.tronai;

import com.tronai.ai.AiProvider;
import com.tronai.queue.BackgroundJobPublisher;
import com.tronai.storage.ObjectStorageService;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.tts.TextToSpeechProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Health Endpoint Tests:
 *   GET /health => reports status, service, database, ollama, model, stt, tts, storage, and queue connectivity.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private SpeechToTextProvider speechToTextProvider;

    @MockitoBean
    private TextToSpeechProvider textToSpeechProvider;

    @MockitoBean
    private ObjectStorageService objectStorageService;

    @MockitoBean
    private BackgroundJobPublisher backgroundJobPublisher;

    @Test
    @DisplayName("Health endpoint returns HTTP 200 when database, ollama, stt, and tts are reachable")
    void healthReturns200WhenAllReachable() throws Exception {
        when(aiProvider.isAvailable()).thenReturn(true);
        when(speechToTextProvider.isAvailable()).thenReturn(true);
        when(textToSpeechProvider.isAvailable()).thenReturn(true);
        when(objectStorageService.isAvailable()).thenReturn(true);
        when(backgroundJobPublisher.isAvailable()).thenReturn(true);

        mockMvc.perform(get("/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("tron-ai-spring"))
                .andExpect(jsonPath("$.database").value("reachable"))
                .andExpect(jsonPath("$.ollama").value("reachable"))
                .andExpect(jsonPath("$.model").value("qwen3-8b"))
                .andExpect(jsonPath("$.stt").value("reachable"))
                .andExpect(jsonPath("$.tts").value("reachable"))
                .andExpect(jsonPath("$.storage").value("reachable"))
                .andExpect(jsonPath("$.queue").value("reachable"))
                .andExpect(jsonPath("$.cloudAi").value("disabled"));
    }

    @Test
    @DisplayName("Health endpoint returns HTTP 503 degraded when ollama is unreachable")
    void healthReturns503WhenOllamaUnreachable() throws Exception {
        when(aiProvider.isAvailable()).thenReturn(false);
        when(speechToTextProvider.isAvailable()).thenReturn(true);
        when(textToSpeechProvider.isAvailable()).thenReturn(true);

        mockMvc.perform(get("/health").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("degraded"))
                .andExpect(jsonPath("$.database").value("reachable"))
                .andExpect(jsonPath("$.ollama").value("unreachable"));
    }
    @Test
    void releaseReadinessIsPublicAndIndependentOfExternalAi() throws Exception {
        when(aiProvider.isAvailable()).thenReturn(false);
        when(objectStorageService.isAvailable()).thenReturn(true);
        mockMvc.perform(get("/health/ready").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ready"))
                .andExpect(jsonPath("$.database").value("reachable"));
    }

}
