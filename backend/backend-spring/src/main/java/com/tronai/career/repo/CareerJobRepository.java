package com.tronai.career.repo;

import com.tronai.career.entity.CareerJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareerJobRepository extends JpaRepository<CareerJobEntity, String> {
    Optional<CareerJobEntity> findByIdAndUser_Id(String id, Long userId);
    Optional<CareerJobEntity> findByUser_IdAndContentHash(Long userId, String contentHash);
    List<CareerJobEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);
    List<CareerJobEntity> findByRunIdAndUser_Id(String runId, Long userId);
}
