package com.tronai.career.repo;

import com.tronai.career.entity.CareerOpsCheckpointEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareerOpsCheckpointRepository extends JpaRepository<CareerOpsCheckpointEntity, Long> {
    List<CareerOpsCheckpointEntity> findByUser_Id(Long userId);
}
