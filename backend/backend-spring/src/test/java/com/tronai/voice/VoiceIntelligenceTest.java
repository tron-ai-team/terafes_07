package com.tronai.voice;

import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiMode;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.stt.SttTranscriptionResult;
import com.tronai.tts.TextToSpeechProvider;
import com.tronai.tts.WavAudioSupport;
import com.tronai.hybrid.HybridRoutingService;
import com.tronai.ai.AiProvider;
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
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Realistic EN/JA voice conversation tests comparing known spoken input → STT transcript → LLM answer.
 * STT and LLM are mocked separately so transcription errors are not confused with reasoning errors.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser
class VoiceIntelligenceTest {

    private static final byte[] FAKE_WAV = WavAudioSupport.wrapPcm16LeMono(
            new byte[]{0, 0, 20, 0, -20, 0, 0, 0, 10, 0}, 24000);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.tronai.auth.JwtService jwtService;

    @Autowired
    private com.tronai.user.UserRepository userRepository;

    @Autowired
    private VoiceProperties voiceProperties;

    @MockitoBean
    private SpeechToTextProvider speechToTextProvider;

    @MockitoBean
    private TextToSpeechProvider textToSpeechProvider;

    @MockitoBean
    private AiProvider aiProvider;

    @MockitoBean
    private HybridRoutingService hybridRoutingService;

    private String authHeader;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(aiProvider.getProviderName()).thenReturn("ollama");
        org.mockito.Mockito.lenient().when(aiProvider.isAvailable()).thenReturn(true);
        org.mockito.Mockito.lenient().when(textToSpeechProvider.isAvailable()).thenReturn(true);
        org.mockito.Mockito.lenient().when(textToSpeechProvider.synthesize(anyString())).thenReturn(FAKE_WAV);
        org.mockito.Mockito.lenient().when(hybridRoutingService.selectInferenceRoute()).thenReturn("LOCAL_OLLAMA");
        org.mockito.Mockito.lenient().when(hybridRoutingService.allowsCloudInference()).thenReturn(true);
        org.mockito.Mockito.lenient().when(hybridRoutingService.tryAcquireAiSlot()).thenReturn(true);

        com.tronai.user.User user = userRepository.findByEmailIgnoreCase("voice-intel@tron.ai")
                .orElseGet(() -> userRepository.save(com.tronai.user.User.builder()
                        .email("voice-intel@tron.ai")
                        .displayName("Voice Intel")
                        .passwordHash("x")
                        .role("USER")
                        .enabled(true)
                        .build()));
        authHeader = "Bearer " + jwtService.generateAccessToken(
                user.getId(), user.getEmail(), "USER", user.getDisplayName());
    }

    @Test
    @DisplayName("System prompt requires direct accurate spoken answers without greetings")
    void systemPromptIsDirect() {
        String en = VoiceService.buildVoiceSystemPrompt("en");
        assertThat(en).containsIgnoringCase("Answer the actual question directly");
        assertThat(en).containsIgnoringCase("Do not greet");
        assertThat(en).contains("English");
        assertThat(en).doesNotContain("one or two short spoken sentences");

        String ja = VoiceService.buildVoiceSystemPrompt("ja");
        assertThat(ja).contains("Japanese");
    }

    @Test
    @DisplayName("Cloud Voice FAST upgrades to SMART when prefer-smart is enabled")
    void cloudVoicePrefersSmart() {
        VoiceService service = new VoiceService(
                speechToTextProvider, null, null, null, null, null, null, null, null, null, null, null,
                voiceProperties, null, null);
        assertThat(service.resolveCloudVoiceMode(AiMode.FAST)).isEqualTo(AiMode.SMART);
        assertThat(service.resolveCloudVoiceMode(AiMode.AUTO)).isEqualTo(AiMode.SMART);
        assertThat(service.resolveCloudVoiceMode(AiMode.ULTRA)).isEqualTo(AiMode.ULTRA);
    }

    @Test
    @DisplayName("English: known spoken math question → transcript preserved → direct numeric answer")
    void englishMathQuestion() throws Exception {
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("What is twelve times seven?", 1.2, "en"));
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder()
                .text("Twelve times seven is eighty-four.")
                .actualModelId("qwen3:8b")
                .build());

        MockMultipartFile file = new MockMultipartFile("file", "mic.wav", "audio/wav", FAKE_WAV);
        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file)
                        .header("Authorization", authHeader)
                        .param("language", "en")
                        .param("sessionId", "voice-en-math-" + java.util.UUID.randomUUID()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript").value("What is twelve times seven?"))
                .andExpect(jsonPath("$.reply").value("Twelve times seven is eighty-four."))
                .andExpect(jsonPath("$.language").value("en"))
                .andExpect(jsonPath("$.engineModel").value("qwen3:8b"));

        ArgumentCaptor<com.tronai.ai.ChatGenerationRequest> captor =
                ArgumentCaptor.forClass(com.tronai.ai.ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getNumPredict()).isGreaterThanOrEqualTo(256);
        String system = captor.getValue().getMessages().get(0).getContent();
        assertThat(system).contains("English");
        assertThat(system).containsIgnoringCase("directly");
    }

    @Test
    @DisplayName("English multi-turn: follow-up uses conversation history")
    void englishFollowUpUsesHistory() throws Exception {
        AtomicInteger turn = new AtomicInteger();
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any())).thenAnswer(inv -> {
            int n = turn.incrementAndGet();
            if (n == 1) {
                return new SttTranscriptionResult("My favorite color is blue.", 1.0, "en");
            }
            return new SttTranscriptionResult("What color did I just mention?", 1.0, "en");
        });
        when(aiProvider.generate(any())).thenAnswer(inv -> {
            com.tronai.ai.ChatGenerationRequest req = inv.getArgument(0);
            List<ChatMessage> msgs = req.getMessages();
            String lastUser = msgs.get(msgs.size() - 1).getContent();
            if (lastUser.contains("favorite color")) {
                return ChatGenerationResult.builder().text("Got it, blue is noted.").build();
            }
            boolean sawBlue = msgs.stream().anyMatch(m ->
                    m.getContent() != null && m.getContent().toLowerCase().contains("blue"));
            assertThat(sawBlue).as("history must include prior blue mention").isTrue();
            return ChatGenerationResult.builder().text("You mentioned blue.").build();
        });

        String sessionId = "voice-en-follow-" + java.util.UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile("file", "mic.wav", "audio/wav", FAKE_WAV);

        mockMvc.perform(multipart("/api/v1/voice/turn").file(file)
                        .header("Authorization", authHeader)
                        .param("language", "en")
                        .param("sessionId", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value("Got it, blue is noted."));

        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(new MockMultipartFile("file", "mic.wav", "audio/wav", FAKE_WAV))
                        .header("Authorization", authHeader)
                        .param("language", "en")
                        .param("sessionId", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript").value("What color did I just mention?"))
                .andExpect(jsonPath("$.reply").value("You mentioned blue."));
    }

    @Test
    @DisplayName("Japanese: known transcript → Japanese reply language locked")
    void japaneseConversation() throws Exception {
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("今日の天気はどうですか", 1.5, "ja"));
        when(aiProvider.generate(any())).thenReturn(ChatGenerationResult.builder()
                .text("申し訳ありませんが、リアルタイムの天気データは持っていません。")
                .build());

        MockMultipartFile file = new MockMultipartFile("file", "mic.wav", "audio/wav", FAKE_WAV);
        MvcResult result = mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(file)
                        .header("Authorization", authHeader)
                        .param("language", "ja")
                        .param("sessionId", "voice-ja-" + java.util.UUID.randomUUID()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript").value("今日の天気はどうですか"))
                .andExpect(jsonPath("$.language").value("ja"))
                .andReturn();

        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).contains("天気");

        ArgumentCaptor<com.tronai.ai.ChatGenerationRequest> captor =
                ArgumentCaptor.forClass(com.tronai.ai.ChatGenerationRequest.class);
        verify(aiProvider).generate(captor.capture());
        assertThat(captor.getValue().getMessages().get(0).getContent()).contains("Japanese");
    }

    @Test
    @DisplayName("STT empty transcript is reported as STT failure, not LLM failure")
    void emptyTranscriptIsSttError() throws Exception {
        when(speechToTextProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("   ", 0.1, "en"));

        mockMvc.perform(multipart("/api/v1/voice/turn")
                        .file(new MockMultipartFile("file", "mic.wav", "audio/wav", FAKE_WAV))
                        .header("Authorization", authHeader)
                        .param("language", "en"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("No speech was recognized"));

        verify(aiProvider, never()).generate(any());
    }
}
