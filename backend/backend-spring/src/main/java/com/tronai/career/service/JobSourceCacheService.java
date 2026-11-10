package com.tronai.career.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.entity.CareerJobSourceCacheEntity;
import com.tronai.career.repo.CareerJobSourceCacheRepository;
import com.tronai.career.service.provider.ExternalJobListing;
import com.tronai.career.util.CareerHashUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class JobSourceCacheService {

    public static final Duration DEFAULT_TTL = Duration.ofHours(48);

    private final CareerJobSourceCacheRepository repository;
    private final ObjectMapper objectMapper;

    public JobSourceCacheService(CareerJobSourceCacheRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void upsert(ExternalJobListing listing, Duration ttl) {
        if (listing == null || listing.getSourceUrl() == null) return;
        Instant now = Instant.now();
        Instant verified = listing.getLastVerifiedAt() != null ? listing.getLastVerifiedAt() : now;
        String hash = CareerHashUtil.sha256(
                listing.getSourceUrl() + "|" + listing.getTitle() + "|" + listing.getCompany());
        CareerJobSourceCacheEntity entity = repository
                .findBySourceProviderAndSourceId(listing.getProvider(), listing.getSourceId())
                .orElseGet(CareerJobSourceCacheEntity::new);
        entity.setSourceProvider(listing.getProvider());
        entity.setSourceId(listing.getSourceId());
        entity.setSourceUrl(listing.getSourceUrl());
        entity.setTitle(listing.getTitle() != null ? listing.getTitle() : "Untitled");
        entity.setCompany(listing.getCompany() != null ? listing.getCompany() : "Unknown");
        entity.setLocation(listing.getLocation());
        entity.setEmploymentType(listing.getEmploymentType());
        entity.setDescriptionText(listing.getDescription());
        entity.setRequiredSkillsJson(writeJson(listing.getTags()));
        entity.setApplicationStatus(listing.getApplicationStatus() != null ? listing.getApplicationStatus() : "UNKNOWN");
        entity.setInternationalStudentPolicy(
                listing.getInternationalStudentPolicy() != null ? listing.getInternationalStudentPolicy() : "UNKNOWN");
        entity.setNewGraduateEligible(listing.getNewGraduateEligible());
        entity.setGraduationYear(listing.getGraduationYear());
        entity.setContentHash(hash);
        entity.setLastVerifiedAt(verified);
        entity.setExpiresAt(verified.plus(ttl != null ? ttl : DEFAULT_TTL));
        repository.save(entity);
    }

    @Transactional(readOnly = true)
    public List<ExternalJobListing> findFresh(String provider) {
        return repository.findBySourceProviderAndExpiresAtAfterOrderByLastVerifiedAtDesc(provider, Instant.now())
                .stream()
                .map(this::toListing)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExternalJobListing> searchFresh(String provider, List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return findFresh(provider);
        }
        Map<String, ExternalJobListing> byUrl = new LinkedHashMap<>();
        for (String token : tokens) {
            if (token == null || token.isBlank()) continue;
            for (CareerJobSourceCacheEntity row : repository.searchFresh(provider, token.trim(), Instant.now())) {
                ExternalJobListing listing = toListing(row);
                byUrl.putIfAbsent(listing.getSourceUrl(), listing);
            }
        }
        return new ArrayList<>(byUrl.values());
    }

    private ExternalJobListing toListing(CareerJobSourceCacheEntity e) {
        return ExternalJobListing.builder()
                .provider(e.getSourceProvider())
                .sourceId(e.getSourceId())
                .sourceUrl(e.getSourceUrl())
                .title(e.getTitle())
                .company(e.getCompany())
                .location(e.getLocation())
                .employmentType(e.getEmploymentType())
                .newGraduateEligible(e.getNewGraduateEligible())
                .description(e.getDescriptionText())
                .tags(readList(e.getRequiredSkillsJson()))
                .publishedAt(e.getLastVerifiedAt())
                .lastVerifiedAt(e.getLastVerifiedAt())
                .applicationStatus(e.getApplicationStatus())
                .internationalStudentPolicy(e.getInternationalStudentPolicy())
                .graduationYear(e.getGraduationYear())
                .verificationNotes("Served from verified source cache; expires "
                        + (e.getExpiresAt() != null ? e.getExpiresAt() : "n/a"))
                .build();
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value != null ? value : List.of());
        } catch (Exception e) {
            return "[]";
        }
    }
}
