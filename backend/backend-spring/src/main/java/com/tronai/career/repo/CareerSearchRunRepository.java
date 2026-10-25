package com.tronai.career.repo;

import com.tronai.career.entity.CareerSearchRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareerSearchRunRepository extends JpaRepository<CareerSearchRunEntity, String> {
    Optional<CareerSearchRunEntity> findByIdAndUser_Id(String id, Long userId);
    List<CareerSearchRunEntity> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
