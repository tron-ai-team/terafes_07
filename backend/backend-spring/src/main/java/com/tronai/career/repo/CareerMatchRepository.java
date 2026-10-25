package com.tronai.career.repo;

import com.tronai.career.entity.CareerMatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareerMatchRepository extends JpaRepository<CareerMatchEntity, String> {
    List<CareerMatchEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);
    Optional<CareerMatchEntity> findByIdAndUser_Id(String id, Long userId);
}
