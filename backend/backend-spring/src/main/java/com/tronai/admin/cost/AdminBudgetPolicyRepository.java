package com.tronai.admin.cost;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminBudgetPolicyRepository extends JpaRepository<AdminBudgetPolicyEntity, Long> {
    Optional<AdminBudgetPolicyEntity> findByScope(String scope);
}
