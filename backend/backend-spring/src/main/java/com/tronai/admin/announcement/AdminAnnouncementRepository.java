package com.tronai.admin.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AdminAnnouncementRepository extends JpaRepository<AdminAnnouncementEntity, Long> {

    @Query("SELECT a FROM AdminAnnouncementEntity a WHERE a.status = 'PUBLISHED' "
            + "AND (a.startAt IS NULL OR a.startAt <= :now) "
            + "AND (a.endAt IS NULL OR a.endAt >= :now) "
            + "ORDER BY a.publishedAt DESC, a.updatedAt DESC")
    List<AdminAnnouncementEntity> findActive(Instant now);
}
