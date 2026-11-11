package com.tronai.admin.security;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AdminSecurityService {

    private final AdminSecurityEventRepository events;

    public AdminSecurityService(AdminSecurityEventRepository events) {
        this.events = events;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mfa", Map.of(
                "status", "NOT_IMPLEMENTED",
                "detail", "Multi-factor authentication is not enabled on this deployment"));
        out.put("sessionRevocation", Map.of("supported", true));
        out.put("oauth", Map.of("providersExposed", false));
        return out;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listEvents(Pageable pageable) {
        return events.findAllByOrderByCreatedAtDesc(pageable).map(e -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", e.getId());
            row.put("eventType", e.getEventType());
            row.put("severity", e.getSeverity());
            row.put("actorUserId", e.getActorUserId());
            row.put("targetUserId", e.getTargetUserId());
            row.put("detail", e.getDetail());
            row.put("requestId", e.getRequestId());
            row.put("createdAt", e.getCreatedAt());
            return row;
        });
    }
}
