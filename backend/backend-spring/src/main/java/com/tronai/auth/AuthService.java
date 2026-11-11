package com.tronai.auth;

import com.tronai.auth.dto.AuthResponse;
import com.tronai.auth.dto.LoginRequest;
import com.tronai.auth.dto.RegisterRequest;
import com.tronai.auth.dto.UserDto;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.UserSettings;
import com.tronai.user.UserSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    public static final String REFRESH_COOKIE_NAME = "tron_refresh_token";

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final com.tronai.auth.identity.UserIdentityRepository userIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${COOKIE_SECURE:${cookie.secure:false}}")
    private boolean cookieSecure;

    @Value("${COOKIE_SAME_SITE:${cookie.same-site:Lax}}")
    private String cookieSameSite;

    public AuthService(UserRepository userRepository,
                       UserSettingsRepository userSettingsRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       com.tronai.auth.identity.UserIdentityRepository userIdentityRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userIdentityRepository = userIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResult register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        String password = request.getPassword();
        if (password == null || password.trim().isEmpty() || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }

        String displayName = request.getDisplayName();
        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = normalizedEmail.split("@")[0];
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .displayName(displayName.trim())
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        user = userRepository.save(user);

        UserSettings settings = UserSettings.builder()
                .user(user)
                .preferredLanguage("ja")
                .preferredModel("qwen3:8b")
                .build();
        userSettingsRepository.save(settings);

        return createAuthResult(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!user.isEnabled() || user.getSuspendedAt() != null || user.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return createAuthResult(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is missing");
        }

        String hash = JwtService.hashToken(rawRefreshToken.trim());
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid or expired"));

        if (!token.isValid()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid or expired");
        }

        // Revoke the old refresh token (token rotation)
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);

        User user = token.getUser();
        if (!user.isEnabled() || user.getSuspendedAt() != null || user.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled");
        }

        return createAuthResult(user);
    }

    @Transactional
    public ResponseCookie logout(String rawRefreshToken) {
        // Always clear the cookie. Revoke is best-effort so logout never 500s
        // (unknown/expired token, DB blip) and Desktop Agent stays independent of web session.
        if (rawRefreshToken != null && !rawRefreshToken.trim().isEmpty()) {
            try {
                String hash = JwtService.hashToken(rawRefreshToken.trim());
                refreshTokenRepository.revokeByTokenHash(hash, Instant.now());
            } catch (RuntimeException ex) {
                // ignore — cookie clear below still completes logout for the browser
            }
        }

        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite(resolvedSameSite())
                .build();
    }

    public UserDto getMe(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElse(null);
        java.util.List<String> providers = user != null ? resolveAuthProviders(user) : java.util.List.of("PASSWORD");
        return UserDto.builder()
                .id(principal.getId())
                .email(principal.getEmail())
                .displayName(principal.getDisplayName())
                .role(principal.getRole())
                .authProviders(providers)
                .build();
    }

    public AuthResult createAuthResult(User user) {
        String accessToken = jwtService.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getDisplayName()
        );

        String rawRefreshToken = jwtService.generateRawRefreshToken();
        String tokenHash = JwtService.hashToken(rawRefreshToken);

        Instant expiresAt = Instant.now().plus(jwtService.getRefreshDays(), ChronoUnit.DAYS);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .createdAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, rawRefreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/v1/auth")
                .maxAge(Duration.ofDays(jwtService.getRefreshDays()))
                .sameSite(resolvedSameSite())
                .build();

        long expiresIn = jwtService.getAccessMinutes() * 60;

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .user(UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .displayName(user.getDisplayName())
                        .role(user.getRole())
                        .authProviders(resolveAuthProviders(user))
                        .build())
                .build();

        return new AuthResult(authResponse, cookie);
    }

    public java.util.List<String> resolveAuthProviders(User user) {
        java.util.List<String> providers = new java.util.ArrayList<>();
        if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
            providers.add("PASSWORD");
        }
        if (user.getId() != null) {
            java.util.List<com.tronai.auth.identity.UserIdentity> identities = userIdentityRepository.findByUserId(user.getId());
            for (com.tronai.auth.identity.UserIdentity id : identities) {
                if (!providers.contains(id.getProvider())) {
                    providers.add(id.getProvider());
                }
            }
        }
        if (providers.isEmpty()) {
            providers.add("PASSWORD");
        }
        return providers;
    }

    private String resolvedSameSite() {
        if (cookieSameSite == null) {
            return "Lax";
        }
        String value = cookieSameSite.trim();
        if ("None".equalsIgnoreCase(value)) {
            return "None";
        }
        if ("Strict".equalsIgnoreCase(value)) {
            return "Strict";
        }
        return "Lax";
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return email.trim().toLowerCase();
    }

    public record AuthResult(AuthResponse response, ResponseCookie cookie) {}
}
