package com.tronai.hybrid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Hybrid local/cloud routing gates. Local Ollama preferred when permitted and healthy;
 * cloud only when enabled and caller already passes quota/consent checks upstream.
 */
@Service
public class HybridRoutingService {

    private final PlatformControlRepository controls;
    private final AtomicInteger inFlight = new AtomicInteger(0);
    private final AtomicInteger queued = new AtomicInteger(0);

    @Value("${tron.hybrid.ollama-health-url:http://127.0.0.1:11434/api/tags}")
    private String ollamaHealthUrl;

    @Value("${tron.hybrid.rtx-probe-timeout-ms:1500}")
    private int rtxProbeTimeoutMs;

    public HybridRoutingService(PlatformControlRepository controls) {
        this.controls = controls;
    }

    public PlatformControlEntity state() {
        return controls.findById(1).orElseGet(() -> {
            PlatformControlEntity created = new PlatformControlEntity();
            return controls.save(created);
        });
    }

    public PlatformControlEntity update(PlatformControlEntity patch, Long actorUserId) {
        PlatformControlEntity current = state();
        if (patch.getMode() != null) {
            current.setMode(patch.getMode());
        }
        current.setLocalRoutingEnabled(patch.isLocalRoutingEnabled());
        current.setCloudRoutingEnabled(patch.isCloudRoutingEnabled());
        current.setPauseNewAiTasks(patch.isPauseNewAiTasks());
        current.setStopNewAgentJobs(patch.isStopNewAgentJobs());
        current.setExhibitionRegistrationOpen(patch.isExhibitionRegistrationOpen());
        if (patch.getMaxConcurrentAiRequests() > 0) {
            current.setMaxConcurrentAiRequests(patch.getMaxConcurrentAiRequests());
        }
        if (patch.getQueueCapacity() > 0) {
            current.setQueueCapacity(patch.getQueueCapacity());
        }
        if (patch.getRtxOverride() != null) {
            current.setRtxOverride(patch.getRtxOverride());
        }
        if (patch.getGtxOverride() != null) {
            current.setGtxOverride(patch.getGtxOverride());
        }
        current.setUpdatedAt(Instant.now());
        current.setUpdatedBy(actorUserId);
        return controls.save(current);
    }

    public boolean isLocalOllamaReachable() {
        PlatformControlEntity s = state();
        if ("FORCE_OFFLINE".equalsIgnoreCase(s.getRtxOverride())) {
            return false;
        }
        if ("FORCE_ONLINE".equalsIgnoreCase(s.getRtxOverride())) {
            return true;
        }
        return probe(ollamaHealthUrl);
    }

    public String selectSupervisorRoute() {
        return selectInferenceRoute();
    }

    /**
     * Shared local/cloud decision for Supervisor, Chat (FAST/SMART/ULTRA), and agent inference.
     * Values: {@code LOCAL_OLLAMA}, {@code CLOUD_GATEWAY}, {@code PAUSED}, {@code UNAVAILABLE}.
     */
    public String selectInferenceRoute() {
        PlatformControlEntity s = state();
        if (s.getMode() == PlatformMode.MAINTENANCE || s.isPauseNewAiTasks()) {
            return "PAUSED";
        }
        if (s.isLocalRoutingEnabled() && isLocalOllamaReachable()) {
            return "LOCAL_OLLAMA";
        }
        if (s.isCloudRoutingEnabled()) {
            return "CLOUD_GATEWAY";
        }
        return "UNAVAILABLE";
    }

    /** True when hybrid policy allows routing to local Ollama (probe + admin flags). */
    public boolean allowsLocalInference() {
        return "LOCAL_OLLAMA".equals(selectInferenceRoute());
    }

    /** True when cloud providers may be used (admin cloud flag and not maintenance-paused). */
    public boolean allowsCloudInference() {
        PlatformControlEntity s = state();
        if (s.getMode() == PlatformMode.MAINTENANCE || s.isPauseNewAiTasks()) {
            return false;
        }
        return s.isCloudRoutingEnabled();
    }

    public boolean tryAcquireAiSlot() {
        PlatformControlEntity s = state();
        if (s.isPauseNewAiTasks() || s.getMode() == PlatformMode.MAINTENANCE) {
            return false;
        }
        int next = inFlight.incrementAndGet();
        if (next > s.getMaxConcurrentAiRequests()) {
            inFlight.decrementAndGet();
            int q = queued.incrementAndGet();
            if (q > s.getQueueCapacity()) {
                queued.decrementAndGet();
                return false;
            }
            // Bounded wait not implemented here — caller sees queue pressure via metrics.
            queued.decrementAndGet();
            return false;
        }
        return true;
    }

    public void releaseAiSlot() {
        inFlight.updateAndGet(v -> Math.max(0, v - 1));
    }

    public Map<String, Object> metrics() {
        PlatformControlEntity s = state();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mode", s.getMode().name());
        m.put("localRoutingEnabled", s.isLocalRoutingEnabled());
        m.put("cloudRoutingEnabled", s.isCloudRoutingEnabled());
        m.put("pauseNewAiTasks", s.isPauseNewAiTasks());
        m.put("stopNewAgentJobs", s.isStopNewAgentJobs());
        m.put("inFlightAiRequests", inFlight.get());
        m.put("queueSize", queued.get());
        m.put("maxConcurrentAiRequests", s.getMaxConcurrentAiRequests());
        m.put("queueCapacity", s.getQueueCapacity());
        m.put("localOllamaReachable", isLocalOllamaReachable());
        m.put("supervisorRoute", selectSupervisorRoute());
        m.put("rtxOverride", s.getRtxOverride());
        m.put("gtxOverride", s.getGtxOverride());
        return m;
    }

    private boolean probe(String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setConnectTimeout(rtxProbeTimeoutMs);
            conn.setReadTimeout(rtxProbeTimeoutMs);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            return code >= 200 && code < 500;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
