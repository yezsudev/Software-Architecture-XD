package com.viewcounter.worker;

import com.viewcounter.model.ViewEvent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Profile("worker")
@RequiredArgsConstructor
public class ViewEventBatchConsumer {

    private final BatchViewUpdateRepository batchViewUpdateRepository;
    private final MeterRegistry meterRegistry;

    @RabbitListener(
            queues = "${app.rabbitmq.queue}",
            containerFactory = "batchListenerContainerFactory"
    )
    public void consume(List<ViewEvent> events) {
        if (events == null || events.isEmpty()) {
            return;
        }

        List<ViewEvent> normalized = new ArrayList<>(events.size());
        long invalid = 0;

        for (ViewEvent event : events) {
            if (event == null || event.getPostId() == null || event.getPostId().isBlank()) {
                invalid++;
                continue;
            }
            if (event.getEventId() == null || event.getEventId().isBlank()) {
                event.setEventId(stableEventId(event));
            }
            if (event.getTimestamp() == null) {
                event.setTimestamp(Instant.now());
            }
            normalized.add(event);
        }

        if (normalized.isEmpty()) {
            meterRegistry.counter("worker.batch.events.invalid").increment(invalid);
            log.warn("Dropped {} invalid events in batch", invalid);
            return;
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        BatchPersistResult result = batchViewUpdateRepository.persistBatch(normalized);
        sample.stop(meterRegistry.timer("worker.batch.flush.duration"));

        long duplicates = result.receivedEvents() - result.appliedEvents();

        counter("worker.batch.events.received", result.receivedEvents());
        counter("worker.batch.events.applied", result.appliedEvents());
        counter("worker.batch.events.duplicate", Math.max(duplicates, 0));
        counter("worker.batch.events.invalid", invalid);
        counter("worker.batch.posts.affected", result.affectedPosts());
        counter("worker.batch.flush.count", 1);

        log.info("Worker flush success: batchSize={}, applied={}, duplicates={}, invalid={}, affectedPosts={}",
                result.receivedEvents(),
                result.appliedEvents(),
                duplicates,
                invalid,
                result.affectedPosts());
    }

    private void counter(String metricName, long value) {
        if (value <= 0) {
            return;
        }
        Counter counter = meterRegistry.counter(metricName);
        counter.increment(value);
    }

    private String stableEventId(ViewEvent event) {
        String base = event.getPostId() + "|" + event.getTimestamp() + "|" + event.getSource();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            // Fallback still keeps worker running if SHA-256 is unavailable.
            return base;
        }
    }
}
