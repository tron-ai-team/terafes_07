package com.tronai.career.repo;

import com.tronai.career.entity.CareerJobSaveEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareerJobSaveRepository extends JpaRepository<CareerJobSaveEntity, Long> {
    Optional<CareerJobSaveEntity> findByUser_IdAndJobId(Long userId, String jobId);
    long countByUser_IdAndSavedTrue(Long userId);
    List<CareerJobSaveEntity> findByUser_IdAndSavedTrueOrderByUpdatedAtDesc(Long userId);
}
