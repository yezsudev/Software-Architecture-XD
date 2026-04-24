package com.viewcounter.worker;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.QueueInformation;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("worker")
@RequiredArgsConstructor
public class QueueLagMonitor {

    private final RabbitAdmin rabbitAdmin;

    @Value("${app.rabbitmq.queue}")
    private String queueName;

    @Value("${app.worker.monitor.queue-lag-threshold:10000}")
    private long queueLagThreshold;

    @Scheduled(fixedDelayString = "${app.worker.monitor.queue-lag-interval-ms:15000}")
    public void monitorLag() {
        QueueInformation info = rabbitAdmin.getQueueInfo(queueName);
        if (info == null) {
            log.warn("Cannot fetch queue metrics for queue={}", queueName);
            return;
        }

        int depth = info.getMessageCount();
        if (depth >= queueLagThreshold) {
            log.warn("Queue lag detected: queue={}, depth={}, threshold={}", queueName, depth, queueLagThreshold);
            return;
        }

        log.debug("Queue depth healthy: queue={}, depth={}", queueName, depth);
    }
}
