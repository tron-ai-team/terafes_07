package com.tronai.career.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.JobApplicationEntity;
import com.tronai.career.entity.JobApplicationStatusHistoryEntity;
import com.tronai.career.repo.JobApplicationRepository;
import com.tronai.career.repo.JobApplicationStatusHistoryRepository;
import com.tronai.career.util.CareerHashUtil;
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
public class JobApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final JobApplicationStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public JobApplicationService(JobApplicationRepository applicationRepository,
                                 JobApplicationStatusHistoryRepository historyRepository,
                                 UserRepository userRepository,
                                 ObjectMapper objectMapper) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CareerDtos.ApplicationResponse create(Long userId, CareerDtos.ApplicationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String hash = CareerHashUtil.sha256(userId + "|" + safe(request.getCompany()) + "|" + safe(request.getPosition()) + "|" + safe(request.getSourceUrl()));
        applicationRepository.findByUser_IdAndContentHash(userId, hash).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate application");
        });
        String status = request.getStatus() != null ? request.getStatus() : "SAVED";
        JobApplicationEntity entity = JobApplicationEntity.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .jobId(request.getJobId())
                .cvDocumentId(request.getCvDocumentId())
                .interviewSessionId(request.getInterviewSessionId())
                .company(require(request.getCompany(), "company"))
                .position(require(request.getPosition(), "position"))
                .sourceUrl(request.getSourceUrl())
                .status(status)
                .applicationDate(request.getApplicationDate())
                .nextAction(request.getNextAction())
                .deadlineAt(request.getDeadlineAt())
                .interviewAt(request.getInterviewAt())
                .notes(request.getNotes())
                .reminderJson(writeJson(request.getReminder()))
                .contentHash(hash)
                .build();
        applicationRepository.save(entity);
        recordHistory(entity.getId(), null, status, "Created");
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<CareerDtos.ApplicationResponse> list(Long userId) {
        return applicationRepository.findByUser_IdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CareerDtos.ApplicationResponse get(Long userId, String id) {
        return toResponse(requireOwned(userId, id));
    }

    @Transactional
    public CareerDtos.ApplicationResponse update(Long userId, String id, CareerDtos.ApplicationRequest request) {
        JobApplicationEntity entity = requireOwned(userId, id);
        String previous = entity.getStatus();
        if (request.getCompany() != null) entity.setCompany(request.getCompany());
        if (request.getPosition() != null) entity.setPosition(request.getPosition());
        if (request.getJobId() != null) entity.setJobId(request.getJobId());
        if (request.getCvDocumentId() != null) entity.setCvDocumentId(request.getCvDocumentId());
        if (request.getInterviewSessionId() != null) entity.setInterviewSessionId(request.getInterviewSessionId());
        if (request.getSourceUrl() != null) entity.setSourceUrl(request.getSourceUrl());
        if (request.getStatus() != null) entity.setStatus(request.getStatus());
        if (request.getApplicationDate() != null) entity.setApplicationDate(request.getApplicationDate());
        if (request.getNextAction() != null) entity.setNextAction(request.getNextAction());
        if (request.getDeadlineAt() != null) entity.setDeadlineAt(request.getDeadlineAt());
        if (request.getInterviewAt() != null) entity.setInterviewAt(request.getInterviewAt());
        if (request.getNotes() != null) entity.setNotes(request.getNotes());
        if (request.getReminder() != null) entity.setReminderJson(writeJson(request.getReminder()));
        applicationRepository.save(entity);
        if (request.getStatus() != null && !request.getStatus().equals(previous)) {
            recordHistory(entity.getId(), previous, request.getStatus(), "Updated");
        }
        return toResponse(entity);
    }

    @Transactional
    public void delete(Long userId, String id) {
        JobApplicationEntity entity = requireOwned(userId, id);
        applicationRepository.delete(entity);
    }

    private JobApplicationEntity requireOwned(Long userId, String id) {
        return applicationRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    private void recordHistory(String applicationId, String from, String to, String note) {
        historyRepository.save(JobApplicationStatusHistoryEntity.builder()
                .applicationId(applicationId)
                .fromStatus(from)
                .toStatus(to)
                .note(note)
                .build());
    }

    private CareerDtos.ApplicationResponse toResponse(JobApplicationEntity entity) {
        List<CareerDtos.StatusHistoryItem> history = historyRepository.findByApplicationIdOrderByChangedAtAsc(entity.getId())
                .stream()
                .map(h -> CareerDtos.StatusHistoryItem.builder()
                        .fromStatus(h.getFromStatus())
                        .toStatus(h.getToStatus())
                        .note(h.getNote())
                        .changedAt(h.getChangedAt())
                        .build())
                .collect(Collectors.toList());
        return CareerDtos.ApplicationResponse.builder()
                .id(entity.getId())
                .jobId(entity.getJobId())
                .cvDocumentId(entity.getCvDocumentId())
                .interviewSessionId(entity.getInterviewSessionId())
                .company(entity.getCompany())
                .position(entity.getPosition())
                .sourceUrl(entity.getSourceUrl())
                .status(entity.getStatus())
                .applicationDate(entity.getApplicationDate())
                .nextAction(entity.getNextAction())
                .deadlineAt(entity.getDeadlineAt())
                .interviewAt(entity.getInterviewAt())
                .notes(entity.getNotes())
                .reminder(readMap(entity.getReminderJson()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .statusHistory(history)
                .build();
    }

    private String require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        return value;
    }

    private String safe(String v) {
        return v == null ? "" : v;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
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
}
