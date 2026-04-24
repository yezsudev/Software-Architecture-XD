package com.viewcounter.worker;

import com.viewcounter.model.ViewEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Array;
import java.util.List;

@Repository
@Profile("worker")
@RequiredArgsConstructor
public class BatchViewUpdateRepository {

    private static final String UPSERT_BATCH_SQL = """
            WITH incoming AS (
                SELECT *
                FROM unnest(?::text[], ?::text[]) AS t(event_id, post_id)
            ),
            dedup AS (
                SELECT DISTINCT event_id, post_id
                FROM incoming
            ),
            inserted AS (
                INSERT INTO processed_view_events(event_id, post_id)
                SELECT event_id, post_id
                FROM dedup
                ON CONFLICT (event_id) DO NOTHING
                RETURNING post_id
            ),
            aggregated AS (
                SELECT post_id, COUNT(*)::bigint AS delta
                FROM inserted
                GROUP BY post_id
            ),
            upserted AS (
                INSERT INTO posts(id, views)
                SELECT post_id, delta
                FROM aggregated
                ON CONFLICT (id) DO UPDATE
                    SET views = posts.views + EXCLUDED.views,
                        updated_at = NOW()
                RETURNING id
            )
            SELECT
                COALESCE((SELECT SUM(delta) FROM aggregated), 0) AS applied_events,
                COALESCE((SELECT COUNT(*) FROM upserted), 0) AS affected_posts
            """;

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public BatchPersistResult persistBatch(List<ViewEvent> events) {
        if (events == null || events.isEmpty()) {
            return new BatchPersistResult(0, 0, 0);
        }

        String[] eventIds = events.stream().map(ViewEvent::getEventId).toArray(String[]::new);
        String[] postIds = events.stream().map(ViewEvent::getPostId).toArray(String[]::new);

        return jdbcTemplate.execute((ConnectionCallback<BatchPersistResult>) connection -> {
            Array eventIdArray = connection.createArrayOf("text", eventIds);
            Array postIdArray = connection.createArrayOf("text", postIds);

            try (var statement = connection.prepareStatement(UPSERT_BATCH_SQL)) {
                statement.setArray(1, eventIdArray);
                statement.setArray(2, postIdArray);

                try (var resultSet = statement.executeQuery()) {
                    if (!resultSet.next()) {
                        return new BatchPersistResult(events.size(), 0, 0);
                    }
                    return new BatchPersistResult(
                            events.size(),
                            resultSet.getLong("applied_events"),
                            resultSet.getLong("affected_posts")
                    );
                }
            } finally {
                eventIdArray.free();
                postIdArray.free();
            }
        });
    }
}
