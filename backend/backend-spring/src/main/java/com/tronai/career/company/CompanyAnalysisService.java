package com.tronai.career.company;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.cvbuilder.CvAiSuggestionEntity;
import com.tronai.career.cvbuilder.CvAiSuggestionRepository;
import com.tronai.career.cvbuilder.CvBuilderDraftEntity;
import com.tronai.career.cvbuilder.CvBuilderDraftRepository;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.profile.CandidateProfileEntity;
import com.tronai.career.profile.CandidateProfileRepository;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.jsoup.nodes.Document;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@Service
public class CompanyAnalysisService {

    private final CompanyAnalysisRepository analysisRepository;
    private final CompanyResearchSourceRepository sourceRepository;
    private final CompanyCvSuggestionRepository companySuggestionRepository;
    private final CvAiSuggestionRepository cvSuggestionRepository;
    private final CvBuilderDraftRepository draftRepository;
    private final CandidateProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final SafeUrlFetcher urlFetcher;
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;

    public CompanyAnalysisService(CompanyAnalysisRepository analysisRepository,
                                  CompanyResearchSourceRepository sourceRepository,
                                  CompanyCvSuggestionRepository companySuggestionRepository,
                                  CvAiSuggestionRepository cvSuggestionRepository,
                                  CvBuilderDraftRepository draftRepository,
                                  CandidateProfileRepository profileRepository,
                                  UserRepository userRepository,
                                  SafeUrlFetcher urlFetcher,
                                  ObjectMapper objectMapper,
                                  CareerLanguageHelper languageHelper) {
        this.analysisRepository = analysisRepository;
        this.sourceRepository = sourceRepository;
        this.companySuggestionRepository = companySuggestionRepository;
        this.cvSuggestionRepository = cvSuggestionRepository;
        this.draftRepository = draftRepository;
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.urlFetcher = urlFetcher;
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
    }

    @Transactional
    public Map<String, Object> analyze(Long userId, Map<String, Object> body) {
        User user = userRepository.findById(userId).orElseThrow();
        String companyName = String.valueOf(body.getOrDefault("companyName", "")).trim();
        String websiteUrl = String.valueOf(body.getOrDefault("websiteUrl", "")).trim();
        String recruitmentUrl = body.get("recruitmentUrl") == null ? null : String.valueOf(body.get("recruitmentUrl")).trim();
        String language = languageHelper.normalize(String.valueOf(body.getOrDefault("language", "en")));
        if (companyName.isBlank() || websiteUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "companyName and websiteUrl required");
        }

        String id = UUID.randomUUID().toString();
        CompanyAnalysisEntity entity = CompanyAnalysisEntity.builder()
                .id(id)
                .user(user)
                .companyName(companyName)
                .websiteUrl(websiteUrl)
                .recruitmentUrl(recruitmentUrl == null || recruitmentUrl.isBlank() ? null : recruitmentUrl)
                .cvDocumentId(body.get("cvDocumentId") instanceof Number n ? n.longValue() : null)
                .cvDraftId(body.get("cvDraftId") == null ? null : String.valueOf(body.get("cvDraftId")))
                .language(language)
                .status("RUNNING")
                .build();
        analysisRepository.save(entity);

        List<Map<String, Object>> sources = new ArrayList<>();
        List<String> facts = new ArrayList<>();
        try {
            Document doc = urlFetcher.fetch(websiteUrl);
            String title = doc.title();
            String text = doc.body() != null ? doc.body().text() : "";
            String excerpt = clip(text, 800);
            persistSource(id, websiteUrl, title, excerpt);
            sources.add(sourceMap(websiteUrl, title, excerpt));
            if (title != null && !title.isBlank()) facts.add("Page title: " + title);
            facts.add("Published website text excerpt captured (verified extraction)");

            if (entity.getRecruitmentUrl() != null) {
                Document rec = urlFetcher.fetch(entity.getRecruitmentUrl());
                String rTitle = rec.title();
                String rExcerpt = clip(rec.body() != null ? rec.body().text() : "", 800);
                persistSource(id, entity.getRecruitmentUrl(), rTitle, rExcerpt);
                sources.add(sourceMap(entity.getRecruitmentUrl(), rTitle, rExcerpt));
                facts.add("Recruitment page excerpt captured");
            }

            Map<String, Object> overview = new LinkedHashMap<>();
            overview.put("companyName", companyName);
            overview.put("websiteUrl", websiteUrl);
            overview.put("facts", facts);
            overview.put("interpretations", List.of(
                    "Summaries below are coaching aids; only listed facts are source-backed."));

            Map<String, Object> requirements = new LinkedHashMap<>();
            requirements.put("stated", extractKeywordHints(text));
            requirements.put("notStated", List.of(
                    "Unstated eligibility is NOT treated as a confirmed mismatch"));
            requirements.put("needsVerification", List.of(
                    "Confirm graduation year, education, and language on the original recruitment site"));

            Map<String, Object> comparison = compareToProfile(userId, companyName);
            Map<String, Object> preparation = Map.of(
                    "hrQuestions", List.of(
                            companyName + "への志望動機を、公開情報に基づいて説明してください。",
                            "自己紹介をお願いします"),
                    "technicalQuestions", List.of(
                            "これまでの技術経験を、事実の範囲で具体的に説明してください"),
                    "researchAreas", List.of("Products/services on " + websiteUrl),
                    "note", "Questions are coaching suggestions, not claimed confidential interview scripts"
            );

            List<CompanyCvSuggestionEntity> suggestions = buildPendingSuggestions(user, id, userId, companyName);
            entity.setOverviewJson(write(overview));
            entity.setRequirementsJson(write(requirements));
            entity.setComparisonJson(write(comparison));
            entity.setPreparationJson(write(preparation));
            entity.setStatus("COMPLETED");
            entity.setCompletedAt(Instant.now());
            analysisRepository.save(entity);
            return toDto(entity, sources, suggestions);
        } catch (Exception e) {
            entity.setStatus("FAILED");
            entity.setErrorMessage(e.getMessage() != null ? clip(e.getMessage(), 1000) : "failed");
            entity.setCompletedAt(Instant.now());
            analysisRepository.save(entity);
            if (e instanceof ResponseStatusException rse) throw rse;
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(Long userId, String id) {
        CompanyAnalysisEntity entity = requireOwned(userId, id);
        return toDto(entity, loadSources(id),
                companySuggestionRepository.findByAnalysisIdAndUser_IdOrderByCreatedAtAsc(id, userId));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long userId) {
        return analysisRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", e.getId());
                    m.put("companyName", e.getCompanyName());
                    m.put("websiteUrl", e.getWebsiteUrl());
                    m.put("status", e.getStatus());
                    m.put("completedAt", e.getCompletedAt());
                    return m;
                }).toList();
    }

    @Transactional
    public Map<String, Object> suggestImprovements(Long userId, String analysisId, Map<String, Object> body) {
        CompanyAnalysisEntity analysis = requireOwned(userId, analysisId);
        String field = String.valueOf(body.getOrDefault("fieldKey", "selfPr"));
        String draftId = body.get("draftId") == null ? analysis.getCvDraftId() : String.valueOf(body.get("draftId"));
        String original = "";
        if (draftId != null && !draftId.isBlank()) {
            CvBuilderDraftEntity draft = draftRepository.findByIdAndUser_Id(draftId, userId).orElse(null);
            if (draft != null) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> payload = objectMapper.readValue(draft.getPayloadJson(), Map.class);
                    original = String.valueOf(payload.getOrDefault(field, ""));
                } catch (Exception ignored) {
                }
            }
        }
        String proposed = original.isBlank() ? ""
                : original.trim() + "（" + analysis.getCompanyName() + "の公開情報を踏まえ、事実の範囲で具体化を推奨）";
        CompanyCvSuggestionEntity sugg = CompanyCvSuggestionEntity.builder()
                .id(UUID.randomUUID().toString())
                .analysisId(analysisId)
                .user(analysis.getUser())
                .fieldKey(field)
                .originalText(original)
                .proposedText(proposed)
                .reason("Company-specific coaching from published sources only; pending acceptance")
                .status("PENDING")
                .build();
        companySuggestionRepository.save(sugg);
        return Map.of(
                "suggestionId", sugg.getId(),
                "status", "PENDING",
                "fieldKey", field,
                "originalText", original,
                "proposedText", proposed,
                "reason", sugg.getReason()
        );
    }

    @Transactional
    public Map<String, Object> transferToCvManager(Long userId, String analysisId, Map<String, Object> body) {
        requireOwned(userId, analysisId);
        String draftId = String.valueOf(body.getOrDefault("draftId", "")).trim();
        if (draftId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "draftId required");
        }
        CvBuilderDraftEntity draft = draftRepository.findByIdAndUser_Id(draftId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));

        @SuppressWarnings("unchecked")
        List<String> ids = body.get("suggestionIds") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();
        List<CompanyCvSuggestionEntity> toTransfer = companySuggestionRepository
                .findByAnalysisIdAndUser_IdOrderByCreatedAtAsc(analysisId, userId).stream()
                .filter(s -> "PENDING".equals(s.getStatus()))
                .filter(s -> ids.isEmpty() || ids.contains(s.getId()))
                .toList();
        if (toTransfer.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending suggestions to transfer");
        }

        List<Map<String, Object>> created = new ArrayList<>();
        for (CompanyCvSuggestionEntity cs : toTransfer) {
            CvAiSuggestionEntity pending = CvAiSuggestionEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .draftId(draftId)
                    .user(draft.getUser())
                    .fieldKey(cs.getFieldKey())
                    .originalText(cs.getOriginalText())
                    .proposedText(cs.getProposedText())
                    .reason(cs.getReason() + " [transferred from company analysis " + analysisId + "]")
                    .status("PENDING")
                    .language("ja")
                    .build();
            cvSuggestionRepository.save(pending);
            cs.setStatus("TRANSFERRED");
            cs.setTransferredDraftId(draftId);
            companySuggestionRepository.save(cs);
            created.add(Map.of(
                    "companySuggestionId", cs.getId(),
                    "cvSuggestionId", pending.getId(),
                    "status", "PENDING",
                    "fieldKey", cs.getFieldKey()
            ));
        }
        // Draft payload unchanged until user accepts each CV suggestion.
        return Map.of("draftId", draftId, "transferred", created, "draftUnchanged", true);
    }

    private List<CompanyCvSuggestionEntity> buildPendingSuggestions(User user, String analysisId, Long userId, String companyName) {
        String selfPr = profileRepository.findByUser_Id(userId).map(CandidateProfileEntity::getSelfPr).orElse("");
        CompanyCvSuggestionEntity s = CompanyCvSuggestionEntity.builder()
                .id(UUID.randomUUID().toString())
                .analysisId(analysisId)
                .user(user)
                .fieldKey("selfPr")
                .originalText(selfPr == null ? "" : selfPr)
                .proposedText((selfPr == null || selfPr.isBlank()) ? ""
                        : selfPr.trim() + "（" + companyName + "の事業領域との接点を、既存経験の範囲で明確化）")
                .reason("Highlight published company themes using only existing candidate facts")
                .status("PENDING")
                .build();
        companySuggestionRepository.save(s);
        return List.of(s);
    }

    private Map<String, Object> compareToProfile(Long userId, String companyName) {
        Optional<CandidateProfileEntity> profile = profileRepository.findByUser_Id(userId);
        List<String> strengths = new ArrayList<>();
        List<String> gaps = new ArrayList<>();
        List<String> uncertain = new ArrayList<>();
        if (profile.isEmpty()) {
            gaps.add("Candidate profile missing — complete profile before claiming match");
        } else {
            CandidateProfileEntity p = profile.get();
            if (p.getSelfPr() != null && !p.getSelfPr().isBlank()) strengths.add("Self-PR present");
            else gaps.add("自己PR is empty");
            if (p.getSkillsJson() != null && p.getSkillsJson().length() > 4) strengths.add("Skills recorded");
            else gaps.add("Skills not recorded on profile");
            uncertain.add("Company-specific hard requirements not fully stated on crawled pages");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("overall", strengths.isEmpty() ? "partial" : "partial");
        m.put("companyName", companyName);
        m.put("strengths", strengths);
        m.put("gaps", gaps);
        m.put("uncertain", uncertain);
        return m;
    }

    private List<String> extractKeywordHints(String text) {
        List<String> hints = new ArrayList<>();
        if (text == null) return hints;
        String[] keys = {"新卒", "既卒", "大卒", "日本語", "エンジニア", "recruit", "career", "graduate"};
        String lower = text.toLowerCase(Locale.ROOT);
        for (String k : keys) {
            if (text.contains(k) || lower.contains(k.toLowerCase(Locale.ROOT))) {
                hints.add("Mentioned on page: " + k);
            }
        }
        return hints;
    }

    private CompanyAnalysisEntity requireOwned(Long userId, String id) {
        return analysisRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found"));
    }

    private void persistSource(String analysisId, String url, String title, String excerpt) {
        sourceRepository.save(CompanyResearchSourceEntity.builder()
                .analysisId(analysisId).sourceUrl(url).title(title).excerpt(excerpt).build());
    }

    private List<Map<String, Object>> loadSources(String analysisId) {
        return sourceRepository.findByAnalysisIdOrderByExtractedAtAsc(analysisId).stream()
                .map(s -> sourceMap(s.getSourceUrl(), s.getTitle(), s.getExcerpt()))
                .toList();
    }

    private Map<String, Object> sourceMap(String url, String title, String excerpt) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sourceUrl", url);
        m.put("title", title == null ? "" : title);
        m.put("excerpt", excerpt == null ? "" : excerpt);
        return m;
    }

    private Map<String, Object> toDto(CompanyAnalysisEntity e, List<Map<String, Object>> sources,
                                      List<CompanyCvSuggestionEntity> suggestions) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("companyName", e.getCompanyName());
        m.put("websiteUrl", e.getWebsiteUrl());
        m.put("recruitmentUrl", e.getRecruitmentUrl());
        m.put("cvDraftId", e.getCvDraftId());
        m.put("status", e.getStatus());
        m.put("language", e.getLanguage());
        m.put("overview", read(e.getOverviewJson()));
        m.put("requirements", read(e.getRequirementsJson()));
        m.put("comparison", read(e.getComparisonJson()));
        m.put("preparation", read(e.getPreparationJson()));
        m.put("sources", sources);
        m.put("suggestions", suggestions.stream().map(s -> Map.of(
                "id", s.getId(),
                "fieldKey", s.getFieldKey(),
                "originalText", s.getOriginalText() == null ? "" : s.getOriginalText(),
                "proposedText", s.getProposedText() == null ? "" : s.getProposedText(),
                "reason", s.getReason() == null ? "" : s.getReason(),
                "status", s.getStatus()
        )).toList());
        m.put("errorMessage", e.getErrorMessage());
        m.put("completedAt", e.getCompletedAt());
        return m;
    }

    private static String clip(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }

    private String write(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }

    private Object read(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try { return objectMapper.readValue(json, Object.class); } catch (Exception e) { return Map.of(); }
    }
}
