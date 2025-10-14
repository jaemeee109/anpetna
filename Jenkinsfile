pipeline {
  agent { label 'worker-1' }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
  }

  environment {
    GIT_REPO           = 'https://github.com/jaemeee109/anpetna.git'
    BRANCH             = 'MASTER'
    DOCKERHUB_REPO     = 'rayoh95/anpetna'

    APP_DIR            = '/opt/anpetna/app'
    NGINX_DIR          = '/opt/anpetna/nginx'
    NGINX_ACTIVE_VAR   = '/opt/anpetna/nginx/conf.d/active-upstream.var'

    NGINX_CONTAINER    = 'anpetna-nginx'
    DOCKER_NETWORK     = 'anpetna_net'

    HEALTH_TIMEOUT_SEC = '180'
    IMAGE_TAG_BASE     = "v1.0.${env.BUILD_NUMBER}"

    // 디버그 토글: 1로 켜면 민감값 원문도 출력(주의)
    DEBUG_ENV          = '0'
  }

  stages {

    stage('Preflight') {
      steps {
        sh '''#!/bin/sh
set -euxo pipefail

test -f "${APP_DIR}/docker-compose.yml" || { echo "Missing ${APP_DIR}/docker-compose.yml (worker volume?)"; exit 1; }
test -d "${NGINX_DIR}" || { echo "Missing ${NGINX_DIR} (worker volume?)"; exit 1; }

docker version >/dev/null
docker compose version >/dev/null

docker network ls | grep -w "${DOCKER_NETWORK}" >/dev/null || docker network create ${DOCKER_NETWORK} || true

if [ ! -f "${NGINX_ACTIVE_VAR}" ]; then
  mkdir -p "$(dirname ${NGINX_ACTIVE_VAR})"
  printf 'set $active_upstream app-blue:8080;\n' > "${NGINX_ACTIVE_VAR}"
fi

docker ps --format '{{.Names}}' | grep -w "${NGINX_CONTAINER}" >/dev/null || { echo "Nginx container ${NGINX_CONTAINER} not running"; exit 1; }

if ! docker inspect -f '{{json .NetworkSettings.Networks}}' ${NGINX_CONTAINER} | grep -q "\"${DOCKER_NETWORK}\""; then
  docker network connect ${DOCKER_NETWORK} ${NGINX_CONTAINER} || true
fi
'''
      }
    }

    stage('Checkout') {
      steps {
        git branch: "${BRANCH}", url: "${GIT_REPO}", credentialsId: 'git_access_token'
      }
    }

    stage('Select Color') {
      steps {
        script {
          def active = sh(
            script: "grep -oE 'app-(blue|green)' ${NGINX_ACTIVE_VAR} | tail -n1 | cut -d'-' -f2 || true",
            returnStdout: true
          ).trim()
          env.CURRENT_COLOR = (active in ['blue','green']) ? active : 'blue'
          env.NEXT_COLOR    = (env.CURRENT_COLOR == 'blue') ? 'green' : 'blue'
          env.IMAGE_TAG     = env.IMAGE_TAG_BASE
          echo "CURRENT=${env.CURRENT_COLOR}, NEXT=${env.NEXT_COLOR}, IMAGE_TAG_BASE=${env.IMAGE_TAG_BASE}"
        }
      }
    }

    stage('Build (Gradle)') {
      options { timeout(time: 20, unit: 'MINUTES') }
      steps {
        retry(2) {
          sh '''#!/bin/sh
set -euxo pipefail

export JAVA_HOME=/opt/java/openjdk
export PATH="$JAVA_HOME/bin:$PATH"

export GRADLE_USER_HOME="$WORKSPACE/.gradle-cache"
mkdir -p "$GRADLE_USER_HOME"

printf '%s\n' \
  'org.gradle.daemon=false' \
  'org.gradle.console=plain' \
  'systemProp.org.gradle.internal.http.connectionTimeout=120000' \
  'systemProp.org.gradle.internal.http.socketTimeout=120000' \
  > "$GRADLE_USER_HOME/gradle.properties"

test -f ./gradlew || { echo "gradlew not found"; exit 1; }
chmod +x ./gradlew

./gradlew --no-daemon --max-workers=1 \
  -Dorg.gradle.workers.max=1 \
  -Dorg.gradle.jvmargs=-Xmx1536m \
  -Dfile.encoding=UTF-8 \
  --info --stacktrace --console=plain \
  clean bootJar -x test

JAR_PATH=$(ls -1 build/libs/*.jar | head -n1 || true)
[ -f "$JAR_PATH" ] || { echo "JAR not found under build/libs"; exit 1; }
ls -l "$JAR_PATH"
'''
        }
      }
    }

    stage('Docker Build & Push') {
      environment {
        DOCKER_BUILDKIT = '1'
        COMPOSE_DOCKER_CLI_BUILD = '1'
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-hub-access-token',
                                          usernameVariable: 'DOCKER_USER',
                                          passwordVariable: 'DOCKER_PASS')]) {
          sh '''#!/bin/sh
set -euxo pipefail

: "${DOCKERHUB_REPO:?DOCKERHUB_REPO not set}"
: "${IMAGE_TAG_BASE:?IMAGE_TAG_BASE not set}"
: "${NEXT_COLOR:?NEXT_COLOR not set}"

echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

JAR_PATH=$(ls -1 build/libs/*.jar | head -n1)
[ -f "$JAR_PATH" ] || { echo "JAR not found under build/libs"; exit 1; }

IMAGE_BASE="${DOCKERHUB_REPO}:${IMAGE_TAG_BASE}"
if [ "${NEXT_COLOR}" = "green" ]; then OTHER_COLOR="blue"; else OTHER_COLOR="green"; fi

docker build --pull \
  --build-arg JAR_FILE="$JAR_PATH" \
  -t "${IMAGE_BASE}" \
  -f Dockerfile .

docker tag "${IMAGE_BASE}" "${IMAGE_BASE}-${NEXT_COLOR}"
docker tag "${IMAGE_BASE}" "${IMAGE_BASE}-${OTHER_COLOR}"

docker push "${IMAGE_BASE}"
docker push "${IMAGE_BASE}-${NEXT_COLOR}"
docker push "${IMAGE_BASE}-${OTHER_COLOR}"

echo "${IMAGE_BASE}-${NEXT_COLOR}" > image.tag
printf '%s\n' \
  "${IMAGE_BASE}" \
  "${IMAGE_BASE}-${NEXT_COLOR}" \
  "${IMAGE_BASE}-${OTHER_COLOR}" > image.tags

docker logout || true
'''
        }
      }
    }

    stage('Deploy NEXT (compose override + 강력 검증)') {
      steps {
        withCredentials([
          string(credentialsId: 'db_url',  variable: 'DB_URL'),
          usernamePassword(credentialsId: 'db_userpass', usernameVariable: 'DB_USER', passwordVariable: 'DB_PASS'),
          string(credentialsId: 'toss_secret_key', variable: 'TOSS_SECRET'),
          string(credentialsId: 'naver_geocode_client_id', variable: 'NAVER_ID'),
          string(credentialsId: 'naver_geocode_client_secret', variable: 'NAVER_SECRET')
        ]) {
          sh '''#!/bin/sh
    set -euxo pipefail

    TARGET="app-${NEXT_COLOR}"
    IMAGE="${DOCKERHUB_REPO}:${IMAGE_TAG_BASE}-${NEXT_COLOR}"
    OVERRIDE_FILE="${WORKSPACE}/override-${TARGET}.yml"

    # --- (0) Jenkins 변수 바이트 검증 (마스킹 출력) ---
    echo "[DEBUG] Byte-lengths (no secrets printed)"
    printf 'DB_URL bytes = ';   printf '%s' "$DB_URL"   | wc -c
    printf 'DB_USER bytes = ';  printf '%s' "$DB_USER"  | wc -c
    printf 'DB_PASS bytes = ';  printf '%s' "$DB_PASS"  | wc -c

    # --- (1) 따옴표만 이스케이프한 안전값 준비 ---
    escq() { printf '%s' "$1" | sed 's/"/\\"/g'; }
    DB_URL_S=$(escq "$DB_URL")
    DB_USER_S=$(escq "$DB_USER")
    DB_PASS_S=$(escq "$DB_PASS")
    TOSS_SECRET_S=$(escq "$TOSS_SECRET")
    NAVER_ID_S=$(escq "$NAVER_ID")
    NAVER_SECRET_S=$(escq "$NAVER_SECRET")
    IMAGE_S=$(escq "$IMAGE")

    # --- (2) 오버라이드 파일을 직접 작성 (변수 즉시 확장) ---
    cat > "${OVERRIDE_FILE}" <<EOF
    services:
      ${TARGET}:
        image: "${IMAGE_S}"
        environment:
          SPRING_DATASOURCE_URL: "${DB_URL_S}"
          SPRING_DATASOURCE_USERNAME: "${DB_USER_S}"
          SPRING_DATASOURCE_PASSWORD: "${DB_PASS_S}"
          SPRING_PROFILES_ACTIVE: "prod"
          TOSS_SECRET_KEY: "${TOSS_SECRET_S}"
          NAVER_MAP_CLIENT_ID: "${NAVER_ID_S}"
          NAVER_MAP_CLIENT_SECRET: "${NAVER_SECRET_S}"
        networks:
          - ${DOCKER_NETWORK}
    networks:
      ${DOCKER_NETWORK}:
        external: true
    EOF

    # --- (3) compose 머지 결과 확인 ---
    echo "[compose-config] merged service block for ${TARGET}"
    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" config | awk "/${TARGET}:/,/^[^[:space:]]/" || true

    # --- (4) 실제 배포 ---
    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" pull ${TARGET} || true
    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" up -d ${TARGET}

    # 컨테이너 존재/상태 출력
    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" ps
    docker ps --format '{{.Names}}' | grep -w "${TARGET}"

    # --- (5) 런타임 ENV 검증 ---
    # nounset으로 인한 미정의 변수 오류를 막기 위해 CID 구간만 잠시 해제
    set +u
    CID="$(docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" ps -q ${TARGET} 2>/dev/null || true)"
    : "${CID:=}"   # 비정의면 빈 값으로
    set -u

    if [ -z "${CID:-}" ]; then
      echo "Container for ${TARGET} not found after up -d"
      exit 1
    fi

    echo "[inspect-env] (names only, not values)"
    docker inspect "${CID}" --format '{{range .Config.Env}}{{println .}}{{end}}' \
     | grep -E '^SPRING_DATASOURCE_URL=|^SPRING_DATASOURCE_USERNAME=|^SPRING_DATASOURCE_PASSWORD=' \
     | sed 's/=.*/=<redacted>/' || true

    echo "[/proc/1/environ lengths]"
    docker exec -i "${CID}" sh -lc '
      getv(){ tr "\\0" "\\n" </proc/1/environ | awk -F= -v k="$1" "$0 ~ "^"k"=" {sub(/^[^=]*=/,""); print; exit}"; }
      plen(){ val="$(getv "$1")"; printf "%s bytes = " "$1"; printf "%s" "$val" | wc -c; }
      plen SPRING_DATASOURCE_URL
      plen SPRING_DATASOURCE_USERNAME
      plen SPRING_DATASOURCE_PASSWORD
    '

    # --- (6) 컨테이너 네임스페이스에서 DB TCP 연결 테스트 ---
    HOSTPORT=$(printf "%s" "$DB_URL" | sed -E 's#^jdbc:[a-zA-Z0-9]+://([^/]+)/.*#\\1#')
    HOST=${HOSTPORT%:*}
    PORT=${HOSTPORT#*:}
    [ "$HOST" = "$PORT" ] && PORT=3306
    echo "[TCP test] from container namespace (${TARGET}) -> $HOST:$PORT"
    docker run --rm --network "container:${TARGET}" busybox sh -lc "nc -vz -w2 $HOST $PORT || true"

    # (선택) 최근 로그 30줄
    docker logs --tail=30 ${TARGET} || true

    # --- (7) 민감 오버라이드 파일 삭제 ---
    shred -u "${OVERRIDE_FILE}" 2>/dev/null || rm -f "${OVERRIDE_FILE}"
    '''
        }
      }
    }

    stage('Healthcheck NEXT') {
      steps {
        sh '''#!/bin/sh
set -euxo pipefail
TARGET="app-${NEXT_COLOR}"

docker pull curlimages/curl:latest || true

SECONDS=0
until docker run --rm --network ${DOCKER_NETWORK} \
    -e TARGET="${TARGET}" curlimages/curl:latest \
    sh -c 'code=$(curl -s -o /dev/null -w "%{http_code}" http://$TARGET:8080/actuator/health); \
           if [ "$code" = 200 ]; then \
             curl -fsS http://$TARGET:8080/actuator/health | grep -q "\"status\":\"UP\""; \
           else \
             [ "$code" = 401 ]; \
           fi'; do
  if [ ${SECONDS} -ge ${HEALTH_TIMEOUT_SEC} ]; then
    echo "Healthcheck timeout for ${TARGET}"
    exit 1
  fi
  sleep 3
done
echo "NEXT ${NEXT_COLOR} is healthy (HTTP 200/UP or 401)"
'''
      }
    }

    stage('Switch Nginx → NEXT') {
      steps {
        script {
          try {
            sh '''#!/bin/sh
set -euxo pipefail

printf 'set $active_upstream app-%s:8080;\n' "${NEXT_COLOR}" > "${NGINX_ACTIVE_VAR}"
docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER}

docker pull curlimages/curl:latest || true
docker run --rm --network ${DOCKER_NETWORK} curlimages/curl:latest sh -lc '
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://'${NGINX_CONTAINER}'/actuator/health");
  if [ "$code" = "200" ]; then
    curl -fsS "http://'${NGINX_CONTAINER}'/actuator/health" | grep -q "\"status\":\"UP\"";
  else
    [ "$code" = "401" ];
  fi
'
'''
          } catch (err) {
            sh '''#!/bin/sh
set +e
echo "[SWITCH-ROLLBACK] revert to CURRENT"
printf 'set $active_upstream app-%s:8080;\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER} || true
'''
            error "Switchover verification failed → rolled back to ${env.CURRENT_COLOR}"
          }
        }
      }
    }

    stage('Drain & Stop PREV') {
      steps {
        sh '''#!/bin/sh
set -euxo pipefail
sleep 5
PREV="app-${CURRENT_COLOR}"
docker compose -f ${APP_DIR}/docker-compose.yml stop ${PREV} || true
docker compose -f ${APP_DIR}/docker-compose.yml rm -f ${PREV} || true
'''
      }
    }
  }

  post {
    success {
      echo "Switched to ${env.NEXT_COLOR} (${env.IMAGE_TAG_BASE}-${env.NEXT_COLOR})"
    }
    unsuccessful {
      script {
        sh '''#!/bin/sh
set +e
echo "[PIPELINE-ROLLBACK] revert Nginx to CURRENT & stop NEXT service"

printf 'set $active_upstream app-%s:8080;\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER} || true

docker compose -f ${APP_DIR}/docker-compose.yml stop app-${NEXT_COLOR}  || true
docker compose -f ${APP_DIR}/docker-compose.yml rm -f app-${NEXT_COLOR} || true

rm -f ${APP_DIR}/override-app-${NEXT_COLOR}.yml || true
rm -f ${APP_DIR}/override-app-${CURRENT_COLOR}.yml || true
'''
      }
    }
  }
}
