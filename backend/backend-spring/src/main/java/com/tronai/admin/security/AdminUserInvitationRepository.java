package com.tronai.admin.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminUserInvitationRepository extends JpaRepository<AdminUserInvitationEntity, Long> {
}
