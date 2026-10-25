package com.tronai.career.repo;

import com.tronai.career.entity.JobApplicationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplicationEntity, String> {
    List<JobApplicationEntity> findByUser_IdOrderByUpdatedAtDesc(Long userId);
    Optional<JobApplicationEntity> findByIdAndUser_Id(String id, Long userId);
    Optional<JobApplicationEntity> findByUser_IdAndContentHash(Long userId, String contentHash);
}
