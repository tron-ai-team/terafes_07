package com.tronai.admin;

import com.tronai.auth.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminAuditService {

    private final AdminAuditLogRepository audits;

    public AdminAuditService(AdminAuditLogRepository audits) {
        this.audits = audits;
    }

    @Transactional
    public void log(Long actorUserId, String action, String targetType, String targetId, String detail) {
        log(actorUserId, action, targetType, targetId, detail, null, null, null);
    }

    @Transactional
    public void log(
            Long actorUserId,
            String action,
            String targetType,
            String targetId,
            String detail,
            String resultStatus,
            String requestId,
            String actorRole) {
        AdminAuditLogEntity a = new AdminAuditLogEntity();
        a.setActorUserId(actorUserId);
        a.setAction(action);
        a.setTargetType(targetType);
        a.setTargetId(targetId);
        a.setDetail(detail);
        a.setResultStatus(resultStatus);
        a.setRequestId(requestId);
        a.setActorRole(actorRole != null ? actorRole : currentActorRole());
        a.setCreatedAt(Instant.now());
        audits.save(a);
    }

    private String currentActorRole() {
        return SecurityUtils.getCurrentUser().map(com.tronai.auth.UserPrincipal::getRole).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentAudits(int limit) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminAuditLogEntity a : audits.findAllByOrderByCreatedAtDesc(
                org.springframework.data.domain.PageRequest.of(0, limit)).getContent()) {
            out.add(toMap(a));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> search(String action, String targetType, Pageable pageable) {
        Page<AdminAuditLogEntity> page;
        if (action != null && !action.isBlank() && targetType != null && !targetType.isBlank()) {
            page = audits.findByActionContainingIgnoreCaseAndTargetTypeContainingIgnoreCase(
                    action, targetType, pageable);
        } else if (action != null && !action.isBlank()) {
            page = audits.findByActionContainingIgnoreCase(action, pageable);
        } else if (targetType != null && !targetType.isBlank()) {
            page = audits.findByTargetTypeContainingIgnoreCase(targetType, pageable);
        } else {
            page = audits.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(this::toMap);
    }

    private Map<String, Object> toMap(AdminAuditLogEntity a) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", a.getId());
        row.put("actorUserId", a.getActorUserId());
        row.put("actorRole", a.getActorRole());
        row.put("action", a.getAction());
        row.put("targetType", a.getTargetType());
        row.put("targetId", a.getTargetId());
        row.put("detail", a.getDetail());
        row.put("resultStatus", a.getResultStatus());
        row.put("requestId", a.getRequestId());
        row.put("createdAt", a.getCreatedAt());
        return row;
    }
}
