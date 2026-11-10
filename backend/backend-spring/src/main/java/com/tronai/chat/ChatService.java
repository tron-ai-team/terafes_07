package com.tronai.chat;

import com.tronai.ai.AiProvider;
import com.tronai.ai.ChatGenerationRequest;
import com.tronai.ai.ChatGenerationResult;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.AiProviderUnavailableException;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiQuotaExceededException;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileResolver;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import com.tronai.chat.dto.*;
import com.tronai.error.ChatValidationException;
import com.tronai.hybrid.HybridRoutingService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private static final java.util.regex.Pattern CODE_PATTERN = java.util.regex.Pattern.compile(
            "```|\\b(code|function|script|component|fastapi|python|typescript|react|class|def)\\b|コード|実装|関数",
            java.util.regex.Pattern.CASE_INSENSITIVE
    );

    private static final java.util.regex.Pattern BRIEF_PATTERN = java.util.regex.Pattern.compile(
            "\\b(one word|briefly|in one sentence)\\b|一言|短く",
            java.util.regex.Pattern.CASE_INSENSITIVE
    );

    private final ModelManager modelManager;
    private final AiProfileService aiProfileService;
    private final AiProfileResolver aiProfileResolver;
    private final AiGateway aiGateway;
    private final HybridRoutingService hybrid;
    private final LanguageService languageService;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatService(ModelManager modelManager,
                       AiProfileService aiProfileService,
                       AiProfileResolver aiProfileResolver,
                       AiGateway aiGateway,
                       HybridRoutingService hybrid,
                       LanguageService languageService,
                       ChatSessionRepository chatSessionRepository,
                       ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository) {
        this.modelManager = modelManager;
        this.aiProfileService = aiProfileService;
        this.aiProfileResolver = aiProfileResolver;
        this.aiGateway = aiGateway;
        this.hybrid = hybrid;
        this.languageService = languageService;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    public static int outputBudget(String text) {
        if (text == null) {
            return 1024;
        }
        if (CODE_PATTERN.matcher(text).find()) {
            return 1536;
        }
        if (BRIEF_PATTERN.matcher(text).find()) {
            return 128;
        }
        return 1024;
    }

    @Transactional
    public ChatResponse processChat(ChatRequest request) {
        if (request.getMessages() == null || request.getMessages().isEmpty()) {
            throw new ChatValidationException("messages list must not be empty");
        }

        List<ChatMessageIn> nonSystemMessages = new ArrayList<>();
        for (ChatMessageIn msg : request.getMessages()) {
            if (!"system".equalsIgnoreCase(msg.getRole())) {
                nonSystemMessages.add(msg);
            }
        }

        if (nonSystemMessages.isEmpty() || !"user".equalsIgnoreCase(nonSystemMessages.get(nonSystemMessages.size() - 1).getRole())) {
            throw new ChatValidationException("The latest chat message must be from the user");
        }

        ChatMessageIn latestUserMsg = nonSystemMessages.get(nonSystemMessages.size() - 1);
        String userText = latestUserMsg.getContent();

        if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
            String norm = languageService.normalize(request.getLanguage());
            if (norm == null) {
                throw new ChatValidationException("language must be " + com.tronai.language.ExperienceLanguage.supportedList());
            }
        }

        if (request.getModel() != null && !request.getModel().isBlank()) {
            ModelProfile legacyModel = modelManager.getModel(request.getModel());
            if (legacyModel == null) {
                throw new ChatValidationException("Model not found: " + request.getModel());
            }
        }

        String resolvedLanguage = languageService.resolveLanguage(request.getLanguage(), userText);

        List<ChatMessage> promptMessages = new ArrayList<>();
        promptMessages.add(ChatMessage.builder()
                .role("system")
                .content(languageService.buildSystemPrompt(resolvedLanguage, request.getSearchMode()))
                .build());

        for (ChatMessageIn msg : nonSystemMessages) {
            promptMessages.add(ChatMessage.builder()
                    .role(msg.getRole().toLowerCase())
                    .content(msg.getContent())
                    .build());
        }

        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.trim().isEmpty()) {
            sessionId = UUID.randomUUID().toString();
        }

        // Persistence and session profile lock handling
        Optional<UserPrincipal> currentUser = SecurityUtils.getCurrentUser();
        ChatSessionEntity persistedSession = null;
        AiProfile effectiveProfile;

        if (currentUser.isPresent()) {
            Long userId = currentUser.get().getId();
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                final String clientSessionId = sessionId;
                Optional<ChatSessionEntity> existingSessionOpt = chatSessionRepository
                        .findByUserIdAndClientSessionId(userId, clientSessionId);

                if (existingSessionOpt.isPresent()) {
                    persistedSession = existingSessionOpt.get();
                    boolean hasExistingMessages = chatMessageRepository.existsBySessionId(persistedSession.getId());

                    if (hasExistingMessages) {
                        // PROFILE IS LOCKED
                        AiProfile lockedProfile = aiProfileService.parseProfile(persistedSession.getAiProfile());
                        if (request.getAiProfile() != null && !request.getAiProfile().isBlank()) {
                            AiProfile requestedProfile = aiProfileService.parseProfile(request.getAiProfile());
                            if (requestedProfile != lockedProfile) {
                                log.warn("Rejected mid-session profile change attempt from {} to {} for session {}",
                                        lockedProfile, requestedProfile, clientSessionId);
                                throw new ResponseStatusException(HttpStatus.CONFLICT,
                                        "AI profile cannot be changed after this chat has started.");
                            }
                        }
                        effectiveProfile = lockedProfile;
                    } else {
                        // Empty session: explicit → saved preference → FAST
                        effectiveProfile = aiProfileResolver.resolve(request.getAiProfile());
                        persistedSession.setAiProfile(effectiveProfile.name());
                    }
                } else {
                    // New session: explicit → saved preference → FAST
                    effectiveProfile = aiProfileResolver.resolve(request.getAiProfile());
                    String title = userText.length() > 32 ? userText.substring(0, 32) : userText;
                    persistedSession = ChatSessionEntity.builder()
                            .user(user)
                            .clientSessionId(clientSessionId)
                            .title(title)
                            .aiProfile(effectiveProfile.name())
                            .modelId(effectiveProfile.getModelId())
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    persistedSession = chatSessionRepository.save(persistedSession);
                }

                // Persist the latest user turn
                ChatMessageEntity userMsgEntity = ChatMessageEntity.builder()
                        .session(persistedSession)
                        .role("user")
                        .content(userText)
                        .language(resolvedLanguage)
                        .createdAt(Instant.now())
                        .build();
                chatMessageRepository.save(userMsgEntity);
            } else {
                effectiveProfile = aiProfileResolver.resolve(request.getAiProfile());
            }
        } else {
            effectiveProfile = aiProfileResolver.resolve(request.getAiProfile());
        }

        // Local profiles require ModelManager resolution; gateway profiles may skip when local QUALITY is down.
        ModelProfile modelProfile = null;
        AiMode requestedMode = toAiMode(effectiveProfile);
        if (requestedMode == AiMode.FAST || requestedMode == AiMode.QUALITY) {
            modelProfile = aiProfileService.resolveModel(effectiveProfile);
        } else {
            try {
                modelProfile = aiProfileService.resolveModel(effectiveProfile);
            } catch (ResponseStatusException ignored) {
                modelProfile = null;
            }
        }

        if (persistedSession != null) {
            persistedSession.setModelId(modelProfile != null ? modelProfile.getId() : effectiveProfile.getModelId());
        }

        int numPredict = Math.max(outputBudget(userText), effectiveProfile.getDefaultMaxTokens());
        log.debug("Sending chat generation request under profile {} ({} messages) in language {}",
                effectiveProfile, promptMessages.size(), resolvedLanguage);

        ChatGenerationResult result;
        try {
            result = generateWithGatewayOrLocal(
                    effectiveProfile,
                    modelProfile,
                    promptMessages,
                    numPredict,
                    userIdForSession(persistedSession));
        } catch (GatewayProviderException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
        } catch (AiQuotaExceededException ex) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        }
        if (persistedSession != null && result.getProviderType() != null) {
            persistedSession.setProviderType(result.getProviderType().name());
            persistedSession.setActualModelId(result.getActualModelId());
        }

        // Persist the assistant turn
        if (persistedSession != null) {
            ChatMessageEntity assistantMsgEntity = ChatMessageEntity.builder()
                    .session(persistedSession)
                    .role("assistant")
                    .content(result.getText())
                    .language(resolvedLanguage)
                    .createdAt(Instant.now())
                    .build();
            chatMessageRepository.save(assistantMsgEntity);

            persistedSession.setUpdatedAt(Instant.now());
            chatSessionRepository.save(persistedSession);
        }

        SearchInfo searchInfo = buildSearchInfo(request.getSearchMode());

        return ChatResponse.builder()
                .sessionId(sessionId)
                .reply(result.getText())
                .content(result.getText())
                .language(resolvedLanguage)
                .truncated(result.isTruncated())
                .finishReason(result.getFinishReason())
                .evalCount(result.getEvalCount())
                .promptEvalCount(result.getPromptEvalCount())
                .search(searchInfo)
                .aiProfile(effectiveProfile.name())
                .model(modelProfile != null ? modelProfile.getId() : effectiveProfile.getModelId())
                .providerType(result.getProviderType() != null ? result.getProviderType().name() : null)
                .actualModelId(result.getActualModelId())
                .locked(true)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ChatSessionSummaryDto> getSessionsForUser(Long userId) {
        List<ChatSessionEntity> sessions = chatSessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return sessions.stream().map(s -> {
            boolean locked = s.getMessages() != null && !s.getMessages().isEmpty();
            String profileStr = s.getAiProfile() != null ? s.getAiProfile() : "FAST";
            ModelProfile mp = modelManager.resolveModel(s.getModelId());
            String displayName = mp != null ? mp.getProviderModelName() : s.getModelId();

            return ChatSessionSummaryDto.builder()
                    .id(s.getId())
                    .clientSessionId(s.getClientSessionId())
                    .title(s.getTitle())
                    .modelId(s.getModelId())
                    .aiProfile(profileStr)
                    .modelDisplayName(displayName)
                    .locked(locked)
                    .createdAt(s.getCreatedAt())
                    .updatedAt(s.getUpdatedAt())
                    .messageCount(s.getMessages() != null ? s.getMessages().size() : 0)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChatSessionDetailDto getSessionDetailForUser(Long userId, String sessionId) {
        ChatSessionEntity session = findSessionForUser(userId, sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found"));

        List<ChatMessageDto> messages = session.getMessages().stream().map(m -> ChatMessageDto.builder()
                .id(m.getId())
                .role(m.getRole())
                .content(m.getContent())
                .language(m.getLanguage())
                .createdAt(m.getCreatedAt())
                .build()
        ).collect(Collectors.toList());

        boolean locked = !messages.isEmpty();
        String profileStr = session.getAiProfile() != null ? session.getAiProfile() : "FAST";
        ModelProfile mp = modelManager.resolveModel(session.getModelId());
        String displayName = mp != null ? mp.getProviderModelName() : session.getModelId();

        return ChatSessionDetailDto.builder()
                .id(session.getId())
                .clientSessionId(session.getClientSessionId())
                .title(session.getTitle())
                .modelId(session.getModelId())
                .aiProfile(profileStr)
                .modelDisplayName(displayName)
                .locked(locked)
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .messages(messages)
                .build();
    }

    @Transactional
    public void deleteSessionForUser(Long userId, String sessionId) {
        ChatSessionEntity session = findSessionForUser(userId, sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found"));

        chatSessionRepository.delete(session);
    }

    private Optional<ChatSessionEntity> findSessionForUser(Long userId, String sessionId) {
        Optional<ChatSessionEntity> byClient = chatSessionRepository.findByUserIdAndClientSessionId(userId, sessionId);
        if (byClient.isPresent()) {
            return byClient;
        }
        try {
            Long numericId = Long.parseLong(sessionId);
            return chatSessionRepository.findById(numericId)
                    .filter(s -> s.getUser().getId().equals(userId));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private SearchInfo buildSearchInfo(String searchMode) {
        String mode = searchMode != null ? searchMode.toLowerCase() : "auto";
        if ("off".equals(mode)) {
            return SearchInfo.builder()
                    .mode("off")
                    .performed(false)
                    .status("skipped")
                    .query("")
                    .detail("Search is turned off")
                    .results(List.of())
                    .build();
        }

        String finalMode = "on".equals(mode) ? "on" : "auto";
        return SearchInfo.builder()
                .mode(finalMode)
                .performed(false)
                .status("unavailable")
                .query(null)
                .detail("Search provider not configured")
                .results(List.of())
                .build();
    }

    private ChatGenerationResult generateWithGatewayOrLocal(
            AiProfile profile,
            ModelProfile modelProfile,
            List<ChatMessage> promptMessages,
            int numPredict,
            Long userId) {
        AiMode mode = toAiMode(profile);
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
            // FAST/QUALITY: local ModelManager when hybrid allows local — never charges Ultra credits.
            if (preferLocal && (mode == AiMode.FAST || mode == AiMode.QUALITY)) {
                if (modelProfile == null) {
                    throw new IllegalStateException("Local AI model profile is unavailable");
                }
                try {
                    AiProvider aiProvider = modelManager.getProvider(modelProfile.getProvider());
                    ChatGenerationRequest genRequest = ChatGenerationRequest.builder()
                            .model(modelProfile.getProviderModelName())
                            .messages(promptMessages)
                            .temperature(profile.getDefaultTemperature())
                            .numPredict(numPredict)
                            .logicalProfile(profile.name())
                            .build();
                    return aiProvider.generate(genRequest);
                } catch (AiProviderUnavailableException localDown) {
                    if (!hybrid.allowsCloudInference()) {
                        throw localDown;
                    }
                    log.info("Local FAST/QUALITY failed; falling back to cloud gateway under hybrid policy");
                    return generateViaGateway(mode, promptMessages, profile, numPredict, userId);
                }
            }

            // Local forced offline / cloud-only: gateway path (Ollama excluded by AiModelRouter+hybrid).
            // SMART/ULTRA always gateway. Ultra credits apply only to ULTRA mode inside AiGateway.
            if (!preferLocal && !hybrid.allowsCloudInference()) {
                throw new IllegalStateException("Cloud AI routing is disabled while local inference is unavailable");
            }
            return generateViaGateway(mode, promptMessages, profile, numPredict, userId);
        } finally {
            hybrid.releaseAiSlot();
        }
    }

    private ChatGenerationResult generateViaGateway(
            AiMode mode,
            List<ChatMessage> promptMessages,
            AiProfile profile,
            int numPredict,
            Long userId) {
        AiRequestContext.Builder ctx = AiRequestContext.builder()
                .feature(AiFeature.CHAT)
                .mode(mode)
                .userId(userId)
                .messages(promptMessages)
                .temperature(profile.getDefaultTemperature())
                .maxTokens(numPredict)
                .idempotencyKey(UUID.randomUUID().toString());
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
            case ULTRA -> AiMode.ULTRA;
            case AUTO -> AiMode.AUTO;
        };
    }

    private static Long userIdForSession(ChatSessionEntity session) {
        if (session == null || session.getUser() == null) {
            return null;
        }
        return session.getUser().getId();
    }
}
