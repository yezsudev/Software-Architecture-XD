package com.viewcounter.producer;

import com.viewcounter.model.ViewEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ViewEventProducer {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.routing-key}")
    private String routingKey;

    /**
     * Sends view event to RabbitMQ asynchronously.
     * Non-blocking — caller returns immediately.
     * Retry is handled by RabbitTemplate's RetryTemplate (configured in RabbitMQConfig).
     */
    @Async
    public void publishViewEvent(ViewEvent event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
            log.debug("Published ViewEvent to queue: eventId={}, postId={}, timestamp={}",
                    event.getEventId(), event.getPostId(), event.getTimestamp());
        } catch (AmqpException e) {
            // After all retries exhausted — log and swallow so API is not affected
            log.error("Failed to publish ViewEvent after retries: eventId={}, postId={}, error={}",
                    event.getEventId(), event.getPostId(), e.getMessage());
            // TODO: persist to fallback store (DB, local file) for eventual consistency
        }
    }
}
