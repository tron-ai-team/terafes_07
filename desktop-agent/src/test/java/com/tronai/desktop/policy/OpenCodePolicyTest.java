package com.tronai.desktop.policy;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenCodePolicyTest {

    private final CommandPolicyEngine policy = new CommandPolicyEngine();

    @Test
    void openCodeEnsureServeIsNormalInsideWorkspace() {
        PolicyDecision d = policy.evaluate(new PolicyRequest(
                "OPENCODE", "ENSURE_SERVE",
                "C:/Users/test/workspace", "C:/Users/test/workspace",
                null, null, null, null, null));
        assertThat(d.risk()).isEqualTo(RiskLevel.NORMAL);
    }

    @Test
    void openCodeOutsideWorkspaceIsBlocked() {
        PolicyDecision d = policy.evaluate(new PolicyRequest(
                "OPENCODE", "ENSURE_SERVE",
                "C:/Users/test/workspace", "C:/Users/test/other",
                null, null, null, null, null));
        assertThat(d.risk()).isEqualTo(RiskLevel.BLOCKED);
    }

    @Test
    void openCodeVerifyRelativePathAllowed() {
        PolicyDecision d = policy.evaluate(new PolicyRequest(
                "OPENCODE", "VERIFY_FILE",
                "C:/Users/test/workspace", "C:/Users/test/workspace",
                "proof.txt", null, null, null, null));
        assertThat(d.risk()).isEqualTo(RiskLevel.NORMAL);
    }
}
