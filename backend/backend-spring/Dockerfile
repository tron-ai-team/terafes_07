# TRON AI Spring Boot — multi-stage image (built in CI, not on the core server).
# Context must be this module directory:
#   docker build -t tron-ai-backend backend/backend-spring

FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package \
    && mv target/*.jar /workspace/app.jar

FROM eclipse-temurin:21-jre-alpine
LABEL org.opencontainers.image.title="tron-ai-backend" \
      org.opencontainers.image.description="TRON AI Spring Boot core"

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
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError" \
    TRON_STORAGE_LOCAL_PATH=/var/lib/tron-ai/object-storage

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health/ready >/dev/null || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
