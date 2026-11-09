# TRON AI Spring Boot — multi-stage production image (built in CI / GHCR).
# Build context: backend/backend-spring
#
#   docker build -f backend/backend-spring/Dockerfile -t tron-ai-backend ./backend/backend-spring

FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package \
    && mv target/*.jar /workspace/app.jar

FROM eclipse-temurin:21-jre-alpine
LABEL org.opencontainers.image.title="tron-ai-backend" \
      org.opencontainers.image.description="TRON AI Spring Boot core" \
      org.opencontainers.image.source="https://github.com/tron-ai-team/terafes_07"

RUN apk add --no-cache wget \
    && addgroup -S tron && adduser -S -G tron tron \
    && mkdir -p /var/lib/tron-ai/object-storage /var/lib/tron-ai/uploads /var/log/tron-ai \
    && chown -R tron:tron /var/lib/tron-ai /var/log/tron-ai

WORKDIR /app
COPY --from=build /workspace/app.jar /app/app.jar
USER tron

ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_ADDRESS=0.0.0.0 \
    SERVER_PORT=8080 \
    JAVA_OPTS="-Xms256m -Xmx768m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError" \
    TRON_STORAGE_LOCAL_PATH=/var/lib/tron-ai/object-storage \
    TRON_RABBITMQ_ENABLED=false

EXPOSE 8080

# Actuator liveness/readiness — DB-focused; does not require Ollama/STT/VOICEVOX.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health >/dev/null || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
