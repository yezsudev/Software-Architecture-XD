# Article View Counter (Backend + Redis + Queue + Worker + PostgreSQL)

Hệ thống đếm view theo hướng write-optimized:
- API ghi nhanh vào Redis.
- Event được đẩy qua RabbitMQ.
- Worker batch-consume và đồng bộ xuống PostgreSQL.

Mục tiêu: giảm tải DB write trực tiếp, vẫn đảm bảo eventual consistency.

## Architecture Flow

```text
Client
  -> POST /view?postId=123
       -> Redis INCR (+ Lua set TTL khi key mới)
       -> publish ViewEvent(eventId, postId, timestamp) sang RabbitMQ
       -> trả response ngay

Worker (profile=worker)
  -> consume theo batch từ view.queue
     flush theo max-size hoặc timeout 5s
  -> dedupe eventId + group postId
  -> UPSERT cộng dồn vào PostgreSQL posts.views
```

Đọc realtime:
- GET /views đọc từ Redis (nhanh, gần realtime).

Đọc báo cáo/chính thức:
- đọc từ PostgreSQL (có thể trễ vài giây).

## Database Schema

Migration: `src/main/resources/db/migration/V1__create_posts_and_processed_events.sql`

```sql
CREATE TABLE posts (
  id VARCHAR(64) PRIMARY KEY,
  views BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processed_view_events (
  event_id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`processed_view_events.event_id` giúp idempotent khi message bị redelivery.

## Worker Implementation (Java, service riêng)

Worker chạy bằng cùng artifact nhưng profile riêng:
- `SPRING_PROFILES_ACTIVE=worker`
- `spring.main.web-application-type=none`

Thành phần chính:
- `worker/ViewEventBatchConsumer.java`: nhận `List<ViewEvent>` từ RabbitMQ batch listener.
- `worker/BatchViewUpdateRepository.java`: 1 SQL CTE xử lý dedupe + group + upsert.
- `worker/QueueLagMonitor.java`: log cảnh báo khi queue depth vượt ngưỡng.

Batch policy:
- Theo số lượng: `app.worker.batch.max-size`
- Theo thời gian: `app.worker.batch.flush-interval-ms` (mặc định 5000ms)

## Message Format

```json
{
  "eventId": "8e5dd9e7-41bd-4f9c-bd2c-cf9f2172f7fc",
  "postId": "123",
  "timestamp": "2026-04-24T09:00:00.000Z",
  "source": "api"
}
```

## Run With Docker

```bash
docker-compose up --build
```

Services:
- API: 8080
- Worker: background consumer
- Redis: 6379
- RabbitMQ: 5672, UI 15672
- PostgreSQL: 5432

## Quick Testing

1. Start full stack:

```bash
docker-compose up --build
```

2. Open test UI in browser:

```text
http://localhost:8080/test-ui.html
```

Advanced consistency UI:

```text
http://localhost:8080/consistency-ui.html
```

3. In UI:
- Click `Check health` first.
- Use `POST /view (+1)` to simulate one view.
- Use `GET /views` to read current Redis counter.
- Use `Run burst test` (example: 200 requests, concurrency 20) for quick load check.

4. In advanced UI (`consistency-ui.html`):
- `Check consistency now`: compare `redisViews` vs `dbViews` for 1 postId.
- `Start auto-check`: poll consistency every N ms to observe eventual convergence.
- `Run multi-post burst`: generate traffic across many postIds.
- `Sample top 5 consistency`: view lag table for multiple posts.

5. Optional DB verify (PostgreSQL):

```bash
docker exec -it view-postgres psql -U view_user -d view_counter -c "SELECT id, views, updated_at FROM posts ORDER BY updated_at DESC LIMIT 10;"
```

Note: Redis is near-realtime, PostgreSQL is eventually consistent and may lag a few seconds based on worker batch flush.

## Extra Test APIs

- `GET /db/views?postId=...`: read persisted views from PostgreSQL.
- `GET /consistency?postId=...`: returns Redis count, DB count, lag, and `consistent` flag.

## Reliability Notes

- Queue lag:
  - Worker có queue-lag monitor để phát hiện backlog.
  - Tăng số worker instance khi lag tăng.
- Worker crash:
  - Message chưa ack sẽ được RabbitMQ redeliver khi worker lên lại.
  - Idempotent theo `eventId` tránh double-count.
- Redis restart:
  - Redis chỉ là realtime cache; dữ liệu bền nằm ở PostgreSQL.
  - Có thể bật Redis persistence (AOF/RDB) nếu cần giảm mất mát ngắn hạn.

## Eventual Consistency (Giải thích)

Eventual consistency nghĩa là dữ liệu giữa Redis và PostgreSQL có thể lệch tạm thời, nhưng sẽ hội tụ về đúng sau một khoảng thời gian ngắn khi worker flush xong.

Chấp nhận được cho view counter vì:
- View là dữ liệu high-write, không yêu cầu strict transaction ngay lập tức.
- Người dùng ưu tiên latency thấp khi ghi/đọc gần realtime.
- DB thống kê có thể chậm vài giây mà không ảnh hưởng nghiệp vụ cốt lõi.

## Trade-offs

Ưu điểm:
- API latency thấp, throughput cao.
- DB giảm đáng kể số write nhờ batch + group.
- Kiến trúc chịu lỗi tốt hơn nhờ queue tách lớp.

Đánh đổi:
- Tăng độ phức tạp vận hành (worker, queue, monitoring).
- Dữ liệu DB không đồng bộ tức thời.
- Cần cơ chế dedupe/idempotent để tránh over-count khi redelivery.

## Scaling Guide (10k req/s)

1. Backend scale
- Scale ngang API instances sau load balancer.
- Tối ưu thread pool, connection pool, autoscaling theo CPU/RPS/latency.

2. Redis scale
- Dùng Redis Cluster hoặc sharding theo `postId`.
- Bật persistence phù hợp (AOF everysec) và replica để failover.
- Theo dõi hot-key; cân nhắc key-tagging/hash strategy để phân tán.

3. Queue scale
- Dùng nhiều queue/partition theo hash(`postId`) để tăng parallelism.
- Mỗi partition có consumer group worker riêng.
- Tinh chỉnh prefetch, batch size, và số worker instances.

## Bonus đã triển khai

- Redis Lua script cho `INCR + EXPIRE` atomically (trong `RedisViewService`).
- Metrics qua Micrometer:
  - `worker.batch.events.received`
  - `worker.batch.events.applied`
  - `worker.batch.events.duplicate`
  - `worker.batch.flush.duration`
