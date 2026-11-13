package com.tronai.admin.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiFeatureQuotaReservationRepository extends JpaRepository<AiFeatureQuotaReservationEntity, Long> {

    Optional<AiFeatureQuotaReservationEntity> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);
}
