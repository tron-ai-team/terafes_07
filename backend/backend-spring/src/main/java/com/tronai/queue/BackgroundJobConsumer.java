package com.tronai.queue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(prefix = "tron.rabbitmq", name = "enabled", havingValue = "true", matchIfMissing = true)
public class BackgroundJobConsumer {

    private static final Logger log = LoggerFactory.getLogger(BackgroundJobConsumer.class);

    // In-memory record of received events for live test validation and auditing
    private final List<TronEvent> receivedEvents = new CopyOnWriteArrayList<>();

    @RabbitListener(queues = RabbitConfig.CV_QUEUE)
    public void handleCvEvent(TronEvent event) {
        log.info("Consumer received CV event: id={}, type={}, user={}, resource={}",
                event.getEventId(), event.getEventType(), event.getUserId(), event.getResourceId());
        receivedEvents.add(event);
    }

    @RabbitListener(queues = RabbitConfig.INTERVIEW_QUEUE)
    public void handleInterviewEvent(TronEvent event) {
        log.info("Consumer received Interview event: id={}, type={}, user={}, resource={}",
                event.getEventId(), event.getEventType(), event.getUserId(), event.getResourceId());
        receivedEvents.add(event);
    }

    public List<TronEvent> getReceivedEvents() {
        return List.copyOf(receivedEvents);
    }

    public void clearReceivedEvents() {
        receivedEvents.clear();
    }
}
