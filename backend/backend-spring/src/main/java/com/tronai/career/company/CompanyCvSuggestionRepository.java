package com.tronai.career.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyCvSuggestionRepository extends JpaRepository<CompanyCvSuggestionEntity, String> {
    List<CompanyCvSuggestionEntity> findByAnalysisIdAndUser_IdOrderByCreatedAtAsc(String analysisId, Long userId);
}
