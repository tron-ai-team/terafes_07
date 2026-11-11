package com.tronai.admin.useradmin;

import com.tronai.admin.AdminAuditService;
import com.tronai.auth.RefreshTokenRepository;
import com.tronai.auth.identity.UserIdentity;
import com.tronai.auth.identity.UserIdentityRepository;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminUserService {

    private final UserRepository users;
    private final UserIdentityRepository identities;
    private final RefreshTokenRepository refreshTokens;
    private final AdminAuditService auditService;
    private final com.tronai.admin.security.AdminUserInvitationRepository invitationRepository;

    public AdminUserService(
            UserRepository users,
            UserIdentityRepository identities,
            RefreshTokenRepository refreshTokens,
            AdminAuditService auditService,
            com.tronai.admin.security.AdminUserInvitationRepository invitationRepository) {
        this.users = users;
        this.identities = identities;
        this.refreshTokens = refreshTokens;
        this.auditService = auditService;
        this.invitationRepository = invitationRepository;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> search(String query, String role, Boolean enabled, Boolean deleted, Pageable page) {
        Specification<User> spec = (root, cq, cb) -> cb.conjunction();
        if (query != null && !query.isBlank()) {
            String q = "%" + query.trim().toLowerCase() + "%";
            Specification<User> text = (root, cq, cb) -> cb.or(
                    cb.like(cb.lower(root.get("email")), q),
                    cb.like(cb.lower(root.get("displayName")), q));
            spec = spec.and(text);
        }
        if (role != null && !role.isBlank()) {
            String roleValue = role.trim().toUpperCase();
            Specification<User> roleSpec = (root, cq, cb) -> cb.equal(cb.upper(root.get("role")), roleValue);
            spec = spec.and(roleSpec);
        }
        if (enabled != null) {
            boolean enabledValue = enabled;
            Specification<User> enabledSpec = (root, cq, cb) -> cb.equal(root.get("enabled"), enabledValue);
            spec = spec.and(enabledSpec);
        }
        if (deleted != null) {
            Specification<User> deletedSpec = Boolean.TRUE.equals(deleted)
                    ? (root, cq, cb) -> cb.isNotNull(root.get("deletedAt"))
                    : (root, cq, cb) -> cb.isNull(root.get("deletedAt"));
            spec = spec.and(deletedSpec);
        }
        return users.findAll(spec, page).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detail(Long userId) {
        User u = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Map<String, Object> out = toSummary(u);
        List<UserIdentity> ids = identities.findByUserId(userId);
        List<Map<String, Object>> providers = new ArrayList<>();
        for (UserIdentity id : ids) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("provider", id.getProvider());
            row.put("emailAtLogin", id.getEmailAtLogin());
            row.put("emailVerified", id.isEmailVerified());
            row.put("lastLoginAt", id.getLastLoginAt());
            providers.add(row);
        }
        out.put("identities", providers);
        return out;
    }

    @Transactional
    public Map<String, Object> suspend(Long actorId, String actorRole, Long targetId, String reason) {
        User u = requireActiveTarget(targetId);
        forbidAdminActingOnOwner(actorRole, u);
        if (actorId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot suspend yourself");
        }
        u.setEnabled(false);
        u.setSuspendedAt(Instant.now());
        u.setSuspendReason(reason == null ? "Suspended by admin" : reason);
        users.save(u);
        int revoked = refreshTokens.revokeAllForUser(u, Instant.now());
        auditService.log(actorId, "USER_SUSPEND", "user", String.valueOf(targetId),
                (reason == null ? "" : reason) + " refreshTokensRevoked=" + revoked, "SUCCESS", null, actorRole);
        Map<String, Object> out = toSummary(u);
        out.put("refreshTokensRevoked", revoked);
        return out;
    }

    @Transactional
    public Map<String, Object> restore(Long actorId, String actorRole, Long targetId) {
        User u = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setEnabled(true);
        u.setSuspendedAt(null);
        u.setSuspendReason(null);
        users.save(u);
        auditService.log(actorId, "USER_RESTORE", "user", String.valueOf(targetId), null, "SUCCESS", null, actorRole);
        return toSummary(u);
    }

    @Transactional
    public Map<String, Object> softDelete(Long actorId, String actorRole, Long targetId, String reason) {
        User u = requireActiveTarget(targetId);
        forbidAdminActingOnOwner(actorRole, u);
        if (actorId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete yourself");
        }
        u.setEnabled(false);
        u.setDeletedAt(Instant.now());
        u.setDeleteReason(reason != null ? reason : "Soft deleted by admin");
        users.save(u);
        refreshTokens.revokeAllForUser(u, Instant.now());
        auditService.log(actorId, "USER_SOFT_DELETE", "user", String.valueOf(targetId), reason, "SUCCESS", null, actorRole);
        return toSummary(u);
    }

    @Transactional
    public Map<String, Object> changeRole(Long actorId, String actorRole, Long targetId, String newRole) {
        requireOwner(actorRole);
        if (newRole == null || newRole.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
        }
        String role = newRole.trim().toUpperCase();
        if (!List.of("USER", "ADMIN", "OWNER").contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
        }
        User target = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if ("OWNER".equalsIgnoreCase(target.getRole()) && !"OWNER".equals(role)) {
            long owners = users.countByRoleIgnoreCaseAndDeletedAtIsNull("OWNER");
            if (owners <= 1) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot demote the last OWNER");
            }
        }
        if (actorId.equals(targetId) && "OWNER".equalsIgnoreCase(target.getRole()) && !"OWNER".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot demote yourself from OWNER");
        }
        if ("OWNER".equals(role) && !"OWNER".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only OWNER can assign OWNER role");
        }
        String before = target.getRole();
        target.setRole(role);
        users.save(target);
        auditService.log(actorId, "USER_ROLE_CHANGE", "user", String.valueOf(targetId),
                before + " -> " + role, "SUCCESS", null, actorRole);
        return toSummary(target);
    }

    @Transactional
    public Map<String, Object> revokeSessions(Long actorId, String actorRole, Long targetId) {
        User u = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        int revoked = refreshTokens.revokeAllForUser(u, Instant.now());
        auditService.log(actorId, "USER_REVOKE_SESSIONS", "user", String.valueOf(targetId),
                "revoked=" + revoked, "SUCCESS", null, actorRole);
        return Map.of("userId", targetId, "refreshTokensRevoked", revoked);
    }

    @Transactional
    public Map<String, Object> invite(Long actorId, String actorRole, String email, String role, String note) {
        requireOwner(actorRole);
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        }
        String roleName = role == null || role.isBlank() ? "USER" : role.trim().toUpperCase();
        if ("OWNER".equals(roleName)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot invite as OWNER");
        }
        byte[] tokenBytes = new byte[32];
        new SecureRandom().nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = sha256(token);

        com.tronai.admin.security.AdminUserInvitationEntity inv = new com.tronai.admin.security.AdminUserInvitationEntity();
        inv.setEmail(email.trim().toLowerCase());
        inv.setRoleName(roleName);
        inv.setTokenHash(tokenHash);
        inv.setStatus("PENDING");
        inv.setNote(note);
        inv.setInvitedBy(actorId);
        inv.setExpiresAt(Instant.now().plusSeconds(7 * 24 * 3600L));
        inv.setCreatedAt(Instant.now());
        invitationRepository.save(inv);

        auditService.log(actorId, "USER_INVITE", "invitation", String.valueOf(inv.getId()),
                "email=" + email, "SUCCESS", null, actorRole);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", inv.getId());
        out.put("email", inv.getEmail());
        out.put("role", inv.getRoleName());
        out.put("expiresAt", inv.getExpiresAt());
        out.put("status", inv.getStatus());
        out.put("delivery", "OFFLINE_ADMIN_SETUP");
        out.put("emailDeliveryConfigured", false);
        out.put("setupToken", token);
        out.put("note", "Email delivery is not configured. setupToken is returned once for offline OWNER-approved account setup; store hashed only.");
        return out;
    }

    @Transactional
    public Map<String, Object> passwordResetInitiate(Long actorId, String actorRole, Long targetId) {
        User u = users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String requestId = UUID.randomUUID().toString();
        auditService.log(actorId, "USER_PASSWORD_RESET_INIT", "user", String.valueOf(targetId),
                "requestId=" + requestId, "SUCCESS", requestId, actorRole);
        return Map.of(
                "userId", u.getId(),
                "email", u.getEmail(),
                "status", "INITIATED",
                "requestId", requestId,
                "note", "No password or reset token is exposed via admin API");
    }

    private void requireOwner(String actorRole) {
        if (!"OWNER".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "OWNER role required");
        }
    }

    private void forbidAdminActingOnOwner(String actorRole, User target) {
        if ("OWNER".equalsIgnoreCase(target.getRole()) && !"OWNER".equalsIgnoreCase(actorRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot modify OWNER");
        }
    }

    private User requireActiveTarget(Long targetId) {
        return users.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Map<String, Object> toSummary(User u) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("email", u.getEmail());
        row.put("displayName", u.getDisplayName());
        row.put("role", u.getRole());
        row.put("enabled", u.isEnabled());
        row.put("status", resolveStatus(u));
        row.put("suspendedAt", u.getSuspendedAt());
        row.put("suspendReason", u.getSuspendReason());
        row.put("deletedAt", u.getDeletedAt());
        row.put("deleteReason", u.getDeleteReason());
        row.put("lastLoginAt", u.getLastLoginAt());
        row.put("createdAt", u.getCreatedAt());
        row.put("loginMethods", resolveLoginMethods(u));
        return row;
    }

    private static String resolveStatus(User u) {
        if (u.getDeletedAt() != null) {
            return "DELETED";
        }
        if (u.getSuspendedAt() != null || !u.isEnabled()) {
            return u.getSuspendedAt() != null ? "SUSPENDED" : "DISABLED";
        }
        return "ACTIVE";
    }

    private List<String> resolveLoginMethods(User u) {
        List<String> methods = new ArrayList<>();
        if (u.getPasswordHash() != null && !u.getPasswordHash().isBlank()) {
            methods.add("LOCAL");
        }
        for (UserIdentity id : identities.findByUserId(u.getId())) {
            if (id.getProvider() != null && "google".equalsIgnoreCase(id.getProvider())) {
                if (!methods.contains("GOOGLE")) {
                    methods.add("GOOGLE");
                }
            } else if (id.getProvider() != null) {
                String p = id.getProvider().trim().toUpperCase();
                if (!methods.contains(p)) {
                    methods.add(p);
                }
            }
        }
        return methods;
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
