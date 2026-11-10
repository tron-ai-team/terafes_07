package com.tronai.user;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.profile.CandidateProfileService;
import com.tronai.user.dto.UpdateProfileRequest;
import com.tronai.user.dto.UserProfileResponse;
import com.tronai.user.dto.UserSettingsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "Endpoints for authenticated user profile and user settings")
public class UserController {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final CandidateProfileService candidateProfileService;

    public UserController(UserRepository userRepository,
                          UserSettingsRepository userSettingsRepository,
                          CandidateProfileService candidateProfileService) {
        this.userRepository = userRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.candidateProfileService = candidateProfileService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile with live Candidate Profile summary")
    public ResponseEntity<UserProfileResponse> getMe() {
        Long userId = SecurityUtils.getRequiredUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return ResponseEntity.ok(toResponse(user));
    }

    @PatchMapping("/me")
    @Transactional
    @Operation(summary = "Update current user profile")
    public ResponseEntity<UserProfileResponse> updateMe(@RequestBody UpdateProfileRequest request) {
        Long userId = SecurityUtils.getRequiredUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (request != null && request.getDisplayName() != null && !request.getDisplayName().isBlank()) {
            user.setDisplayName(request.getDisplayName().trim());
            userRepository.save(user);
        }

        return ResponseEntity.ok(toResponse(user));
    }

    @GetMapping("/me/settings")
    @Operation(summary = "Get current authenticated user settings")
    public ResponseEntity<UserSettingsDto> getSettings() {
        Long userId = SecurityUtils.getRequiredUserId();
        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElseThrow();
                    UserSettings s = UserSettings.builder()
                            .user(user)
                            .preferredLanguage("ja")
                            .preferredModel("qwen3:8b")
                            .preferredAiProfile("FAST")
                            .build();
                    return userSettingsRepository.save(s);
                });

        return ResponseEntity.ok(UserSettingsDto.builder()
                .preferredLanguage(settings.getPreferredLanguage())
                .preferredModel(settings.getPreferredModel())
                .preferredAiProfile(settings.getPreferredAiProfile())
                .build());
    }

    @PatchMapping("/me/settings")
    @Transactional
    @Operation(summary = "Update current user settings")
    public ResponseEntity<UserSettingsDto> updateSettings(@RequestBody UserSettingsDto request) {
        Long userId = SecurityUtils.getRequiredUserId();
        UserSettings settings = userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId).orElseThrow();
                    UserSettings s = UserSettings.builder()
                            .user(user)
                            .preferredLanguage("ja")
                            .preferredModel("qwen3:8b")
                            .preferredAiProfile("FAST")
                            .build();
                    return userSettingsRepository.save(s);
                });

        if (request != null) {
            if (request.getPreferredLanguage() != null && !request.getPreferredLanguage().isBlank()) {
                settings.setPreferredLanguage(request.getPreferredLanguage().trim());
            }
            if (request.getPreferredModel() != null && !request.getPreferredModel().isBlank()) {
                settings.setPreferredModel(request.getPreferredModel().trim());
            }
            if (request.getPreferredAiProfile() != null && !request.getPreferredAiProfile().isBlank()) {
                settings.setPreferredAiProfile(request.getPreferredAiProfile().trim().toUpperCase());
            }
            userSettingsRepository.save(settings);
        }

        return ResponseEntity.ok(UserSettingsDto.builder()
                .preferredLanguage(settings.getPreferredLanguage())
                .preferredModel(settings.getPreferredModel())
                .preferredAiProfile(settings.getPreferredAiProfile())
                .build());
    }

    private UserProfileResponse toResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .candidateProfile(candidateProfileService.summaryForUser(user.getId()))
                .build();
    }
}
