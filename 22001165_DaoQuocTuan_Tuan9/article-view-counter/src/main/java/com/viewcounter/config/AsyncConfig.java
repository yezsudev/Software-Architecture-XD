package com.viewcounter.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    /**
     * Dedicated thread pool for async queue publishing.
     * Isolated so queue slowness never affects main request threads.
     */
    @Bean(name = "mqPublisherExecutor")
    public Executor mqPublisherExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("mq-publisher-");
        executor.setRejectedExecutionHandler((r, exec) -> {
            // Drop silently when queue is full — preserve API latency
            // In production: push to fallback / circuit breaker
        });
        executor.initialize();
        return executor;
    }
}
