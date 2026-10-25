package com.tronai.career.cvbuilder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CvBuilderDraftRepository extends JpaRepository<CvBuilderDraftEntity, String> {
    List<CvBuilderDraftEntity> findByUser_IdOrderByUpdatedAtDesc(Long userId);
    Optional<CvBuilderDraftEntity> findByIdAndUser_Id(String id, Long userId);
}
