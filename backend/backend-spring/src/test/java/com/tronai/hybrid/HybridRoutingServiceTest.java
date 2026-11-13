package com.tronai.hybrid;

import com.tronai.ai.OllamaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HybridRoutingServiceTest {

    @Mock
    PlatformControlRepository controls;
    @Mock
    OllamaClient ollamaClient;

    HybridRoutingService hybrid;

    @BeforeEach
    void setUp() {
        hybrid = new HybridRoutingService(controls, ollamaClient);
        ReflectionTestUtils.setField(hybrid, "assumeLocalHealthy", true);
        PlatformControlEntity state = new PlatformControlEntity();
        when(controls.findById(1)).thenReturn(Optional.of(state));
        lenient().when(controls.save(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(ollamaClient.checkHealth()).thenReturn(true);
    }

    @Test
    void pausedWhenMaintenance() {
        PlatformControlEntity state = hybrid.state();
        state.setMode(PlatformMode.MAINTENANCE);
        assertThat(hybrid.selectSupervisorRoute()).isEqualTo("PAUSED");
    }

    @Test
    void cloudWhenLocalForcedOfflineAndCloudEnabled() {
        PlatformControlEntity state = hybrid.state();
        state.setRtxOverride("FORCE_OFFLINE");
        state.setLocalRoutingEnabled(true);
        state.setCloudRoutingEnabled(true);
        assertThat(hybrid.selectSupervisorRoute()).isEqualTo("CLOUD_GATEWAY");
        assertThat(hybrid.selectInferenceRoute()).isEqualTo("CLOUD_GATEWAY");
        assertThat(hybrid.allowsLocalInference()).isFalse();
        assertThat(hybrid.allowsCloudInference()).isTrue();
    }

    @Test
    void localWhenForcedOnline() {
        PlatformControlEntity state = hybrid.state();
        state.setRtxOverride("FORCE_ONLINE");
        state.setLocalRoutingEnabled(true);
        assertThat(hybrid.selectSupervisorRoute()).isEqualTo("LOCAL_OLLAMA");
    }

    @Test
    void acquireRejectsWhenPaused() {
        PlatformControlEntity state = hybrid.state();
        state.setPauseNewAiTasks(true);
        assertThat(hybrid.tryAcquireAiSlot()).isFalse();
    }

    @Test
    void acquireRespectsConcurrencyCap() {
        PlatformControlEntity state = hybrid.state();
        state.setMaxConcurrentAiRequests(1);
        assertThat(hybrid.tryAcquireAiSlot()).isTrue();
        assertThat(hybrid.tryAcquireAiSlot()).isFalse();
        hybrid.releaseAiSlot();
        assertThat(hybrid.tryAcquireAiSlot()).isTrue();
        hybrid.releaseAiSlot();
    }
}
