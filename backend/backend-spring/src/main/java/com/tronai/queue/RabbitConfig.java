package com.tronai.queue;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "tron.rabbitmq", name = "enabled", havingValue = "true", matchIfMissing = true)
public class RabbitConfig {

    public static final String EXCHANGE_NAME = "tron.events";
    public static final String CV_QUEUE = "tron.cv.events";
    public static final String INTERVIEW_QUEUE = "tron.interview.events";
    public static final String CV_ROUTING_KEY = "cv.processed";
    public static final String INTERVIEW_ROUTING_KEY = "interview.completed";

    @Bean
    public TopicExchange tronEventsExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue cvEventsQueue() {
        return QueueBuilder.durable(CV_QUEUE).build();
    }

    @Bean
    public Queue interviewEventsQueue() {
        return QueueBuilder.durable(INTERVIEW_QUEUE).build();
    }

    @Bean
    public Binding cvEventsBinding(Queue cvEventsQueue, TopicExchange tronEventsExchange) {
        return BindingBuilder.bind(cvEventsQueue).to(tronEventsExchange).with("cv.*");
    }

    @Bean
    public Binding interviewEventsBinding(Queue interviewEventsQueue, TopicExchange tronEventsExchange) {
        return BindingBuilder.bind(interviewEventsQueue).to(tronEventsExchange).with("interview.*");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
