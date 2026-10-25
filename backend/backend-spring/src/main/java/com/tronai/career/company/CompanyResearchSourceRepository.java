package com.tronai.career.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyResearchSourceRepository extends JpaRepository<CompanyResearchSourceEntity, Long> {
    List<CompanyResearchSourceEntity> findByAnalysisIdOrderByExtractedAtAsc(String analysisId);
}
