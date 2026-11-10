package com.tronai.career.profile;

import com.tronai.career.cvbuilder.CvAiAssistService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Profile narrative AI suggestions. Preview-only — never silently overwrites master profile text.
 */
@Service
public class CandidateProfileAiAssistService {

    private static final Set<String> ALLOWED_FIELDS = Set.of(
            "selfPr", "careerGoals", "motivation", "gakuchika", "strengths", "weaknesses",
            "reasonForIt", "learningExperiences", "technicalAchievements", "projectDescription"
    );

    private final CvAiAssistService cvAiAssistService;

    public CandidateProfileAiAssistService(CvAiAssistService cvAiAssistService) {
        this.cvAiAssistService = cvAiAssistService;
    }

    public CandidateProfileDtos.AiSuggestResponse suggest(Long userId,
                                                          CandidateProfileDtos.AiSuggestRequest request,
                                                          CandidateProfileEntity profile) {
        if (request == null || request.getFieldKey() == null || request.getFieldKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fieldKey is required");
        }
        String fieldKey = request.getFieldKey().trim();
        if (!ALLOWED_FIELDS.contains(fieldKey)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "AI suggestions are only available for career narrative fields");
        }
        String original = request.getCurrentText() != null ? request.getCurrentText() : "";
        if (original.isBlank() && profile != null) {
            original = switch (fieldKey) {
                case "selfPr" -> nullToEmpty(profile.getSelfPr());
                case "careerGoals" -> nullToEmpty(profile.getCareerGoals());
                case "motivation" -> nullToEmpty(profile.getMotivation());
                default -> "";
            };
        }
        Map<String, Object> ctx = new LinkedHashMap<>();
        if (profile != null) {
            ctx.put("fullName", nullToEmpty(profile.getFullName()));
            ctx.put("nameJa", nullToEmpty(profile.getNameJa()));
            ctx.put("skillsJson", nullToEmpty(profile.getSkillsJson()));
            ctx.put("educationJson", nullToEmpty(profile.getEducationJson()));
            ctx.put("projectsJson", nullToEmpty(profile.getProjectsJson()));
        }
        String language = request.getLanguage() == null ? "ja" : request.getLanguage();
        boolean allowCloud = Boolean.TRUE.equals(request.getAllowCloud());
        CvAiAssistService.AssistResult result = cvAiAssistService.improve(
                userId,
                fieldKey,
                original,
                request.getInstruction() == null ? "" : request.getInstruction(),
                language,
                ctx,
                profile,
                allowCloud
        );
        return CandidateProfileDtos.AiSuggestResponse.builder()
                .fieldKey(fieldKey)
                .originalText(original)
                .proposedText(result.proposedText())
                .reason(result.reason() + " | Requires your approval before saving to master profile.")
                .engine(result.engine())
                .requiresApproval(true)
                .build();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
