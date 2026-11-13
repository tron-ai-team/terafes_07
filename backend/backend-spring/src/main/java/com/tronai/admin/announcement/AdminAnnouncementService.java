package com.tronai.admin.announcement;

import com.tronai.admin.AdminAuditService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminAnnouncementService {

    private final AdminAnnouncementRepository repository;
    private final AdminAuditService auditService;

    public AdminAnnouncementService(AdminAnnouncementRepository repository, AdminAuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminAnnouncementEntity a : repository.findAll()) {
            out.add(toMap(a));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listActive() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminAnnouncementEntity a : repository.findActive(Instant.now())) {
            out.add(toPublicMap(a));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> create(Long actorId, Map<String, Object> body) {
        AdminAnnouncementEntity a = new AdminAnnouncementEntity();
        apply(a, body);
        a.setCreatedBy(actorId);
        a.setUpdatedBy(actorId);
        a.setCreatedAt(Instant.now());
        a.setUpdatedAt(Instant.now());
        repository.save(a);
        auditService.log(actorId, "ANNOUNCEMENT_CREATE", "announcement", String.valueOf(a.getId()), null, "SUCCESS", null, null);
        return toMap(a);
    }

    @Transactional
    public Map<String, Object> update(Long actorId, Long id, Map<String, Object> body) {
        AdminAnnouncementEntity a = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
        apply(a, body);
        a.setUpdatedBy(actorId);
        a.setUpdatedAt(Instant.now());
        repository.save(a);
        auditService.log(actorId, "ANNOUNCEMENT_UPDATE", "announcement", String.valueOf(id), null, "SUCCESS", null, null);
        return toMap(a);
    }

    @Transactional
    public Map<String, Object> publish(Long actorId, Long id) {
        AdminAnnouncementEntity a = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
        a.setStatus("PUBLISHED");
        a.setPublishedAt(Instant.now());
        a.setUpdatedBy(actorId);
        a.setUpdatedAt(Instant.now());
        repository.save(a);
        auditService.log(actorId, "ANNOUNCEMENT_PUBLISH", "announcement", String.valueOf(id), null, "SUCCESS", null, null);
        return toMap(a);
    }

    @Transactional
    public Map<String, Object> unpublish(Long actorId, Long id) {
        AdminAnnouncementEntity a = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
        a.setStatus("UNPUBLISHED");
        a.setUpdatedBy(actorId);
        a.setUpdatedAt(Instant.now());
        repository.save(a);
        auditService.log(actorId, "ANNOUNCEMENT_UNPUBLISH", "announcement", String.valueOf(id), null, "SUCCESS", null, null);
        return toMap(a);
    }

    @Transactional
    public Map<String, Object> archive(Long actorId, Long id) {
        AdminAnnouncementEntity a = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));
        a.setStatus("ARCHIVED");
        a.setUpdatedBy(actorId);
        a.setUpdatedAt(Instant.now());
        repository.save(a);
        auditService.log(actorId, "ANNOUNCEMENT_ARCHIVE", "announcement", String.valueOf(id), null, "SUCCESS", null, null);
        return toMap(a);
    }

    private void apply(AdminAnnouncementEntity a, Map<String, Object> body) {
        if (body.get("titleEn") != null) a.setTitleEn(String.valueOf(body.get("titleEn")));
        if (body.get("titleJa") != null) a.setTitleJa(String.valueOf(body.get("titleJa")));
        // Frontend uses messageEn/messageJa; backend stores bodyEn/bodyJa.
        if (body.get("bodyEn") != null) a.setBodyEn(String.valueOf(body.get("bodyEn")));
        if (body.get("bodyJa") != null) a.setBodyJa(String.valueOf(body.get("bodyJa")));
        if (body.get("messageEn") != null) a.setBodyEn(String.valueOf(body.get("messageEn")));
        if (body.get("messageJa") != null) a.setBodyJa(String.valueOf(body.get("messageJa")));
        if (body.get("severity") != null) a.setSeverity(String.valueOf(body.get("severity")));
        if (body.get("priority") != null) a.setSeverity(String.valueOf(body.get("priority")));
        if (body.get("audience") != null) a.setAudience(String.valueOf(body.get("audience")));
        if (body.get("status") != null) a.setStatus(String.valueOf(body.get("status")));
        if (body.containsKey("startAt")) a.setStartAt(parseInstant(body.get("startAt")));
        if (body.containsKey("endAt")) a.setEndAt(parseInstant(body.get("endAt")));
        if (a.getTitleEn() == null || a.getTitleEn().isBlank()) a.setTitleEn("Untitled");
        if (a.getTitleJa() == null || a.getTitleJa().isBlank()) a.setTitleJa(a.getTitleEn());
        if (a.getBodyEn() == null) a.setBodyEn("");
        if (a.getBodyJa() == null) a.setBodyJa(a.getBodyEn());
    }

    private Instant parseInstant(Object v) {
        if (v == null) return null;
        return Instant.parse(String.valueOf(v));
    }

    private Map<String, Object> toMap(AdminAnnouncementEntity a) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", a.getId());
        row.put("titleEn", a.getTitleEn());
        row.put("titleJa", a.getTitleJa());
        row.put("bodyEn", a.getBodyEn());
        row.put("bodyJa", a.getBodyJa());
        row.put("messageEn", a.getBodyEn());
        row.put("messageJa", a.getBodyJa());
        row.put("severity", a.getSeverity());
        row.put("priority", a.getSeverity());
        row.put("audience", a.getAudience());
        row.put("status", a.getStatus());
        row.put("startAt", a.getStartAt());
        row.put("endAt", a.getEndAt());
        row.put("publishedAt", a.getPublishedAt());
        row.put("createdAt", a.getCreatedAt());
        row.put("updatedAt", a.getUpdatedAt());
        return row;
    }

    private Map<String, Object> toPublicMap(AdminAnnouncementEntity a) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", a.getId());
        row.put("titleEn", a.getTitleEn());
        row.put("titleJa", a.getTitleJa());
        row.put("bodyEn", a.getBodyEn());
        row.put("bodyJa", a.getBodyJa());
        row.put("messageEn", a.getBodyEn());
        row.put("messageJa", a.getBodyJa());
        row.put("severity", a.getSeverity());
        row.put("priority", a.getSeverity());
        row.put("audience", a.getAudience());
        row.put("publishedAt", a.getPublishedAt());
        return row;
    }
}
