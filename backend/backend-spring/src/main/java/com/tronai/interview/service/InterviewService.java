package com.tronai.interview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.GenerationTrace;
import com.tronai.ai.GenerationTraceHolder;
import com.tronai.ai.model.ModelProfile;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import com.tronai.career.company.CompanyAnalysisEntity;
import com.tronai.career.company.CompanyAnalysisRepository;
import com.tronai.interview.*;
import com.tronai.interview.dto.*;
import com.tronai.interview.generator.InterviewQuestionGenerator;
import com.tronai.interview.session.InterviewSession;
import com.tronai.interview.session.InterviewSessionManager;
import com.tronai.queue.BackgroundJobPublisher;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core interview progression engine.
 * Controls interview lifecycle, session progression, answer validation, and analysis coordination.
 * Enforces session-level AI profile locking (FAST vs QUALITY).
 * All states are durable in MySQL and survive application restarts.
 */
@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private final InterviewSessionManager sessionManager;
    private final InterviewQuestionGenerator questionGenerator;
    private final InterviewAnalysisService analysisService;
    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewMessageRepository interviewMessageRepository;
    private final InterviewAnalysisRepository interviewAnalysisRepository;
    private final UserRepository userRepository;
    private final BackgroundJobPublisher backgroundJobPublisher;
    private final AiProfileService aiProfileService;
    private final com.tronai.ai.profile.AiProfileResolver aiProfileResolver;
    private final CompanyAnalysisRepository companyAnalysisRepository;
    private final ObjectMapper objectMapper;

    private static final String FOLLOW_UP_CARD_JA = "次の質問は、回答後に下の文字起こしへ追加されます。";
    private static final String FOLLOW_UP_CARD_EN = "The next question will appear in the transcript below after your answer.";
    private static final String CONCLUDING_MESSAGE_JA = "面接は以上となります。お疲れ様でした。回答の分析結果をご確認ください。";
    private static final String CONCLUDING_MESSAGE_EN = "That concludes our interview session today. Thank you for your time. You can now view your comprehensive analysis.";

    public InterviewService(InterviewSessionManager sessionManager,
                            InterviewQuestionGenerator questionGenerator,
                            InterviewAnalysisService analysisService,
                            InterviewSessionRepository interviewSessionRepository,
                            InterviewMessageRepository interviewMessageRepository,
                            InterviewAnalysisRepository interviewAnalysisRepository,
                            UserRepository userRepository,
                            BackgroundJobPublisher backgroundJobPublisher,
                            AiProfileService aiProfileService,
                            com.tronai.ai.profile.AiProfileResolver aiProfileResolver,
                            CompanyAnalysisRepository companyAnalysisRepository,
                            ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.questionGenerator = questionGenerator;
        this.analysisService = analysisService;
        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewMessageRepository = interviewMessageRepository;
        this.interviewAnalysisRepository = interviewAnalysisRepository;
        this.userRepository = userRepository;
        this.backgroundJobPublisher = backgroundJobPublisher;
        this.aiProfileService = aiProfileService;
        this.aiProfileResolver = aiProfileResolver;
        this.companyAnalysisRepository = companyAnalysisRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Initializes and starts a new interview session.
     * Locks the AI Profile immediately.
     */
    @Transactional
    public InterviewStartResponse startInterview(InterviewConfigDto config) {
        if (config == null) {
            config = new InterviewConfigDto();
        }

        int questionCount = config.getQuestionCount() != null ? config.getQuestionCount() : 5;
        questionCount = Math.max(1, Math.min(10, questionCount));
        config.setQuestionCount(questionCount);

        com.tronai.language.ExperienceLanguage selectedLanguage =
                com.tronai.language.ExperienceLanguage.parseOrDefault(config.getLanguage(), com.tronai.language.ExperienceLanguage.JA);
        config.setLanguage(selectedLanguage.code());
        if (config.getType() == null || config.getType().isBlank()) {
            config.setType("technical");
        }
        if (config.getDifficulty() == null || config.getDifficulty().isBlank()) {
            config.setDifficulty("intermediate");
        }
        if (config.getMode() == null || config.getMode().isBlank()) {
            config.setMode("manual");
        }

        boolean japaneseCards = selectedLanguage == com.tronai.language.ExperienceLanguage.JA;

        // Resolve AI profile: explicit → saved preference → FAST (locks immediately)
        AiProfile profile = aiProfileResolver.resolve(config.getAiProfile());
        ModelProfile modelProfile;
        try {
            modelProfile = aiProfileService.resolveModel(profile);
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            // Gateway modes may not need a local QUALITY model online.
            modelProfile = aiProfileService.resolveModel(AiProfile.FAST);
        }

        // Resolve or create user for interview ownership
        User user = resolveCurrentUser();

        // Hydrate company-specific interview context from Career Center analysis (owned by user)
        applyCompanyAnalysisContext(user.getId(), config);

        // Create in-memory session container with locked profile
        InterviewSession session = sessionManager.createSession(config, questionCount, profile.name(), modelProfile.getId());
        String interviewId = session.getInterviewId();

        // Generate opening question
        String firstQuestion = questionGenerator.generateFirstQuestion(config);
        session.recordAskedQuestion(firstQuestion, "自己紹介");
        session.addTurn("interviewer", firstQuestion);

        // Create initial transcript
        TranscriptMessageDto initialMessage = new TranscriptMessageDto(
                "ai-" + System.nanoTime(),
                "ai",
                firstQuestion,
                InterviewSession.currentClock(),
                false
        );
        if (!japaneseCards) {
            initialMessage.setTextEn(firstQuestion);
        }
        session.addTranscriptMessage(initialMessage);

        // Build question cards
        List<InterviewQuestionDto> questions = new ArrayList<>();
        questions.add(new InterviewQuestionDto(
                "q-1",
                1,
                questionCount,
                japaneseCards ? "自己紹介" : "Self-Introduction",
                "自己紹介",
                firstQuestion,
                japaneseCards ? "" : firstQuestion,
                config.getDifficulty()
        ));

        for (int i = 2; i <= questionCount; i++) {
            questions.add(new InterviewQuestionDto(
                    "q-" + i,
                    i,
                    questionCount,
                    japaneseCards ? "会話" : "Experience",
                    "会話",
                    FOLLOW_UP_CARD_JA,
                    FOLLOW_UP_CARD_EN,
                    config.getDifficulty()
            ));
        }
        session.setQuestions(questions);

        // Persist session to MySQL with locked AI profile and model trace
        String configJson = serializeJson(config);
        InterviewSessionEntity sessionEntity = InterviewSessionEntity.builder()
                .id(interviewId)
                .user(user)
                .cvDocumentId(config.getCvDocumentId())
                .jobId(config.getJobId())
                .companyAnalysisId(config.getCompanyAnalysisId())
                .language(selectedLanguage.code())
                .configJson(configJson)
                .currentQuestionIndex(0)
                .questionCount(questionCount)
                .finished(false)
                .aiProfile(profile.name())
                .modelId(modelProfile.getId())
                .providerType("LOCAL")
                .actualModelId(modelProfile.getProviderModelName())
                .startedAt(Instant.now())
                .build();
        applyProviderTrace(sessionEntity);
        sessionEntity = interviewSessionRepository.save(sessionEntity);

        // Persist initial message
        InterviewMessageEntity msgEntity = InterviewMessageEntity.builder()
                .session(sessionEntity)
                .role("interviewer")
                .questionIndex(0)
                .messageType("質問")
                .text(firstQuestion)
                .createdAt(Instant.now())
                .build();
        interviewMessageRepository.save(msgEntity);

        log.info("Started interview session [{}] in MySQL with {} questions, aiProfile={}, model={}, user={}",
                interviewId, questionCount, profile.name(), modelProfile.getId(), user.getEmail());

        return new InterviewStartResponse(
                interviewId,
                config,
                questions,
                0,
                session.getTranscript(),
                profile.name(),
                true
        );
    }

    /**
     * Submits an answer to the interview session with optimistic concurrency control.
     */
    @Transactional
    public InterviewAnswerResponse submitAnswer(String interviewId, Integer clientQuestionIndex, String answerText) {
        InterviewSession session = sessionManager.getSession(interviewId);
        boolean isEnglish = com.tronai.language.ExperienceLanguage.parseOrDefault(
                session.getConfig().getLanguage(), com.tronai.language.ExperienceLanguage.JA)
                != com.tronai.language.ExperienceLanguage.JA;

        session.getLock().lock();
        try {
            // Guard: Interview already finished
            if (session.isFinished()) {
                throw new InterviewException(HttpStatus.CONFLICT, "This interview has already ended");
            }

            // Guard: Stale or mismatched question index
            if (clientQuestionIndex == null || clientQuestionIndex != session.getCurrentQuestionIndex()) {
                log.warn("Stale index received for session [{}]. Client sent {}, Server current is {}",
                        interviewId, clientQuestionIndex, session.getCurrentQuestionIndex());
                throw new InterviewException(HttpStatus.CONFLICT, "This interview turn was already submitted");
            }

            // Guard: Empty answer text
            if (answerText == null || answerText.trim().isEmpty()) {
                throw new InterviewException(HttpStatus.UNPROCESSABLE_ENTITY, "Answer text cannot be empty");
            }

            // Fetch DB session entity for optimistic locking and ownership enforcement
            InterviewSessionEntity sessionEntity = interviewSessionRepository.findById(interviewId)
                    .orElseThrow(() -> new InterviewException(HttpStatus.NOT_FOUND, "Interview session was not found"));

            Optional<UserPrincipal> optUser = SecurityUtils.getCurrentUser();
            if (optUser.isPresent() && sessionEntity.getUser() != null && !sessionEntity.getUser().getId().equals(optUser.get().getId())) {
                throw new InterviewException(HttpStatus.NOT_FOUND, "Interview session was not found");
            }

            if (sessionEntity.getCurrentQuestionIndex() != clientQuestionIndex) {
                throw new InterviewException(HttpStatus.CONFLICT, "This interview turn was already submitted");
            }

            String cleanAnswer = answerText.trim();

            // Record candidate turn
            session.addTurn("candidate", cleanAnswer);
            TranscriptMessageDto userMessage = new TranscriptMessageDto(
                    "user-" + System.nanoTime(),
                    "user",
                    cleanAnswer,
                    InterviewSession.currentClock(),
                    false
            );
            session.addTranscriptMessage(userMessage);

            // Persist candidate message to MySQL
            InterviewMessageEntity userMsgEntity = InterviewMessageEntity.builder()
                    .session(sessionEntity)
                    .role("candidate")
                    .questionIndex(clientQuestionIndex)
                    .messageType("回答")
                    .text(cleanAnswer)
                    .createdAt(Instant.now())
                    .build();
            interviewMessageRepository.save(userMsgEntity);

            int nextIndex = session.getCurrentQuestionIndex() + 1;
            boolean isFinished = nextIndex >= session.getQuestionCount();

            TranscriptMessageDto aiFollowUpMessage;

            if (isFinished) {
                // Interview completed
                session.setFinished(true);
                String closingText = isEnglish ? CONCLUDING_MESSAGE_EN : CONCLUDING_MESSAGE_JA;
                session.addTurn("interviewer", closingText);

                aiFollowUpMessage = new TranscriptMessageDto(
                        "ai-" + System.nanoTime(),
                        "ai",
                        closingText,
                        InterviewSession.currentClock(),
                        true
                );
                session.addTranscriptMessage(aiFollowUpMessage);

                // Persist closing message to MySQL
                InterviewMessageEntity closingMsgEntity = InterviewMessageEntity.builder()
                        .session(sessionEntity)
                        .role("interviewer")
                        .questionIndex(nextIndex)
                        .messageType("終了")
                        .text(closingText)
                        .createdAt(Instant.now())
                        .build();
                interviewMessageRepository.save(closingMsgEntity);

                // Update session entity in MySQL
                sessionEntity.setCurrentQuestionIndex(nextIndex);
                sessionEntity.setFinished(true);
                sessionEntity.setCompletedAt(Instant.now());
                applyProviderTrace(sessionEntity);
                interviewSessionRepository.save(sessionEntity);

                // Generate and persist final analysis (inheriting session profile)
                try {
                    InterviewAnalysisResultDto analysisResult = analysisService.analyze(session);
                    persistAnalysis(sessionEntity, analysisResult);

                    // Publish async non-critical queue event
                    backgroundJobPublisher.publishInterviewCompleted(
                            sessionEntity.getUser().getId(),
                            interviewId,
                            analysisResult.getOverallScore()
                    );
                } catch (Exception e) {
                    log.error("Failed to generate/persist analysis on interview completion: {}", e.getMessage(), e);
                }

                log.info("Interview session [{}] completed after {} turns and persisted to MySQL", interviewId, nextIndex);
                return new InterviewAnswerResponse(userMessage, aiFollowUpMessage, nextIndex, true);

            } else {
                // Advance to next question (using session's locked AI profile)
                String nextQuestion = questionGenerator.generateNextQuestion(session, cleanAnswer);
                session.addTurn("interviewer", nextQuestion);

                List<InterviewQuestionDto> currentQuestions = session.getQuestions();
                if (nextIndex < currentQuestions.size()) {
                    InterviewQuestionDto targetCard = currentQuestions.get(nextIndex);
                    targetCard.setTextJa(nextQuestion);
                    if (isEnglish) {
                        targetCard.setTextEn(nextQuestion);
                    }
                    session.setQuestions(currentQuestions);
                }

                aiFollowUpMessage = new TranscriptMessageDto(
                        "ai-" + System.nanoTime(),
                        "ai",
                        nextQuestion,
                        InterviewSession.currentClock(),
                        true
                );
                session.addTranscriptMessage(aiFollowUpMessage);

                // Persist AI follow-up question to MySQL
                InterviewMessageEntity followUpMsgEntity = InterviewMessageEntity.builder()
                        .session(sessionEntity)
                        .role("interviewer")
                        .questionIndex(nextIndex)
                        .messageType("質問")
                        .text(nextQuestion)
                        .createdAt(Instant.now())
                        .build();
                interviewMessageRepository.save(followUpMsgEntity);

                // Update session state in MySQL
                session.setCurrentQuestionIndex(nextIndex);
                sessionEntity.setCurrentQuestionIndex(nextIndex);
                applyProviderTrace(sessionEntity);
                interviewSessionRepository.save(sessionEntity);

                log.info("Interview session [{}] progressed to question index {}", interviewId, nextIndex);
                return new InterviewAnswerResponse(userMessage, aiFollowUpMessage, nextIndex, false);
            }
        } finally {
            session.getLock().unlock();
        }
    }

    /**
     * Generates or fetches performance analysis for an interview session.
     */
    @Transactional
    public InterviewAnalysisResultDto getAnalysis(String interviewId) {
        // Enforce ownership if authenticated
        Optional<UserPrincipal> user = SecurityUtils.getCurrentUser();
        if (user.isPresent()) {
            InterviewSessionEntity entity = interviewSessionRepository.findById(interviewId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session was not found"));
            if (!entity.getUser().getId().equals(user.get().getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session was not found");
            }
        }

        // Check if analysis is already persisted in MySQL
        Optional<InterviewAnalysisEntity> optAnalysis = interviewAnalysisRepository.findBySessionId(interviewId);
        if (optAnalysis.isPresent()) {
            InterviewSession session = sessionManager.getSession(interviewId);
            return mapEntityToAnalysisResult(optAnalysis.get(), session);
        }

        InterviewSession session = sessionManager.getSession(interviewId);
        session.getLock().lock();
        try {
            if (!session.isFinished()) {
                session.setFinished(true);
            }
            InterviewAnalysisResultDto result = analysisService.analyze(session);

            // Persist to MySQL
            InterviewSessionEntity sessionEntity = interviewSessionRepository.findById(interviewId).orElse(null);
            if (sessionEntity != null) {
                persistAnalysis(sessionEntity, result);
            }
            return result;
        } finally {
            session.getLock().unlock();
        }
    }

    public InterviewSession getSession(String interviewId) {
        return sessionManager.getSession(interviewId);
    }

    @Transactional(readOnly = true)
    public List<InterviewSummaryDto> listUserInterviews(Long userId) {
        List<InterviewSessionEntity> sessions = interviewSessionRepository.findByUserIdOrderByStartedAtDesc(userId);
        List<InterviewSummaryDto> results = new ArrayList<>();

        for (InterviewSessionEntity s : sessions) {
            InterviewConfigDto cfg = deserializeConfig(s.getConfigJson());
            Integer overallScore = null;
            if (s.getAnalysis() != null) {
                overallScore = s.getAnalysis().getOverallScore();
            }

            results.add(InterviewSummaryDto.builder()
                    .id(s.getId())
                    .companyName(cfg.getCompanyName())
                    .jobPosition(cfg.getJobPosition())
                    .interviewType(cfg.getType())
                    .difficulty(cfg.getDifficulty())
                    .currentQuestionIndex(s.getCurrentQuestionIndex())
                    .questionCount(s.getQuestionCount())
                    .finished(s.isFinished())
                    .overallScore(overallScore)
                    .aiProfile(s.getAiProfile() != null ? s.getAiProfile() : "FAST")
                    .modelId(s.getModelId() != null ? s.getModelId() : "tron-fast")
                    .locked(true)
                    .startedAt(s.getStartedAt())
                    .completedAt(s.getCompletedAt())
                    .build());
        }
        return results;
    }

    @Transactional(readOnly = true)
    public InterviewDetailDto getUserInterviewDetail(Long userId, String interviewId) {
        InterviewSessionEntity s = interviewSessionRepository.findByIdAndUserId(interviewId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session not found"));

        InterviewConfigDto cfg = deserializeConfig(s.getConfigJson());
        InterviewSession session = sessionManager.getSession(interviewId);

        InterviewAnalysisResultDto analysis = null;
        if (s.getAnalysis() != null) {
            analysis = mapEntityToAnalysisResult(s.getAnalysis(), session);
        }

        return InterviewDetailDto.builder()
                .id(s.getId())
                .config(cfg)
                .cvDocumentId(s.getCvDocumentId())
                .jobId(s.getJobId())
                .companyAnalysisId(s.getCompanyAnalysisId())
                .language(s.getLanguage() != null ? s.getLanguage() : (cfg != null ? cfg.getLanguage() : null))
                .currentQuestionIndex(s.getCurrentQuestionIndex())
                .questionCount(s.getQuestionCount())
                .finished(s.isFinished())
                .aiProfile(s.getAiProfile() != null ? s.getAiProfile() : "FAST")
                .modelId(s.getModelId() != null ? s.getModelId() : "tron-fast")
                .locked(true)
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                .transcript(session.getTranscript())
                .analysis(analysis)
                .build();
    }

    @Transactional
    public void deleteUserInterview(Long userId, String interviewId) {
        InterviewSessionEntity s = interviewSessionRepository.findByIdAndUserId(interviewId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session not found"));
        interviewSessionRepository.delete(s);
        sessionManager.removeSession(interviewId);
    }

    /**
     * Starts a new practice session using the same CV/job/config as a previous interview.
     */
    @Transactional
    public InterviewStartResponse repeatInterview(Long userId, String interviewId) {
        InterviewSessionEntity previous = interviewSessionRepository.findByIdAndUserId(interviewId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session not found"));
        InterviewConfigDto cfg = deserializeConfig(previous.getConfigJson());
        if (cfg == null) {
            cfg = new InterviewConfigDto();
        }
        if (previous.getCvDocumentId() != null) {
            cfg.setCvDocumentId(previous.getCvDocumentId());
        }
        if (previous.getJobId() != null) {
            cfg.setJobId(previous.getJobId());
        }
        if (previous.getLanguage() != null && (cfg.getLanguage() == null || cfg.getLanguage().isBlank())) {
            cfg.setLanguage(previous.getLanguage());
        }
        return startInterview(cfg);
    }

    private void persistAnalysis(InterviewSessionEntity sessionEntity, InterviewAnalysisResultDto result) {
        try {
            InterviewAnalysisEntity analysisEntity = InterviewAnalysisEntity.builder()
                    .session(sessionEntity)
                    .overallScore(result.getOverallScore())
                    .communicationScore(result.getCommunicationScore())
                    .japaneseScore(result.getJapaneseScore())
                    .technicalScore(result.getTechnicalScore())
                    .confidenceScore(result.getConfidenceScore())
                    .radarJson(serializeJson(result.getRadarData()))
                    .strongPointsJson(serializeJson(result.getStrongPoints()))
                    .weakPointsJson(serializeJson(result.getWeakPoints()))
                    .feedback(result.getAiOverallFeedback())
                    .starJson(serializeJson(result.getStarSuggestion()))
                    .createdAt(Instant.now())
                    .build();

            interviewAnalysisRepository.save(analysisEntity);
        } catch (Exception e) {
            log.warn("Could not save interview analysis entity: {}", e.getMessage());
        }
    }

    private InterviewAnalysisResultDto mapEntityToAnalysisResult(InterviewAnalysisEntity entity, InterviewSession session) {
        InterviewAnalysisResultDto dto = new InterviewAnalysisResultDto();
        dto.setInterviewId(entity.getSession().getId());
        InterviewConfigDto cfg = session.getConfig();
        if (cfg != null) {
            dto.setCompanyName(cfg.getCompanyName());
            dto.setJobPosition(cfg.getJobPosition());
            dto.setInterviewType(cfg.getType());
            dto.setDifficulty(cfg.getDifficulty());
        }
        dto.setOverallScore(entity.getOverallScore());
        dto.setCommunicationScore(entity.getCommunicationScore());
        dto.setJapaneseScore(entity.getJapaneseScore());
        dto.setTechnicalScore(entity.getTechnicalScore());
        dto.setConfidenceScore(entity.getConfidenceScore());
        dto.setAiOverallFeedback(entity.getFeedback());
        dto.setTranscript(session.getTranscript());

        try {
            dto.setRadarData(objectMapper.readValue(entity.getRadarJson(), objectMapper.getTypeFactory().constructCollectionType(List.class, RadarDataDto.class)));
            dto.setStrongPoints(objectMapper.readValue(entity.getStrongPointsJson(), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)));
            dto.setWeakPoints(objectMapper.readValue(entity.getWeakPointsJson(), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)));
            if (entity.getStarJson() != null && !entity.getStarJson().isBlank()) {
                dto.setStarSuggestion(objectMapper.readValue(entity.getStarJson(), StarSuggestionDto.class));
            }
        } catch (Exception e) {
            // keep defaults
        }

        return dto;
    }

    /**
     * When {@code companyAnalysisId} is set, load owned analysis and enrich interview config.
     * Does not invent confidential interview questions — only uses published research JSON.
     */
    private void applyCompanyAnalysisContext(Long userId, InterviewConfigDto config) {
        if (config.getCompanyAnalysisId() == null || config.getCompanyAnalysisId().isBlank()) {
            return;
        }
        CompanyAnalysisEntity analysis = companyAnalysisRepository
                .findByIdAndUser_Id(config.getCompanyAnalysisId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Company analysis not found for current user"));
        if (config.getCompanyName() == null || config.getCompanyName().isBlank()) {
            config.setCompanyName(analysis.getCompanyName());
        }
        if (config.getCompanyNameJa() == null || config.getCompanyNameJa().isBlank()) {
            config.setCompanyNameJa(analysis.getCompanyName());
        }
        StringBuilder ctx = new StringBuilder();
        if (config.getJobDescription() != null && !config.getJobDescription().isBlank()) {
            ctx.append(config.getJobDescription()).append("\n");
        }
        ctx.append("Company analysis id=").append(analysis.getId())
                .append("; website=").append(analysis.getWebsiteUrl());
        if (analysis.getPreparationJson() != null && !analysis.getPreparationJson().isBlank()) {
            ctx.append("; preparation=").append(analysis.getPreparationJson());
        }
        if (analysis.getComparisonJson() != null && !analysis.getComparisonJson().isBlank()) {
            ctx.append("; comparison=").append(analysis.getComparisonJson());
        }
        config.setJobDescription(ctx.toString());
        if (config.getType() == null || config.getType().isBlank() || "general".equalsIgnoreCase(config.getType())) {
            config.setType("company-specific");
        }
    }

    private User resolveCurrentUser() {
        Optional<UserPrincipal> current = SecurityUtils.getCurrentUser();
        if (current.isPresent()) {
            UserPrincipal principal = current.get();
            if (principal.getId() != null) {
                Optional<User> byId = userRepository.findById(principal.getId());
                if (byId.isPresent()) {
                    return byId.get();
                }
            }
            if (principal.getEmail() != null) {
                Optional<User> byEmail = userRepository.findByEmailIgnoreCase(principal.getEmail());
                if (byEmail.isPresent()) {
                    return byEmail.get();
                }
            }
            return userRepository.save(User.builder()
                    .email(principal.getEmail() != null ? principal.getEmail() : "user@tron.ai")
                    .displayName(principal.getDisplayName() != null ? principal.getDisplayName() : "User")
                    .role(principal.getRole() != null ? principal.getRole() : "USER")
                    .enabled(true)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());
        }
        // Guest / default user
        return userRepository.findByEmailIgnoreCase("guest@tron.ai")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("guest@tron.ai")
                        .displayName("Guest User")
                        .role("GUEST")
                        .enabled(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));
    }

    private String serializeJson(Object obj) {
        if (obj == null) return "{}";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private void applyProviderTrace(InterviewSessionEntity entity) {
        GenerationTrace trace = GenerationTraceHolder.current();
        if (trace == null || entity == null) {
            return;
        }
        entity.setProviderType(trace.providerType().name());
        entity.setActualModelId(trace.actualModelId());
    }

    private InterviewConfigDto deserializeConfig(String json) {
        if (json == null || json.isBlank()) return new InterviewConfigDto();
        try {
            return objectMapper.readValue(json, InterviewConfigDto.class);
        } catch (Exception e) {
            return new InterviewConfigDto();
        }
    }
}
