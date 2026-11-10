package com.tronai.career.profile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.storage.ObjectStorageService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.dto.CandidateProfileSummaryDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class CandidateProfileService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern JP_POSTAL = Pattern.compile("^\\d{3}-?\\d{4}$");
    private static final Pattern URL = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);
    private static final long MAX_PHOTO_BYTES = 2L * 1024 * 1024;
    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final CandidateProfileRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ObjectStorageService objectStorageService;
    private final CandidateProfileAiAssistService aiAssistService;

    public CandidateProfileService(CandidateProfileRepository repository,
                                   UserRepository userRepository,
                                   ObjectMapper objectMapper,
                                   ObjectStorageService objectStorageService,
                                   CandidateProfileAiAssistService aiAssistService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.objectStorageService = objectStorageService;
        this.aiAssistService = aiAssistService;
    }

    @Transactional(readOnly = true)
    public CandidateProfileDtos.ProfileResponse get(Long userId) {
        return repository.findByUser_Id(userId)
                .map(this::toResponse)
                .orElseGet(this::emptyResponse);
    }

    @Transactional
    public CandidateProfileDtos.ProfileResponse upsert(Long userId, CandidateProfileDtos.ProfileRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile body required");
        }
        validateRequest(request);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        CandidateProfileEntity entity = repository.findByUser_Id(userId).orElseGet(() ->
                CandidateProfileEntity.builder().user(user).build());

        Set<String> confirmed = new HashSet<>(readStringList(entity.getConfirmedFieldsJson()));
        boolean allow = request.isAllowOverwriteConfirmed();

        if (canSet("fullName", request.getFullName(), confirmed, allow)) entity.setFullName(trimToNull(request.getFullName()));
        if (canSet("nameJa", request.getNameJa(), confirmed, allow)) entity.setNameJa(trimToNull(request.getNameJa()));
        if (canSet("furigana", request.getFurigana(), confirmed, allow)) entity.setFurigana(trimToNull(request.getFurigana()));
        LocalDate dob = ProfileDateParser.parseOptional(request.getDateOfBirth());
        if (dob != null && canSet("dateOfBirth", "x", confirmed, allow)) {
            entity.setDateOfBirth(dob);
        }
        if (canSet("nationality", request.getNationality(), confirmed, allow)) entity.setNationality(trimToNull(request.getNationality()));
        if (canSet("gender", request.getGender(), confirmed, allow)) entity.setGender(trimToNull(request.getGender()));
        if (canSet("addressText", request.getAddressText(), confirmed, allow)) entity.setAddressText(trimToNull(request.getAddressText()));
        if (canSet("postalCode", request.getPostalCode(), confirmed, allow)) entity.setPostalCode(trimToNull(request.getPostalCode()));
        if (canSet("prefecture", request.getPrefecture(), confirmed, allow)) entity.setPrefecture(trimToNull(request.getPrefecture()));
        if (canSet("city", request.getCity(), confirmed, allow)) entity.setCity(trimToNull(request.getCity()));
        if (canSet("streetAddress", request.getStreetAddress(), confirmed, allow)) entity.setStreetAddress(trimToNull(request.getStreetAddress()));
        if (canSet("building", request.getBuilding(), confirmed, allow)) entity.setBuilding(trimToNull(request.getBuilding()));
        if (canSet("email", request.getEmail(), confirmed, allow)) entity.setEmail(trimToNull(request.getEmail()));
        if (canSet("phone", request.getPhone(), confirmed, allow)) entity.setPhone(trimToNull(request.getPhone()));

        if (request.getEducationLegacyText() != null && canSet("education", "x", confirmed, allow)) {
            entity.setEducationLegacyText(request.getEducationLegacyText());
        }

        if (request.getEducation() != null && canSet("education", "x", confirmed, allow)) {
            List<Map<String, Object>> normalized = normalizeEducation(request.getEducation());
            // Safe legacy preservation: first time unstructured payload arrives, keep original text.
            if (EducationLegacyMigrator.looksUnstructured(normalized)
                    && (entity.getEducationLegacyText() == null || entity.getEducationLegacyText().isBlank())) {
                entity.setEducationLegacyText(EducationLegacyMigrator.joinLegacy(normalized));
                entity.setEducationMigrationStatus("NEEDS_REVIEW");
            }
            if (Boolean.TRUE.equals(request.getConfirmEducationMigration())) {
                entity.setEducationMigrationStatus("CONFIRMED");
            }
            entity.setEducationJson(writeJson(normalized));
        }

        if (request.getCareer() != null && canSet("career", "x", confirmed, allow)) {
            entity.setCareerJson(writeJson(normalizeCareer(request.getCareer())));
        }
        if (request.getNoWorkExperience() != null && canSet("career", "x", confirmed, allow)) {
            entity.setNoWorkExperience(Boolean.TRUE.equals(request.getNoWorkExperience()));
            if (entity.isNoWorkExperience()) {
                entity.setCareerJson(writeJson(List.of()));
            }
        }
        if (request.getSkills() != null && canSet("skills", "x", confirmed, allow)) {
            entity.setSkillsJson(writeJson(normalizeSkills(objectsToMaps(request.getSkills()))));
        }
        if (request.getLanguages() != null && canSet("languages", "x", confirmed, allow)) {
            entity.setLanguagesJson(writeJson(normalizeLanguages(objectsToMaps(request.getLanguages()))));
        }
        if (request.getProjects() != null && canSet("projects", "x", confirmed, allow)) {
            entity.setProjectsJson(writeJson(normalizeProjects(request.getProjects())));
        }
        if (request.getCertifications() != null && canSet("certifications", "x", confirmed, allow)) {
            entity.setCertificationsJson(writeJson(normalizeCertifications(request.getCertifications())));
        }
        if (canSet("selfPr", request.getSelfPr(), confirmed, allow)) entity.setSelfPr(request.getSelfPr());
        if (canSet("careerGoals", request.getCareerGoals(), confirmed, allow)) entity.setCareerGoals(request.getCareerGoals());
        if (canSet("motivation", request.getMotivation(), confirmed, allow)) entity.setMotivation(request.getMotivation());
        if (request.getCareerStories() != null && canSet("careerStories", "x", confirmed, allow)) {
            entity.setCareerStoriesJson(writeJson(request.getCareerStories()));
        }
        if (request.getInternational() != null && canSet("international", "x", confirmed, allow)) {
            entity.setInternationalJson(writeJson(request.getInternational()));
        }
        if (request.getPreferences() != null) {
            entity.setPreferencesJson(writeJson(request.getPreferences()));
        }
        if (request.getConfirmedFields() != null) {
            confirmed.addAll(request.getConfirmedFields());
            entity.setConfirmedFieldsJson(writeJson(new ArrayList<>(confirmed)));
        }

        // Compose addressText from structured parts when addressText blank but parts present.
        if ((entity.getAddressText() == null || entity.getAddressText().isBlank())
                && hasAnyAddressPart(entity)) {
            entity.setAddressText(composeAddress(entity));
        }

        CompletenessResult completeness = computeCompleteness(entity);
        entity.setCompletenessScore(completeness.score());
        return toResponse(repository.save(entity), completeness);
    }

    @Transactional
    public CandidateProfileDtos.ProfileResponse uploadPhoto(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file is required");
        }
        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Profile photo must be 2MB or smaller");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!PHOTO_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Profile photo must be JPEG, PNG, or WebP");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        CandidateProfileEntity entity = repository.findByUser_Id(userId).orElseGet(() ->
                CandidateProfileEntity.builder().user(user).build());
        String ext = contentType.contains("png") ? "png" : contentType.contains("webp") ? "webp" : "jpg";
        String key = "profiles/" + userId + "/photo-" + UUID.randomUUID() + "." + ext;
        try {
            objectStorageService.putObject(key, file.getBytes(), contentType);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store profile photo");
        }
        entity.setPhotoObjectKey(key);
        CompletenessResult completeness = computeCompleteness(entity);
        entity.setCompletenessScore(completeness.score());
        return toResponse(repository.save(entity), completeness);
    }

    @Transactional(readOnly = true)
    public CandidateProfileDtos.AiSuggestResponse suggest(Long userId, CandidateProfileDtos.AiSuggestRequest request) {
        CandidateProfileEntity profile = repository.findByUser_Id(userId).orElse(null);
        return aiAssistService.suggest(userId, request, profile);
    }

    /** Skill names for Job Finder / matching — never invents proficiency. */
    @Transactional(readOnly = true)
    public List<String> skillNamesForUser(Long userId) {
        return repository.findByUser_Id(userId)
                .map(e -> skillNames(readFlexibleObjectList(e.getSkillsJson())))
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public List<String> languageNamesForUser(Long userId) {
        return repository.findByUser_Id(userId)
                .map(e -> languageNames(readFlexibleObjectList(e.getLanguagesJson())))
                .orElse(List.of());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> preferencesForUser(Long userId) {
        return repository.findByUser_Id(userId)
                .map(e -> readMap(e.getPreferencesJson()))
                .orElse(Map.of());
    }

    @Transactional(readOnly = true)
    public Optional<CandidateProfileEntity> findEntity(Long userId) {
        return repository.findByUser_Id(userId);
    }

    /**
     * Live summary for User Profile page — reads Candidate Profile only (no sync table).
     * Missing fields stay empty; never invents values.
     */
    @Transactional(readOnly = true)
    public CandidateProfileSummaryDto summaryForUser(Long userId) {
        Optional<CandidateProfileEntity> opt = repository.findByUser_Id(userId);
        if (opt.isEmpty()) {
            return CandidateProfileSummaryDto.builder()
                    .profileExists(false)
                    .education(List.of())
                    .targetJobs(List.of())
                    .preferredLocations(List.of())
                    .skills(List.of())
                    .certifications(List.of())
                    .projects(List.of())
                    .missingFields(List.of())
                    .completenessScore(0)
                    .hasPhoto(false)
                    .build();
        }
        CandidateProfileDtos.ProfileResponse full = toResponse(opt.get());
        Map<String, Object> prefs = full.getPreferences() != null ? full.getPreferences() : Map.of();

        List<String> education = new ArrayList<>();
        String graduationFromEducation = null;
        if (full.getEducation() != null) {
            for (Map<String, Object> row : full.getEducation()) {
                String school = firstNonBlank(row.get("schoolName"), row.get("school"));
                String dept = firstNonBlank(row.get("department"), row.get("detail"));
                String label = school;
                if (!dept.isBlank()) label = school.isBlank() ? dept : school + " — " + dept;
                if (!label.isBlank()) education.add(label);
                Integer endYear = asInt(row.get("endYear"));
                if (endYear != null) {
                    graduationFromEducation = String.valueOf(endYear);
                }
            }
        }

        String expectedGrad = str(prefs.get("expectedGraduationYear"));
        if (expectedGrad.isBlank()) expectedGrad = graduationFromEducation == null ? "" : graduationFromEducation;

        List<String> targetJobs = stringListFromPref(prefs.get("desiredJobTitles"));
        List<String> locations = stringListFromPref(prefs.get("preferredPrefectures"));
        if (locations.isEmpty()) locations = stringListFromPref(prefs.get("preferredLocations"));

        List<String> skills = skillNames(full.getSkills());
        List<String> certs = new ArrayList<>();
        if (full.getCertifications() != null) {
            for (Map<String, Object> c : full.getCertifications()) {
                String name = str(c.get("name"));
                if (!name.isBlank()) certs.add(name);
            }
        }
        List<String> projects = new ArrayList<>();
        if (full.getProjects() != null) {
            for (Map<String, Object> p : full.getProjects()) {
                String name = str(p.get("name"));
                if (!name.isBlank()) projects.add(name);
            }
        }

        String jlpt = extractJlpt(full.getLanguages());
        boolean hasPhoto = notBlank(full.getPhotoObjectKey());

        String displayName = firstNonBlank(full.getFullName(), full.getNameJa());
        return CandidateProfileSummaryDto.builder()
                .profileExists(true)
                .fullName(blankToNull(displayName))
                .nameJa(blankToNull(full.getNameJa()))
                .furigana(blankToNull(full.getFurigana()))
                .photoUrl(hasPhoto ? "/api/v1/career/profile/photo" : null)
                .hasPhoto(hasPhoto)
                .education(education)
                .expectedGraduationYear(blankToNull(expectedGrad))
                .targetJobs(targetJobs)
                .preferredLocations(locations)
                .skills(skills)
                .certifications(certs)
                .jlptLevel(blankToNull(jlpt))
                .projects(projects)
                .completenessScore(full.getCompletenessScore())
                .missingFields(full.getMissingFields() != null ? full.getMissingFields() : List.of())
                .contactEmail(blankToNull(full.getEmail()))
                .build();
    }

    /**
     * Owner-only photo bytes. Returns empty Optional when no photo is stored.
     */
    @Transactional(readOnly = true)
    public Optional<PhotoBytes> getPhoto(Long userId) {
        return repository.findByUser_Id(userId)
                .filter(e -> notBlank(e.getPhotoObjectKey()))
                .map(e -> {
                    byte[] data = objectStorageService.getObject(e.getPhotoObjectKey());
                    String key = e.getPhotoObjectKey().toLowerCase(Locale.ROOT);
                    MediaType type = MediaType.IMAGE_JPEG;
                    if (key.endsWith(".png")) type = MediaType.IMAGE_PNG;
                    else if (key.endsWith(".webp")) type = MediaType.parseMediaType("image/webp");
                    return new PhotoBytes(data, type);
                });
    }

    public record PhotoBytes(byte[] data, MediaType contentType) {}

    private void validateRequest(CandidateProfileDtos.ProfileRequest request) {
        if (request.getEmail() != null && !request.getEmail().isBlank() && !EMAIL.matcher(request.getEmail().trim()).matches()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Please enter a valid email address.");
        }
        if (request.getPostalCode() != null && !request.getPostalCode().isBlank()) {
            String pc = request.getPostalCode().trim();
            // Allow Japanese postal codes and international free-form (length-bounded).
            if (pc.length() > 20) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Postal code is too long.");
            }
            if (pc.chars().allMatch(ch -> Character.isDigit(ch) || ch == '-') && !JP_POSTAL.matcher(pc).matches()
                    && pc.replace("-", "").length() == 7) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Japanese postal code must look like 123-4567.");
            }
        }
        LocalDate parsedDob = ProfileDateParser.parseOptional(request.getDateOfBirth());
        if (parsedDob != null && parsedDob.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Date of birth cannot be in the future.");
        }
        if (request.getFullName() != null && request.getFullName().length() > 255) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Full name is too long (max 255).");
        }
        if (request.getNameJa() != null && request.getNameJa().length() > 255) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Japanese name is too long (max 255).");
        }
        if (request.getFurigana() != null && request.getFurigana().length() > 255) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Furigana is too long (max 255).");
        }
        if (request.getEducation() != null) {
            for (Map<String, Object> row : request.getEducation()) {
                Integer sy = asInt(row.get("startYear"));
                Integer ey = asInt(row.get("endYear"));
                if (sy != null && ey != null && ey < sy) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "Education end date cannot be earlier than start date.");
                }
            }
        }
        if (request.getCareer() != null) {
            for (Map<String, Object> row : request.getCareer()) {
                validateOptionalUrl(row.get("companyUrl"));
                LocalDate start = asDate(row.get("startDate"));
                LocalDate end = asDate(row.get("endDate"));
                boolean current = Boolean.TRUE.equals(row.get("currentlyEmployed"));
                if (start != null && end != null && !current && end.isBefore(start)) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "Work experience end date cannot be earlier than start date.");
                }
            }
        }
        if (request.getProjects() != null) {
            for (Map<String, Object> row : request.getProjects()) {
                validateOptionalUrl(row.get("githubUrl"));
                validateOptionalUrl(row.get("liveDemoUrl"));
            }
        }
        if (request.getCertifications() != null) {
            for (Map<String, Object> row : request.getCertifications()) {
                validateOptionalUrl(row.get("credentialUrl"));
            }
        }
    }

    private void validateOptionalUrl(Object value) {
        if (value == null) return;
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return;
        if (!URL.matcher(s).matches()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Please enter a valid URL starting with http:// or https://");
        }
    }

    private boolean canSet(String field, String newValue, Set<String> confirmed, boolean allow) {
        if (newValue == null) return false;
        if (confirmed.contains(field) && !allow) return false;
        return true;
    }

    private CompletenessResult computeCompleteness(CandidateProfileEntity e) {
        List<String> missing = new ArrayList<>();
        Map<String, Object> breakdown = new LinkedHashMap<>();
        int score = 0;

        boolean personalCore = notBlank(e.getFullName()) || notBlank(e.getNameJa());
        boolean contact = notBlank(e.getEmail()) && notBlank(e.getPhone());
        boolean address = notBlank(e.getAddressText()) || hasAnyAddressPart(e);
        boolean personal = personalCore && e.getDateOfBirth() != null && contact && address;
        breakdown.put("personalInformation", personal);
        if (!personalCore) missing.add("Full legal name");
        if (e.getDateOfBirth() == null) missing.add("Date of birth");
        if (!notBlank(e.getEmail())) missing.add("Email");
        if (!notBlank(e.getPhone())) missing.add("Phone number");
        if (!address) missing.add("Address");
        if (personal) score += 20;

        List<Map<String, Object>> education = normalizeEducation(readFlexibleObjectList(e.getEducationJson()));
        boolean educationOk = !education.isEmpty() && education.stream().anyMatch(row ->
                notBlank(str(row.get("schoolName"))) || notBlank(str(row.get("school"))));
        breakdown.put("education", educationOk);
        if (!educationOk) missing.add("Education");
        if (educationOk) score += 15;

        Map<String, Object> prefs = readMap(e.getPreferencesJson());
        boolean prefsOk = hasPreferenceSignal(prefs);
        breakdown.put("careerPreferences", prefsOk);
        if (!prefsOk) missing.add("Career preferences (job type / location / graduation year)");
        if (prefsOk) score += 15;

        List<Map<String, Object>> skills = normalizeSkills(readFlexibleObjectList(e.getSkillsJson()));
        boolean skillsOk = !skills.isEmpty();
        breakdown.put("technicalSkills", skillsOk);
        if (!skillsOk) missing.add("Technical skills");
        if (skillsOk) score += 15;

        Map<String, Object> stories = readMap(e.getCareerStoriesJson());
        boolean storiesOk = notBlank(e.getSelfPr())
                || notBlank(str(stories.get("selfPr")))
                || notBlank(str(stories.get("gakuchika")))
                || notBlank(e.getCareerGoals());
        breakdown.put("careerStories", storiesOk);
        if (!storiesOk) missing.add("Self PR or career goals");
        if (storiesOk) score += 15;

        // Optional sections — contribute when present, never penalize absence of international/photo/gender/work.
        List<Map<String, Object>> projects = readFlexibleObjectList(e.getProjectsJson());
        boolean projectsOk = !projects.isEmpty();
        breakdown.put("projects", projectsOk);
        if (!projectsOk) missing.add("Technical projects");
        if (projectsOk) score += 10;

        List<Map<String, Object>> career = readFlexibleObjectList(e.getCareerJson());
        boolean workOk = e.isNoWorkExperience() || !career.isEmpty();
        breakdown.put("workExperience", workOk);
        // Students with no experience are not missing work; only flag if neither declared.
        if (!workOk) missing.add("Work experience (or mark no professional experience)");
        if (workOk) score += 5;

        List<Map<String, Object>> certs = readFlexibleObjectList(e.getCertificationsJson());
        List<Map<String, Object>> langs = normalizeLanguages(readFlexibleObjectList(e.getLanguagesJson()));
        boolean certLangOk = !certs.isEmpty() || !langs.isEmpty();
        breakdown.put("certificationsAndLanguages", certLangOk);
        if (certLangOk) score += 5;

        // International is optional — never required for completeness missing list.
        breakdown.put("internationalStudentInfo", !readMap(e.getInternationalJson()).isEmpty());
        breakdown.put("profilePhotoOptional", notBlank(e.getPhotoObjectKey()));

        return new CompletenessResult(Math.min(100, score), missing, breakdown);
    }

    private boolean hasPreferenceSignal(Map<String, Object> prefs) {
        if (prefs == null || prefs.isEmpty()) return false;
        return hasListOrText(prefs.get("desiredJobTitles"))
                || hasListOrText(prefs.get("preferredPrefectures"))
                || hasListOrText(prefs.get("preferredLocations"))
                || hasListOrText(prefs.get("preferredEmploymentTypes"))
                || notBlank(str(prefs.get("expectedGraduationYear")))
                || notBlank(str(prefs.get("schoolCategory")))
                || notBlank(str(prefs.get("employmentType")))
                || notBlank(str(prefs.get("jobCategory")));
    }

    private boolean hasListOrText(Object value) {
        if (value == null) return false;
        if (value instanceof Collection<?> c) return !c.isEmpty();
        return notBlank(String.valueOf(value));
    }

    private CandidateProfileDtos.ProfileResponse emptyResponse() {
        CompletenessResult c = new CompletenessResult(0,
                List.of("Full legal name", "Email", "Education", "Technical skills",
                        "Career preferences (job type / location / graduation year)", "Self PR or career goals"),
                Map.of(
                        "personalInformation", false,
                        "education", false,
                        "careerPreferences", false,
                        "technicalSkills", false,
                        "careerStories", false,
                        "projects", false,
                        "workExperience", true,
                        "certificationsAndLanguages", false,
                        "internationalStudentInfo", false
                ));
        return CandidateProfileDtos.ProfileResponse.builder()
                .completenessScore(0)
                .missingFields(c.missing())
                .completenessBreakdown(c.breakdown())
                .education(List.of())
                .educationSuggestions(List.of())
                .career(List.of())
                .skills(List.of())
                .languages(List.of())
                .projects(List.of())
                .certifications(List.of())
                .careerStories(Map.of())
                .international(Map.of())
                .preferences(Map.of())
                .confirmedFields(List.of())
                .noWorkExperience(false)
                .build();
    }

    private CandidateProfileDtos.ProfileResponse toResponse(CandidateProfileEntity e) {
        return toResponse(e, computeCompleteness(e));
    }

    private CandidateProfileDtos.ProfileResponse toResponse(CandidateProfileEntity e, CompletenessResult completeness) {
        List<Map<String, Object>> education = normalizeEducation(readFlexibleObjectList(e.getEducationJson()));
        String legacy = e.getEducationLegacyText();
        if ((legacy == null || legacy.isBlank()) && EducationLegacyMigrator.looksUnstructured(education)) {
            legacy = EducationLegacyMigrator.joinLegacy(education);
        }
        List<Map<String, Object>> suggestions = List.of();
        String migrationStatus = e.getEducationMigrationStatus();
        if (legacy != null && !legacy.isBlank()
                && (migrationStatus == null || "NEEDS_REVIEW".equals(migrationStatus)
                || EducationLegacyMigrator.looksUnstructured(education))) {
            suggestions = EducationLegacyMigrator.suggest(legacy);
            if (migrationStatus == null) migrationStatus = "NEEDS_REVIEW";
        }

        return CandidateProfileDtos.ProfileResponse.builder()
                .id(e.getId())
                .fullName(e.getFullName())
                .nameJa(e.getNameJa())
                .furigana(e.getFurigana())
                .dateOfBirth(e.getDateOfBirth())
                .nationality(e.getNationality())
                .gender(e.getGender())
                .addressText(e.getAddressText())
                .postalCode(e.getPostalCode())
                .prefecture(e.getPrefecture())
                .city(e.getCity())
                .streetAddress(e.getStreetAddress())
                .building(e.getBuilding())
                .email(e.getEmail())
                .phone(e.getPhone())
                .photoObjectKey(e.getPhotoObjectKey())
                .education(education)
                .educationLegacyText(legacy)
                .educationMigrationStatus(migrationStatus)
                .educationSuggestions(suggestions)
                .career(normalizeCareer(readFlexibleObjectList(e.getCareerJson())))
                .noWorkExperience(e.isNoWorkExperience())
                .skills(normalizeSkills(readFlexibleObjectList(e.getSkillsJson())))
                .languages(normalizeLanguages(readFlexibleObjectList(e.getLanguagesJson())))
                .projects(normalizeProjects(readFlexibleObjectList(e.getProjectsJson())))
                .certifications(normalizeCertifications(readFlexibleObjectList(e.getCertificationsJson())))
                .selfPr(e.getSelfPr())
                .careerGoals(e.getCareerGoals())
                .motivation(e.getMotivation())
                .careerStories(readMap(e.getCareerStoriesJson()))
                .international(readMap(e.getInternationalJson()))
                .preferences(readMap(e.getPreferencesJson()))
                .completenessScore(completeness.score())
                .confirmedFields(readStringList(e.getConfirmedFieldsJson()))
                .missingFields(completeness.missing())
                .completenessBreakdown(completeness.breakdown())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private List<Map<String, Object>> normalizeEducation(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        Set<String> seen = new HashSet<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            String schoolName = firstNonBlank(row.get("schoolName"), row.get("school"));
            String detail = str(row.get("detail"));
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("schoolName", schoolName);
            m.put("schoolNameJa", str(row.get("schoolNameJa")));
            m.put("country", str(row.get("country")));
            m.put("schoolType", str(row.get("schoolType")));
            m.put("department", firstNonBlank(row.get("department"), detail));
            m.put("course", str(row.get("course")));
            m.put("startYear", asInt(row.get("startYear")));
            m.put("startMonth", asInt(row.get("startMonth")));
            m.put("endYear", asInt(row.get("endYear")));
            m.put("endMonth", asInt(row.get("endMonth")));
            m.put("status", str(row.get("status")));
            // Keep legacy keys for CV Builder / older clients.
            m.put("school", schoolName);
            m.put("detail", firstNonBlank(row.get("department"), detail));
            String dedupe = (schoolName + "|" + m.get("department") + "|" + m.get("startYear") + "|" + m.get("endYear"))
                    .toLowerCase(Locale.ROOT);
            if (schoolName.isBlank() && str(m.get("department")).isBlank()) continue;
            if (!seen.add(dedupe)) continue;
            out.add(m);
        }
        out.sort((a, b) -> {
            Integer ay = asInt(a.get("startYear"));
            Integer by = asInt(b.get("startYear"));
            if (ay == null && by == null) return 0;
            if (ay == null) return 1;
            if (by == null) return -1;
            return Integer.compare(ay, by);
        });
        return out;
    }

    private List<Map<String, Object>> normalizeCareer(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        for (Map<String, Object> row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            String org = firstNonBlank(row.get("company"), row.get("organization"));
            String role = firstNonBlank(row.get("jobTitle"), row.get("role"));
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("company", org);
            m.put("organization", org);
            m.put("jobTitle", role);
            m.put("role", role);
            m.put("employmentType", str(row.get("employmentType")));
            m.put("startDate", str(row.get("startDate")));
            m.put("endDate", str(row.get("endDate")));
            m.put("currentlyEmployed", Boolean.TRUE.equals(row.get("currentlyEmployed")));
            m.put("responsibilities", str(row.get("responsibilities")));
            m.put("achievements", str(row.get("achievements")));
            m.put("technologies", row.get("technologies") instanceof Collection<?> c ? c : List.of());
            m.put("period", firstNonBlank(row.get("period"), composePeriod(str(row.get("startDate")), str(row.get("endDate")),
                    Boolean.TRUE.equals(row.get("currentlyEmployed")))));
            if (org.isBlank() && role.isBlank()) continue;
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> normalizeSkills(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        Set<String> seen = new HashSet<>();
        for (Map<String, Object> row : rows) {
            String name = firstNonBlank(row.get("name"), row.get("skill"));
            if (name.isBlank()) continue;
            String key = name.toLowerCase(Locale.ROOT);
            if (!seen.add(key)) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("name", name);
            m.put("category", firstNonBlank(row.get("category"), "Other"));
            // Never invent expertise — only store what user provided.
            m.put("proficiency", str(row.get("proficiency")));
            m.put("experienceMonths", asInt(row.get("experienceMonths")));
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> normalizeLanguages(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        for (Map<String, Object> row : rows) {
            String language = firstNonBlank(row.get("language"), row.get("name"));
            if (language.isBlank()) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("language", language);
            m.put("proficiency", str(row.get("proficiency")));
            m.put("certification", str(row.get("certification")));
            m.put("score", str(row.get("score")));
            m.put("dateObtained", str(row.get("dateObtained")));
            m.put("verified", Boolean.TRUE.equals(row.get("verified")));
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> normalizeProjects(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        for (Map<String, Object> row : rows) {
            String name = str(row.get("name"));
            if (name.isBlank()) continue;
            Map<String, Object> m = new LinkedHashMap<>(row);
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("name", name);
            out.add(m);
        }
        return out;
    }

    private List<Map<String, Object>> normalizeCertifications(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null) return out;
        for (Map<String, Object> row : rows) {
            String name = str(row.get("name"));
            if (name.isBlank()) continue;
            Map<String, Object> m = new LinkedHashMap<>(row);
            m.put("id", row.get("id") != null ? row.get("id") : UUID.randomUUID().toString());
            m.put("name", name);
            // Do not mark studying/exam-scheduled as obtained.
            String status = str(row.get("status"));
            if (status.isBlank()) status = "Obtained";
            m.put("status", status);
            out.add(m);
        }
        return out;
    }

    public static List<String> skillNames(List<Map<String, Object>> skills) {
        List<String> names = new ArrayList<>();
        if (skills == null) return names;
        for (Map<String, Object> s : skills) {
            String name = firstNonBlankStatic(s.get("name"), s.get("skill"));
            if (!name.isBlank()) names.add(name);
        }
        return names;
    }

    public static List<String> languageNames(List<Map<String, Object>> languages) {
        List<String> names = new ArrayList<>();
        if (languages == null) return names;
        for (Map<String, Object> s : languages) {
            String name = firstNonBlankStatic(s.get("language"), s.get("name"));
            if (!name.isBlank()) names.add(name);
        }
        return names;
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private String writeJson(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "[]"; }
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return List.of();
            List<String> out = new ArrayList<>();
            for (JsonNode n : node) {
                if (n.isTextual()) out.add(n.asText());
                else if (n.isObject()) {
                    String v = n.has("name") ? n.get("name").asText()
                            : n.has("language") ? n.get("language").asText() : null;
                    if (v != null && !v.isBlank()) out.add(v);
                }
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> objectsToMaps(List<Object> raw) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (raw == null) return out;
        for (Object item : raw) {
            if (item == null) continue;
            if (item instanceof String s) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", s);
                m.put("language", s);
                m.put("school", s);
                m.put("schoolName", s);
                out.add(m);
            } else if (item instanceof Map<?, ?> map) {
                out.add(new LinkedHashMap<>((Map<String, Object>) map));
            }
        }
        return out;
    }

    private List<Map<String, Object>> readFlexibleObjectList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) return List.of();
            List<Map<String, Object>> out = new ArrayList<>();
            for (JsonNode item : node) {
                if (item.isTextual()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", item.asText());
                    m.put("language", item.asText());
                    m.put("school", item.asText());
                    m.put("schoolName", item.asText());
                    out.add(m);
                } else if (item.isObject()) {
                    Map<String, Object> m = objectMapper.convertValue(item, new TypeReference<>() {});
                    out.add(m);
                }
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { return new LinkedHashMap<>(); }
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static String firstNonBlank(Object a, Object b) {
        String s = str(a);
        if (!s.isEmpty()) return s;
        return str(b);
    }

    private static String firstNonBlankStatic(Object a, Object b) {
        return firstNonBlank(a, b);
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try { return Integer.parseInt(s); } catch (Exception e) { return null; }
    }

    private static LocalDate asDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t;
    }

    private static boolean hasAnyAddressPart(CandidateProfileEntity e) {
        return notBlankStatic(e.getPostalCode()) || notBlankStatic(e.getPrefecture())
                || notBlankStatic(e.getCity()) || notBlankStatic(e.getStreetAddress())
                || notBlankStatic(e.getBuilding());
    }

    private static boolean notBlankStatic(String s) {
        return s != null && !s.isBlank();
    }

    private static String composeAddress(CandidateProfileEntity e) {
        List<String> parts = new ArrayList<>();
        if (notBlankStatic(e.getPostalCode())) parts.add("〒" + e.getPostalCode());
        if (notBlankStatic(e.getPrefecture())) parts.add(e.getPrefecture());
        if (notBlankStatic(e.getCity())) parts.add(e.getCity());
        if (notBlankStatic(e.getStreetAddress())) parts.add(e.getStreetAddress());
        if (notBlankStatic(e.getBuilding())) parts.add(e.getBuilding());
        return String.join(" ", parts);
    }

    private static String composePeriod(String start, String end, boolean current) {
        if (start.isBlank() && end.isBlank() && !current) return "";
        if (current) return (start.isBlank() ? "" : start + " – ") + "Present";
        if (!start.isBlank() && !end.isBlank()) return start + " – " + end;
        return start.isBlank() ? end : start;
    }

    private record CompletenessResult(int score, List<String> missing, Map<String, Object> breakdown) {}

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static List<String> stringListFromPref(Object value) {
        List<String> out = new ArrayList<>();
        if (value instanceof Collection<?> c) {
            for (Object item : c) {
                if (item != null && !String.valueOf(item).isBlank()) out.add(String.valueOf(item).trim());
            }
        } else if (value instanceof String s && !s.isBlank()) {
            out.add(s.trim());
        }
        return out;
    }

    private static String extractJlpt(List<Map<String, Object>> languages) {
        if (languages == null) return "";
        String best = "";
        int bestRank = Integer.MAX_VALUE;
        for (Map<String, Object> lang : languages) {
            String blob = (str(lang.get("certification")) + " " + str(lang.get("score")) + " "
                    + str(lang.get("proficiency")) + " " + str(lang.get("language"))).toUpperCase(Locale.ROOT);
            for (int n = 1; n <= 5; n++) {
                String token = "N" + n;
                if (blob.contains("JLPT") && blob.contains(token) || blob.matches(".*\\b" + token + "\\b.*")) {
                    if (n < bestRank) {
                        bestRank = n;
                        best = token;
                    }
                }
            }
        }
        return best;
    }
}
