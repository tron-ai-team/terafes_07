package com.tronai.career.cvbuilder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CvGeneratedDocumentRepository extends JpaRepository<CvGeneratedDocumentEntity, String> {
    List<CvGeneratedDocumentEntity> findByDraftIdAndUser_IdOrderByCreatedAtDesc(String draftId, Long userId);
    Optional<CvGeneratedDocumentEntity> findByIdAndUser_Id(String id, Long userId);
}
