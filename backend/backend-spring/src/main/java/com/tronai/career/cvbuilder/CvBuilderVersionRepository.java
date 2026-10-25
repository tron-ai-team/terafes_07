package com.tronai.career.cvbuilder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CvBuilderVersionRepository extends JpaRepository<CvBuilderVersionEntity, String> {
    List<CvBuilderVersionEntity> findByDraftIdOrderByVersionNumberDesc(String draftId);
    Optional<CvBuilderVersionEntity> findByIdAndUser_Id(String id, Long userId);
    int countByDraftId(String draftId);
}
