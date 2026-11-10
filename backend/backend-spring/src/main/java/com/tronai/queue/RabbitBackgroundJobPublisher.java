package com.tronai.queue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "tron.rabbitmq", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RabbitBackgroundJobPublisher implements BackgroundJobPublisher {

    private static final Logger log = LoggerFactory.getLogger(RabbitBackgroundJobPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    public RabbitBackgroundJobPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publishCvProcessed(Long userId, Long cvId, String filename) {
        TronEvent event = TronEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(RabbitConfig.CV_ROUTING_KEY)
                .userId(userId)
                .resourceId(String.valueOf(cvId))
                .createdAt(Instant.now())
                .metadata(Map.of("filename", filename != null ? filename : ""))
                .build();

        publishEvent(RabbitConfig.CV_ROUTING_KEY, event);
    }

    @Override
    public void publishInterviewCompleted(Long userId, String interviewId, int overallScore) {
        TronEvent event = TronEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(RabbitConfig.INTERVIEW_ROUTING_KEY)
                .userId(userId)
                .resourceId(interviewId)
                .createdAt(Instant.now())
                .metadata(Map.of("overallScore", overallScore))
                .build();

        publishEvent(RabbitConfig.INTERVIEW_ROUTING_KEY, event);
    }

    @Override
    public void publishEvent(String routingKey, TronEvent event) {
        try {
            log.info("Publishing async event {} for resource {}", event.getEventType(), event.getResourceId());
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE_NAME, routingKey, event);
        } catch (Exception e) {
            // Queue failure safety: non-critical event failure must NEVER crash or abort the caller transaction
            log.warn("[RabbitMQ Publication Failure] Non-critical event {} could not be dispatched (broker unavailable): {}",
                    event.getEventType(), e.getMessage());
        }
    }

    @Override
    public boolean isAvailable() {
        try {
            var connection = rabbitTemplate.getConnectionFactory().createConnection();
            boolean isOpen = connection.isOpen();
            connection.close();
            return isOpen;
        } catch (Exception e) {
            return false;
        }
    }
}
