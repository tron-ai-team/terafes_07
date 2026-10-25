package com.tronai.career.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyAnalysisRepository extends JpaRepository<CompanyAnalysisEntity, String> {
    Optional<CompanyAnalysisEntity> findByIdAndUser_Id(String id, Long userId);
    List<CompanyAnalysisEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
