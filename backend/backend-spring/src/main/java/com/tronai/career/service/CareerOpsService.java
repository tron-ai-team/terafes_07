package com.tronai.career.service;

import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerOpsCheckpointEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.repo.CareerOpsCheckpointRepository;
import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.MynaviJobProvider;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class CareerOpsService {

    private static final List<String> BLOCKED_OAUTH = List.of("gmail", "google_calendar");

    private final CareerOpsCheckpointRepository checkpointRepository;
    private final UserRepository userRepository;
    private final CareerLanguageHelper languageHelper;
    private final MynaviJobProvider mynaviJobProvider;
    private final CareerMapJobProvider careerMapJobProvider;

    public CareerOpsService(CareerOpsCheckpointRepository checkpointRepository,
                            UserRepository userRepository,
                            CareerLanguageHelper languageHelper,
                            MynaviJobProvider mynaviJobProvider,
                            CareerMapJobProvider careerMapJobProvider) {
        this.checkpointRepository = checkpointRepository;
        this.userRepository = userRepository;
        this.languageHelper = languageHelper;
        this.mynaviJobProvider = mynaviJobProvider;
        this.careerMapJobProvider = careerMapJobProvider;
    }

    @Transactional
    public CareerDtos.OpsStatusResponse status(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        for (String provider : BLOCKED_OAUTH) {
            ensureCheckpoint(user, provider, "BLOCKED", languageHelper.message("ops.blocked.oauth", "en"));
        }
        ensureCheckpoint(user, "mynavi", "NO_PUBLIC_API",
                "JS-rendered search; no authorized API; lastStatus=" + mynaviJobProvider.lastFetchStatus());
        ensureCheckpoint(user, "careermap", careerMapJobProvider.isOauthEnabled() ? "OAUTH_READY" : "SITEMAP_OG",
                "Public sitemap + Open Graph; school-linked OAuth blocked; lastStatus="
                        + careerMapJobProvider.lastFetchStatus());

        List<CareerDtos.OpsProviderStatus> providers = new ArrayList<>();
        for (CareerOpsCheckpointEntity cp : checkpointRepository.findByUser_Id(userId)) {
            // Refresh live scrape statuses each call
            if ("mynavi".equals(cp.getProvider())) {
                String st = mynaviJobProvider.lastFetchStatus();
                cp.setStatus(st != null && st.startsWith("LIVE_ERROR") ? "BLOCKED" : "NO_PUBLIC_API");
                cp.setLastError("No authorized API; JS-rendered results. Use official search URL or import. lastStatus="
                        + st);
                checkpointRepository.save(cp);
            } else if ("careermap".equals(cp.getProvider())) {
                String st = careerMapJobProvider.lastFetchStatus();
                boolean empty = st != null && (st.contains("EMPTY") || st.contains("ERROR"));
                cp.setStatus(empty ? "EMPTY" : (careerMapJobProvider.isOauthEnabled() ? "OAUTH_READY" : "SITEMAP_OG"));
                cp.setLastError("Public sitemap + OG metadata; school-linked OAuth blocked; lastStatus=" + st);
                checkpointRepository.save(cp);
            }
            String ext = null;
            if ("mynavi".equals(cp.getProvider())) {
                ext = mynaviJobProvider.externalSearchUrl(new com.tronai.career.service.provider.JobSearchCriteria());
            } else if ("careermap".equals(cp.getProvider())) {
                ext = careerMapJobProvider.externalSearchUrl(new com.tronai.career.service.provider.JobSearchCriteria());
            }
            providers.add(CareerDtos.OpsProviderStatus.builder()
                    .provider(cp.getProvider())
                    .status(cp.getStatus())
                    .message(cp.getLastError())
                    .externalSearchUrl(ext)
                    .build());
        }
        return CareerDtos.OpsStatusResponse.builder().providers(providers).build();
    }

    private void ensureCheckpoint(User user, String provider, String status, String message) {
        List<CareerOpsCheckpointEntity> existing = checkpointRepository.findByUser_Id(user.getId()).stream()
                .filter(cp -> provider.equals(cp.getProvider()))
                .toList();
        if (!existing.isEmpty()) {
            return;
        }
        checkpointRepository.save(CareerOpsCheckpointEntity.builder()
                .user(user)
                .provider(provider)
                .sourceId("default")
                .checkpointKey("connection")
                .status(status)
                .lastError(message)
                .build());
    }
}
