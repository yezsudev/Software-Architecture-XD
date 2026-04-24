package com.viewcounter.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisViewService {

    private static final String INCR_WITH_TTL_LUA = """
        local current = redis.call('INCR', KEYS[1])
        local ttl = tonumber(ARGV[1])
        if current == 1 and ttl > 0 then
          redis.call('EXPIRE', KEYS[1], ttl)
        end
        return current
        """;

    private static final DefaultRedisScript<Long> INCR_WITH_TTL_SCRIPT = new DefaultRedisScript<>(
        INCR_WITH_TTL_LUA,
        Long.class
    );

    private final RedisTemplate<String, String> redisTemplate;

    @Value("${app.redis.key-prefix:post}")
    private String keyPrefix;

    @Value("${app.redis.key-suffix:views}")
    private String keySuffix;

    @Value("${app.redis.key-ttl-days:30}")
    private long keyTtlDays;

    /**
     * Builds Redis key: post:{postId}:views
     */
    private String buildKey(String postId) {
        return String.format("%s:%s:%s", keyPrefix, postId, keySuffix);
    }

    /**
     * Atomically increment view count. Returns new count.
     * Redis INCR is O(1) and thread-safe.
     */
    public long incrementView(String postId) {
        String key = buildKey(postId);
        try {
            long ttlSeconds = Math.max(0, keyTtlDays * 24 * 60 * 60);
            Long count = redisTemplate.execute(
                INCR_WITH_TTL_SCRIPT,
                List.of(key),
                String.valueOf(ttlSeconds)
            );
            long result = (count != null) ? count : 0L;
            log.debug("Incremented view for postId={} → count={}", postId, result);
            return result;
        } catch (Exception e) {
            log.error("Redis INCR failed for postId={}: {}", postId, e.getMessage());
            throw new RuntimeException("Failed to increment view count", e);
        }
    }

    /**
     * Get current view count for a post.
     * Returns 0 if key does not exist.
     */
    public long getViewCount(String postId) {
        String key = buildKey(postId);
        try {
            String value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                log.debug("No view count found for postId={}, returning 0", postId);
                return 0L;
            }
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            log.warn("Invalid number in Redis for postId={}: {}", postId, e.getMessage());
            return 0L;
        } catch (Exception e) {
            log.error("Redis GET failed for postId={}: {}", postId, e.getMessage());
            throw new RuntimeException("Failed to get view count", e);
        }
    }

    /**
     * Check Redis connectivity (used by health check)
     */
    public boolean isHealthy() {
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            return true;
        } catch (Exception e) {
            log.warn("Redis health check failed: {}", e.getMessage());
            return false;
        }
    }
}
