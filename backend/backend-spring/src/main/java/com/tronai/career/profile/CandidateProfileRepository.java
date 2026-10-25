package com.tronai.career.profile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CandidateProfileRepository extends JpaRepository<CandidateProfileEntity, Long> {
    Optional<CandidateProfileEntity> findByUser_Id(Long userId);
}
