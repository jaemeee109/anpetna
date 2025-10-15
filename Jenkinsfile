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

    // ⬇️ 추가: 프론트 퍼블릭 오리진 (요구사항 반영)
    FRONT_ORIGIN       = 'http://43.201.177.220'
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
  printf 'set $active_upstream app-blue:8080;\\n' > "${NGINX_ACTIVE_VAR}"
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

printf '%s\\n' \
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
printf '%s\\n' \
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
set -e -o pipefail

echo "STEP[0] ========== setup vars =========="
TARGET="app-${NEXT_COLOR}"
IMAGE="${DOCKERHUB_REPO}:${IMAGE_TAG_BASE}-${NEXT_COLOR}"
OVERRIDE_FILE="${WORKSPACE}/override-${TARGET}.yml"

# 필수값 확인
require(){ v="$1"; n="$2"; if [ -z "$v" ]; then echo "ERROR: $n is required"; exit 1; fi; }
require "${APP_DIR-}"        "APP_DIR"
require "${DOCKER_NETWORK-}" "DOCKER_NETWORK"
require "${DOCKERHUB_REPO-}" "DOCKERHUB_REPO"
require "${IMAGE_TAG_BASE-}" "IMAGE_TAG_BASE"
require "${NEXT_COLOR-}"     "NEXT_COLOR"
require "${DB_URL-}"         "DB_URL"
require "${DB_USER-}"        "DB_USER"
require "${DB_PASS-}"        "DB_PASS"
require "${FRONT_ORIGIN-}"   "FRONT_ORIGIN"   # ⬅️ 추가: 프론트 오리진 필수

echo "STEP[1] ========== secret length debug =========="
echo "[DEBUG] Byte-lengths (no secrets printed)"
printf 'DB_URL bytes = ';   printf '%s' "$DB_URL"   | wc -c
printf 'DB_USER bytes = ';  printf '%s' "$DB_USER"  | wc -c
printf 'DB_PASS bytes = ';  printf '%s' "$DB_PASS"  | wc -c

echo "STEP[2] ========== escape & write override =========="
escq(){ printf '%s' "${1-}" | sed 's/"/\\"/g'; }
DB_URL_S=$(escq "$DB_URL")
DB_USER_S=$(escq "$DB_USER")
DB_PASS_S=$(escq "$DB_PASS")
TOSS_SECRET_S=$(escq "${TOSS_SECRET-}")
NAVER_ID_S=$(escq "${NAVER_ID-}")
NAVER_SECRET_S=$(escq "${NAVER_SECRET-}")
IMAGE_S=$(escq "$IMAGE")
FRONT_ORIGIN_S=$(escq "$FRONT_ORIGIN")

cat > "${OVERRIDE_FILE}" <<EOF
services:
  ${TARGET}:
    image: "${IMAGE_S}"
    container_name: ${TARGET}
    environment:
      SPRING_DATASOURCE_URL: "${DB_URL_S}"
      SPRING_DATASOURCE_USERNAME: "${DB_USER_S}"
      SPRING_DATASOURCE_PASSWORD: "${DB_PASS_S}"
      SPRING_PROFILES_ACTIVE: "prod"
      TOSS_SECRET_KEY: "${TOSS_SECRET_S}"
      NAVER_MAP_CLIENT_ID: "${NAVER_ID_S}"
      NAVER_MAP_CLIENT_SECRET: "${NAVER_SECRET_S}"
      # ⬇️ 추가: 프론트에서 호출할 백엔드 오리진
      FRONT_API_URL: "${FRONT_ORIGIN_S}"
    networks:
      - ${DOCKER_NETWORK}
networks:
  ${DOCKER_NETWORK}:
    external: true
EOF

echo "STEP[3] ========== merged config (non-blocking) =========="
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" config \
  | awk "/${TARGET}:/,/^[^[:space:]]/" || true

echo "STEP[4] ========== compose up -d ${TARGET} =========="
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" pull "${TARGET}" || true
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" up -d "${TARGET}"

echo "STEP[5] ========== ps snapshot =========="
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" ps || true
docker ps -a --format 'table {{.Names}}\\t{{.Status}}\\t{{.Image}}' | grep -E 'app-(blue|green)' || true

echo "STEP[6] ========== resolve CID =========="
CID="$(docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" ps -q "${TARGET}" || true)"
if [ -z "$CID" ]; then
  echo "ERROR: ${TARGET} not found after up -d"
  docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" ps || true
  docker logs --tail=200 "${TARGET}" || true
  shred -u "${OVERRIDE_FILE}" 2>/dev/null || rm -f "${OVERRIDE_FILE}"
  exit 1
fi
echo "[INFO] ${TARGET} CID=${CID}"

echo "STEP[7] ========== env keys (masked) =========="
docker inspect "${CID}" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^SPRING_DATASOURCE_URL=|^SPRING_DATASOURCE_USERNAME=|^SPRING_DATASOURCE_PASSWORD=|^FRONT_API_URL=' \
  | sed 's/=.*/=<redacted>/' || true

echo "STEP[8] ========== DB TCP test =========="
HOSTPORT=$(printf "%s" "$DB_URL" | sed -E 's#^jdbc:[a-zA-Z0-9]+://([^/]+)/.*#\\1#')
HOST=${HOSTPORT%:*}; PORT=${HOSTPORT#*:}; [ "$HOST" = "$PORT" ] && PORT=3306
echo "[TCP test] ${TARGET} -> $HOST:$PORT"
docker run --rm --network "container:${TARGET}" busybox sh -lc "nc -vz -w3 $HOST $PORT || true"

echo "STEP[9] ========== last logs (tail) =========="
docker logs --tail=60 "${TARGET}" || true

# ⬇️ 추가: 금지 가드 — 관리/서버 bind 옵션 주입 여부 차단
echo "STEP[9.1] ========== forbid management/server address in Env/Cmd =========="
FORBIDDEN_ENV=$(docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -Ei 'management\\.server\\.address|^MANAGEMENT_SERVER_ADDRESS=|^SERVER_ADDRESS=|SPRING_APPLICATION_JSON' || true)
if [ -n "$FORBIDDEN_ENV" ]; then
  echo "[ERROR] Forbidden management/server address related env detected:"
  echo "$FORBIDDEN_ENV"
  exit 1
fi
FORBIDDEN_CMD=$(docker inspect -f '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' "$CID" \
  | grep -E -- '--management\\.server\\.address=|--server\\.address=' || true)
if [ -n "$FORBIDDEN_CMD" ]; then
  echo "[ERROR] Forbidden flags in CMD/Entrypoint:"
  echo "$FORBIDDEN_CMD"
  exit 1
fi

echo "STEP[10] ========== cleanup =========="
shred -u "${OVERRIDE_FILE}" 2>/dev/null || rm -f "${OVERRIDE_FILE}"
echo "STEP[DONE] =========="
'''
        }
      }
    }

    stage('Healthcheck NEXT') {
      steps {
        sh '''#!/bin/sh
set -e

TARGET="app-${NEXT_COLOR}"
echo "[health] TARGET=${TARGET}"

# 0) 먼저 컨테이너 존재 확인(최대 60초 대기)
t=0
while [ $t -lt 60 ]; do
  if docker ps --format '{{.Names}}' | grep -qx "${TARGET}"; then
    break
  fi
  sleep 2; t=$((t+2))
done

if ! docker ps --format '{{.Names}}' | grep -qx "${TARGET}"; then
  echo "[health] ${TARGET} container not found"
  docker ps -a || true
  exit 1
fi

# 스냅샷
docker ps -a --format 'table {{.Names}}\\t{{.Status}}\\t{{.Image}}' | grep -E 'app-(blue|green)' || true
docker inspect -f '{{json .NetworkSettings.Networks}}' "${TARGET}" || true

# 1) 네트워크에서 1회 찍어보기(코드+바디 일부)
docker pull curlimages/curl:latest >/dev/null
docker run --rm --network "${DOCKER_NETWORK}" curlimages/curl:latest sh -lc '
  set -e
  url="http://'"$TARGET"':8080/actuator/health"
  code=$(curl -sS -o /tmp/body -w "%{http_code}" "$url" || true)
  head -c 200 /tmp/body || true; echo
  echo "[health] first-shot code=$code"
' || true

# 2) 재시도 (변수 사용) ⬇️
TIMEOUT=${HEALTH_TIMEOUT_SEC:-180}
SECONDS=0
until [ $SECONDS -ge $TIMEOUT ]; do
  ok=$(docker run --rm --network "${DOCKER_NETWORK}" -e TARGET="${TARGET}" curlimages/curl:latest sh -lc '
    url="http://$TARGET:8080/actuator/health";
    code=$(curl -sS -o /tmp/body -w "%{http_code}" "$url" || true);
    if [ "$code" = "200" ]; then
      grep -q "\"status\":\"UP\"" /tmp/body && echo ok;
    elif [ "$code" = "401" ] || [ "$code" = "302" ]; then
      echo ok;
    fi
  ')
  [ "$ok" = "ok" ] && echo "[health] OK" && exit 0
  sleep 3
done

echo "[health] TIMEOUT (${TIMEOUT}s)"
exit 1
'''
      }
    }

    stage('Switch Nginx → NEXT') {
      steps {
        script {
          try {
            sh '''#!/bin/sh
set -euxo pipefail

printf 'set $active_upstream app-%s:8080;\\n' "${NEXT_COLOR}" > "${NGINX_ACTIVE_VAR}"
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
printf 'set $active_upstream app-%s:8080;\\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
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

printf 'set $active_upstream app-%s:8080;\\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER} || true

docker compose -f ${APP_DIR}/docker-compose.yml stop app-${NEXT_COLOR}  || true
docker compose -f ${APP_DIR}/docker-compose.yml rm -f app-${NEXT_COLOR} || true

# 워크스페이스 임시 파일 정리만 수행 (APP_DIR 쪽 override는 생성하지 않으므로 방어적으로만 유지)
rm -f ${APP_DIR}/override-app-${NEXT_COLOR}.yml || true
rm -f ${APP_DIR}/override-app-${CURRENT_COLOR}.yml || true
'''
      }
    }
  }
}