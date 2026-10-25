package com.tronai.voice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.stt.SttTranscriptionResult;
import com.tronai.tts.AudioStoreService;
import com.tronai.tts.TextToSpeechProvider;
import com.tronai.voice.dto.SpeakRequest;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser
class VoiceEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    private String authHeader;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private AudioStoreService audioStoreService;

    @MockitoBean
    private SpeechToTextProvider speechToTextProvider;

    @MockitoBean
    private TextToSpeechProvider textToSpeechProvider;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private com.tronai.hybrid.HybridRoutingService hybrid;

    private static final byte[] FAKE_WAV = new byte[]{
            'R', 'I', 'F', 'F', 36, 0, 0, 0, 'W', 'A', 'V', 'E', 'f', 'm', 't', ' '
    };

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        // Provider generation is mocked: keep routing hermetic too.
        org.mockito.Mockito.when(hybrid.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.when(hybrid.tryAcquireAiSlot()).thenReturn(true);
        org.mockito.Mockito.when(hybrid.allowsCloudInference()).thenReturn(false);
        org.mockito.Mockito.lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        org.mockito.Mockito.lenient().when(aiProvider.isAvailable()).thenReturn(true);
        org.mockito.Mockito.lenient().when(textToSpeechProvider.isAvailable()).thenReturn(true);
        com.tronai.user.User user = userRepository.findByEmailIgnoreCase("voice-tester@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("voice-tester@tron.ai")
                        .displayName("Voice Tester")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(
                user.getId(), user.getEmail(), "USER", user.getDisplayName());
    }

    @Test
    void unavailableInferenceReturns503WithoutCallingProviders() throws Exception {
        when(hybrid.selectInferenceRoute()).thenReturn("UNAVAILABLE");
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("こんにちは", 2.5, "ja"));

        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(new MockMultipartFile("file", "audio.wav", "audio/wav", FAKE_WAV))
                        .header("Authorization", authHeader)
                        .param("language", "ja"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value(
                        "AI is unavailable: local and cloud routing are both disabled or unhealthy"));
        org.mockito.Mockito.verify(aiProvider, org.mockito.Mockito.never()).generate(any());
        org.mockito.Mockito.verify(textToSpeechProvider, org.mockito.Mockito.never()).synthesize(anyString());
    }

    @Test
    @DisplayName("Unauthenticated voice turn returns HTTP 401")
    void unauthenticatedVoiceTurnReturns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "audio.wav", "audio/wav", FAKE_WAV);
        mockMvc.perform(multipart("/api/v1/voice/turn").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /demo/voice/speak returns WAV audio bytes")
    void demoSpeakSuccess() throws Exception {
        when(textToSpeechProvider.synthesize(anyString())).thenReturn(FAKE_WAV);

        SpeakRequest request = new SpeakRequest("こんにちは");

        mockMvc.perform(post("/demo/voice/speak")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "audio/wav"))
                .andExpect(content().bytes(FAKE_WAV));
    }

    @Test
    @DisplayName("POST /demo/voice/speak rejects empty text with HTTP 400")
    void demoSpeakRejectsEmptyText() throws Exception {
        SpeakRequest request = new SpeakRequest("   ");

        mockMvc.perform(post("/demo/voice/speak")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Text to synthesize cannot be empty"));
    }

    @Test
    @DisplayName("POST /api/v1/voice/turn processes audio turn with STT, LLM, and VOICEVOX")
    void voiceTurnSuccess() throws Exception {
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("自己紹介をお願いします", 2.5, "ja"));

        when(aiProvider.generate(any()))
                .thenReturn(ChatGenerationResult.builder()
                        .text("初めまして、よろしくお願いします。")
                        .truncated(false)
                        .build());

        when(textToSpeechProvider.synthesize(anyString())).thenReturn(FAKE_WAV);

        MockMultipartFile file = new MockMultipartFile(
                "file", "audio.wav", "audio/wav", FAKE_WAV
        );

        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file)
                        .header("Authorization", authHeader)
                        .param("language", "ja"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript").value("自己紹介をお願いします"))
                .andExpect(jsonPath("$.reply").value("初めまして、よろしくお願いします。"))
                .andExpect(jsonPath("$.language").value("ja"))
                .andExpect(jsonPath("$.speechSupported").value(true))
                .andExpect(jsonPath("$.audio_url").exists())
                .andExpect(jsonPath("$.latency_ms").exists())
                .andExpect(jsonPath("$.aiProfile").value("FAST"))
                .andExpect(jsonPath("$.locked").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/voice/turn with QUALITY profile locks session and subsequent profile change attempt returns HTTP 409")
    void voiceTurnQualityLockAndRejectChange() throws Exception {
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("クオリティモードでテストします", 2.5, "ja"));

        when(aiProvider.generate(any()))
                .thenReturn(ChatGenerationResult.builder()
                        .text("クオリティモードで応答しました。")
                        .truncated(false)
                        .build());

        when(textToSpeechProvider.synthesize(anyString())).thenReturn(FAKE_WAV);

        String sessionId = "voice-lock-" + java.util.UUID.randomUUID();
        MockMultipartFile file1 = new MockMultipartFile("file", "audio.wav", "audio/wav", FAKE_WAV);

        // Turn 1 with QUALITY
        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file1)
                        .header("Authorization", authHeader)
                        .param("sessionId", sessionId)
                        .param("aiProfile", "QUALITY")
                        .param("language", "ja"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiProfile").value("QUALITY"))
                .andExpect(jsonPath("$.model").value("tron-quality"))
                .andExpect(jsonPath("$.locked").value(true));

        // Turn 2 attempting FAST on same sessionId -> 409 Conflict
        MockMultipartFile file2 = new MockMultipartFile("file", "audio.wav", "audio/wav", FAKE_WAV);
        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file2)
                        .header("Authorization", authHeader)
                        .param("sessionId", sessionId)
                        .param("aiProfile", "FAST")
                        .param("language", "ja"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("AI profile cannot be changed after this voice session has started."));
    }

    @Test
    @DisplayName("POST /api/v1/voice/turn rejects empty audio with HTTP 400")
    void voiceTurnRejectsEmptyAudio() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.wav", "audio/wav", new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/voice/turn").file(file)
                        .header("Authorization", authHeader))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The audio file is empty"));
    }

    @Test
    @DisplayName("POST /api/v1/voice/turn rejects unknown language with HTTP 422")
    void voiceTurnRejectsUnknownLanguage() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "audio.wav", "audio/wav", FAKE_WAV
        );

        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file)
                        .header("Authorization", authHeader)
                        .param("language", "klingon"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    @DisplayName("GET /api/v1/voice/audio/{clipId} serves stored audio clip")
    void getVoiceAudioSuccess() throws Exception {
        String clipId = audioStoreService.storeClip(FAKE_WAV);

        mockMvc.perform(get("/api/v1/voice/audio/" + clipId))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "audio/wav"))
                .andExpect(header().string("Content-Disposition", "inline; filename=reply.wav"))
                .andExpect(content().bytes(FAKE_WAV));
    }

    @Test
    @DisplayName("GET /api/v1/voice/audio/{clipId} returns 404 for unknown clip")
    void getVoiceAudioNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/voice/audio/missingclip"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Voice audio was not found or has expired"));
    }
}
