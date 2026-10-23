package com.tronai.desktop.runtime;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DesktopRuntimeManagerTest {

    @TempDir
    Path temp;

    @Test
    void probeAllIncludesJava() {
        DesktopRuntimeManager mgr = new DesktopRuntimeManager(temp);
        assertThat(mgr.probeAll())
                .anyMatch(p -> p.id() == DesktopRuntimeManager.EngineId.JAVA && p.present());
    }

    @Test
    void installWithoutConsentIsBlocked() {
        DesktopRuntimeManager mgr = new DesktopRuntimeManager(temp);
        Map<String, Object> out = mgr.requestInstallWithConsent(
                DesktopRuntimeManager.EngineId.OPENCODE, false);
        assertThat(out.get("status")).isEqualTo("CONSENT_REQUIRED");
        assertThat(out.get("installed")).isEqualTo(false);
    }

    @Test
    void consentIsRecordedWithoutSilentInstall() {
        DesktopRuntimeManager mgr = new DesktopRuntimeManager(temp);
        Map<String, Object> out = mgr.requestInstallWithConsent(
                DesktopRuntimeManager.EngineId.OPENCODE, true);
        assertThat(out.get("status")).isEqualTo("CONSENT_RECORDED_MANUAL_INSTALL_REQUIRED");
        assertThat(out.get("installed")).isEqualTo(false);
        assertThat(out.get("consentRecorded")).asString().contains("opencode.consent");
    }
}
