package com.tronai.agent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.GenerationTrace;
import com.tronai.ai.GenerationTraceHolder;
import com.tronai.agent.dto.AgentDtos;
import com.tronai.agent.entity.AgentResultEntity;
import com.tronai.agent.entity.AgentRunEntity;
import com.tronai.agent.entity.AgentRunRepository;
import com.tronai.agent.entity.AgentStepEntity;
import com.tronai.agent.entity.AgentStepRepository;
import com.tronai.agent.entity.AgentResultRepository;
import com.tronai.agent.model.AgentAction;
import com.tronai.agent.model.AgentState;
import com.tronai.agent.model.AgentStepRecord;
import com.tronai.agent.runner.AgentRunner;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.repo.CareerJobRepository;
import com.tronai.cv.CvDocumentRepository;
import com.tronai.interview.dto.InterviewConfigDto;
import com.tronai.interview.dto.InterviewStartResponse;
import com.tronai.interview.service.InterviewService;
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
 * Service orchestrating Agentic Interview Preparation runs, persistence, multi-user isolation,
 * history queries, and seamless interview launching.
 */
@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);

    private final AgentRunner agentRunner;
    private final AgentRunRepository agentRunRepository;
    private final AgentStepRepository agentStepRepository;
    private final AgentResultRepository agentResultRepository;
    private final CvDocumentRepository cvDocumentRepository;
    private final CareerJobRepository careerJobRepository;
    private final UserRepository userRepository;
    private final InterviewService interviewService;
    private final ObjectMapper objectMapper;
    private final com.tronai.ai.profile.AiProfileService aiProfileService;

    @org.springframework.beans.factory.annotation.Autowired
    public AgentService(AgentRunner agentRunner,
                        AgentRunRepository agentRunRepository,
                        AgentStepRepository agentStepRepository,
                        AgentResultRepository agentResultRepository,
                        CvDocumentRepository cvDocumentRepository,
                        CareerJobRepository careerJobRepository,
                        UserRepository userRepository,
                        InterviewService interviewService,
                        ObjectMapper objectMapper,
                        com.tronai.ai.profile.AiProfileService aiProfileService) {
        this.agentRunner = agentRunner;
        this.agentRunRepository = agentRunRepository;
        this.agentStepRepository = agentStepRepository;
        this.agentResultRepository = agentResultRepository;
        this.cvDocumentRepository = cvDocumentRepository;
        this.careerJobRepository = careerJobRepository;
        this.userRepository = userRepository;
        this.interviewService = interviewService;
        this.objectMapper = objectMapper;
        this.aiProfileService = aiProfileService;
    }

    public AgentService(AgentRunner agentRunner,
                        AgentRunRepository agentRunRepository,
                        AgentStepRepository agentStepRepository,
                        AgentResultRepository agentResultRepository,
                        CvDocumentRepository cvDocumentRepository,
                        UserRepository userRepository,
                        InterviewService interviewService,
                        ObjectMapper objectMapper) {
        this(agentRunner, agentRunRepository, agentStepRepository, agentResultRepository, cvDocumentRepository,
                null, userRepository, interviewService, objectMapper, null);
    }

    /**
     * Executes an autonomous multi-step agent run for the given user.
     */
    @Transactional
    public AgentDtos.AgentRunResponse runAgent(Long userId, AgentDtos.AgentRunRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // If CV ID is provided, verify user ownership
        if (request.getCvId() != null) {
            boolean ownsCv = cvDocumentRepository.findByIdAndUserId(request.getCvId(), userId).isPresent();
            if (!ownsCv) {
                log.warn("CV ID {} not owned by user {}. Rejecting agent run.", request.getCvId(), userId);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV not found or access denied");
            }
        }

        String companyName = request.getCompanyName();
        String jobPosition = request.getJobPosition();
        String jobDescription = request.getJobDescription();
        if (request.getJobId() != null && !request.getJobId().isBlank() && careerJobRepository != null) {
            CareerJobEntity job = careerJobRepository.findByIdAndUser_Id(request.getJobId(), userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Career job not found"));
            if (companyName == null || companyName.isBlank()) {
                companyName = job.getCompany();
            }
            if (jobPosition == null || jobPosition.isBlank()) {
                jobPosition = job.getTitle();
            }
            if (jobDescription == null || jobDescription.isBlank()) {
                jobDescription = job.getDescriptionText() != null ? job.getDescriptionText() : job.getSourceUrl();
            }
        }
        if (isBlank(companyName) || isBlank(jobPosition) || isBlank(jobDescription)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "companyName, jobPosition and jobDescription are required (or provide a valid jobId)");
        }

        String runId = UUID.randomUUID().toString();
        com.tronai.ai.profile.AiProfile aiProfile = com.tronai.ai.profile.AiProfile.fromString(request.getAiProfile());
        String modelName = "tron-fast";
        if (aiProfileService != null) {
            com.tronai.ai.model.ModelProfile mp = aiProfileService.resolveModel(aiProfile);
            if (mp != null) {
                modelName = mp.getProviderModelName();
            }
        }

        AgentState state = AgentState.builder()
                .runId(runId)
                .userId(userId)
                .goal(request.getGoal())
                .companyName(companyName)
                .jobPosition(jobPosition)
                .jobDescription(jobDescription)
                .language(resolveLanguage(request.getLanguage()))
                .cvId(request.getCvId())
                .aiProfile(aiProfile)
                .modelId(modelName)
                .build();

        log.info("Starting Agent Run [{}] for user: {} (Profile: {}, Goal: {})", runId, userId, aiProfile, request.getGoal());

        // Execute autonomous loop
        AgentState completedState = agentRunner.run(state);

        // Extract result and metrics
        AgentDtos.AgentResultDto resultDto = agentRunner.extractResult(completedState);
        AgentDtos.AgentMetricsDto metricsDto = agentRunner.extractMetrics(completedState);
        GenerationTrace trace = GenerationTraceHolder.current();
        String providerType = trace != null ? trace.providerType().name() : "LOCAL";
        String actualModelId = trace != null && trace.actualModelId() != null ? trace.actualModelId() : modelName;

        // Persist Run Entity
        AgentRunEntity runEntity = AgentRunEntity.builder()
                .id(runId)
                .user(user)
                .goal(completedState.getGoal())
                .companyName(completedState.getCompanyName())
                .jobPosition(completedState.getJobPosition())
                .jobDescription(completedState.getJobDescription())
                .language(completedState.getLanguage())
                .status(completedState.getStatus())
                .aiProfile(completedState.getAiProfile() != null ? completedState.getAiProfile().name() : "FAST")
                .startedAt(completedState.getStartedAt() != null ? completedState.getStartedAt() : Instant.now())
                .completedAt(completedState.getCompletedAt() != null ? completedState.getCompletedAt() : Instant.now())
                .stepsExecuted(completedState.getSteps().size())
                .modelId(metricsDto.getModel() != null ? metricsDto.getModel() : modelName)
                .providerType(providerType)
                .actualModelId(actualModelId)
                .durationMs(metricsDto.getDurationMs())
                .build();

        runEntity = agentRunRepository.save(runEntity);

        // Persist Step Entities
        List<AgentStepEntity> stepEntities = new ArrayList<>();
        for (AgentStepRecord stepRecord : completedState.getSteps()) {
            AgentStepEntity stepEntity = AgentStepEntity.builder()
                    .run(runEntity)
                    .stepNumber(stepRecord.getStepNumber())
                    .action(stepRecord.getAction().name())
                    .description(stepRecord.getDescription())
                    .status(stepRecord.getStatus())
                    .createdAt(stepRecord.getTimestamp() != null ? stepRecord.getTimestamp() : Instant.now())
                    .build();
            stepEntities.add(agentStepRepository.save(stepEntity));
        }

        // Persist Result Entity
        try {
            String resultJson = objectMapper.writeValueAsString(resultDto);
            AgentResultEntity resultEntity = AgentResultEntity.builder()
                    .run(runEntity)
                    .resultJson(resultJson)
                    .createdAt(Instant.now())
                    .build();
            agentResultRepository.save(resultEntity);
        } catch (Exception e) {
            log.error("Failed to serialize agent result JSON for run {}: {}", runId, e.getMessage());
        }

        // Build Response DTO
        List<AgentDtos.AgentStepDto> stepDtos = completedState.getSteps().stream()
                .map(s -> AgentDtos.AgentStepDto.builder()
                        .step(s.getStepNumber())
                        .action(s.getAction().name())
                        .description(s.getDescription())
                        .status(s.getStatus())
                        .build())
                .collect(Collectors.toList());

        return AgentDtos.AgentRunResponse.builder()
                .runId(runId)
                .status(completedState.getStatus())
                .goal(completedState.getGoal())
                .companyName(completedState.getCompanyName())
                .jobPosition(completedState.getJobPosition())
                .aiProfile(completedState.getAiProfile() != null ? completedState.getAiProfile().name() : "FAST")
                .locked(true)
                .steps(stepDtos)
                .result(resultDto)
                .metrics(metricsDto)
                .build();
    }

    /**
     * Lists all agent runs owned by the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<AgentDtos.AgentRunResponse> listUserRuns(Long userId) {
        List<AgentRunEntity> runs = agentRunRepository.findByUserIdOrderByStartedAtDesc(userId);
        return runs.stream().map(this::toResponseSummary).collect(Collectors.toList());
    }

    /**
     * Retrieves a single agent run by ID, enforcing user ownership.
     */
    @Transactional(readOnly = true)
    public AgentDtos.AgentRunResponse getUserRun(Long userId, String runId) {
        AgentRunEntity run = agentRunRepository.findByIdAndUserId(runId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));

        List<AgentStepEntity> steps = agentStepRepository.findByRunIdOrderByStepNumberAsc(run.getId());
        AgentResultEntity resultEntity = agentResultRepository.findByRunId(run.getId()).orElse(null);

        AgentDtos.AgentResultDto resultDto = null;
        if (resultEntity != null && resultEntity.getResultJson() != null) {
            try {
                resultDto = objectMapper.readValue(resultEntity.getResultJson(), AgentDtos.AgentResultDto.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize result json for run {}: {}", runId, e.getMessage());
            }
        }

        List<AgentDtos.AgentStepDto> stepDtos = steps.stream()
                .map(s -> AgentDtos.AgentStepDto.builder()
                        .step(s.getStepNumber())
                        .action(s.getAction())
                        .description(s.getDescription())
                        .status(s.getStatus())
                        .build())
                .collect(Collectors.toList());

        List<String> toolsUsed = steps.stream()
                .map(AgentStepEntity::getAction)
                .filter(a -> !AgentAction.FINISH.name().equals(a))
                .distinct()
                .collect(Collectors.toList());

        AgentDtos.AgentMetricsDto metrics = AgentDtos.AgentMetricsDto.builder()
                .stepsExecuted(run.getStepsExecuted())
                .toolsUsed(toolsUsed)
                .model(run.getModelId())
                .aiProfile(run.getAiProfile())
                .durationMs(run.getDurationMs())
                .build();

        return AgentDtos.AgentRunResponse.builder()
                .runId(run.getId())
                .status(run.getStatus())
                .goal(run.getGoal())
                .companyName(run.getCompanyName())
                .jobPosition(run.getJobPosition())
                .aiProfile(run.getAiProfile())
                .locked(true)
                .steps(stepDtos)
                .result(resultDto)
                .metrics(metrics)
                .build();
    }

    /**
     * Deletes an agent run owned by the user.
     */
    @Transactional
    public void deleteUserRun(Long userId, String runId) {
        AgentRunEntity run = agentRunRepository.findByIdAndUserId(runId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));
        agentRunRepository.delete(run);
    }

    /**
     * Phase Q: Starts an interactive interview session pre-configured from an Agent Run.
     */
    @Transactional
    public InterviewStartResponse startInterviewFromRun(Long userId, String runId) {
        AgentRunEntity run = agentRunRepository.findByIdAndUserId(runId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));

        InterviewConfigDto config = new InterviewConfigDto();
        config.setCompanyName(run.getCompanyName());
        config.setJobPosition(run.getJobPosition());
        config.setJobDescription(run.getJobDescription());
        config.setLanguage(run.getLanguage());
        config.setType("technical");
        config.setDifficulty("intermediate");
        config.setMode("manual");
        config.setQuestionCount(5);
        config.setAiProfile(run.getAiProfile());

        log.info("Starting interview from Agent Run {} for user {}", runId, userId);
        return interviewService.startInterview(config);
    }

    private AgentDtos.AgentRunResponse toResponseSummary(AgentRunEntity run) {
        AgentDtos.AgentMetricsDto metrics = AgentDtos.AgentMetricsDto.builder()
                .stepsExecuted(run.getStepsExecuted())
                .toolsUsed(Collections.emptyList())
                .model(run.getModelId())
                .aiProfile(run.getAiProfile())
                .durationMs(run.getDurationMs())
                .build();

        return AgentDtos.AgentRunResponse.builder()
                .runId(run.getId())
                .status(run.getStatus())
                .goal(run.getGoal())
                .companyName(run.getCompanyName())
                .jobPosition(run.getJobPosition())
                .aiProfile(run.getAiProfile())
                .locked(true)
                .steps(Collections.emptyList())
                .result(null)
                .metrics(metrics)
                .build();
    }

    private static String resolveLanguage(String requested) {
        if (requested == null || requested.isBlank()) {
            return com.tronai.language.ExperienceLanguage.JA.code();
        }
        com.tronai.language.ExperienceLanguage language = com.tronai.language.ExperienceLanguage.parse(requested);
        if (language == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "language must be " + com.tronai.language.ExperienceLanguage.supportedList());
        }
        return language.code();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
