package com.tronai.voice;

import com.tronai.ai.AiProvider;
import com.tronai.ai.AiProviderUnavailableException;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.ProviderType;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileResolver;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.ai.research.search.SearchBundle;
import com.tronai.ai.research.search.SearchGrounding;
import com.tronai.ai.research.search.SearchOrchestrator;
import com.tronai.ai.research.search.WebSearchProperties;
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

    private final SpeechToTextProvider speechToTextProvider;
    private final SpeechSynthesisRouter speechSynthesisRouter;
    private final AudioStoreService audioStoreService;
    private final ModelManager modelManager;
    private final AiProfileService aiProfileService;
    private final AiProfileResolver aiProfileResolver;
    private final AiGateway aiGateway;
    private final AiGatewayProperties aiGatewayProperties;
    private final HybridRoutingService hybrid;
    private final LanguageService languageService;
    private final VoiceSessionRepository voiceSessionRepository;
    private final UserRepository userRepository;
    private final VoiceProperties voiceProperties;
    private final SearchOrchestrator searchOrchestrator;
    private final WebSearchProperties webSearchProperties;

    // In-memory conversation dialogue history keyed by sessionId
    private final Map<String, List<ChatMessage>> sessions = new ConcurrentHashMap<>();

    public VoiceService(SpeechToTextProvider speechToTextProvider,
                        SpeechSynthesisRouter speechSynthesisRouter,
                        AudioStoreService audioStoreService,
                        ModelManager modelManager,
                        AiProfileService aiProfileService,
                        AiProfileResolver aiProfileResolver,
                        AiGateway aiGateway,
                        AiGatewayProperties aiGatewayProperties,
                        HybridRoutingService hybrid,
                        LanguageService languageService,
                        VoiceSessionRepository voiceSessionRepository,
                        UserRepository userRepository,
                        VoiceProperties voiceProperties,
                        SearchOrchestrator searchOrchestrator,
                        WebSearchProperties webSearchProperties) {
        this.speechToTextProvider = speechToTextProvider;
        this.speechSynthesisRouter = speechSynthesisRouter;
        this.audioStoreService = audioStoreService;
        this.modelManager = modelManager;
        this.aiProfileService = aiProfileService;
        this.aiProfileResolver = aiProfileResolver;
        this.aiGateway = aiGateway;
        this.aiGatewayProperties = aiGatewayProperties != null ? aiGatewayProperties : new AiGatewayProperties();
        this.hybrid = hybrid;
        this.languageService = languageService;
        this.voiceSessionRepository = voiceSessionRepository;
        this.userRepository = userRepository;
        this.voiceProperties = voiceProperties;
        this.searchOrchestrator = searchOrchestrator;
        this.webSearchProperties = webSearchProperties != null ? webSearchProperties : new WebSearchProperties();
    }

    @Transactional
    public V1VoiceTurnResponse handleVoiceTurn(byte[] audioBytes, String filename, String contentType,
                                              String sessionId, String requestedLanguage, String requestedProfileStr) {
        return handleVoiceTurn(audioBytes, filename, contentType, sessionId, requestedLanguage, requestedProfileStr, "auto");
    }

    @Transactional
    public V1VoiceTurnResponse handleVoiceTurn(byte[] audioBytes, String filename, String contentType,
                                              String sessionId, String requestedLanguage, String requestedProfileStr,
                                              String searchMode) {
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

        // 3. STT Transcription (profile-aware) — diagnose STT failures separately from LLM
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
        int maxHistory = Math.max(4, voiceProperties.getMaxHistoryMessages());
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

        // 5. Optional controlled search (AUTO by default — avoids searching every utterance)
        String effectiveSearchMode = (searchMode == null || searchMode.isBlank()) ? "auto" : searchMode;
        SearchBundle searchBundle = searchOrchestrator.orchestrate(
                effectiveSearchMode, transcript, normalizedLanguage, effectiveProfile);

        // 6. LLM Generation with consistent Profile Routing
        String systemPrompt = buildVoiceSystemPrompt(normalizedLanguage, searchBundle);

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content(systemPrompt).build());
        String evidence = SearchGrounding.buildEvidenceBlock(searchBundle, Math.min(1200, webSearchProperties.getMaxContextChars()));
        if (!evidence.isBlank()) {
            messages.add(ChatMessage.builder().role("system").content(evidence).build());
        }
        synchronized (history) {
            int start = Math.max(0, history.size() - maxHistory);
            for (int i = start; i < history.size(); i++) {
                messages.add(history.get(i));
            }
        }
        messages.add(ChatMessage.builder().role("user").content(transcript).build());

        int answerBudget = resolveAnswerBudget(effectiveProfile);
        long llmStarted = System.currentTimeMillis();
        ChatGenerationResult genResult = generateVoiceReply(effectiveProfile, messages, answerBudget, searchBundle);
        int llmMs = (int) (System.currentTimeMillis() - llmStarted);

        String replyText = genResult.getText() == null ? "" : genResult.getText().trim();
        if (replyText.isBlank()) {
            replyText = "ja".equalsIgnoreCase(normalizedLanguage)
                    ? "うまく答えを生成できませんでした。もう一度お願いします。"
                    : "I could not generate an answer. Please try again.";
        }

        // Update in-memory dialogue history
        synchronized (history) {
            history.add(ChatMessage.builder().role("user").content(transcript).build());
            history.add(ChatMessage.builder().role("assistant").content(replyText).build());
            while (history.size() > maxHistory) {
                history.remove(0);
            }
        }

        String spoken = speakable(replyText);
        SpeechLanguageCapability speech = speechSynthesisRouter.capability(normalizedLanguage);
        String audioUrl = "";
        int ttsMs = 0;
        String ttsProvider = null;
        if (speech.speechSynthesis() && ExperienceLanguage.JA.code().equals(speech.language())
                && "voicevox".equals(speech.synthesisProvider())
                && !JAPANESE_PATTERN.matcher(spoken).find()) {
            speech = new SpeechLanguageCapability(speech.language(), true, false, null,
                    "The reply has no Japanese text, so VOICEVOX was not called. Browser speech fallback can be used.");
        }
        // Always attempt synthesizeBest when any server path may exist — cascading
        // fallbacks can succeed even if the preferred capability later fails.
        try {
            long ttsStarted = System.currentTimeMillis();
            var outcome = speechSynthesisRouter.synthesizeBest(spoken, normalizedLanguage);
            ttsMs = (int) (System.currentTimeMillis() - ttsStarted);
            if (outcome.isPresent()) {
                String clipId = audioStoreService.storeClip(outcome.get().audio());
                audioUrl = "/api/v1/voice/audio/" + clipId;
                ttsProvider = outcome.get().providerId();
                speech = new SpeechLanguageCapability(
                        normalizedLanguage, true, true, ttsProvider,
                        "Server speech via " + ttsProvider);
            } else if (speech.speechSynthesis()) {
                speech = new SpeechLanguageCapability(speech.language(), true, false, null,
                        "Server TTS unavailable. Browser speech fallback can be used.");
            }
        } catch (VoiceException ttsFailure) {
            log.warn("Server TTS failed; enabling browser speech fallback: {}", ttsFailure.getMessage());
            speech = new SpeechLanguageCapability(speech.language(), true, false, null,
                    "Server TTS failed. Browser speech fallback can be used. (" + ttsFailure.getMessage() + ")");
        }

        boolean browserFallback = !speech.speechSynthesis() || audioUrl.isBlank();
        if (browserFallback) {
            ttsProvider = "browser";
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
        response.setSpeechSupported(speech.speechSynthesis() && !audioUrl.isBlank());
        response.setSpeechDetail(browserFallback
                ? (speech.detail() != null && !speech.detail().isBlank()
                    ? speech.detail()
                    : "Browser speech fallback — server TTS unavailable for this language.")
                : speech.detail());
        response.setBrowserSpeechFallback(browserFallback);
        response.setLatencyMs(latency);
        response.setAiProfile(effectiveProfile.name());
        response.setModel(effectiveProfile.getModelId());
        response.setEngineModel(genResult.getActualModelId());
        if (genResult.getProviderType() != null) {
            response.setProvider(genResult.getProviderType().name());
        }
        response.setTtsProvider(ttsProvider);
        response.setLocked(true);

        return response;
    }

    static String buildVoiceSystemPrompt(String normalizedLanguage) {
        return buildVoiceSystemPrompt(normalizedLanguage, null);
    }

    static String buildVoiceSystemPrompt(String normalizedLanguage, SearchBundle searchBundle) {
        String langName = LanguageService.SUPPORTED_LANGUAGES.getOrDefault(normalizedLanguage, "English");
        String searchNote = SearchGrounding.systemSearchNote(searchBundle);
        return "You are TRON AI, a precise bilingual voice assistant in a live spoken conversation. "
                + "Reply only in " + langName + ", even if the user mixed languages. "
                + "Understand the user's latest question using prior conversation turns as context. "
                + "Answer the actual question directly and accurately. "
                + "Do not greet, do not introduce yourself, and do not ask interview-style questions. "
                + "Do not give vague, generic, or unrelated answers. "
                + "Keep answers concise for speech (typically 1–3 short sentences) without sacrificing correctness. "
                + "For math, facts, or follow-ups, state the answer clearly first, then a brief reason if needed. "
                + "Do not invent citations or current facts when search is unavailable. "
                + "Do not use markdown, bullet lists, or code fences. "
                + searchNote;
    }

    private int resolveAnswerBudget(AiProfile profile) {
        if (profile == AiProfile.QUALITY || profile == AiProfile.SMART
                || profile == AiProfile.ULTRA) {
            return Math.max(128, voiceProperties.getMaxTokensQuality());
        }
        return Math.max(96, voiceProperties.getMaxTokensFast());
    }

    private ChatGenerationResult generateVoiceReply(
            AiProfile profile,
            List<ChatMessage> messages,
            int answerBudget,
            SearchBundle searchBundle) {
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
            // Align with Chat: GTX FAST lock uses gateway OLLAMA_GTX only — no silent cloud fallback.
            if (mode == AiMode.FAST && aiGatewayProperties.isGtxFastModeEnabled()) {
                return generateVoiceViaGateway(mode, messages, profile, answerBudget, userId, searchBundle);
            }
            boolean preferLocal = "LOCAL_OLLAMA".equals(route);
            if (preferLocal && (mode == AiMode.FAST || mode == AiMode.QUALITY)) {
                ModelProfile modelProfile = aiProfileService.resolveModel(profile);
                try {
                    AiProvider aiProvider = modelManager.getProvider(modelProfile.getProvider());
                    ChatGenerationResult local = aiProvider.generate(ChatGenerationRequest.builder()
                            .model(modelProfile.getProviderModelName())
                            .messages(messages)
                            .temperature(Math.min(0.55, profile.getDefaultTemperature()))
                            .numPredict(answerBudget)
                            .logicalProfile(profile.name())
                            .build());
                    if (local.getActualModelId() == null || local.getActualModelId().isBlank()) {
                        local.setActualModelId(modelProfile.getProviderModelName());
                    }
                    if (local.getProviderType() == null) {
                        local.setProviderType(ProviderType.LOCAL);
                    }
                    return local;
                } catch (AiProviderUnavailableException localDown) {
                    if (!hybrid.allowsCloudInference()) {
                        throw localDown;
                    }
                    log.info("Local voice FAST/QUALITY failed; falling back to cloud gateway");
                    return generateVoiceViaGateway(resolveCloudVoiceMode(mode), messages, profile, answerBudget, userId, searchBundle);
                }
            }
            if (!preferLocal && !hybrid.allowsCloudInference()) {
                throw new IllegalStateException("Cloud AI routing is disabled while local inference is unavailable");
            }
            return generateVoiceViaGateway(resolveCloudVoiceMode(mode), messages, profile, answerBudget, userId, searchBundle);
        } finally {
            hybrid.releaseAiSlot();
        }
    }

    /**
     * Evidence-based cloud Voice routing: FAST/AUTO previously selected gpt-oss-20b and produced
     * vague/truncated spoken answers. Prefer SMART (gpt-oss-120b class) for Voice only.
     */
    AiMode resolveCloudVoiceMode(AiMode mode) {
        if (mode == null) {
            return voiceProperties.isCloudPreferSmart() ? AiMode.SMART : AiMode.FAST;
        }
        if (mode == AiMode.ULTRA) {
            return AiMode.ULTRA;
        }
        if (voiceProperties.isCloudPreferSmart()
                && (mode == AiMode.FAST || mode == AiMode.AUTO || mode == AiMode.QUALITY)) {
            return AiMode.SMART;
        }
        return mode.routingMode() == AiMode.QUALITY ? AiMode.SMART : mode.routingMode();
    }

    private ChatGenerationResult generateVoiceViaGateway(
            AiMode mode,
            List<ChatMessage> messages,
            AiProfile profile,
            int answerBudget,
            Long userId) {
        return generateVoiceViaGateway(mode, messages, profile, answerBudget, userId, null);
    }

    private ChatGenerationResult generateVoiceViaGateway(
            AiMode mode,
            List<ChatMessage> messages,
            AiProfile profile,
            int answerBudget,
            Long userId,
            SearchBundle searchBundle) {
        AiRequestContext.Builder ctx = AiRequestContext.builder()
                .feature(AiFeature.VOICE_REASONING)
                .mode(mode)
                .userId(userId)
                .messages(messages)
                .temperature(Math.min(0.55, profile.getDefaultTemperature()))
                .maxTokens(answerBudget)
                .idempotencyKey(UUID.randomUUID().toString());
        if (searchBundle != null && searchBundle.useNativeCloudTool()) {
            ctx.enableNativeWebSearch(true);
            ctx.nativeWebSearchProvider(searchBundle.nativeCloudProvider());
        }
        return aiGateway.generate(ctx.build()).toChatGenerationResult();
    }

    private static AiMode toAiMode(AiProfile profile) {
        if (profile == null) {
            return AiMode.FAST;
        }
        return switch (profile) {
            case FAST -> AiMode.FAST;
            case QUALITY -> AiMode.QUALITY;
            case SMART -> AiMode.SMART;
            case CLOUD -> AiMode.CLOUD;
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
