package com.tronai.career.cvbuilder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CvAiSuggestionRepository extends JpaRepository<CvAiSuggestionEntity, String> {
    Optional<CvAiSuggestionEntity> findByIdAndUser_Id(String id, Long userId);
    List<CvAiSuggestionEntity> findByDraftIdAndUser_IdOrderByCreatedAtDesc(String draftId, Long userId);
}
