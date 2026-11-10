package com.tronai.interview.session;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.interview.*;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.dto.InterviewQuestionDto;
import com.tronai.interview.dto.TranscriptMessageDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Session manager for interview states.
 * Combines high-speed in-memory state with durable MySQL persistence, AI profile locking, and automatic restart recovery.
 */
@Component
public class InterviewSessionManager {

    private static final Logger log = LoggerFactory.getLogger(InterviewSessionManager.class);
    private static final int MAX_SESSIONS = 1000;

    private final ConcurrentHashMap<String, InterviewSession> sessions = new ConcurrentHashMap<>();
    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewMessageRepository interviewMessageRepository;
    private final ObjectMapper objectMapper;

    public InterviewSessionManager() {
        this(null, null, new ObjectMapper());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public InterviewSessionManager(
            @Lazy InterviewSessionRepository interviewSessionRepository,
            @Lazy InterviewMessageRepository interviewMessageRepository,
            ObjectMapper objectMapper) {
        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewMessageRepository = interviewMessageRepository;
        this.objectMapper = objectMapper;
    }

    public InterviewSession createSession(InterviewConfigDto config, int questionCount) {
        String profile = (config != null && config.getAiProfile() != null && !config.getAiProfile().isBlank())
                ? config.getAiProfile()
                : "FAST";
        return createSession(config, questionCount, profile, "tron-fast");
    }

    public InterviewSession createSession(InterviewConfigDto config, int questionCount, String aiProfile, String modelId) {
        if (sessions.size() >= MAX_SESSIONS) {
            throw new InterviewException(HttpStatus.TOO_MANY_REQUESTS, "Too many active interview sessions");
        }
        String interviewId = UUID.randomUUID().toString();
        InterviewSession session = new InterviewSession(interviewId, config, questionCount, aiProfile, modelId);
        sessions.put(interviewId, session);
        return session;
    }

    public InterviewSession getSession(String interviewId) {
        if (interviewId == null || interviewId.isBlank()) {
            throw new InterviewException(HttpStatus.NOT_FOUND, "Interview session was not found");
        }
        InterviewSession session = sessions.get(interviewId);
        if (session != null) {
            return session;
        }

        // Restart recovery: restore durable session from MySQL
        if (interviewSessionRepository != null) {
            Optional<InterviewSessionEntity> optEntity = interviewSessionRepository.findById(interviewId);
            if (optEntity.isPresent()) {
                log.info("Restoring interview session [{}] from MySQL persistence", interviewId);
                InterviewSession restored = restoreFromEntity(optEntity.get());
                sessions.put(interviewId, restored);
                return restored;
            }
        }

        throw new InterviewException(HttpStatus.NOT_FOUND, "Interview session was not found");
    }

    public boolean hasSession(String interviewId) {
        if (interviewId == null) {
            return false;
        }
        if (sessions.containsKey(interviewId)) {
            return true;
        }
        return interviewSessionRepository != null && interviewSessionRepository.existsById(interviewId);
    }

    public void removeSession(String interviewId) {
        if (interviewId != null) {
            sessions.remove(interviewId);
        }
    }

    public int getActiveCount() {
        return sessions.size();
    }

    public void clearAll() {
        sessions.clear();
    }

    private InterviewSession restoreFromEntity(InterviewSessionEntity entity) {
        InterviewConfigDto config;
        try {
            config = objectMapper.readValue(entity.getConfigJson(), InterviewConfigDto.class);
        } catch (Exception e) {
            log.warn("Failed to parse config_json for session [{}], using defaults: {}", entity.getId(), e.getMessage());
            config = new InterviewConfigDto();
        }

        String profile = entity.getAiProfile() != null ? entity.getAiProfile() : "FAST";
        String modelId = entity.getModelId() != null ? entity.getModelId() : "tron-fast";
        InterviewSession session = new InterviewSession(entity.getId(), config, entity.getQuestionCount(), profile, modelId);
        session.setCurrentQuestionIndex(entity.getCurrentQuestionIndex());
        session.setFinished(entity.isFinished());

        // Restore turns and messages from MySQL
        if (interviewMessageRepository != null) {
            List<InterviewMessageEntity> messages = interviewMessageRepository.findBySessionIdOrderByIdAsc(entity.getId());
            boolean isEnglish = com.tronai.language.ExperienceLanguage.parseOrDefault(
                    config.getLanguage(), com.tronai.language.ExperienceLanguage.JA)
                    != com.tronai.language.ExperienceLanguage.JA;

            for (InterviewMessageEntity msg : messages) {
                session.addTurn(msg.getRole(), msg.getText());
                boolean isAi = !"candidate".equalsIgnoreCase(msg.getRole()) && !"user".equalsIgnoreCase(msg.getRole());
                TranscriptMessageDto dto = new TranscriptMessageDto(
                        "msg-" + msg.getId(),
                        isAi ? "ai" : "user",
                        msg.getText(),
                        InterviewSession.currentClock(),
                        isAi
                );
                if (isEnglish && isAi) {
                    dto.setTextEn(msg.getText());
                }
                session.addTranscriptMessage(dto);
            }

            boolean restoredEngineState = restoreEngineStateFromEntity(entity, session);

            if (!restoredEngineState) {
                for (InterviewMessageEntity msg : messages) {
                    boolean isAi = !"candidate".equalsIgnoreCase(msg.getRole()) && !"user".equalsIgnoreCase(msg.getRole());
                    if (isAi && !"終了".equals(msg.getMessageType())) {
                        session.recordAskedQuestion(msg.getText(), "");
                    }
                }
            }

            // Restore questions cards
            List<InterviewQuestionDto> questions = new ArrayList<>();
            List<String> asked = session.getAskedQuestions();
            for (int i = 1; i <= entity.getQuestionCount(); i++) {
                String qText = (i <= asked.size()) ? asked.get(i - 1) : "次の質問は回答後に表示されます。";
                questions.add(new InterviewQuestionDto(
                        "q-" + i,
                        i,
                        entity.getQuestionCount(),
                        i == 1 ? "Self-Introduction" : "Experience",
                        i == 1 ? "自己紹介" : "会話",
                        qText,
                        isEnglish ? qText : "",
                        config.getDifficulty()
                ));
            }
            session.setQuestions(questions);
        }

        return session;
    }

    boolean restoreEngineStateFromEntity(InterviewSessionEntity entity, InterviewSession session) {
        if (entity.getEngineStateJson() == null || entity.getEngineStateJson().isBlank()) {
            return false;
        }
        try {
            InterviewEngineState state = objectMapper.readValue(entity.getEngineStateJson(), InterviewEngineState.class);
            state.applyTo(session);
            return true;
        } catch (Exception e) {
            log.warn("Failed to parse engine_state_json for session [{}]: {}", entity.getId(), e.getMessage());
            return false;
        }
    }

    public String serializeEngineState(InterviewSession session) {
        try {
            return objectMapper.writeValueAsString(InterviewEngineState.fromSession(session));
        } catch (Exception e) {
            log.warn("Failed to serialize engine state for session [{}]: {}", session.getInterviewId(), e.getMessage());
            return null;
        }
    }

    public void evict(String interviewId) {
        if (interviewId != null) {
            sessions.remove(interviewId);
        }
    }
}
