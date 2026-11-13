package com.tronai.admin.quota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminQuotaPolicyRepository extends JpaRepository<AdminQuotaPolicyEntity, Long> {

    Optional<AdminQuotaPolicyEntity> findByMeterAndScopeAndRoleNameIsNull(String meter, String scope);

    Optional<AdminQuotaPolicyEntity> findByMeterAndScopeAndRoleName(String meter, String scope, String roleName);

    List<AdminQuotaPolicyEntity> findAllByOrderByMeterAscScopeAsc();
}
