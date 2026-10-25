package com.tronai.career.repo;

import com.tronai.career.entity.JobApplicationStatusHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobApplicationStatusHistoryRepository extends JpaRepository<JobApplicationStatusHistoryEntity, Long> {
    List<JobApplicationStatusHistoryEntity> findByApplicationIdOrderByChangedAtAsc(String applicationId);
}
