package com.viewcounter.service;

import com.viewcounter.model.ViewEvent;
import com.viewcounter.producer.ViewEventProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ViewService {

    private final RedisViewService redisViewService;
    private final ViewEventProducer viewEventProducer;
    private final PostViewReadService postViewReadService;

    /**
     * Core flow for POST /view:
     * 1. Increment counter in Redis (sync, O(1), <1ms)
     * 2. Fire-and-forget event to RabbitMQ (async, non-blocking)
     * Total latency: ~1-5ms
     */
    public long recordView(String postId) {
        log.info("Recording view for postId={}", postId);

        // Step 1: Atomic increment in Redis — always fast
        long newCount = redisViewService.incrementView(postId);

        // Step 2: Async publish to MQ — does NOT block response
        ViewEvent event = ViewEvent.of(postId);
        viewEventProducer.publishViewEvent(event);

        log.debug("View recorded: postId={}, newCount={}", postId, newCount);
        return newCount;
    }

    /**
     * Core flow for GET /views:
     * Read directly from Redis — fallback to 0 if not found.
     */
    public long getViewCount(String postId) {
        log.debug("Fetching view count for postId={}", postId);
        return redisViewService.getViewCount(postId);
    }

    public long getDbViewCount(String postId) {
        log.debug("Fetching DB view count for postId={}", postId);
        return postViewReadService.getDbViewCount(postId);
    }
}
