# ---------- Stage 1: Build (Gradle + JDK) ----------
FROM gradle:8-jdk17-alpine AS build
WORKDIR /workspace

# 1) 의존성 캐시 레이어 최적화
#    - 설정/랩퍼/gradle 디렉터리만 먼저 복사 → 의존성만 받아옴
COPY gradle gradle
COPY gradlew .
COPY settings.gradle .
COPY build.gradle .
RUN chmod +x gradlew || true
RUN ./gradlew --version

RUN ./gradlew dependencies --no-daemon || true

COPY . .

RUN ./gradlew clean bootJar --no-daemon

RUN mkdir -p /out && \
    cp "$(ls build/libs/*.jar | grep -v 'plain' | head -n1)" /out/app.jar


# ---------- Stage 2: Runtime (슬림 JRE) ----------
FROM eclipse-temurin:17-jre-alpine
LABEL maintainer="rayoh95"

# 보안상 비루트 사용자
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

# Stage1에서 만든 실행 JAR만 복사
COPY --from=build /out/app.jar ./app.jar

EXPOSE 8080
USER app

ENTRYPOINT ["sh","-lc","exec java $JAVA_OPTS -jar /app/app.jar"]
