package com.tronai.system;

import com.tronai.ai.AiProvider;
import com.tronai.ai.CloudAiProperties;
import com.tronai.ai.model.ModelManager;
import com.tronai.ai.profile.AiProfile;
import com.tronai.ai.profile.AiProfileDefinition;
import com.tronai.ai.profile.AiProfileService;
import com.tronai.ai.profile.AiProfilesResponse;
import com.tronai.queue.BackgroundJobPublisher;
import com.tronai.storage.ObjectStorageService;
import com.tronai.stt.SpeechToTextProvider;
import com.tronai.tts.TextToSpeechProvider;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GET /health
 *
 * System Health Check with AI Profile reachability:
 *   HTTP 200 {
 *     "status": "ok",
 *     "service": "tron-ai-spring",
 *     "database": "reachable",
 *     "ollama": "reachable",
 *     "model": "tron-fast",
 *     "stt": "reachable",
 *     "tts": "reachable",
 *     "storage": "reachable",
 *     "queue": "reachable",
 *     "cloudAi": "disabled",
 *     "aiProfiles": {
 *       "FAST": "reachable",
 *       "QUALITY": "reachable"
 *     }
 *   }
 */
@RestController
public class HealthController {

    private final DataSource dataSource;
    private final AiProvider aiProvider;
    private final ModelManager modelManager;
    private final AiProfileService aiProfileService;
    private final SpeechToTextProvider speechToTextProvider;
    private final TextToSpeechProvider textToSpeechProvider;
    private final ObjectStorageService objectStorageService;
    private final BackgroundJobPublisher backgroundJobPublisher;
    private final CloudAiProperties cloudAiProperties;

    public HealthController(DataSource dataSource,
                            AiProvider aiProvider,
                            ModelManager modelManager,
                            AiProfileService aiProfileService,
                            SpeechToTextProvider speechToTextProvider,
                            TextToSpeechProvider textToSpeechProvider,
                            ObjectStorageService objectStorageService,
                            BackgroundJobPublisher backgroundJobPublisher,
                            CloudAiProperties cloudAiProperties) {
        this.dataSource = dataSource;
        this.aiProvider = aiProvider;
        this.modelManager = modelManager;
        this.aiProfileService = aiProfileService;
        this.speechToTextProvider = speechToTextProvider;
        this.textToSpeechProvider = textToSpeechProvider;
        this.objectStorageService = objectStorageService;
        this.backgroundJobPublisher = backgroundJobPublisher;
        this.cloudAiProperties = cloudAiProperties;
    }

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("service", "tron-ai-spring");

        boolean dbOk = checkDatabase();
        boolean aiOk = checkAiProvider();
        boolean sttOk = checkStt();
        boolean ttsOk = checkTts();
        boolean storageOk = checkStorage();
        boolean queueOk = checkQueue();

        response.put("database", dbOk ? "reachable" : "unreachable");
        response.put("ollama", aiOk ? "reachable" : "unreachable");
        if (modelManager != null) {
            try {
                response.put("model", modelManager.getDefaultModel().getId());
            } catch (Exception e) {
                response.put("model", "unknown");
            }
        }
        response.put("stt", sttOk ? "reachable" : "unreachable");
        response.put("tts", ttsOk ? "reachable" : "unreachable");
        response.put("storage", storageOk ? "reachable" : "unreachable");
        response.put("queue", queueOk ? "reachable" : "unreachable");
        response.put("cloudAi", cloudAiProperties != null ? cloudAiProperties.healthStatus() : "disabled");

        // Profile-aware AI reachability mapping
        Map<String, String> profileHealth = new LinkedHashMap<>();
        if (aiProfileService != null) {
            try {
                AiProfilesResponse profilesResp = aiProfileService.getAvailableProfiles();
                for (AiProfileDefinition def : profilesResp.getProfiles()) {
                    profileHealth.put(def.getId(), def.isAvailable() ? "reachable" : "unavailable");
                }
            } catch (Exception e) {
                profileHealth.put("FAST", aiOk ? "reachable" : "unreachable");
                profileHealth.put("QUALITY", "unavailable");
            }
        } else {
            profileHealth.put("FAST", aiOk ? "reachable" : "unreachable");
            profileHealth.put("QUALITY", "unknown");
        }
        response.put("aiProfiles", profileHealth);

        // Core platform is OK if Database and Ollama FAST are healthy
        if (dbOk && aiOk) {
            return ResponseEntity.ok(response);
        } else {
            response.put("status", "degraded");
            return ResponseEntity.status(503).body(response);
        }
    }

    /** Release readiness deliberately excludes external inference nodes. */
    @GetMapping(value = "/health/ready", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> releaseReadiness() {
        boolean database = checkDatabase();
        boolean storage = checkStorage();
        Map<String, Object> body = Map.of(
                "status", database && storage ? "ready" : "not_ready",
                "database", database ? "reachable" : "unreachable",
                "storage", storage ? "reachable" : "unreachable");
        return ResponseEntity.status(database && storage ? 200 : 503).body(body);
    }

    private boolean checkDatabase() {
        if (dataSource == null) {
            return false;
        }
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(2);
        } catch (SQLException e) {
            return false;
        }
    }

    private boolean checkAiProvider() {
        if (aiProvider == null) {
            return false;
        }
        return aiProvider.isAvailable();
    }

    private boolean checkStt() {
        if (speechToTextProvider == null) {
            return false;
        }
        try {
            return speechToTextProvider.isAvailable();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkTts() {
        if (textToSpeechProvider == null) {
            return false;
        }
        try {
            return textToSpeechProvider.isAvailable();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkStorage() {
        if (objectStorageService == null) {
            return false;
        }
        try {
            return objectStorageService.isAvailable();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkQueue() {
        if (backgroundJobPublisher == null) {
            return false;
        }
        try {
            return backgroundJobPublisher.isAvailable();
        } catch (Exception e) {
            return false;
        }
    }
}
