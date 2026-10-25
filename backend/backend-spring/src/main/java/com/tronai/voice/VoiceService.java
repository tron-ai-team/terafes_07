package com.tronai.voice;

import com.tronai.ai.AiProvider;
import com.tronai.ai.AiProviderUnavailableException;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileResolver;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import com.tronai.chat.LanguageService;
import com.tronai.hybrid.HybridRoutingService;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.stt.SttTranscriptionResult;
import com.tronai.language.ExperienceLanguage;
import com.tronai.tts.AudioStoreService;
import com.tronai.tts.SpeechLanguageCapability;
import com.tronai.tts.SpeechSynthesisRouter;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.voice.dto.V1VoiceTurnResponse;
import com.tronai.voice.dto.VoiceLatencyDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Service for General Voice conversations and speech synthesis orchestration.
 * Supports persistent voice session profile locking (FAST vs QUALITY).
 */
@Service
public class VoiceService {

    private static final Logger log = LoggerFactory.getLogger(VoiceService.class);

    private static final Pattern JAPANESE_PATTERN = Pattern.compile("[\\u3040-\\u30FF\\u4E00-\\u9FFF]");
    private static final int MAX_VOICE_SESSIONS = 100;
    private static final int MAX_HISTORY_MESSAGES = 20;

    private final SpeechToTextProvider speechToTextProvider;
    private final SpeechSynthesisRouter speechSynthesisRouter;
    private final AudioStoreService audioStoreService;
    private final ModelManager modelManager;
    private final AiProfileService aiProfileService;
    private final AiProfileResolver aiProfileResolver;
    private final AiGateway aiGateway;
    private final HybridRoutingService hybrid;
    private final LanguageService languageService;
    private final VoiceSessionRepository voiceSessionRepository;
    private final UserRepository userRepository;

    // In-memory conversation dialogue history keyed by sessionId
    private final Map<String, List<ChatMessage>> sessions = new ConcurrentHashMap<>();

    public VoiceService(SpeechToTextProvider speechToTextProvider,
                        SpeechSynthesisRouter speechSynthesisRouter,
                        AudioStoreService audioStoreService,
                        ModelManager modelManager,
                        AiProfileService aiProfileService,
                        AiProfileResolver aiProfileResolver,
                        AiGateway aiGateway,
                        HybridRoutingService hybrid,
                        LanguageService languageService,
                        VoiceSessionRepository voiceSessionRepository,
                        UserRepository userRepository) {
        this.speechToTextProvider = speechToTextProvider;
        this.speechSynthesisRouter = speechSynthesisRouter;
        this.audioStoreService = audioStoreService;
        this.modelManager = modelManager;
        this.aiProfileService = aiProfileService;
        this.aiProfileResolver = aiProfileResolver;
        this.aiGateway = aiGateway;
        this.hybrid = hybrid;
        this.languageService = languageService;
        this.voiceSessionRepository = voiceSessionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public V1VoiceTurnResponse handleVoiceTurn(byte[] audioBytes, String filename, String contentType,
                                              String sessionId, String requestedLanguage, String requestedProfileStr) {
        long totalStarted = System.currentTimeMillis();

        // 1. Language validation and resolution
        String normalizedLanguage = "ja";
        if (requestedLanguage != null && !requestedLanguage.trim().isEmpty()) {
            String norm = languageService.normalize(requestedLanguage);
            if (norm == null) {
                throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "Unknown or unsupported language: " + requestedLanguage);
            }
            normalizedLanguage = norm;
        }

        // 2. Session identification & profile lock enforcement
        String activeSessionId = (sessionId != null && !sessionId.trim().isEmpty())
                ? sessionId.trim()
                : UUID.randomUUID().toString().replace("-", "");

        AiProfile effectiveProfile;
        Optional<VoiceSessionEntity> existingSessionOpt = voiceSessionRepository.findById(activeSessionId);

        if (existingSessionOpt.isPresent()) {
            VoiceSessionEntity sessionEntity = existingSessionOpt.get();
            AiProfile lockedProfile = aiProfileService.parseProfile(sessionEntity.getAiProfile());

            if (requestedProfileStr != null && !requestedProfileStr.isBlank()) {
                AiProfile reqProfile = aiProfileService.parseProfile(requestedProfileStr);
                if (reqProfile != lockedProfile) {
                    log.warn("Rejected mid-session profile change attempt from {} to {} for voice session {}",
                            lockedProfile, reqProfile, activeSessionId);
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "AI profile cannot be changed after this voice session has started.");
                }
            }
            effectiveProfile = lockedProfile;
            String lockedLanguage = sessionEntity.getLanguage() == null || sessionEntity.getLanguage().isBlank()
                    ? normalizedLanguage : sessionEntity.getLanguage();
            if (requestedLanguage != null && !requestedLanguage.isBlank()
                    && !lockedLanguage.equals(normalizedLanguage)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Language cannot be changed after this voice session has started.");
            }
            normalizedLanguage = lockedLanguage;
            sessionEntity.setUpdatedAt(Instant.now());
            voiceSessionRepository.save(sessionEntity);
        } else {
            // New voice session: explicit → saved preference → FAST
            effectiveProfile = aiProfileResolver.resolve(requestedProfileStr);
            User user = null;
            Optional<UserPrincipal> current = SecurityUtils.getCurrentUser();
            if (current.isPresent() && current.get().getId() != null) {
                user = userRepository.findById(current.get().getId()).orElse(null);
            }

            VoiceSessionEntity newSession = VoiceSessionEntity.builder()
                    .id(activeSessionId)
                    .user(user)
                    .aiProfile(effectiveProfile.name())
                    .modelId(effectiveProfile.getModelId())
                    .language(normalizedLanguage)
                    .startedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            voiceSessionRepository.save(newSession);
        }

        // 3. STT Transcription (profile-aware)
        long sttStarted = System.currentTimeMillis();
        SttTranscriptionResult sttResult = speechToTextProvider.transcribe(
                filename, contentType, audioBytes, normalizedLanguage, effectiveProfile
        );
        int sttMs = (int) (System.currentTimeMillis() - sttStarted);

        String transcript = sttResult.getText().trim();
        if (transcript.isEmpty()) {
            if ("ja".equalsIgnoreCase(normalizedLanguage)) {
                throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No Japanese speech was recognized");
            }
            throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "No speech was recognized");
        }
        if (transcript.length() > 4000) {
            throw new VoiceException(HttpStatus.UNPROCESSABLE_ENTITY, "The transcript is too long");
        }

        // 4. In-memory dialogue history
        List<ChatMessage> history = sessions.computeIfAbsent(activeSessionId, k -> {
            if (sessions.size() >= MAX_VOICE_SESSIONS) {
                Iterator<String> it = sessions.keySet().iterator();
                if (it.hasNext()) {
                    it.next();
                    it.remove();
                }
            }
            return Collections.synchronizedList(new ArrayList<>());
        });

        // 5. LLM Generation with consistent Profile Routing
        String langName = LanguageService.SUPPORTED_LANGUAGES.getOrDefault(normalizedLanguage, "English");
        String systemPrompt = "You are TRON AI in a live voice conversation. "
                + "Reply only in " + langName + ", even if the user spoke another language. "
                + "Do not translate code or quoted phrases. "
                + "Use one or two short spoken sentences. "
                + "Do not interview the user and do not use markdown or code fences.";

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content(systemPrompt).build());
        synchronized (history) {
            int start = Math.max(0, history.size() - MAX_HISTORY_MESSAGES);
            for (int i = start; i < history.size(); i++) {
                messages.add(history.get(i));
            }
        }
        messages.add(ChatMessage.builder().role("user").content(transcript).build());

        int answerBudget = effectiveProfile == AiProfile.QUALITY || effectiveProfile == AiProfile.ULTRA ? 128 : 96;
        long llmStarted = System.currentTimeMillis();
        ChatGenerationResult genResult;
        try {
            genResult = generateVoiceReply(effectiveProfile, messages, answerBudget);
        } catch (com.tronai.ai.gateway.AiQuotaExceededException ex) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        }
        int llmMs = (int) (System.currentTimeMillis() - llmStarted);

        String replyText = genResult.getText().trim();

        // Update in-memory dialogue history
        synchronized (history) {
            history.add(ChatMessage.builder().role("user").content(transcript).build());
            history.add(ChatMessage.builder().role("assistant").content(replyText).build());
        }

        String spoken = speakable(replyText);
        SpeechLanguageCapability speech = speechSynthesisRouter.capability(normalizedLanguage);
        String audioUrl = "";
        int ttsMs = 0;
        if (speech.speechSynthesis() && ExperienceLanguage.JA.code().equals(speech.language())
                && !JAPANESE_PATTERN.matcher(spoken).find()) {
            speech = new SpeechLanguageCapability(speech.language(), true, false, null,
                    "The reply has no Japanese text, so VOICEVOX was not called.");
        }
        if (speech.speechSynthesis()) {
            long ttsStarted = System.currentTimeMillis();
            byte[] wavBytes = speechSynthesisRouter.synthesizeRequired(spoken, normalizedLanguage);
            ttsMs = (int) (System.currentTimeMillis() - ttsStarted);
            String clipId = audioStoreService.storeClip(wavBytes);
            audioUrl = "/api/v1/voice/audio/" + clipId;
        }

        int totalMs = (int) (System.currentTimeMillis() - totalStarted);
        VoiceLatencyDto latency = new VoiceLatencyDto(sttMs, llmMs, ttsMs, totalMs);

        V1VoiceTurnResponse response = new V1VoiceTurnResponse();
        response.setSessionId(activeSessionId);
        response.setTranscript(transcript);
        response.setReply(replyText);
        response.setContent(replyText);
        response.setLanguage(normalizedLanguage);
        response.setAudioUrl(audioUrl);
        response.setAudioContentType("audio/wav");
        response.setSpeechSupported(speech.speechSynthesis());
        response.setSpeechDetail(speech.detail());
        response.setLatencyMs(latency);
        response.setAiProfile(effectiveProfile.name());
        // Locked session reports the logical profile model id (tron-fast / tron-quality).
        response.setModel(effectiveProfile.getModelId());
        response.setLocked(true);

        return response;
    }

    private ChatGenerationResult generateVoiceReply(
            AiProfile profile,
            List<ChatMessage> messages,
            int answerBudget) {
        AiMode mode = toAiMode(profile);
        Long userId = SecurityUtils.getCurrentUser().map(UserPrincipal::getId).orElse(null);
        String route = hybrid.selectInferenceRoute();
        if ("PAUSED".equals(route)) {
            throw new IllegalStateException("AI tasks are paused by admin (maintenance)");
        }
        if ("UNAVAILABLE".equals(route)) {
            throw new IllegalStateException("AI is unavailable: local and cloud routing are both disabled or unhealthy");
        }
        if (!hybrid.tryAcquireAiSlot()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "AI request queue saturated");
        }
        try {
            boolean preferLocal = "LOCAL_OLLAMA".equals(route);
            if (preferLocal && (mode == AiMode.FAST || mode == AiMode.QUALITY)) {
                ModelProfile modelProfile = aiProfileService.resolveModel(profile);
                try {
                    AiProvider aiProvider = modelManager.getProvider(modelProfile.getProvider());
                    return aiProvider.generate(ChatGenerationRequest.builder()
                            .model(modelProfile.getProviderModelName())
                            .messages(messages)
                            .temperature(profile.getDefaultTemperature())
                            .numPredict(answerBudget)
                            .logicalProfile(profile.name())
                            .build());
                } catch (AiProviderUnavailableException localDown) {
                    if (!hybrid.allowsCloudInference()) {
                        throw localDown;
                    }
                    log.info("Local voice FAST/QUALITY failed; falling back to cloud gateway");
                    return generateVoiceViaGateway(mode, messages, profile, answerBudget, userId);
                }
            }
            if (!preferLocal && !hybrid.allowsCloudInference()) {
                throw new IllegalStateException("Cloud AI routing is disabled while local inference is unavailable");
            }
            return generateVoiceViaGateway(mode, messages, profile, answerBudget, userId);
        } finally {
            hybrid.releaseAiSlot();
        }
    }

    private ChatGenerationResult generateVoiceViaGateway(
            AiMode mode,
            List<ChatMessage> messages,
            AiProfile profile,
            int answerBudget,
            Long userId) {
        return aiGateway.generate(AiRequestContext.builder()
                .feature(AiFeature.VOICE_REASONING)
                .mode(mode)
                .userId(userId)
                .messages(messages)
                .temperature(profile.getDefaultTemperature())
                .maxTokens(answerBudget)
                .idempotencyKey(UUID.randomUUID().toString())
                .build()).toChatGenerationResult();
    }

    private static AiMode toAiMode(AiProfile profile) {
        if (profile == null) {
            return AiMode.FAST;
        }
        return switch (profile) {
            case FAST -> AiMode.FAST;
            case QUALITY -> AiMode.QUALITY;
            case SMART -> AiMode.SMART;
            case ULTRA -> AiMode.ULTRA;
            case AUTO -> AiMode.AUTO;
        };
    }

    public byte[] speak(String text) {
        return speak(text, null);
    }

    public byte[] speak(String text, String requestedLanguage) {
        String spoken = speakable(text);
        String language = requestedLanguage == null || requestedLanguage.isBlank()
                ? languageService.detect(spoken) : requestedLanguage;
        return speechSynthesisRouter.synthesizeRequired(spoken, language);
    }

    public static String speakable(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.replaceAll("\\s+", " ").trim();
        if (cleaned.length() <= 400) {
            return cleaned;
        }
        String truncated = cleaned.substring(0, 399);
        while (truncated.endsWith("、") || truncated.endsWith("。") || truncated.endsWith(" ") || truncated.endsWith(",")) {
            truncated = truncated.substring(0, truncated.length() - 1);
        }
        return truncated + "。";
    }
}
