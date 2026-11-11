package com.tronai.admin.cost;

import com.tronai.ai.gateway.usage.AiUsageEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminCostService {

    private final AdminCostPricingRepository pricingRepository;
    private final AdminBudgetPolicyRepository budgetRepository;
    private final AiUsageEventRepository usageEvents;

    public AdminCostService(
            AdminCostPricingRepository pricingRepository,
            AdminBudgetPolicyRepository budgetRepository,
            AiUsageEventRepository usageEvents) {
        this.pricingRepository = pricingRepository;
        this.budgetRepository = budgetRepository;
        this.usageEvents = usageEvents;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> costs() {
        Map<String, Object> out = new LinkedHashMap<>();
        long pricingRows = pricingRepository.count();
        if (pricingRows == 0) {
            out.put("status", "UNAVAILABLE");
            out.put("reason", "No admin_cost_pricing rows configured");
            out.put("usageEventsLast24h", safeUsageCount());
            return out;
        }
        out.put("status", "PARTIAL");
        out.put("pricingRowCount", pricingRows);
        out.put("note", "Cost estimates require pricing rows matched to usage events; not computed in V1");
        out.put("usageEventsLast24h", safeUsageCount());
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> budgets() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AdminBudgetPolicyEntity b : budgetRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", b.getId());
            row.put("scope", b.getScope());
            row.put("currency", b.getCurrency());
            row.put("monthlyLimit", b.getMonthlyLimit());
            row.put("warnPct", b.getWarnPct());
            row.put("criticalPct", b.getCriticalPct());
            row.put("mode", b.getMode());
            row.put("enabled", b.isEnabled());
            row.put("revision", b.getRevision());
            out.add(row);
        }
        return out;
    }

    private Long safeUsageCount() {
        try {
            return usageEvents.countByCreatedAtAfter(Instant.now().minus(1, ChronoUnit.DAYS));
        } catch (Exception ex) {
            return null;
        }
    }
}
