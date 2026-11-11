package com.tronai.admin.quota;

import com.tronai.ai.gateway.AiFeature;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import com.tronai.user.UserSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class AdminFeatureQuotaServiceTest {

    @Autowired AdminFeatureQuotaService quotaService;
    @Autowired AdminQuotaPolicyRepository policies;
    @Autowired UserRepository users;
    @Autowired UserSettingsRepository settings;
    @Autowired AiFeatureQuotaReservationRepository reservations;
    @Autowired AiFeatureDailyCounterRepository counters;

    User user;

    @BeforeEach
    void setup() {
        reservations.deleteAll();
        counters.deleteAll();
        settings.deleteAll();
        users.deleteAll();
        user = users.save(User.builder()
                .email("quota-user-" + UUID.randomUUID() + "@example.com")
                .displayName("Quota User")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    @Test
    @DisplayName("OBSERVE mode allows over-limit reserve and increments would-block counter")
    void observeAllowsOverLimit() {
        AdminQuotaPolicyEntity policy = policies.findByMeterAndScopeAndRoleNameIsNull(
                        AdminQuotaMeter.AI_CHAT.name(), AdminFeatureQuotaService.SCOPE_GLOBAL)
                .orElseThrow();
        policy.setDailyLimit(1);
        policy.setMode(AdminQuotaMode.OBSERVE.name());
        policies.save(policy);

        AiFeatureQuotaReservationEntity r1 = quotaService.reserve(
                user.getId(), AiFeature.CHAT, null, "idem-1", "req-1", 1);
        quotaService.settle(r1.getId());

        AiFeatureQuotaReservationEntity r2 = quotaService.reserve(
                user.getId(), AiFeature.CHAT, null, "idem-2", "req-2", 1);
        assertThat(r2.getId()).isNotNull();

        AiFeatureDailyCounterEntity counter = counters
                .findByUserIdAndMeterAndQuotaDay(user.getId(), AdminQuotaMeter.AI_CHAT.name(),
                        quotaService.quotaDayJst())
                .orElseThrow();
        assertThat(counter.getObserveWouldBlockCount()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("ENFORCE mode rejects over-limit reserve")
    void enforceBlocks() {
        AdminQuotaPolicyEntity policy = policies.findByMeterAndScopeAndRoleNameIsNull(
                        AdminQuotaMeter.AI_CHAT.name(), AdminFeatureQuotaService.SCOPE_GLOBAL)
                .orElseThrow();
        policy.setDailyLimit(1);
        policy.setMode(AdminQuotaMode.ENFORCE.name());
        policies.save(policy);

        AiFeatureQuotaReservationEntity r1 = quotaService.reserve(
                user.getId(), AiFeature.CHAT, null, "idem-a", "req-a", 1);
        quotaService.settle(r1.getId());

        assertThatThrownBy(() -> quotaService.reserve(
                        user.getId(), AiFeature.CHAT, null, "idem-b", "req-b", 1))
                .isInstanceOf(FeatureQuotaExceededException.class);
    }

    @Test
    @DisplayName("Idempotency returns same reservation")
    void idempotentReserve() {
        AiFeatureQuotaReservationEntity r1 = quotaService.reserve(
                user.getId(), AiFeature.CHAT, null, "same-key", "req-x", 1);
        AiFeatureQuotaReservationEntity r2 = quotaService.reserve(
                user.getId(), AiFeature.CHAT, null, "same-key", "req-y", 1);
        assertThat(r2.getId()).isEqualTo(r1.getId());
        assertThat(reservations.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Concurrent reserves respect daily limit under ENFORCE")
    void concurrentEnforce() throws InterruptedException {
        AdminQuotaPolicyEntity policy = policies.findByMeterAndScopeAndRoleNameIsNull(
                        AdminQuotaMeter.AI_CHAT.name(), AdminFeatureQuotaService.SCOPE_GLOBAL)
                .orElseThrow();
        policy.setDailyLimit(5);
        policy.setMode(AdminQuotaMode.ENFORCE.name());
        policies.save(policy);

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger denied = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            pool.submit(() -> {
                try {
                    start.await();
                    AiFeatureQuotaReservationEntity r = quotaService.reserve(
                            user.getId(), AiFeature.CHAT, null, "c-" + idx, "c-req-" + idx, 1);
                    quotaService.settle(r.getId());
                    success.incrementAndGet();
                } catch (FeatureQuotaExceededException ex) {
                    denied.incrementAndGet();
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        while (!pool.isTerminated()) {
            Thread.sleep(50);
        }

        assertThat(success.get()).isEqualTo(5);
        assertThat(denied.get()).isEqualTo(3);
    }
}
