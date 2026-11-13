package com.tronai.admin.quota;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AiFeatureDailyCounterRepository extends JpaRepository<AiFeatureDailyCounterEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM AiFeatureDailyCounterEntity c "
            + "WHERE c.userId = :userId AND c.meter = :meter AND c.quotaDay = :quotaDay")
    Optional<AiFeatureDailyCounterEntity> findByUserIdAndMeterAndQuotaDayForUpdate(
            @Param("userId") Long userId,
            @Param("meter") String meter,
            @Param("quotaDay") LocalDate quotaDay);

    Optional<AiFeatureDailyCounterEntity> findByUserIdAndMeterAndQuotaDay(
            Long userId, String meter, LocalDate quotaDay);
}
