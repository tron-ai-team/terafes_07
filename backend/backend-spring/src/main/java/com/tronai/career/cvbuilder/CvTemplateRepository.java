package com.tronai.career.cvbuilder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CvTemplateRepository extends JpaRepository<CvTemplateEntity, String> {
    List<CvTemplateEntity> findByActiveTrueOrderByCodeAsc();
}
