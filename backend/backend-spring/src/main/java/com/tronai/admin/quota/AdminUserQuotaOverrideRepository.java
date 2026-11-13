package com.tronai.admin.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminUserQuotaOverrideRepository extends JpaRepository<AdminUserQuotaOverrideEntity, Long> {

    Optional<AdminUserQuotaOverrideEntity> findByUserIdAndMeter(Long userId, String meter);

    List<AdminUserQuotaOverrideEntity> findByUserId(Long userId);
}
