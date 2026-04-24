package com.viewcounter.controller;

import com.viewcounter.model.ApiResponse;
import com.viewcounter.service.ViewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping
public class ViewController {

    private final ViewService viewService;

    /**
     * POST /view?postId=123
     * Increment view count — returns new count immediately.
     * Does NOT wait for DB or queue confirmation.
     */
    @PostMapping("/view")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recordView(
            @RequestParam String postId) {

        validatePostId(postId);
        log.info("[POST /view] postId={}", postId);

        long newCount = viewService.recordView(postId);

        Map<String, Object> data = Map.of(
                "postId", postId,
                "views", newCount
        );
        return ResponseEntity.ok(ApiResponse.ok("View recorded", data));
    }

    /**
     * GET /views?postId=123
     * Returns current view count from Redis.
     * Returns 0 if post has never been viewed.
     */
    @GetMapping("/views")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getViews(
            @RequestParam String postId) {

        validatePostId(postId);
        log.debug("[GET /views] postId={}", postId);

        long count = viewService.getViewCount(postId);

        Map<String, Object> data = Map.of(
                "postId", postId,
                "views", count
        );
        return ResponseEntity.ok(ApiResponse.ok("View count retrieved", data));
    }

    /**
     * GET /db/views?postId=123
     * Returns persisted view count from PostgreSQL.
     */
    @GetMapping("/db/views")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDbViews(
            @RequestParam String postId) {

        validatePostId(postId);
        long count = viewService.getDbViewCount(postId);

        Map<String, Object> data = Map.of(
                "postId", postId,
                "views", count
        );
        return ResponseEntity.ok(ApiResponse.ok("DB view count retrieved", data));
    }

    /**
     * GET /consistency?postId=123
     * Compare Redis realtime count and DB persisted count.
     */
    @GetMapping("/consistency")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConsistency(
            @RequestParam String postId) {

        validatePostId(postId);
        long redisViews = viewService.getViewCount(postId);
        long dbViews = viewService.getDbViewCount(postId);
        long lag = redisViews - dbViews;

        Map<String, Object> data = Map.of(
                "postId", postId,
                "redisViews", redisViews,
                "dbViews", dbViews,
                "lag", lag,
                "consistent", lag == 0
        );
        return ResponseEntity.ok(ApiResponse.ok("Consistency checked", data));
    }

    // ---- validation ----

    private void validatePostId(String postId) {
        if (postId == null || postId.isBlank()) {
            throw new IllegalArgumentException("postId must not be blank");
        }
        if (postId.length() > 100) {
            throw new IllegalArgumentException("postId too long (max 100 chars)");
        }
    }
}
