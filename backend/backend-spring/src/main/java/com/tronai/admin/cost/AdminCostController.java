package com.tronai.admin.cost;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN','OWNER')")
public class AdminCostController {

    private final AdminCostService costs;

    public AdminCostController(AdminCostService costs) {
        this.costs = costs;
    }

    @GetMapping("/costs")
    public ResponseEntity<?> costs() {
        return ResponseEntity.ok(costs.costs());
    }

    @GetMapping("/budgets")
    public ResponseEntity<?> budgets() {
        return ResponseEntity.ok(costs.budgets());
    }
}
