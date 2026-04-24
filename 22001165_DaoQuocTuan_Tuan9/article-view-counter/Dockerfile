# ─── Stage 1: Build ─────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder

WORKDIR /app
COPY pom.xml .
# Cache dependencies layer
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn clean package -DskipTests -q

# ─── Stage 2: Runtime ────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/target/article-view-counter-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", \
  "java $JAVA_OPTS \
   -XX:+UseContainerSupport \
   -XX:MaxRAMPercentage=75.0 \
   -Djava.security.egd=file:/dev/./urandom \
   -jar /app/app.jar"]
