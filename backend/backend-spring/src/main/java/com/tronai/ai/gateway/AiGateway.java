package com.tronai.ai.gateway;

import com.tronai.admin.quota.AiFeatureQuotaReservationEntity;
import com.tronai.admin.quota.AdminFeatureQuotaService;
import com.tronai.ai.gateway.provider.GatewayProvider;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.ai.gateway.usage.AiQuotaReservationEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiGateway {

    private final AiModelRouter modelRouter;
    private final AiProviderRegistry providerRegistry;
    private final AiQuotaService quotaService;
    private final AdminFeatureQuotaService featureQuotaService;
    private final AiUsageService usageService;
    private final AiGatewayProperties properties;

    public AiGateway(
            AiModelRouter modelRouter,
            AiProviderRegistry providerRegistry,
            AiQuotaService quotaService,
            AdminFeatureQuotaService featureQuotaService,
            AiUsageService usageService,
            AiGatewayProperties properties) {
        this.modelRouter = modelRouter;
        this.providerRegistry = providerRegistry;
        this.quotaService = quotaService;
        this.featureQuotaService = featureQuotaService;
        this.usageService = usageService;
        this.properties = properties;
    }

    public AiGenerationResult generate(AiRequestContext context) {
        AiMode effectiveMode = modelRouter.resolveEffectiveMode(context);
        if (effectiveMode == AiMode.ULTRA) {
            ensureUltraAvailable(context);
        }

        AiQuotaReservationEntity reservation = null;
        if (effectiveMode == AiMode.ULTRA) {
            reservation = quotaService.reserve(
                    context.getUserId(),
                    context.getFeature(),
                    effectiveMode,
                    context.getIdempotencyKey(),
                    context.getRequestId());
        }

        AiFeatureQuotaReservationEntity featureReservation = null;
        if (context.getUserId() != null) {
            featureReservation = featureQuotaService.reserve(
                    context.getUserId(),
                    context.getFeature(),
                    context.getQuotaMeterHint(),
                    context.getIdempotencyKey(),
                    context.getRequestId(),
                    1);
        }

        AiModelRouter.Route route = modelRouter.resolveRoute(context, effectiveMode);
        List<AiModelRouter.Route> attempts = new ArrayList<>();
        attempts.add(route);
        if (effectiveMode != AiMode.ULTRA) {
            attempts.addAll(modelRouter.fallbackCandidates(context, effectiveMode));
        }

        GatewayProviderException lastFailure = null;
        AiModelRouter.Route usedRoute = route;
        for (int i = 0; i < attempts.size(); i++) {
            usedRoute = attempts.get(i);
            try {
                AiGenerationResult result = invokeProvider(context, effectiveMode, usedRoute);
                if (reservation != null) {
                    quotaService.settle(reservation.getId());
                }
                if (featureReservation != null) {
                    featureQuotaService.settle(featureReservation.getId());
                }
                int ultraCredits = reservation != null ? reservation.getCredits() : 0;
                usageService.recordSuccess(context, result, ultraCredits);
                return result;
            } catch (GatewayProviderException ex) {
                lastFailure = ex;
                if (effectiveMode == AiMode.ULTRA || !isFallbackEligible(ex) || i == attempts.size() - 1) {
                    break;
                }
            }
        }

        if (reservation != null) {
            quotaService.release(reservation.getId());
        }
        if (featureReservation != null) {
            featureQuotaService.release(featureReservation.getId());
        }
        int ultraCredits = reservation != null ? reservation.getCredits() : 0;
        usageService.recordFailure(
                context,
                effectiveMode,
                usedRoute.provider(),
                usedRoute.modelId(),
                lastFailure != null ? lastFailure.getCategory() : GatewayProviderException.UPSTREAM_ERROR,
                ultraCredits);

        if (lastFailure != null) {
            throw lastFailure;
        }
        throw new IllegalStateException("AI generation failed without provider error");
    }

    private void ensureUltraAvailable(AiRequestContext context) {
        if (context.getUserId() == null) {
            throw new IllegalStateException("Authentication required for Ultra AI mode");
        }
        if (!properties.isUltraEnabled()) {
            throw new IllegalStateException("Ultra AI mode is disabled");
        }
        try {
            modelRouter.resolveRoute(context, AiMode.ULTRA);
        } catch (IllegalStateException ex) {
            throw ex;
        }
    }

    private AiGenerationResult invokeProvider(
            AiRequestContext context,
            AiMode effectiveMode,
            AiModelRouter.Route route) {
        GatewayProvider provider = providerRegistry.find(route.provider())
                .orElseThrow(() -> new GatewayProviderException(
                        GatewayProviderException.UNAVAILABLE,
                        503,
                        "Provider not registered: " + route.provider()));
        long started = System.currentTimeMillis();
        AiGenerationResult result = provider.generate(context, route.modelId());
        result.setProvider(route.provider());
        result.setModelId(route.modelId());
        result.setMode(effectiveMode);
        result.setFeature(context.getFeature());
        result.setRequestId(context.getRequestId());
        if (result.getLatencyMs() <= 0) {
            result.setLatencyMs(System.currentTimeMillis() - started);
        }
        return result;
    }

    private boolean isFallbackEligible(GatewayProviderException ex) {
        // Provider-specific failures (e.g. Groq BAD_REQUEST on a large COMPANY_RESEARCH prompt)
        // must not block OpenRouter/Mistral/Ollama. Auth/payment failures stay fail-closed for
        // that provider only — still allow other configured providers in the route chain.
        String category = ex.getCategory();
        return GatewayProviderException.UNAVAILABLE.equals(category)
                || GatewayProviderException.RATE_LIMITED.equals(category)
                || GatewayProviderException.BAD_REQUEST.equals(category)
                || GatewayProviderException.UPSTREAM_ERROR.equals(category)
                || GatewayProviderException.TIMEOUT.equals(category)
                || GatewayProviderException.INVALID_CREDENTIAL.equals(category)
                || GatewayProviderException.PAYMENT_REQUIRED.equals(category);
    }
}
