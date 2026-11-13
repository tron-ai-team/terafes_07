package com.tronai.auth.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    Optional<UserIdentity> findByProviderAndProviderSubject(String provider, String providerSubject);

    List<UserIdentity> findByUserId(Long userId);

    List<UserIdentity> findByUserIdIn(Iterable<Long> userIds);

    boolean existsByProviderAndProviderSubject(String provider, String providerSubject);
}
