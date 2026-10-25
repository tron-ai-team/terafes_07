package com.tronai.desktopagent.policy;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommandPolicyEngineTest {

    private final CommandPolicyEngine policy = new CommandPolicyEngine();
    @org.junit.jupiter.api.io.TempDir
    Path temporaryDirectory;

    private String root;

    @org.junit.jupiter.api.BeforeEach
    void setUpWorkspace() throws java.io.IOException {
        root = java.nio.file.Files.createDirectories(temporaryDirectory.resolve("Dev")).toString();
    }

    @Test
    void gitStatusIsSafeAndPushNeedsApproval() {
        assertThat(policy.evaluate(command(List.of("git", "status"))).risk()).isEqualTo(RiskLevel.SAFE);
        assertThat(policy.evaluate(command(List.of("git", "push", "origin", "main"))).risk())
                .isEqualTo(RiskLevel.REQUIRES_APPROVAL);
        assertThat(policy.evaluate(command(List.of("git", "push", "--force", "origin", "main"))).risk())
                .isEqualTo(RiskLevel.BLOCKED);
        assertThat(policy.evaluate(command(List.of("git", "reset", "--hard"))).risk()).isEqualTo(RiskLevel.BLOCKED);
    }

    @Test
    void buildCommandsAreSafeAndDestructiveCommandsAreBlocked() {
        assertThat(policy.evaluate(command(List.of("mvn", "test"))).risk()).isEqualTo(RiskLevel.SAFE);
        assertThat(policy.evaluate(command(List.of("npm", "test"))).risk()).isEqualTo(RiskLevel.SAFE);
        assertThat(policy.evaluate(command(List.of("gradle", "test"))).risk()).isEqualTo(RiskLevel.SAFE);
        assertThat(policy.evaluate(command(List.of("format", "C:"))).risk()).isEqualTo(RiskLevel.BLOCKED);
        assertThat(policy.evaluate(command(List.of("sudo", "apt", "install", "curl"))).risk())
                .isEqualTo(RiskLevel.REQUIRES_APPROVAL);
    }

    @Test
    void shellOperatorsAreRejected() {
        CommandTokenizer.Tokens tokens = CommandTokenizer.tokenize("git status && rm -rf /");
        assertThat(tokens.rejected()).isTrue();
        PolicyDecision decision = policy.evaluate(new PolicyRequest(
                "TERMINAL", "RUN", root, root, null, null, null, "git status && del /s C:\\Windows", null));
        assertThat(decision.risk()).isEqualTo(RiskLevel.BLOCKED);
    }

    @Test
    void workspaceEscapeIsBlocked() {
        PolicyDecision decision = policy.evaluate(new PolicyRequest(
                "FILE", "READ_FILE", root, root, temporaryDirectory.resolve("Windows/win.ini").toString(), null, null, null, null));
        assertThat(decision.risk()).isEqualTo(RiskLevel.BLOCKED);
        assertThatThrownBy(() -> WorkspaceGuard.requireInside(root, root + "/../Windows", "Path"))
                .isInstanceOf(WorkspaceGuard.WorkspaceViolation.class);
    }

    @Test
    void deleteRequiresApprovalAndSiblingPrefixDoesNotMatch() {
        assertThat(policy.evaluate(new PolicyRequest(
                "FILE", "DELETE_FILE", root, root, Path.of(root, "hello.txt").toString(), null, null, null, null)).risk())
                .isEqualTo(RiskLevel.REQUIRES_APPROVAL);
        assertThat(policy.evaluate(new PolicyRequest(
                "FILE", "READ_FILE", root, root, temporaryDirectory.resolve("DevEvil/secret.txt").toString(), null, null, null, null)).risk())
                .isEqualTo(RiskLevel.BLOCKED);
    }

    @Test
    void approvalFingerprintChangesWhenCommandChanges() {
        String first = Fingerprints.of("TERMINAL", "RUN", root, null, null, List.of("git", "status"), null, null);
        String second = Fingerprints.of("TERMINAL", "RUN", root, null, null, List.of("git", "push"), null, null);
        assertThat(first).isNotEqualTo(second);
        String mac = ApprovalTokens.mac(java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(new byte[32]), "device", "task", "action", first, "100");
        assertThat(ApprovalTokens.matches(mac, mac)).isTrue();
        assertThat(ApprovalTokens.matches(mac, mac + "x")).isFalse();
    }

    @Test
    void redactorHidesTokens() {
        String redacted = SecretRedactor.redact("Authorization: Bearer eyJabc.defghijk.lmnopqrs and password=hunter2");
        assertThat(redacted).doesNotContain("hunter2").doesNotContain("eyJabc");
    }

    @Test
    void browserAliasesNormalizeAndAreAllowed() {
        assertThat(CommandPolicyEngine.normalizeBrowserOperation("navigate")).isEqualTo("OPEN_URL");
        assertThat(CommandPolicyEngine.normalizeBrowserOperation("take_screenshot")).isEqualTo("SCREENSHOT");
        assertThat(CommandPolicyEngine.normalizeBrowserOperation("goto")).isEqualTo("OPEN_URL");
        assertThat(policy.evaluate(new PolicyRequest(
                "BROWSER", "navigate", root, root, null, null, null, null, "https://example.com")).risk())
                .isEqualTo(RiskLevel.NORMAL);
        PolicyDecision unknown = policy.evaluate(new PolicyRequest(
                "BROWSER", "unknown_op", root, root, null, null, null, null, "https://example.com"));
        assertThat(unknown.risk()).isEqualTo(RiskLevel.BLOCKED);
        assertThat(unknown.reason()).contains("Unknown browser operation");
    }

    private PolicyRequest command(List<String> argv) {
        return new PolicyRequest("TERMINAL", "RUN", root, root, null, null, argv, String.join(" ", argv), null);
    }
}
