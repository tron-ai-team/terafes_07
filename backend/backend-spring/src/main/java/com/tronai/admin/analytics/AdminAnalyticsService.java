package com.tronai.admin.analytics;

import com.tronai.ai.gateway.usage.AiUsageEventRepository;
import com.tronai.admin.quota.AiFeatureDailyCounterRepository;
import com.tronai.admin.quota.AdminFeatureQuotaService;
import com.tronai.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AdminAnalyticsService {

    private final UserRepository users;
    private final AiUsageEventRepository usageEvents;
    private final AiFeatureDailyCounterRepository featureCounters;
    private final AdminFeatureQuotaService featureQuotaService;

    public AdminAnalyticsService(
            UserRepository users,
            AiUsageEventRepository usageEvents,
            AiFeatureDailyCounterRepository featureCounters,
            AdminFeatureQuotaService featureQuotaService) {
        this.users = users;
        this.usageEvents = usageEvents;
        this.featureCounters = featureCounters;
        this.featureQuotaService = featureQuotaService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        Instant dayAgo = Instant.now().minus(1, ChronoUnit.DAYS);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("registeredUsers", users.count());
        out.put("enabledUsers", users.countByEnabledTrue());
        out.put("suspendedUsers", users.countBySuspendedAtIsNotNull());
        out.put("featureQuotaDay", featureQuotaService.quotaDayJst().toString());
        out.put("featureCounterRows", featureCounters.count());
        try {
            out.put("aiUsageEventsLast24h", usageEvents.countByCreatedAtAfter(dayAgo));
        } catch (Exception ex) {
            out.put("aiUsageEventsLast24h", null);
            out.put("aiUsageNote", ex.getMessage());
        }
        out.put("dailyActiveUsers", Map.of(
                "value", null,
                "measurement", "unavailable",
                "reason", "No dedicated DAU signal table; do not treat enabledUsers as DAU"));
        out.put("estimatedSpend", Map.of(
                "value", null,
                "measurement", "unavailable",
                "reason", "Pricing catalog empty or unmatched"));
        out.put("generatedAt", Instant.now());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> timeseries(String range) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("range", range == null ? "7d" : range);
        out.put("measurement", "partial");
        out.put("points", java.util.List.of());
        out.put("note", "High-cardinality daily series aggregation not yet materialized; use overview counters");
        out.put("generatedAt", Instant.now());
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> usage(String range) {
        Instant since = Instant.now().minus(resolveDays(range), ChronoUnit.DAYS);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("range", range == null ? "7d" : range);
        out.put("since", since.toString());
        try {
            out.put("aiUsageEvents", usageEvents.countByCreatedAtAfter(since));
            out.put("measurement", "measured");
        } catch (Exception ex) {
            out.put("aiUsageEvents", null);
            out.put("measurement", "unavailable");
            out.put("reason", ex.getMessage());
        }
        out.put("promptContentIncluded", false);
        out.put("generatedAt", Instant.now());
        return out;
    }

    private static long resolveDays(String range) {
        if (range == null) {
            return 7;
        }
        return switch (range.trim().toLowerCase()) {
            case "today", "1d" -> 1;
            case "30d" -> 30;
            default -> 7;
        };
    }
}
