package com.tronai.career.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.entity.CareerJobSaveEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.repo.CareerJobRepository;
import com.tronai.career.repo.CareerJobSaveRepository;
import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.ExternalJobListing;
import com.tronai.career.service.provider.JobSearchProvider;
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
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;
    private final RestClient restClient;

    private static final java.util.Set<String> ALLOWED_IMPORT_HOST_SUFFIXES = java.util.Set.of(
            "mynavi.jp", "job.mynavi.jp", "careermap.jp");

    public CareerJobService(@Qualifier("productJobSearchProviders") List<JobSearchProvider> providers,
                            CareerJobRepository careerJobRepository,
                            CareerJobSaveRepository careerJobSaveRepository,
                            UserRepository userRepository,
                            ObjectMapper objectMapper,
                            CareerLanguageHelper languageHelper,
                            RestClient.Builder restClientBuilder) {
        this.providers = providers;
        this.careerJobRepository = careerJobRepository;
        this.careerJobSaveRepository = careerJobSaveRepository;
        this.userRepository = userRepository;
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
        List<ExternalJobListing> all = new ArrayList<>();
        for (JobSearchProvider provider : providers) {
            if (provider.isAvailable()) {
                all.addAll(provider.fetchJobs());
            }
        }
        return all;
    }

    public List<CareerDtos.CareerJobResult> searchJobs(Long userId, CareerDtos.JobSearchRequest request) {
        String lang = languageHelper.normalize(request.getLanguage());
        List<ExternalJobListing> listings = filterListings(fetchPublicListings(), request);
        int max = request.getMaxResults() != null && request.getMaxResults() > 0 ? request.getMaxResults() : 25;
        return listings.stream()
                .limit(max)
                .map(l -> persistListing(userId, null, l))
                .map(e -> toResult(e, userId, lang))
                .collect(Collectors.toList());
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
        ExternalJobListing listing = ExternalJobListing.builder()
                .provider(provider)
                .sourceId(CareerHashUtil.sha256(url).substring(0, 16))
                .sourceUrl(url)
                .title(extractTitleFromUrl(url))
                .company("Unknown")
                .location("")
                .description(fetchDescriptionSnippet(url))
                .tags(List.of())
                .publishedAt(Instant.now())
                .build();
        CareerJobEntity entity = persistListing(userId, null, listing);
        return toResult(entity, userId, languageHelper.normalize(request.getLanguage()));
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
                careerJobRepository.save(job);
            }
            return job;
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
        boolean saved = careerJobSaveRepository.findByUser_IdAndJobId(userId, entity.getId())
                .map(CareerJobSaveEntity::isSaved)
                .orElse(false);
        return CareerDtos.CareerJobResult.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .company(entity.getCompany())
                .location(entity.getLocation())
                .sourceUrl(entity.getSourceUrl())
                .employmentType(entity.getEmploymentType())
                .newGraduateEligible(entity.getNewGraduateEligible())
                .requiredSkills(readStringList(entity.getRequiredSkillsJson()))
                .japaneseRequirement(entity.getJapaneseRequirement())
                .educationRequirement(entity.getEducationRequirement())
                .experienceRequirement(entity.getExperienceRequirement())
                .visaSupport(entity.getVisaSupport())
                .salary(entity.getSalary())
                .fullDescription(entity.getDescriptionText())
                .discoveredAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)
                .saved(saved)
                .build();
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
                        || Boolean.TRUE.equals(l.getNewGraduateEligible()))
                .sorted(Comparator.comparing(ExternalJobListing::getPublishedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private boolean matchesText(String q, ExternalJobListing l) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String hay = (safe(l.getTitle()) + " " + safe(l.getCompany()) + " " + safe(l.getLocation()) + " "
                + safe(l.getDescription()) + " " + String.join(" ", l.getTags() != null ? l.getTags() : List.of())).toLowerCase();
        // OR semantics: keep listing if any meaningful search token appears (AND was too strict for role phrases).
        boolean any = false;
        for (String token : q.toLowerCase().split("\\s+")) {
            if (token.length() < 3) {
                continue;
            }
            if (hay.contains(token)) {
                any = true;
                break;
            }
        }
        return any;
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

    private void validateProductImportHost(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL host required");
            }
            String lower = host.toLowerCase();
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
        String lower = url.toLowerCase();
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
            return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim().substring(0, Math.min(2000, html.length()));
        } catch (Exception e) {
            return "";
        }
    }
}
