package com.tronai.admin.quota;

import com.tronai.admin.AdminAuditService;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.user.User;
import com.tronai.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminFeatureQuotaService {

    public static final String SCOPE_GLOBAL = "GLOBAL";
    public static final String SCOPE_ROLE = "ROLE";
    public static final ZoneId JST = ZoneId.of("Asia/Tokyo");

    private final AdminQuotaPolicyRepository policyRepository;
    private final AdminUserQuotaOverrideRepository overrideRepository;
    private final AiFeatureDailyCounterRepository counterRepository;
    private final AiFeatureQuotaReservationRepository reservationRepository;
    private final AdminQuotaAdjustmentRepository adjustmentRepository;
    private final UserRepository userRepository;
    private final AdminAuditService auditService;
    private final ConcurrentHashMap<Long, Object> userLocks = new ConcurrentHashMap<>();

    public AdminFeatureQuotaService(
            AdminQuotaPolicyRepository policyRepository,
            AdminUserQuotaOverrideRepository overrideRepository,
            AiFeatureDailyCounterRepository counterRepository,
            AiFeatureQuotaReservationRepository reservationRepository,
            AdminQuotaAdjustmentRepository adjustmentRepository,
            UserRepository userRepository,
            AdminAuditService auditService) {
        this.policyRepository = policyRepository;
        this.overrideRepository = overrideRepository;
        this.counterRepository = counterRepository;
        this.reservationRepository = reservationRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    public LocalDate quotaDayJst() {
        return LocalDate.now(JST);
    }

    public Instant nextResetAtJst() {
        ZonedDateTime now = ZonedDateTime.now(JST);
        return now.toLocalDate().plusDays(1).atStartOfDay(JST).toInstant();
    }

    public record EffectiveLimit(int dailyLimit, AdminQuotaMode mode, boolean enabled) {}

    @Transactional(readOnly = true)
    public EffectiveLimit resolveEffectiveLimit(Long userId, AdminQuotaMeter meter) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String meterName = meter.name();

        Optional<AdminUserQuotaOverrideEntity> override = overrideRepository.findByUserIdAndMeter(userId, meterName);
        if (override.isPresent() && !override.get().isInherit() && override.get().getOverrideLimit() != null) {
            AdminQuotaMode mode = resolveModeFromPolicies(meterName, user.getRole());
            boolean enabled = isPolicyEnabled(meterName, user.getRole());
            return new EffectiveLimit(override.get().getOverrideLimit(), mode, enabled);
        }

        Optional<AdminQuotaPolicyEntity> rolePolicy = policyRepository.findByMeterAndScopeAndRoleName(
                meterName, SCOPE_ROLE, user.getRole());
        if (rolePolicy.isPresent() && rolePolicy.get().isEnabled()) {
            AdminQuotaPolicyEntity p = rolePolicy.get();
            return new EffectiveLimit(p.getDailyLimit(), AdminQuotaMode.fromDb(p.getMode()), p.isEnabled());
        }

        AdminQuotaPolicyEntity global = policyRepository
                .findByMeterAndScopeAndRoleNameIsNull(meterName, SCOPE_GLOBAL)
                .orElseThrow(() -> new IllegalStateException("No global quota policy for meter: " + meterName));
        return new EffectiveLimit(
                global.getDailyLimit(),
                AdminQuotaMode.fromDb(global.getMode()),
                global.isEnabled());
    }

    private boolean isPolicyEnabled(String meter, String roleName) {
        return policyRepository.findByMeterAndScopeAndRoleName(meter, SCOPE_ROLE, roleName)
                .filter(AdminQuotaPolicyEntity::isEnabled)
                .or(() -> policyRepository.findByMeterAndScopeAndRoleNameIsNull(meter, SCOPE_GLOBAL))
                .map(AdminQuotaPolicyEntity::isEnabled)
                .orElse(false);
    }

    private AdminQuotaMode resolveModeFromPolicies(String meter, String roleName) {
        return policyRepository.findByMeterAndScopeAndRoleName(meter, SCOPE_ROLE, roleName)
                .or(() -> policyRepository.findByMeterAndScopeAndRoleNameIsNull(meter, SCOPE_GLOBAL))
                .map(p -> AdminQuotaMode.fromDb(p.getMode()))
                .orElse(AdminQuotaMode.OBSERVE);
    }

    @Transactional
    public AiFeatureQuotaReservationEntity reserve(
            Long userId,
            AiFeature feature,
            String meterHint,
            String idempotencyKey,
            String requestId,
            int units) {
        if (userId == null) {
            return null;
        }
        Object lock = userLocks.computeIfAbsent(userId, id -> new Object());
        synchronized (lock) {
            AdminQuotaMeter meter = AdminQuotaMeter.fromAiFeature(feature, meterHint);
            String key = normalizeIdempotencyKey(idempotencyKey, requestId);
            Optional<AiFeatureQuotaReservationEntity> existing =
                    reservationRepository.findByUserIdAndIdempotencyKey(userId, key);
            if (existing.isPresent()) {
                return existing.get();
            }

            EffectiveLimit limit = resolveEffectiveLimit(userId, meter);
            if (!limit.enabled()) {
                return createReservation(userId, meter, feature, key, requestId, units, limit.mode());
            }

            LocalDate day = quotaDayJst();
            AiFeatureDailyCounterEntity counter = loadCounterForUpdate(userId, meter.name(), day);

            int inFlight = counter.getReservedCount();
            int used = counter.getSettledCount() + inFlight;
            int remaining = Math.max(0, limit.dailyLimit() - used);
            boolean wouldExceed = used + units > limit.dailyLimit();

            if (wouldExceed) {
                if (limit.mode() == AdminQuotaMode.ENFORCE) {
                    counter.setDeniedCount(counter.getDeniedCount() + 1);
                    counter.setUpdatedAt(Instant.now());
                    counterRepository.save(counter);
                    throw new FeatureQuotaExceededException(
                            feature, meter, limit.dailyLimit(), used, remaining, nextResetAtJst());
                }
                counter.setObserveWouldBlockCount(counter.getObserveWouldBlockCount() + 1);
            }

            counter.setReservedCount(counter.getReservedCount() + units);
            counter.setUpdatedAt(Instant.now());
            counterRepository.save(counter);

            return createReservation(userId, meter, feature, key, requestId, units, limit.mode());
        }
    }

    private AiFeatureQuotaReservationEntity createReservation(
            Long userId,
            AdminQuotaMeter meter,
            AiFeature feature,
            String idempotencyKey,
            String requestId,
            int units,
            AdminQuotaMode mode) {
        AiFeatureQuotaReservationEntity entity = new AiFeatureQuotaReservationEntity();
        entity.setUserId(userId);
        entity.setMeter(meter.name());
        entity.setQuotaDay(quotaDayJst());
        entity.setUnits(units);
        entity.setStatus(FeatureQuotaReservationStatus.RESERVED.name());
        entity.setModeAtReserve(mode.name());
        entity.setIdempotencyKey(idempotencyKey);
        entity.setRequestId(requestId != null ? requestId : idempotencyKey);
        entity.setFeature(feature != null ? feature.name() : null);
        entity.setCreatedAt(Instant.now());
        return reservationRepository.save(entity);
    }

    @Transactional
    public void settle(Long reservationId) {
        reservationRepository.findById(reservationId).ifPresent(reservation -> {
            if (FeatureQuotaReservationStatus.SETTLED.name().equals(reservation.getStatus())) {
                return;
            }
            if (!FeatureQuotaReservationStatus.RESERVED.name().equals(reservation.getStatus())) {
                return;
            }
            LocalDate day = reservation.getQuotaDay();
            AiFeatureDailyCounterEntity counter = loadCounterForUpdate(
                    reservation.getUserId(), reservation.getMeter(), day);
            counter.setReservedCount(Math.max(0, counter.getReservedCount() - reservation.getUnits()));
            counter.setSettledCount(counter.getSettledCount() + reservation.getUnits());
            counter.setUpdatedAt(Instant.now());
            counterRepository.save(counter);

            reservation.setStatus(FeatureQuotaReservationStatus.SETTLED.name());
            reservation.setSettledAt(Instant.now());
            reservationRepository.save(reservation);
        });
    }

    @Transactional
    public void release(Long reservationId) {
        reservationRepository.findById(reservationId).ifPresent(reservation -> {
            if (FeatureQuotaReservationStatus.RELEASED.name().equals(reservation.getStatus())) {
                return;
            }
            if (!FeatureQuotaReservationStatus.RESERVED.name().equals(reservation.getStatus())) {
                return;
            }
            counterRepository
                    .findByUserIdAndMeterAndQuotaDayForUpdate(
                            reservation.getUserId(), reservation.getMeter(), reservation.getQuotaDay())
                    .ifPresent(counter -> {
                        counter.setReservedCount(Math.max(0, counter.getReservedCount() - reservation.getUnits()));
                        counter.setUpdatedAt(Instant.now());
                        counterRepository.save(counter);
                    });
            reservation.setStatus(FeatureQuotaReservationStatus.RELEASED.name());
            reservationRepository.save(reservation);
        });
    }

    @Transactional
    public Map<String, Object> resetUserDay(Long actorUserId, Long targetUserId, AdminQuotaMeter meter, String reason) {
        LocalDate day = quotaDayJst();
        counterRepository.findByUserIdAndMeterAndQuotaDay(targetUserId, meter.name(), day).ifPresent(counter -> {
            int delta = -(counter.getSettledCount() + counter.getReservedCount());
            AdminQuotaAdjustmentEntity adj = new AdminQuotaAdjustmentEntity();
            adj.setUserId(targetUserId);
            adj.setMeter(meter.name());
            adj.setQuotaDay(day);
            adj.setAdjustment(delta);
            adj.setReason(reason != null ? reason : "Admin reset user day");
            adj.setActorUserId(actorUserId);
            adj.setCreatedAt(Instant.now());
            adjustmentRepository.save(adj);

            counter.setReservedCount(0);
            counter.setSettledCount(0);
            counter.setDeniedCount(0);
            counter.setObserveWouldBlockCount(0);
            counter.setUpdatedAt(Instant.now());
            counterRepository.save(counter);
        });
        auditService.log(actorUserId, "QUOTA_RESET_USER_DAY", "user", String.valueOf(targetUserId),
                meter.name() + " day=" + day, "SUCCESS", null);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", targetUserId);
        out.put("meter", meter.name());
        out.put("quotaDay", day.toString());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> usageSummary(Long userId) {
        LocalDate day = quotaDayJst();
        List<Map<String, Object>> meters = new ArrayList<>();
        for (AdminQuotaMeter meter : AdminQuotaMeter.values()) {
            EffectiveLimit limit = resolveEffectiveLimit(userId, meter);
            AiFeatureDailyCounterEntity counter = counterRepository
                    .findByUserIdAndMeterAndQuotaDay(userId, meter.name(), day)
                    .orElse(null);
            int settled = counter != null ? counter.getSettledCount() : 0;
            int reserved = counter != null ? counter.getReservedCount() : 0;
            int used = settled + reserved;
            int remaining = Math.max(0, limit.dailyLimit() - used);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("meter", meter.name());
            row.put("dailyLimit", limit.dailyLimit());
            row.put("used", used);
            row.put("settled", settled);
            row.put("reserved", reserved);
            row.put("remaining", remaining);
            row.put("mode", limit.mode().name());
            row.put("enabled", limit.enabled());
            if (counter != null) {
                row.put("observeWouldBlockCount", counter.getObserveWouldBlockCount());
                row.put("deniedCount", counter.getDeniedCount());
            }
            meters.add(row);
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("quotaDay", day.toString());
        summary.put("timezone", JST.getId());
        summary.put("resetAt", nextResetAtJst());
        summary.put("meters", meters);
        return summary;
    }

    private AiFeatureDailyCounterEntity loadCounterForUpdate(Long userId, String meter, LocalDate day) {
        Optional<AiFeatureDailyCounterEntity> existing =
                counterRepository.findByUserIdAndMeterAndQuotaDayForUpdate(userId, meter, day);
        if (existing.isPresent()) {
            return existing.get();
        }
        try {
            newCounter(userId, meter, day);
        } catch (DataIntegrityViolationException ignored) {
            // Another transaction created the counter row first.
        }
        return counterRepository.findByUserIdAndMeterAndQuotaDayForUpdate(userId, meter, day)
                .orElseThrow(() -> new IllegalStateException("Feature counter missing after create race"));
    }

    private AiFeatureDailyCounterEntity newCounter(Long userId, String meter, LocalDate day) {
        AiFeatureDailyCounterEntity c = new AiFeatureDailyCounterEntity();
        c.setUserId(userId);
        c.setMeter(meter);
        c.setQuotaDay(day);
        c.setTimezone(JST.getId());
        c.setReservedCount(0);
        c.setSettledCount(0);
        c.setDeniedCount(0);
        c.setObserveWouldBlockCount(0);
        c.setUpdatedAt(Instant.now());
        return counterRepository.save(c);
    }

    private String normalizeIdempotencyKey(String idempotencyKey, String requestId) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            return idempotencyKey.trim();
        }
        if (requestId != null && !requestId.isBlank()) {
            return "fq:" + requestId.trim();
        }
        return "fq:" + Instant.now().toEpochMilli();
    }
}
