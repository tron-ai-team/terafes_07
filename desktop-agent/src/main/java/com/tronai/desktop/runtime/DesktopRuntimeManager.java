package com.tronai.desktop.runtime;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Detects optional agent engines and runtime dependencies.
 * Does not silently install third-party engines — install requires explicit consent.
 */
public final class DesktopRuntimeManager {

    public enum EngineId {
        OPENCODE,
        OPENCLAW,
        PLAYWRIGHT,
        JAVA,
        NODE
    }

    public record ProbeResult(
            EngineId id,
            boolean present,
            String version,
            String detail,
            Instant checkedAt
    ) {}

    public record InstallPlan(
            EngineId id,
            boolean requiresConsent,
            String method,
            String commandHint,
            String pinnedVersionNote
    ) {}

    private final Path stateDir;

    public DesktopRuntimeManager() {
        this(Path.of(System.getProperty("user.home"), ".tron-desktop-agent", "runtime"));
    }

    public DesktopRuntimeManager(Path stateDir) {
        this.stateDir = stateDir;
    }

    public List<ProbeResult> probeAll() {
        List<ProbeResult> out = new ArrayList<>();
        out.add(probeJava());
        out.add(probeNode());
        out.add(probeCli(EngineId.OPENCODE, "opencode", "--version"));
        out.add(probeCli(EngineId.OPENCLAW, "openclaw", "--version"));
        out.add(probePlaywrightHint());
        return out;
    }

    public Map<String, Object> healthReport() {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("stateDir", stateDir.toAbsolutePath().toString());
        report.put("checkedAt", Instant.now().toString());
        List<Map<String, Object>> engines = new ArrayList<>();
        for (ProbeResult p : probeAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.id().name());
            row.put("present", p.present());
            row.put("version", p.version());
            row.put("detail", p.detail());
            engines.add(row);
        }
        report.put("engines", engines);
        report.put("consentRequiredForInstall", true);
        report.put("note", "Optional engines are never installed silently.");
        return report;
    }

    public InstallPlan planInstall(EngineId id) {
        return switch (id) {
            case OPENCODE -> new InstallPlan(
                    id, true, "npm-global",
                    "npm install -g @opencode/cli@2.1.1",
                    "User consent required. Prefer version-pinned package; verify with opencode --version + /api/session probe.");
            case OPENCLAW -> new InstallPlan(
                    id, true, "npm-global",
                    "npm install -g openclaw@2026.6.35",
                    "User consent required. Version-pinned. Gateway config still required; CLI alone is not live browser execution.");
            case PLAYWRIGHT -> new InstallPlan(
                    id, true, "java-classpath",
                    "Use desktop-agent Playwright dependency + browser download with consent",
                    "Browsers must be downloaded with user approval.");
            case NODE -> new InstallPlan(
                    id, true, "official-installer",
                    "Install Node LTS from https://nodejs.org",
                    "Required for OpenCode/OpenClaw npm packages.");
            case JAVA -> new InstallPlan(
                    id, false, "bundled-jpackage",
                    "Bundled with Windows installer (jpackage)",
                    "End users should not need a separate JDK when using the MSI.");
        };
    }

    /**
     * Records consent and returns the install command hint. Does not execute privileged installs.
     */
    public Map<String, Object> requestInstallWithConsent(EngineId id, boolean userConsented) {
        Map<String, Object> out = new LinkedHashMap<>();
        InstallPlan plan = planInstall(id);
        out.put("engine", id.name());
        out.put("requiresConsent", plan.requiresConsent());
        out.put("method", plan.method());
        out.put("commandHint", plan.commandHint());
        out.put("pinnedVersionNote", plan.pinnedVersionNote());
        if (plan.requiresConsent() && !userConsented) {
            out.put("status", "CONSENT_REQUIRED");
            out.put("installed", false);
            return out;
        }
        try {
            Files.createDirectories(stateDir);
            Path consent = stateDir.resolve(id.name().toLowerCase(Locale.ROOT) + ".consent");
            Files.writeString(consent,
                    Instant.now() + " consented=true method=" + plan.method() + "\n",
                    StandardCharsets.UTF_8);
            out.put("consentRecorded", consent.toAbsolutePath().toString());
            out.put("status", "CONSENT_RECORDED_MANUAL_INSTALL_REQUIRED");
            out.put("installed", false);
            out.put("note", "Automatic privileged install is not performed by the agent process. "
                    + "Installer pipeline / user-approved setup runs the verified package command.");
        } catch (Exception e) {
            out.put("status", "ERROR");
            out.put("error", e.getMessage());
            out.put("installed", false);
        }
        return out;
    }

    private ProbeResult probeJava() {
        String ver = System.getProperty("java.version", "");
        return new ProbeResult(EngineId.JAVA, !ver.isBlank(), ver,
                "runtime=" + System.getProperty("java.home", ""), Instant.now());
    }

    private ProbeResult probeNode() {
        return probeCli(EngineId.NODE, "node", "--version");
    }

    private ProbeResult probePlaywrightHint() {
        boolean onClasspath = false;
        try {
            Class.forName("com.microsoft.playwright.Playwright");
            onClasspath = true;
        } catch (ClassNotFoundException ignored) {
            // optional
        }
        return new ProbeResult(EngineId.PLAYWRIGHT, onClasspath,
                onClasspath ? "classpath" : null,
                onClasspath
                        ? "Playwright Java present; browsers may still need download with consent"
                        : "Playwright not on classpath",
                Instant.now());
    }

    private ProbeResult probeCli(EngineId id, String cmd, String arg) {
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd, arg);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    if (sb.length() > 0) {
                        sb.append('\n');
                    }
                    sb.append(line);
                }
            }
            boolean ok = p.waitFor(8, TimeUnit.SECONDS) && p.exitValue() == 0;
            String text = sb.toString().trim();
            return new ProbeResult(id, ok, ok ? firstLine(text) : null,
                    ok ? "ok" : "exit or timeout; output=" + truncate(text, 200),
                    Instant.now());
        } catch (Exception e) {
            return new ProbeResult(id, false, null,
                    e.getClass().getSimpleName() + ": " + e.getMessage(), Instant.now());
        }
    }

    private static String firstLine(String s) {
        int i = s.indexOf('\n');
        return i < 0 ? s : s.substring(0, i).trim();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
