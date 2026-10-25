package com.tronai.cv.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.auth.SecurityUtils;
import com.tronai.auth.UserPrincipal;
import com.tronai.cv.*;
import com.tronai.cv.dto.*;
import com.tronai.cv.extractor.CompositeDocumentTextExtractor;
import com.tronai.cv.extractor.ExtractedDocument;
import com.tronai.cv.parser.CvParsedResult;
import com.tronai.cv.parser.CvParser;
import com.tronai.queue.BackgroundJobPublisher;
import com.tronai.storage.ObjectStorageService;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class CvService {

    private static final Logger log = LoggerFactory.getLogger(CvService.class);

    public static final long MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

    private final CompositeDocumentTextExtractor documentExtractor;
    private final CvParser cvParser;
    private final ObjectStorageService objectStorageService;
    private final CvDocumentRepository cvDocumentRepository;
    private final CvProfileRepository cvProfileRepository;
    private final UserRepository userRepository;
    private final BackgroundJobPublisher backgroundJobPublisher;
    private final ObjectMapper objectMapper;

    public CvService(CompositeDocumentTextExtractor documentExtractor,
                     CvParser cvParser,
                     ObjectStorageService objectStorageService,
                     CvDocumentRepository cvDocumentRepository,
                     CvProfileRepository cvProfileRepository,
                     UserRepository userRepository,
                     BackgroundJobPublisher backgroundJobPublisher,
                     ObjectMapper objectMapper) {
        this.documentExtractor = documentExtractor;
        this.cvParser = cvParser;
        this.objectStorageService = objectStorageService;
        this.cvDocumentRepository = cvDocumentRepository;
        this.cvProfileRepository = cvProfileRepository;
        this.userRepository = userRepository;
        this.backgroundJobPublisher = backgroundJobPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CvUploadResponse processCvUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CvException(HttpStatus.BAD_REQUEST, "The file is not a valid PDF");
        }

        if (file.getSize() > MAX_FILE_BYTES) {
            throw new CvException(HttpStatus.PAYLOAD_TOO_LARGE, "PDF exceeds the 5MB limit");
        }

        String rawFilename = file.getOriginalFilename();
        String safeFilename = sanitizeFilename(rawFilename);
        String contentType = file.getContentType();

        if (!documentExtractor.supports(safeFilename, contentType)) {
            throw new CvException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only PDF or DOCX files are accepted");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            log.error("Failed to read uploaded file bytes: {}", e.getMessage());
            throw new CvException(HttpStatus.BAD_REQUEST, "The PDF structure could not be read");
        }

        // Validate and extract raw document text and page metadata
        ExtractedDocument extracted = documentExtractor.extract(data, safeFilename, contentType);

        // Structure resume fields
        CvParsedResult parsed = cvParser.parse(extracted.getText(), safeFilename);

        String sha256 = calculateSha256(data);

        // Handle authenticated user persistence
        Optional<UserPrincipal> currentUser = SecurityUtils.getCurrentUser();
        Long cvId = null;

        if (currentUser.isPresent()) {
            Long userId = currentUser.get().getId();
            User user = userRepository.findById(userId).orElse(null);

            if (user != null) {
                String ext = safeFilename.toLowerCase().endsWith(".docx") ? "docx" : "pdf";
                String objectKey = String.format("users/%d/cv/%s.%s", userId, UUID.randomUUID(), ext);
                boolean objectUploaded = false;

                try {
                    // Store original file in private MinIO storage
                    objectStorageService.putObject(objectKey, data, contentType);
                    objectUploaded = true;

                    // Persist CV Document metadata
                    CvDocumentEntity doc = CvDocumentEntity.builder()
                            .user(user)
                            .originalFilename(safeFilename)
                            .objectKey(objectKey)
                            .contentType(contentType != null ? contentType : "application/pdf")
                            .sizeBytes((long) data.length)
                            .sha256(sha256)
                            .pageCount(extracted.getPageCount())
                            .textCharacters(extracted.getCharacterCount())
                            .status("COMPLETED")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();

                    doc = cvDocumentRepository.save(doc);
                    cvId = doc.getId();

                    // Persist parsed CV Profile
                    String educationJson = serializeJson(parsed.getEducation());
                    String skillsJson = serializeJson(parsed.getSkills());
                    String workExpJson = serializeJson(parsed.getWorkExperience());
                    String extractionNotesJson = serializeJson(parsed.getExtractionNotes());

                    String excerpt = extracted.getText().length() > 4000
                            ? extracted.getText().substring(0, 4000)
                            : extracted.getText();

                    CvProfileEntity profile = CvProfileEntity.builder()
                            .document(doc)
                            .educationJson(educationJson)
                            .skillsJson(skillsJson)
                            .workExperienceJson(workExpJson)
                            .extractionNotesJson(extractionNotesJson)
                            .languagesJson(serializeJson(inferLanguages(parsed.getSkills())))
                            .summaryText(buildSummary(parsed))
                            .rawTextExcerpt(excerpt)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();

                    cvProfileRepository.save(profile);

                    // Publish async non-critical queue event
                    backgroundJobPublisher.publishCvProcessed(userId, doc.getId(), safeFilename);

                } catch (Exception e) {
                    // Compensating deletion to prevent orphaned objects
                    if (objectUploaded) {
                        try {
                            log.warn("Performing compensating deletion for MinIO object: {}", objectKey);
                            objectStorageService.deleteObject(objectKey);
                        } catch (Exception delEx) {
                            log.error("Compensating deletion failed: {}", delEx.getMessage());
                        }
                    }
                    log.error("Failed to persist CV document / profile: {}", e.getMessage(), e);
                    throw new CvException(HttpStatus.INTERNAL_SERVER_ERROR, "CV storage failed: " + e.getMessage());
                }
            }
        }

        return CvUploadResponse.builder()
                .cvId(cvId)
                .filename(safeFilename)
                .pageCount(extracted.getPageCount())
                .textCharacters(extracted.getCharacterCount())
                .education(parsed.getEducation())
                .skills(parsed.getSkills())
                .workExperience(parsed.getWorkExperience())
                .extractionNotes(parsed.getExtractionNotes())
                .build();
    }

    @Transactional(readOnly = true)
    public List<CvDocumentSummaryDto> listUserDocuments(Long userId) {
        List<CvDocumentEntity> docs = cvDocumentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<CvDocumentSummaryDto> result = new ArrayList<>();
        for (CvDocumentEntity d : docs) {
            result.add(CvDocumentSummaryDto.builder()
                    .id(d.getId())
                    .filename(d.getOriginalFilename())
                    .contentType(d.getContentType())
                    .sizeBytes(d.getSizeBytes())
                    .pageCount(d.getPageCount())
                    .textCharacters(d.getTextCharacters())
                    .status(d.getStatus())
                    .primary(d.isPrimary())
                    .versionLabel(d.getVersionLabel())
                    .createdAt(d.getCreatedAt())
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public CvDocumentDetailDto getUserDocument(Long userId, Long cvId) {
        CvDocumentEntity doc = cvDocumentRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CV document not found"));

        CvProfileEntity profile = cvProfileRepository.findByDocumentId(doc.getId()).orElse(null);

        List<EducationItemDto> education = profile != null ? deserializeList(profile.getEducationJson(), new TypeReference<>() {}) : List.of();
        List<String> skills = profile != null ? deserializeList(profile.getSkillsJson(), new TypeReference<>() {}) : List.of();
        List<ExperienceItemDto> workExperience = profile != null ? deserializeList(profile.getWorkExperienceJson(), new TypeReference<>() {}) : List.of();
        List<String> extractionNotes = profile != null ? deserializeList(profile.getExtractionNotesJson(), new TypeReference<>() {}) : List.of();

        return CvDocumentDetailDto.builder()
                .id(doc.getId())
                .filename(doc.getOriginalFilename())
                .contentType(doc.getContentType())
                .sizeBytes(doc.getSizeBytes())
                .sha256(doc.getSha256())
                .pageCount(doc.getPageCount())
                .textCharacters(doc.getTextCharacters())
                .status(doc.getStatus())
                .primary(doc.isPrimary())
                .versionLabel(doc.getVersionLabel())
                .createdAt(doc.getCreatedAt())
                .education(education)
                .skills(skills)
                .workExperience(workExperience)
                .extractionNotes(extractionNotes)
                .languages(profile != null ? deserializeList(profile.getLanguagesJson(), new TypeReference<>() {}) : List.of())
                .summaryText(profile != null ? profile.getSummaryText() : null)
                .rawTextExcerpt(profile != null ? profile.getRawTextExcerpt() : null)
                .build();
    }

    @Transactional
    public void setPrimaryCv(Long userId, Long cvId) {
        CvDocumentEntity doc = cvDocumentRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CV document not found"));
        List<CvDocumentEntity> all = cvDocumentRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (CvDocumentEntity d : all) {
            d.setPrimary(d.getId().equals(doc.getId()));
        }
        cvDocumentRepository.saveAll(all);
    }

    @Transactional
    public CvDocumentDetailDto updateProfile(Long userId, Long cvId, CvProfileUpdateRequest request) {
        CvDocumentEntity doc = cvDocumentRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CV document not found"));
        if (request.getVersionLabel() != null) {
            doc.setVersionLabel(request.getVersionLabel());
            cvDocumentRepository.save(doc);
        }
        CvProfileEntity profile = cvProfileRepository.findByDocumentId(doc.getId())
                .orElseGet(() -> CvProfileEntity.builder().document(doc).build());
        if (request.getEducation() != null) profile.setEducationJson(serializeJson(request.getEducation()));
        if (request.getSkills() != null) profile.setSkillsJson(serializeJson(request.getSkills()));
        if (request.getWorkExperience() != null) profile.setWorkExperienceJson(serializeJson(request.getWorkExperience()));
        if (request.getLanguages() != null) profile.setLanguagesJson(serializeJson(request.getLanguages()));
        if (request.getSummaryText() != null) profile.setSummaryText(request.getSummaryText());
        cvProfileRepository.save(profile);
        return getUserDocument(userId, cvId);
    }

    @Transactional(readOnly = true)
    public CvSuggestionsResponse suggestions(Long userId, Long cvId, String jobId, String language) {
        CvDocumentDetailDto cv = getUserDocument(userId, cvId);
        List<String> general = new ArrayList<>();
        if (cv.getSkills() == null || cv.getSkills().size() < 5) {
            general.add("Add more concrete technical skills to your CV profile.");
        }
        if (cv.getSummaryText() == null || cv.getSummaryText().isBlank()) {
            general.add("Write a short professional summary highlighting your target role.");
        }
        List<String> jobSpecific = new ArrayList<>();
        if (jobId != null && !jobId.isBlank()) {
            jobSpecific.add("Tailor bullet points to mirror keywords from job " + jobId + ".");
            jobSpecific.add("Quantify achievements that relate to the job requirements.");
        }
        return CvSuggestionsResponse.builder()
                .generalSuggestions(general)
                .jobSpecificSuggestions(jobSpecific)
                .language(language != null ? language : "en")
                .build();
    }

    @Transactional
    public void deleteUserDocument(Long userId, Long cvId) {
        CvDocumentEntity doc = cvDocumentRepository.findByIdAndUserId(cvId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CV document not found"));

        String objectKey = doc.getObjectKey();

        // Delete from database
        cvDocumentRepository.delete(doc);

        // Delete from MinIO storage
        if (objectKey != null && !objectKey.isBlank()) {
            try {
                objectStorageService.deleteObject(objectKey);
            } catch (Exception e) {
                log.warn("Failed to delete MinIO object for deleted CV {}: {}", cvId, e.getMessage());
            }
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "upload.pdf";
        }
        try {
            return Path.of(filename).getFileName().toString();
        } catch (Exception e) {
            return "upload.pdf";
        }
    }

    private String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String serializeJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

    private <T> List<T> deserializeList(String json, TypeReference<List<T>> typeRef) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> inferLanguages(List<String> skills) {
        List<String> langs = new ArrayList<>();
        langs.add("English");
        if (skills != null) {
            for (String skill : skills) {
                if (skill != null && (skill.toLowerCase().contains("japanese") || skill.contains("日本語"))) {
                    langs.add("Japanese");
                    break;
                }
            }
        }
        return langs;
    }

    private String buildSummary(CvParsedResult parsed) {
        if (parsed.getWorkExperience() != null && !parsed.getWorkExperience().isEmpty()) {
            return "Experienced candidate with " + parsed.getWorkExperience().size() + " listed roles.";
        }
        return "Candidate profile extracted from uploaded CV.";
    }
}
