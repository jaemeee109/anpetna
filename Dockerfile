# 리포지토리(또는 백엔드 모듈) 루트의 Dockerfile
FROM eclipse-temurin:17-jre
ARG JAR_FILE

WORKDIR /app
COPY ${JAR_FILE} app.jar

# 선택: JVM 옵션/프로파일을 컨테이너 실행 시 주입할 수 있게
ENV JAVA_OPTS=""

EXPOSE 8080

# 선택: 컨테이너 자체 헬스체크 (compose 헬스체크를 쓰면 생략 가능)
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '\"status\":\"UP\"' || exit 1

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
