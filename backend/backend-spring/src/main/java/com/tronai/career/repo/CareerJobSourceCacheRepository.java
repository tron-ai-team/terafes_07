package com.tronai.career.repo;

import com.tronai.career.entity.CareerJobSourceCacheEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CareerJobSourceCacheRepository extends JpaRepository<CareerJobSourceCacheEntity, Long> {

    Optional<CareerJobSourceCacheEntity> findBySourceProviderAndSourceId(String sourceProvider, String sourceId);

    List<CareerJobSourceCacheEntity> findBySourceProviderAndExpiresAtAfterOrderByLastVerifiedAtDesc(
            String sourceProvider, Instant now);

    @Query("""
            SELECT c FROM CareerJobSourceCacheEntity c
            WHERE c.sourceProvider = :provider
              AND c.expiresAt > :now
              AND (
                   LOWER(c.title) LIKE LOWER(CONCAT('%', :token, '%'))
                OR LOWER(c.company) LIKE LOWER(CONCAT('%', :token, '%'))
                OR LOWER(COALESCE(c.location, '')) LIKE LOWER(CONCAT('%', :token, '%'))
                OR LOWER(COALESCE(c.descriptionText, '')) LIKE LOWER(CONCAT('%', :token, '%'))
              )
            ORDER BY c.lastVerifiedAt DESC
            """)
    List<CareerJobSourceCacheEntity> searchFresh(@Param("provider") String provider,
                                                 @Param("token") String token,
                                                 @Param("now") Instant now);
}
