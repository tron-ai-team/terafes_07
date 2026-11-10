package com.tronai.stt;

import com.tronai.ai.profile.AiProfile;
import com.tronai.voice.VoiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Primary STT entry point: prefer local faster-whisper when {@code STT_BASE_URL} is set and healthy,
 * otherwise use Groq Whisper cloud. Preserves the local worker for the future RTX AI node.
 */
@Component
@Primary
public class RoutingSpeechToTextProvider implements SpeechToTextProvider {

    private static final Logger log = LoggerFactory.getLogger(RoutingSpeechToTextProvider.class);

    private final SttProperties properties;
    private final RemoteWhisperSpeechToTextProvider localProvider;
    private final GroqWhisperSpeechToTextProvider cloudProvider;

    public RoutingSpeechToTextProvider(
            SttProperties properties,
            RemoteWhisperSpeechToTextProvider localProvider,
            GroqWhisperSpeechToTextProvider cloudProvider) {
        this.properties = properties;
        this.localProvider = localProvider;
        this.cloudProvider = cloudProvider;
    }

    @Override
    public SttTranscriptionResult transcribe(
            String filename,
            String contentType,
            byte[] data,
            String language,
            AiProfile profile) {
        boolean localConfigured = hasLocalBaseUrl();
        boolean cloudConfigured = cloudProvider.isConfigured();

        if (localConfigured && properties.isPreferLocal()) {
            try {
                return localProvider.transcribe(filename, contentType, data, language, profile);
            } catch (VoiceException localFailure) {
                if (!cloudConfigured) {
                    throw localFailure;
                }
                log.warn("Local STT failed ({}); falling back to Groq Whisper", localFailure.getMessage());
                return cloudProvider.transcribe(filename, contentType, data, language, profile);
            }
        }

        if (cloudConfigured) {
            return cloudProvider.transcribe(filename, contentType, data, language, profile);
        }

        if (localConfigured) {
            return localProvider.transcribe(filename, contentType, data, language, profile);
        }

        throw new VoiceException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "STT service is unavailable: configure GROQ_API_KEY for cloud Whisper or STT_BASE_URL for local Whisper");
    }

    @Override
    public boolean isAvailable() {
        if (cloudProvider.isAvailable()) {
            return true;
        }
        return hasLocalBaseUrl() && localProvider.isAvailable();
    }

    private boolean hasLocalBaseUrl() {
        String base = properties.getBaseUrl();
        return base != null && !base.isBlank();
    }
}
