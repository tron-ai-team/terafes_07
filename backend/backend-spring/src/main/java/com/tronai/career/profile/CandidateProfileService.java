package com.tronai.career.profile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class CandidateProfileService {

    private final CandidateProfileRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public CandidateProfileService(CandidateProfileRepository repository,
                                   UserRepository userRepository,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public CandidateProfileDtos.ProfileResponse get(Long userId) {
        return repository.findByUser_Id(userId)
                .map(this::toResponse)
                .orElseGet(() -> CandidateProfileDtos.ProfileResponse.builder()
                        .completenessScore(0)
                        .missingFields(List.of("fullName", "email", "education", "skills"))
                        .education(List.of())
                        .career(List.of())
                        .skills(List.of())
                        .languages(List.of())
                        .confirmedFields(List.of())
                        .build());
    }

    @Transactional
    public CandidateProfileDtos.ProfileResponse upsert(Long userId, CandidateProfileDtos.ProfileRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile body required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        CandidateProfileEntity entity = repository.findByUser_Id(userId).orElseGet(() ->
                CandidateProfileEntity.builder().user(user).build());

        Set<String> confirmed = new HashSet<>(readStringList(entity.getConfirmedFieldsJson()));
        boolean allow = request.isAllowOverwriteConfirmed();

        if (canSet("fullName", request.getFullName(), confirmed, allow)) entity.setFullName(request.getFullName());
        if (canSet("nameJa", request.getNameJa(), confirmed, allow)) entity.setNameJa(request.getNameJa());
        if (canSet("furigana", request.getFurigana(), confirmed, allow)) entity.setFurigana(request.getFurigana());
        if (request.getDateOfBirth() != null && canSet("dateOfBirth", "x", confirmed, allow)) {
            entity.setDateOfBirth(request.getDateOfBirth());
        }
        if (canSet("nationality", request.getNationality(), confirmed, allow)) entity.setNationality(request.getNationality());
        if (canSet("addressText", request.getAddressText(), confirmed, allow)) entity.setAddressText(request.getAddressText());
        if (canSet("email", request.getEmail(), confirmed, allow)) entity.setEmail(request.getEmail());
        if (canSet("phone", request.getPhone(), confirmed, allow)) entity.setPhone(request.getPhone());
        if (request.getEducation() != null && canSet("education", "x", confirmed, allow)) {
            entity.setEducationJson(writeJson(request.getEducation()));
        }
        if (request.getCareer() != null && canSet("career", "x", confirmed, allow)) {
            entity.setCareerJson(writeJson(request.getCareer()));
        }
        if (request.getSkills() != null && canSet("skills", "x", confirmed, allow)) {
            entity.setSkillsJson(writeJson(request.getSkills()));
        }
        if (request.getLanguages() != null && canSet("languages", "x", confirmed, allow)) {
            entity.setLanguagesJson(writeJson(request.getLanguages()));
        }
        if (canSet("selfPr", request.getSelfPr(), confirmed, allow)) entity.setSelfPr(request.getSelfPr());
        if (canSet("careerGoals", request.getCareerGoals(), confirmed, allow)) entity.setCareerGoals(request.getCareerGoals());
        if (canSet("motivation", request.getMotivation(), confirmed, allow)) entity.setMotivation(request.getMotivation());
        if (request.getPreferences() != null) entity.setPreferencesJson(writeJson(request.getPreferences()));
        if (request.getConfirmedFields() != null) {
            confirmed.addAll(request.getConfirmedFields());
            entity.setConfirmedFieldsJson(writeJson(new ArrayList<>(confirmed)));
        }

        entity.setCompletenessScore(computeCompleteness(entity));
        return toResponse(repository.save(entity));
    }

    private boolean canSet(String field, String newValue, Set<String> confirmed, boolean allow) {
        if (newValue == null) return false;
        if (confirmed.contains(field) && !allow) return false;
        return true;
    }

    private int computeCompleteness(CandidateProfileEntity e) {
        int score = 0;
        if (notBlank(e.getFullName()) || notBlank(e.getNameJa())) score += 15;
        if (e.getDateOfBirth() != null) score += 10;
        if (notBlank(e.getEmail())) score += 10;
        if (notBlank(e.getPhone())) score += 5;
        if (notBlank(e.getAddressText())) score += 10;
        if (notBlank(e.getEducationJson()) && !"[]".equals(e.getEducationJson())) score += 15;
        if (notBlank(e.getSkillsJson()) && !"[]".equals(e.getSkillsJson())) score += 15;
        if (notBlank(e.getSelfPr())) score += 10;
        if (notBlank(e.getLanguagesJson()) && !"[]".equals(e.getLanguagesJson())) score += 10;
        return Math.min(100, score);
    }

    private CandidateProfileDtos.ProfileResponse toResponse(CandidateProfileEntity e) {
        List<String> missing = new ArrayList<>();
        if (!notBlank(e.getFullName()) && !notBlank(e.getNameJa())) missing.add("fullName");
        if (e.getDateOfBirth() == null) missing.add("dateOfBirth");
        if (!notBlank(e.getEmail())) missing.add("email");
        if (!notBlank(e.getEducationJson()) || "[]".equals(e.getEducationJson())) missing.add("education");
        if (!notBlank(e.getSkillsJson()) || "[]".equals(e.getSkillsJson())) missing.add("skills");
        if (!notBlank(e.getSelfPr())) missing.add("selfPr");

        return CandidateProfileDtos.ProfileResponse.builder()
                .id(e.getId())
                .fullName(e.getFullName())
                .nameJa(e.getNameJa())
                .furigana(e.getFurigana())
                .dateOfBirth(e.getDateOfBirth())
                .nationality(e.getNationality())
                .addressText(e.getAddressText())
                .email(e.getEmail())
                .phone(e.getPhone())
                .photoObjectKey(e.getPhotoObjectKey())
                .education(readMapList(e.getEducationJson()))
                .career(readMapList(e.getCareerJson()))
                .skills(readStringList(e.getSkillsJson()))
                .languages(readStringList(e.getLanguagesJson()))
                .selfPr(e.getSelfPr())
                .careerGoals(e.getCareerGoals())
                .motivation(e.getMotivation())
                .preferences(readMap(e.getPreferencesJson()))
                .completenessScore(e.getCompletenessScore())
                .confirmedFields(readStringList(e.getConfirmedFieldsJson()))
                .missingFields(missing)
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private String writeJson(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "[]"; }
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return List.of(); }
    }

    private List<Map<String, Object>> readMapList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return List.of(); }
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return Map.of(); }
    }
}
