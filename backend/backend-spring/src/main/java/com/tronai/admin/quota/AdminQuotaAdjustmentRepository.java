package com.tronai.admin.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminQuotaAdjustmentRepository extends JpaRepository<AdminQuotaAdjustmentEntity, Long> {
}
