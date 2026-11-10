package com.tronai.career.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.entity.CareerJobSaveEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.profile.CandidateProfileService;
import com.tronai.career.repo.CareerJobRepository;
import com.tronai.career.repo.CareerJobSaveRepository;
import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.ExternalJobListing;
import com.tronai.career.service.provider.JobSearchCriteria;
import com.tronai.career.service.provider.JobSearchProvider;
import com.tronai.career.service.provider.MynaviJobProvider;
import com.tronai.career.util.CareerHashUtil;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CareerJobService {

    private final List<JobSearchProvider> providers;
    private final CareerJobRepository careerJobRepository;
    private final CareerJobSaveRepository careerJobSaveRepository;
    private final UserRepository userRepository;
    private final CandidateProfileService candidateProfileService;
    private final JobCompatibilityMatcher compatibilityMatcher;
    private final MynaviJobProvider mynaviJobProvider;
    private final CareerMapJobProvider careerMapJobProvider;
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;
    private final RestClient restClient;

    private static final java.util.Set<String> ALLOWED_IMPORT_HOST_SUFFIXES = java.util.Set.of(
            "mynavi.jp", "job.mynavi.jp", "careermap.jp");

    public CareerJobService(@Qualifier("productJobSearchProviders") List<JobSearchProvider> providers,
                            CareerJobRepository careerJobRepository,
                            CareerJobSaveRepository careerJobSaveRepository,
                            UserRepository userRepository,
                            CandidateProfileService candidateProfileService,
                            JobCompatibilityMatcher compatibilityMatcher,
                            MynaviJobProvider mynaviJobProvider,
                            CareerMapJobProvider careerMapJobProvider,
                            ObjectMapper objectMapper,
                            CareerLanguageHelper languageHelper,
                            RestClient.Builder restClientBuilder) {
        this.providers = providers;
        this.careerJobRepository = careerJobRepository;
        this.careerJobSaveRepository = careerJobSaveRepository;
        this.userRepository = userRepository;
        this.candidateProfileService = candidateProfileService;
        this.compatibilityMatcher = compatibilityMatcher;
        this.mynaviJobProvider = mynaviJobProvider;
        this.careerMapJobProvider = careerMapJobProvider;
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
        this.restClient = restClientBuilder.build();
    }

    public List<CareerJobEntity> findByRun(Long userId, String runId) {
        return careerJobRepository.findByRunIdAndUser_Id(runId, userId);
    }

    public List<ExternalJobListing> filterListingsForRequest(CareerDtos.JobSearchRequest request, List<ExternalJobListing> listings) {
        return filterListings(listings, request);
    }

    public List<ExternalJobListing> fetchPublicListings() {
        return fetchPublicListings(JobSearchCriteria.from(null, null, List.of(), null, null, 25, false));
    }

    public List<ExternalJobListing> fetchPublicListings(JobSearchCriteria criteria) {
        List<ExternalJobListing> all = new ArrayList<>();
        Set<String> seenUrls = new LinkedHashSet<>();
        for (JobSearchProvider provider : providers) {
            if (!provider.isAvailable()) continue;
            try {
                List<ExternalJobListing> found = provider.search(criteria);
                for (ExternalJobListing listing : found) {
                    if (listing.getSourceUrl() == null || listing.getSourceUrl().isBlank()) continue;
                    if (!isAllowedSourceUrl(listing.getSourceUrl())) continue;
                    if (!seenUrls.add(listing.getSourceUrl())) continue;
                    all.add(listing);
                }
            } catch (Exception e) {
                // Provider failures must not crash Career Center
            }
        }
        return all;
    }

    public List<CareerDtos.CareerJobResult> searchJobs(Long userId, CareerDtos.JobSearchRequest request) {
        CareerDtos.JobSearchRequest effective = applyProfilePreferences(userId, request);
        String lang = languageHelper.normalize(effective.getLanguage());
        JobSearchCriteria criteria = JobSearchCriteria.from(
                effective.getQuery(),
                effective.getLocation(),
                effective.getKeywords(),
                effective.getEmploymentType(),
                effective.getNewGraduateOnly(),
                effective.getMaxResults(),
                Boolean.TRUE.equals(effective.getForceRefresh()));
        List<ExternalJobListing> listings = filterListings(fetchPublicListings(criteria), effective);
        int max = effective.getMaxResults() != null && effective.getMaxResults() > 0 ? effective.getMaxResults() : 25;
        boolean aiExplain = Boolean.TRUE.equals(effective.getAiExplain());
        return listings.stream()
                .limit(max)
                .map(l -> persistListing(userId, null, l))
                .map(e -> toResult(e, userId, lang, aiExplain))
                .sorted(Comparator.comparingInt(CareerDtos.CareerJobResult::getMatchScore).reversed())
                .collect(Collectors.toList());
    }

    public CareerDtos.JobSourcesResponse sources(Long userId, CareerDtos.JobSearchRequest request) {
        CareerDtos.JobSearchRequest effective = request != null ? request : new CareerDtos.JobSearchRequest();
        JobSearchCriteria criteria = JobSearchCriteria.from(
                effective.getQuery(), effective.getLocation(), effective.getKeywords(),
                effective.getEmploymentType(), effective.getNewGraduateOnly(),
                effective.getMaxResults(), false);
        List<CareerDtos.OpsProviderStatus> providersStatus = new ArrayList<>();
        List<String> urls = new ArrayList<>();
        for (JobSearchProvider provider : providers) {
            String ext = provider.externalSearchUrl(criteria);
            if (ext != null) urls.add(ext);
            providersStatus.add(CareerDtos.OpsProviderStatus.builder()
                    .provider(provider.providerId())
                    .status(provider.isAvailable() ? provider.lastFetchStatus() : "UNAVAILABLE")
                    .message(statusMessage(provider))
                    .externalSearchUrl(ext)
                    .build());
        }
        return CareerDtos.JobSourcesResponse.builder()
                .providers(providersStatus)
                .externalSearchUrls(urls)
                .emptyStateMessage("No verified jobs found for these search conditions.")
                .build();
    }

    public Map<String, Object> refreshSources(Long userId, CareerDtos.JobSearchRequest request) {
        CareerDtos.JobSearchRequest req = request != null ? request : new CareerDtos.JobSearchRequest();
        req.setForceRefresh(true);
        List<CareerDtos.CareerJobResult> results = searchJobs(userId, req);
        return Map.of(
                "success", true,
                "count", results.size(),
                "mynaviStatus", mynaviJobProvider.lastFetchStatus(),
                "careermapStatus", careerMapJobProvider.lastFetchStatus(),
                "results", results
        );
    }

    @Transactional(readOnly = true)
    public List<CareerDtos.CareerJobResult> listSavedJobs(Long userId) {
        String lang = "ja";
        return careerJobSaveRepository.findByUser_IdAndSavedTrueOrderByUpdatedAtDesc(userId).stream()
                .map(save -> careerJobRepository.findByIdAndUser_Id(save.getJobId(), userId).orElse(null))
                .filter(Objects::nonNull)
                .map(e -> toResult(e, userId, lang, false))
                .collect(Collectors.toList());
    }

    private String statusMessage(JobSearchProvider provider) {
        if ("mynavi".equals(provider.providerId())) {
            return "No public authorized API; search results are JS-rendered. "
                    + "Automated listing extraction disabled. Use official search link or URL import. lastStatus="
                    + provider.lastFetchStatus();
        }
        if ("careermap".equals(provider.providerId())) {
            return "Public sitemap + Open Graph metadata (robots-allowed). "
                    + "School-linked OAuth blocked. lastStatus=" + provider.lastFetchStatus();
        }
        return provider.lastFetchStatus();
    }

    /**
     * Merge Candidate Profile preferences into job search when requested.
     * Missing preference fields are ignored — never treated as hard mismatches.
     */
    @SuppressWarnings("unchecked")
    private CareerDtos.JobSearchRequest applyProfilePreferences(Long userId, CareerDtos.JobSearchRequest request) {
        if (request == null) {
            request = new CareerDtos.JobSearchRequest();
        }
        if (!Boolean.TRUE.equals(request.getUseProfilePreferences())) {
            return request;
        }
        Map<String, Object> prefs = candidateProfileService.preferencesForUser(userId);
        List<String> profileSkills = candidateProfileService.skillNamesForUser(userId);
        if (prefs.isEmpty() && profileSkills.isEmpty()) {
            return request;
        }
        CareerDtos.JobSearchRequest out = CareerDtos.JobSearchRequest.builder()
                .query(request.getQuery())
                .location(request.getLocation())
                .keywords(request.getKeywords() == null ? new ArrayList<>() : new ArrayList<>(request.getKeywords()))
                .employmentType(request.getEmploymentType())
                .newGraduateOnly(request.getNewGraduateOnly())
                .maxResults(request.getMaxResults())
                .language(request.getLanguage())
                .useProfilePreferences(true)
                .forceRefresh(request.getForceRefresh())
                .aiExplain(request.getAiExplain())
                .build();
        if ((out.getLocation() == null || out.getLocation().isBlank())) {
            Object locs = prefs.get("preferredPrefectures");
            if (locs == null) locs = prefs.get("preferredLocations");
            if (locs instanceof List<?> list && !list.isEmpty() && list.get(0) != null) {
                out.setLocation(String.valueOf(list.get(0)));
            } else if (locs instanceof String s && !s.isBlank()) {
                out.setLocation(s);
            }
        }
        if (out.getEmploymentType() == null || out.getEmploymentType().isBlank()) {
            Object emp = prefs.get("preferredEmploymentTypes");
            if (emp instanceof List<?> list && !list.isEmpty() && list.get(0) != null) {
                out.setEmploymentType(String.valueOf(list.get(0)));
            } else if (prefs.get("employmentType") != null) {
                out.setEmploymentType(String.valueOf(prefs.get("employmentType")));
            }
        }
        Object jobCat = prefs.get("jobCategory");
        if (jobCat != null && String.valueOf(jobCat).contains("新卒") && out.getNewGraduateOnly() == null) {
            out.setNewGraduateOnly(true);
        }
        List<String> keywords = out.getKeywords() == null ? new ArrayList<>() : out.getKeywords();
        Object titles = prefs.get("desiredJobTitles");
        if (titles instanceof List<?> list) {
            for (Object t : list) {
                if (t != null && !String.valueOf(t).isBlank()) keywords.add(String.valueOf(t));
            }
        }
        // Prefer role query from desired titles when query blank
        if ((out.getQuery() == null || out.getQuery().isBlank()) && titles instanceof List<?> list && !list.isEmpty()) {
            out.setQuery(String.valueOf(list.get(0)));
        }
        Object techs = prefs.get("preferredTechnologies");
        if (techs instanceof List<?> list) {
            for (Object t : list) {
                if (t != null && !String.valueOf(t).isBlank()) keywords.add(String.valueOf(t));
            }
        }
        // Do NOT dump every profile skill into hard search keywords — that over-filters real titles.
        // Skills are used later by the compatibility matcher.
        out.setKeywords(keywords.stream().distinct().collect(Collectors.toList()));
        if ((out.getQuery() == null || out.getQuery().isBlank()) && !keywords.isEmpty()) {
            out.setQuery(keywords.get(0));
        }
        return out;
    }

    @Transactional
    public CareerDtos.CareerJobResult importJob(Long userId, CareerDtos.JobImportRequest request) {
        if (request.getSourceUrl() == null || request.getSourceUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceUrl is required");
        }
        String url = request.getSourceUrl().trim();
        validateUrl(url);
        validateProductImportHost(url);
        if (CareerMapJobProvider.isSchoolLinkedUrl(url)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "School-linked CareerMap import requires OAuth and is blocked");
        }
        String provider = inferProviderFromUrl(url);
        ExternalJobListing listing;
        if ("mynavi".equals(provider)) {
            listing = mynaviJobProvider.importFromUrl(url);
        } else if ("careermap".equals(provider) && url.toLowerCase(Locale.ROOT).contains("/jobs/")) {
            try {
                String html = restClient.get().uri(url).retrieve().body(String.class);
                listing = com.tronai.career.service.provider.OpenGraphJobParser.parseCareerMapJob(url, html, Instant.now());
                if (listing == null) {
                    listing = fallbackImportListing(provider, url);
                }
            } catch (Exception e) {
                listing = fallbackImportListing(provider, url);
            }
        } else {
            listing = fallbackImportListing(provider, url);
        }
        CareerJobEntity entity = persistListing(userId, null, listing);
        return toResult(entity, userId, languageHelper.normalize(request.getLanguage()), false);
    }

    private ExternalJobListing fallbackImportListing(String provider, String url) {
        return ExternalJobListing.builder()
                .provider(provider)
                .sourceId(CareerHashUtil.sha256(url).substring(0, 16))
                .sourceUrl(url)
                .title(extractTitleFromUrl(url))
                .company("Unknown")
                .location("")
                .description(fetchDescriptionSnippet(url))
                .tags(List.of())
                .publishedAt(Instant.now())
                .lastVerifiedAt(Instant.now())
                .applicationStatus("UNKNOWN")
                .internationalStudentPolicy("UNKNOWN")
                .verificationNotes("Imported URL; limited metadata. Not confirmed as open vacancy.")
                .build();
    }

    @Transactional
    public CareerJobEntity persistListing(Long userId, String runId, ExternalJobListing listing) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String hash = CareerHashUtil.sha256(listing.getSourceUrl() + "|" + listing.getTitle() + "|" + listing.getCompany());
        Optional<CareerJobEntity> existing = careerJobRepository.findByUser_IdAndContentHash(userId, hash);
        if (existing.isPresent()) {
            CareerJobEntity job = existing.get();
            if (runId != null) {
                job.setRunId(runId);
            }
            job.setLastVerifiedAt(listing.getLastVerifiedAt() != null ? listing.getLastVerifiedAt() : Instant.now());
            if (listing.getApplicationStatus() != null) job.setApplicationStatus(listing.getApplicationStatus());
            if (listing.getInternationalStudentPolicy() != null) {
                job.setInternationalStudentPolicy(listing.getInternationalStudentPolicy());
            }
            if (listing.getVerificationNotes() != null) job.setVerificationNotes(listing.getVerificationNotes());
            return careerJobRepository.save(job);
        }
        CareerJobEntity entity = CareerJobEntity.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .runId(runId)
                .sourceProvider(listing.getProvider())
                .sourceId(listing.getSourceId())
                .sourceUrl(listing.getSourceUrl())
                .title(listing.getTitle() != null ? listing.getTitle() : "Untitled")
                .company(listing.getCompany() != null ? listing.getCompany() : "Unknown")
                .location(listing.getLocation())
                .employmentType(listing.getEmploymentType())
                .newGraduateEligible(listing.getNewGraduateEligible())
                .requiredSkillsJson(writeJson(listing.getTags()))
                .descriptionText(listing.getDescription())
                .publishedAt(listing.getPublishedAt())
                .lastVerifiedAt(listing.getLastVerifiedAt() != null ? listing.getLastVerifiedAt() : Instant.now())
                .applicationStatus(listing.getApplicationStatus() != null ? listing.getApplicationStatus() : "UNKNOWN")
                .internationalStudentPolicy(listing.getInternationalStudentPolicy() != null
                        ? listing.getInternationalStudentPolicy() : "UNKNOWN")
                .verificationNotes(listing.getVerificationNotes())
                .contentHash(hash)
                .build();
        return careerJobRepository.save(entity);
    }

    @Transactional
    public Map<String, Object> toggleSave(Long userId, String jobId, boolean saved) {
        CareerJobEntity job = careerJobRepository.findByIdAndUser_Id(jobId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
        User user = job.getUser();
        CareerJobSaveEntity save = careerJobSaveRepository.findByUser_IdAndJobId(userId, jobId)
                .orElseGet(() -> CareerJobSaveEntity.builder().user(user).jobId(jobId).build());
        save.setSaved(saved);
        careerJobSaveRepository.save(save);
        return Map.of("success", true, "saved", saved);
    }

    public CareerJobEntity requireOwnedJob(Long userId, String jobId) {
        return careerJobRepository.findByIdAndUser_Id(jobId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    public CareerDtos.CareerJobResult toResult(CareerJobEntity entity, Long userId, String lang) {
        return toResult(entity, userId, lang, false);
    }

    public CareerDtos.CareerJobResult toResult(CareerJobEntity entity, Long userId, String lang, boolean aiExplain) {
        boolean saved = careerJobSaveRepository.findByUser_IdAndJobId(userId, entity.getId())
                .map(CareerJobSaveEntity::isSaved)
                .orElse(false);
        CareerDtos.CareerJobResult result = CareerDtos.CareerJobResult.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .company(entity.getCompany())
                .location(blankToUnknown(entity.getLocation()))
                .sourceUrl(entity.getSourceUrl())
                .sourceProvider(entity.getSourceProvider())
                .employmentType(entity.getEmploymentType())
                .newGraduateEligible(entity.getNewGraduateEligible())
                .requiredSkills(readStringList(entity.getRequiredSkillsJson()))
                .japaneseRequirement(entity.getJapaneseRequirement() != null
                        ? entity.getJapaneseRequirement() : "UNKNOWN")
                .educationRequirement(entity.getEducationRequirement())
                .experienceRequirement(entity.getExperienceRequirement())
                .visaSupport(entity.getVisaSupport() != null ? entity.getVisaSupport() : "UNKNOWN")
                .salary(entity.getSalary())
                .fullDescription(entity.getDescriptionText())
                .discoveredAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .lastVerifiedAt(entity.getLastVerifiedAt() != null ? entity.getLastVerifiedAt().toString() : null)
                .applicationStatus(entity.getApplicationStatus() != null ? entity.getApplicationStatus() : "UNKNOWN")
                .internationalStudentPolicy(entity.getInternationalStudentPolicy() != null
                        ? entity.getInternationalStudentPolicy() : "UNKNOWN")
                .verificationNotes(entity.getVerificationNotes())
                .saved(saved)
                .matchScoreDisclosure(JobCompatibilityMatcher.SCORE_DISCLOSURE)
                .build();
        return compatibilityMatcher.enrich(userId, entity, result, aiExplain);
    }

    public List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<ExternalJobListing> filterListings(List<ExternalJobListing> listings, CareerDtos.JobSearchRequest request) {
        String q = joinQuery(request);
        return listings.stream()
                .filter(l -> matchesText(q, l))
                .filter(l -> request.getNewGraduateOnly() == null || !request.getNewGraduateOnly()
                        || Boolean.TRUE.equals(l.getNewGraduateEligible())
                        || l.getNewGraduateEligible() == null) // UNKNOWN allowed; never invent false eligibility
                .sorted(Comparator.comparing(ExternalJobListing::getLastVerifiedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private boolean matchesText(String q, ExternalJobListing l) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String hay = (safe(l.getTitle()) + " " + safe(l.getCompany()) + " " + safe(l.getLocation()) + " "
                + safe(l.getDescription()) + " " + String.join(" ", l.getTags() != null ? l.getTags() : List.of())).toLowerCase(Locale.ROOT);
        boolean any = false;
        for (String token : q.toLowerCase(Locale.ROOT).split("[\\s,、]+")) {
            if (!isMeaningfulToken(token)) {
                continue;
            }
            if (hay.contains(token)) {
                any = true;
                break;
            }
        }
        // If all tokens were too short / noise, keep listing rather than drop everything.
        return any || Arrays.stream(q.toLowerCase(Locale.ROOT).split("[\\s,、]+"))
                .noneMatch(CareerJobService::isMeaningfulToken);
    }

    static boolean isMeaningfulToken(String token) {
        if (token == null || token.isBlank()) return false;
        boolean cjk = token.codePoints().anyMatch(cp ->
                Character.UnicodeScript.of(cp) == Character.UnicodeScript.HAN
                        || Character.UnicodeScript.of(cp) == Character.UnicodeScript.HIRAGANA
                        || Character.UnicodeScript.of(cp) == Character.UnicodeScript.KATAKANA);
        if (cjk) return token.length() >= 2;
        return token.length() >= 2;
    }

    private String joinQuery(CareerDtos.JobSearchRequest request) {
        StringBuilder sb = new StringBuilder();
        if (request.getQuery() != null) sb.append(request.getQuery()).append(' ');
        if (request.getLocation() != null) sb.append(request.getLocation()).append(' ');
        if (request.getKeywords() != null) {
            request.getKeywords().forEach(k -> sb.append(k).append(' '));
        }
        return sb.toString().trim();
    }

    private String safe(String v) {
        return v == null ? "" : v;
    }

    private String blankToUnknown(String v) {
        return v == null || v.isBlank() ? "UNKNOWN" : v;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value != null ? value : List.of());
        } catch (Exception e) {
            return "[]";
        }
    }

    private void validateUrl(String url) {
        try {
            URI uri = URI.create(url);
            if (uri.getScheme() == null || (!uri.getScheme().equalsIgnoreCase("http") && !uri.getScheme().equalsIgnoreCase("https"))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL must be http or https");
            }
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
    }

    private boolean isAllowedSourceUrl(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) return false;
            String lower = host.toLowerCase(Locale.ROOT);
            return ALLOWED_IMPORT_HOST_SUFFIXES.stream().anyMatch(lower::endsWith);
        } catch (Exception e) {
            return false;
        }
    }

    private void validateProductImportHost(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL host required");
            }
            String lower = host.toLowerCase(Locale.ROOT);
            boolean ok = ALLOWED_IMPORT_HOST_SUFFIXES.stream().anyMatch(lower::endsWith);
            if (!ok) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Import host must be mynavi or careermap (got " + host + ")");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
    }

    private String inferProviderFromUrl(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("mynavi")) return "mynavi";
        if (lower.contains("careermap")) return "careermap";
        return "manual_import";
    }

    private String extractTitleFromUrl(String url) {
        try {
            String path = URI.create(url).getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                return "Imported job";
            }
            String segment = path.substring(path.lastIndexOf('/') + 1).replace('-', ' ').replace('_', ' ');
            return segment.isBlank() ? "Imported job" : segment;
        } catch (Exception e) {
            return "Imported job";
        }
    }

    private String fetchDescriptionSnippet(String url) {
        try {
            String html = restClient.get().uri(url).retrieve().body(String.class);
            if (html == null) {
                return "";
            }
            String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
            return text.substring(0, Math.min(2000, text.length()));
        } catch (Exception e) {
            return "";
        }
    }
}
