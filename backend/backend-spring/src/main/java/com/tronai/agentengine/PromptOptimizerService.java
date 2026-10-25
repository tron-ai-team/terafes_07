package com.tronai.agentengine;

import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * One-shot prompt optimizer. Improves the user goal once, then returns.
 * Does not plan tools or execute a second agent loop.
 */
@Service
public class PromptOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(PromptOptimizerService.class);

    private final AiGateway aiGateway;

    public PromptOptimizerService(AiGateway aiGateway) {
        this.aiGateway = aiGateway;
    }

    public OptimizationResult optimize(Long userId, String rawGoal, NativeAgentRouter.RouteKind route) {
        return optimize(userId, rawGoal, route, null, null);
    }

    /**
     * One-shot optimization with optional provider/model override (benchmark / admin).
     */
    public OptimizationResult optimize(Long userId, String rawGoal, NativeAgentRouter.RouteKind route,
                                       String providerOverride, String modelOverride) {
        if (rawGoal == null || rawGoal.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Goal is required");
        }
        String trimmed = rawGoal.trim();
        String system = """
                You are TRON's prompt optimizer. Rewrite the user request into ONE clear, actionable agent prompt.
                Rules:
                - Output ONLY the improved prompt text. No JSON. No markdown fences. No preamble.
                - Keep the user's original intent. Do not invent a different product.
                - Make workspace constraints explicit: create real files in the current working directory.
                - For coding: require concrete files, builds/tests when appropriate, and verification of outputs.
                - For file changes: instruct the agent to use native edit/write tools (edit needs path+oldString+newString; write needs full file contents). Never invent <line> markers.
                - For browser automation: require a real URL, navigation, title/URL capture, and screenshot when useful.
                - Do not emit low-level tool commands (no FILE/TERMINAL JSON). The native agent plans tools itself.
                - Never forbid creating files. Never say "do not create any other files".
                - Never require "no trailing newline" or other pedantic file-byte constraints.
                - Helper instruction files (e.g. TRON_NATIVE_GOAL.txt) may already exist; ignore them as deliverables.
                - Keep length under 800 words.
                """;
        String user = "Route: " + route.name()
                + "\nOriginal request:\n"
                + trimmed;
        try {
            AiRequestContext.Builder ctx = AiRequestContext.builder()
                    .userId(userId)
                    .feature(AiFeature.CODING_AGENT)
                    .mode(AiMode.SMART)
                    .maxTokens(1200)
                    .messages(List.of(
                            ChatMessage.builder().role("system").content(system).build(),
                            ChatMessage.builder().role("user").content(user).build()));
            if (providerOverride != null && !providerOverride.isBlank()) {
                ctx.providerOverride(providerOverride.trim());
            }
            if (modelOverride != null && !modelOverride.isBlank()) {
                ctx.modelOverride(modelOverride.trim());
            }
            AiGenerationResult result = aiGateway.generate(ctx.build());
            String improved = sanitize(result == null ? null : result.getText());
            if (improved == null || improved.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Prompt optimizer returned empty text");
            }
            String provider = result.getProvider() == null ? "unknown" : result.getProvider().name();
            String model = result.getModelId() == null ? "" : result.getModelId();
            log.info("Prompt optimized userId={} route={} provider={} model={} charsIn={} charsOut={}",
                    userId, route, provider, model, trimmed.length(), improved.length());
            return new OptimizationResult(trimmed, improved, provider, model);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Prompt optimizer failed: " + e.getMessage());
        }
    }

    private static String sanitize(String text) {
        if (text == null) {
            return null;
        }
        String t = text.trim();
        if (t.startsWith("```")) {
            int nl = t.indexOf('\n');
            if (nl > 0) {
                t = t.substring(nl + 1);
            }
            if (t.toLowerCase(Locale.ROOT).endsWith("```")) {
                t = t.substring(0, t.length() - 3).trim();
            }
        }
        return t.trim();
    }

    public record OptimizationResult(String originalGoal, String improvedPrompt,
                                     String providerId, String modelId) {
    }
}
