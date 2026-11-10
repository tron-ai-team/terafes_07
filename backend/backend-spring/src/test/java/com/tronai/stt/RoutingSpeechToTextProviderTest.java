package com.tronai.stt;

import com.tronai.ai.profile.AiProfile;
import com.tronai.voice.VoiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoutingSpeechToTextProviderTest {

    @Mock
    private RemoteWhisperSpeechToTextProvider localProvider;

    @Mock
    private GroqWhisperSpeechToTextProvider cloudProvider;

    private SttProperties properties;
    private RoutingSpeechToTextProvider routing;

    @BeforeEach
    void setUp() {
        properties = new SttProperties();
        properties.setPreferLocal(true);
        properties.setGroqEnabled(true);
        routing = new RoutingSpeechToTextProvider(properties, localProvider, cloudProvider);
    }

    @Test
    @DisplayName("Uses Groq Whisper when local STT_BASE_URL is empty")
    void usesCloudWhenLocalBaseUrlEmpty() {
        properties.setBaseUrl("");
        when(cloudProvider.isConfigured()).thenReturn(true);
        when(cloudProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("hello", 1.0, "en"));

        SttTranscriptionResult result = routing.transcribe(
                "mic.wav", "audio/wav", new byte[]{1, 2, 3}, "en", AiProfile.FAST);

        assertEquals("hello", result.getText());
        verify(cloudProvider).transcribe(any(), any(), any(), any(), eq(AiProfile.FAST));
        verify(localProvider, never()).transcribe(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Falls back to Groq when local STT fails")
    void fallsBackToCloudWhenLocalFails() {
        properties.setBaseUrl("http://127.0.0.1:8091");
        when(cloudProvider.isConfigured()).thenReturn(true);
        when(localProvider.transcribe(any(), any(), any(), any(), any()))
                .thenThrow(new VoiceException(HttpStatus.SERVICE_UNAVAILABLE, "STT service is unavailable"));
        when(cloudProvider.transcribe(any(), any(), any(), any(), any()))
                .thenReturn(new SttTranscriptionResult("こんにちは", 1.2, "ja"));

        SttTranscriptionResult result = routing.transcribe(
                "mic.wav", "audio/wav", new byte[]{1, 2, 3}, "ja", AiProfile.SMART);

        assertEquals("こんにちは", result.getText());
        verify(cloudProvider).transcribe(any(), any(), any(), any(), eq(AiProfile.SMART));
    }

    @Test
    @DisplayName("Throws 503 when neither local nor cloud STT is available")
    void throwsWhenNoProvider() {
        properties.setBaseUrl("");
        when(cloudProvider.isConfigured()).thenReturn(false);

        VoiceException ex = assertThrows(VoiceException.class, () ->
                routing.transcribe("mic.wav", "audio/wav", new byte[]{1}, "ja", AiProfile.FAST));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertTrue(ex.getMessage().contains("GROQ_API_KEY") || ex.getMessage().contains("unavailable"));
    }

    @Test
    @DisplayName("isAvailable is true when Groq Whisper is configured")
    void availableWhenCloudConfigured() {
        properties.setBaseUrl("");
        when(cloudProvider.isAvailable()).thenReturn(true);
        assertTrue(routing.isAvailable());
    }
}
