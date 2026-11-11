package com.tronai.admin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLogEntity, Long> {

    Page<AdminAuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AdminAuditLogEntity> findByActionContainingIgnoreCase(String action, Pageable pageable);

    Page<AdminAuditLogEntity> findByTargetTypeContainingIgnoreCase(String targetType, Pageable pageable);

    Page<AdminAuditLogEntity> findByActionContainingIgnoreCaseAndTargetTypeContainingIgnoreCase(
            String action, String targetType, Pageable pageable);
}
