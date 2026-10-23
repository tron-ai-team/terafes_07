package com.tronai.desktop.policy;

public record PolicyDecision(RiskLevel risk, String reason) {
    public static PolicyDecision of(RiskLevel risk, String reason) {
        return new PolicyDecision(risk, reason);
    }
}

