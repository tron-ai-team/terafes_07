package com.tronai.queue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Used when RabbitMQ is intentionally disabled (phase-1 production core stack).
 * Publishes become no-ops so auth/CV flows continue without a broker.
 */
@Service
@ConditionalOnProperty(prefix = "tron.rabbitmq", name = "enabled", havingValue = "false")
public class NoOpBackgroundJobPublisher implements BackgroundJobPublisher {

    private static final Logger log = LoggerFactory.getLogger(NoOpBackgroundJobPublisher.class);

    @Override
    public void publishCvProcessed(Long userId, Long cvId, String filename) {
        log.debug("RabbitMQ disabled; skipping CV processed event for cvId={}", cvId);
    }

    @Override
    public void publishInterviewCompleted(Long userId, String interviewId, int overallScore) {
        log.debug("RabbitMQ disabled; skipping interview completed event for interviewId={}", interviewId);
    }

    @Override
    public void publishEvent(String routingKey, TronEvent event) {
        log.debug("RabbitMQ disabled; skipping event type={}", routingKey);
    }

    @Override
    public boolean isAvailable() {
        return false;
    }
}
