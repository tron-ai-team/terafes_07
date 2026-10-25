package com.tronai.career.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.entity.CareerMatchEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.repo.CareerMatchRepository;
import com.tronai.career.util.SkillMatchEngine;
import com.tronai.cv.CvDocumentRepository;
import com.tronai.cv.CvProfileEntity;
import com.tronai.cv.CvProfileRepository;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CareerMatchService {

    private final CareerMatchRepository careerMatchRepository;
    private final CvDocumentRepository cvDocumentRepository;
    private final CvProfileRepository cvProfileRepository;
    private final CareerJobService careerJobService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;

    public CareerMatchService(CareerMatchRepository careerMatchRepository,
                              CvDocumentRepository cvDocumentRepository,
                              CvProfileRepository cvProfileRepository,
                              CareerJobService careerJobService,
                              UserRepository userRepository,
                              ObjectMapper objectMapper,
                              CareerLanguageHelper languageHelper) {
        this.careerMatchRepository = careerMatchRepository;
        this.cvDocumentRepository = cvDocumentRepository;
        this.cvProfileRepository = cvProfileRepository;
        this.careerJobService = careerJobService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
    }

    @Transactional
    public CareerDtos.MatchResponse createMatch(Long userId, CareerDtos.MatchRequest request) {
        if (request.getCvDocumentId() == null || request.getJobId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cvDocumentId and jobId are required");
        }
        cvDocumentRepository.findByIdAndUserId(request.getCvDocumentId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CV not found"));
        CareerJobEntity job = careerJobService.requireOwnedJob(userId, request.getJobId());
        CvProfileEntity profile = cvProfileRepository.findByDocumentId(request.getCvDocumentId()).orElse(null);
        List<String> candidateSkills = profile != null ? readList(profile.getSkillsJson()) : List.of();
        List<String> languages = profile != null ? readList(profile.getLanguagesJson()) : List.of();
        List<String> required = careerJobService.readStringList(job.getRequiredSkillsJson());
        String lang = languageHelper.normalize(request.getLanguage());
        SkillMatchEngine.MatchAnalysis analysis = SkillMatchEngine.analyze(
                candidateSkills, required, job.getJapaneseRequirement(), languages, lang, languageHelper);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        CareerMatchEntity entity = CareerMatchEntity.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .cvDocumentId(request.getCvDocumentId())
                .jobId(job.getId())
                .matchScore(analysis.score())
                .matchTier(analysis.tier())
                .mandatoryBlockersJson(writeJson(analysis.mandatoryBlockers()))
                .matchedSkillsJson(writeJson(analysis.matchedSkills()))
                .missingSkillsJson(writeJson(analysis.missingSkills()))
                .strengthsJson(writeJson(analysis.strengths()))
                .gapsJson(writeJson(analysis.gaps()))
                .reasonsJson(writeJson(analysis.reasons()))
                .improvementsJson(writeJson(analysis.improvements()))
                .rubricJson(writeJson(analysis.rubric()))
                .language(lang)
                .build();
        careerMatchRepository.save(entity);
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<CareerDtos.MatchResponse> listMatches(Long userId) {
        return careerMatchRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public SkillMatchEngine.MatchAnalysis analyzeForJob(Long userId, Long cvId, CareerJobEntity job, String language) {
        CvProfileEntity profile = cvProfileRepository.findByDocumentId(cvId).orElse(null);
        List<String> candidateSkills = profile != null ? readList(profile.getSkillsJson()) : List.of();
        List<String> languages = profile != null ? readList(profile.getLanguagesJson()) : List.of();
        List<String> required = careerJobService.readStringList(job.getRequiredSkillsJson());
        String lang = languageHelper.normalize(language);
        return SkillMatchEngine.analyze(candidateSkills, required, job.getJapaneseRequirement(), languages, lang, languageHelper);
    }

    private CareerDtos.MatchResponse toResponse(CareerMatchEntity entity) {
        return CareerDtos.MatchResponse.builder()
                .id(entity.getId())
                .cvDocumentId(entity.getCvDocumentId())
                .jobId(entity.getJobId())
                .matchScore(entity.getMatchScore())
                .matchTier(entity.getMatchTier())
                .mandatoryBlockers(readList(entity.getMandatoryBlockersJson()))
                .matchedSkills(readList(entity.getMatchedSkillsJson()))
                .missingSkills(readList(entity.getMissingSkillsJson()))
                .strengths(readList(entity.getStrengthsJson()))
                .gaps(readList(entity.getGapsJson()))
                .reasons(readList(entity.getReasonsJson()))
                .improvements(readList(entity.getImprovementsJson()))
                .rubric(readMap(entity.getRubricJson()))
                .language(entity.getLanguage())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }
}
