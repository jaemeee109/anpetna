pipeline {
  agent { label 'worker-1' }

  triggers { githubPush() }
  
  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
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

    // 추가: 프론트 퍼블릭 오리진 (요구사항 반영)
    FRONT_ORIGIN       = 'http://43.201.177.220:3000'
  }

  stages {

    stage('Workspace Cleanup') {
      steps { deleteDir() }
    }

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
          string(credentialsId: 'naver_geocode_client_secret', variable: 'NAVER_SECRET'),

          // --- [추가] MinIO 크리덴셜 3종 바인딩 ---
          string(credentialsId: 'MINIO_URL',    variable: 'MINIO_URL'),
          string(credentialsId: 'MINIO_BUCKET', variable: 'MINIO_BUCKET'),
          usernamePassword(credentialsId: 'MINIO_CRED',
                           usernameVariable: 'MINIO_ACCESS_KEY',
                           passwordVariable: 'MINIO_SECRET_KEY')
          // --------------------------------------
        ]) {
          sh '''#!/bin/sh
    set -euxo pipefail

    # sanitize & fallback for NEXT_COLOR
    NEXT_COLOR="$(printf '%s' "${NEXT_COLOR-}" | tr -d '\\r' | xargs || true)"
    echo "[DEBUG] NEXT_COLOR(raw)=${NEXT_COLOR-}"
    if [ -z "${NEXT_COLOR}" ]; then
      if [ -f "${NGINX_ACTIVE_VAR}" ]; then
        ACTIVE=$(grep -oE 'app-(blue|green)' "${NGINX_ACTIVE_VAR}" | tail -n1 | cut -d'-' -f2 || true)
        case "$ACTIVE" in
          blue)  NEXT_COLOR=green ;;
          green) NEXT_COLOR=blue  ;;
          *)     NEXT_COLOR=green ;;
        esac
        echo "[DEBUG] NEXT_COLOR(fallback from nginx)=${NEXT_COLOR}"
      else
        NEXT_COLOR=green
        echo "[DEBUG] NEXT_COLOR(fallback default)=${NEXT_COLOR}"
      fi
    fi
    TARGET="app-${NEXT_COLOR}"
    echo "[DEBUG] TARGET=${TARGET}"

    echo "STEP[0] ========== setup vars =========="

    test -f image.tag || { echo "image.tag missing"; exit 1; }
    IMAGE="$(tr -d '\\r' < image.tag | xargs)"
    echo "[DEBUG] IMAGE=${IMAGE}"
    OVERRIDE_FILE="${WORKSPACE}/override-${TARGET}.yml"

    # 필수값 확인
    require(){ v="$1"; n="$2"; if [ -z "$v" ]; then echo "ERROR: $n is required"; exit 1; fi; }
    require "${APP_DIR-}"        "APP_DIR"
    require "${DOCKER_NETWORK-}" "DOCKER_NETWORK"
    require "${DOCKERHUB_REPO-}" "DOCKERHUB_REPO"
    require "${NEXT_COLOR-}"     "NEXT_COLOR"
    require "${DB_URL-}"         "DB_URL"
    require "${DB_USER-}"        "DB_USER"
    require "${DB_PASS-}"        "DB_PASS"

    # --- [추가] MinIO 필수값 체크 ---
    require "${MINIO_URL-}"         "MINIO_URL"
    require "${MINIO_ACCESS_KEY-}"  "MINIO_ACCESS_KEY"
    require "${MINIO_SECRET_KEY-}"  "MINIO_SECRET_KEY"
    require "${MINIO_BUCKET-}"      "MINIO_BUCKET"
    # --------------------------------

    # FRONT_ORIGIN 은 선택값
    FRONT_ORIGIN="${FRONT_ORIGIN-}"

    echo "STEP[1] ========== secret length debug =========="
    echo "[DEBUG] Byte-lengths (no secrets printed)"
    printf 'DB_URL bytes = ';   printf '%s' "$DB_URL"   | wc -c
    printf 'DB_USER bytes = ';  printf '%s' "$DB_USER"  | wc -c
    printf 'DB_PASS bytes = ';  printf '%s' "$DB_PASS"  | wc -c
    # --- [참고] MinIO도 길이만 출력(값은 마스킹) ---
    printf 'MINIO_URL bytes = ';        printf '%s' "$MINIO_URL"        | wc -c
    printf 'MINIO_ACCESS_KEY bytes = '; printf '%s' "$MINIO_ACCESS_KEY" | wc -c
    printf 'MINIO_SECRET_KEY bytes = '; printf '%s' "$MINIO_SECRET_KEY" | wc -c
    printf 'MINIO_BUCKET bytes = ';     printf '%s' "$MINIO_BUCKET"     | wc -c

    echo "STEP[2] ========== write override (printf-safe) =========="
    # 값 escape
    escq(){ printf '%s' "${1-}" | sed 's/"/\\"/g'; }
    DB_URL_S=$(escq "$DB_URL"); DB_USER_S=$(escq "$DB_USER"); DB_PASS_S=$(escq "$DB_PASS")
    TOSS_SECRET_S=$(escq "${TOSS_SECRET-}"); NAVER_ID_S=$(escq "${NAVER_ID-}"); NAVER_SECRET_S=$(escq "${NAVER_SECRET-}")
    IMAGE_S=$(escq "$IMAGE"); FRONT_ORIGIN_S=$(escq "$FRONT_ORIGIN")

    # --- [추가] MinIO 값 이스케이프 ---
    MINIO_URL_S=$(escq "$MINIO_URL")
    MINIO_ACCESS_KEY_S=$(escq "$MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY_S=$(escq "$MINIO_SECRET_KEY")
    MINIO_BUCKET_S=$(escq "$MINIO_BUCKET")
    # -----------------------------------

    # 파일 생성(printf로 안전하게 작성)
    : > "${OVERRIDE_FILE}"
    printf 'services:\\n' >> "${OVERRIDE_FILE}"
    printf '  %s:\\n' "${TARGET}" >> "${OVERRIDE_FILE}"
    printf '    image: "%s"\\n' "${IMAGE_S}" >> "${OVERRIDE_FILE}"
    printf '    container_name: %s\\n' "${TARGET}" >> "${OVERRIDE_FILE}"
    printf '    environment:\\n' >> "${OVERRIDE_FILE}"
    printf '      SPRING_DATASOURCE_URL: "%s"\\n' "${DB_URL_S}" >> "${OVERRIDE_FILE}"
    printf '      SPRING_DATASOURCE_USERNAME: "%s"\\n' "${DB_USER_S}" >> "${OVERRIDE_FILE}"
    printf '      SPRING_DATASOURCE_PASSWORD: "%s"\\n' "${DB_PASS_S}" >> "${OVERRIDE_FILE}"
    printf '      SPRING_PROFILES_ACTIVE: "prod"\\n' >> "${OVERRIDE_FILE}"
    printf '      SERVER_ADDRESS: "0.0.0.0"\\n' >> "${OVERRIDE_FILE}"
    printf '      TOSS_SECRET_KEY: "%s"\\n' "${TOSS_SECRET_S}" >> "${OVERRIDE_FILE}"
    printf '      NAVER_GEOCODE_CLIENT_ID: "%s"\\n' "${NAVER_ID_S}" >> "${OVERRIDE_FILE}"
    printf '      NAVER_GEOCODE_CLIENT_SECRET: "%s"\\n' "${NAVER_SECRET_S}" >> "${OVERRIDE_FILE}"
    if [ -n "$FRONT_ORIGIN" ]; then
      printf '      FRONT_API_URL: "%s"\\n' "${FRONT_ORIGIN_S}" >> "${OVERRIDE_FILE}"
    fi

    # --- [추가] MinIO 4종 환경변수 주입 ---
    printf '      MINIO_URL: "%s"\\n'          "${MINIO_URL_S}"          >> "${OVERRIDE_FILE}"
    printf '      MINIO_ACCESS_KEY: "%s"\\n'   "${MINIO_ACCESS_KEY_S}"   >> "${OVERRIDE_FILE}"
    printf '      MINIO_SECRET_KEY: "%s"\\n'   "${MINIO_SECRET_KEY_S}"   >> "${OVERRIDE_FILE}"
    printf '      MINIO_BUCKET: "%s"\\n'       "${MINIO_BUCKET_S}"       >> "${OVERRIDE_FILE}"
    # -------------------------------------

    printf '    networks:\\n' >> "${OVERRIDE_FILE}"
    printf '      - %s\\n' "${DOCKER_NETWORK}" >> "${OVERRIDE_FILE}"
    printf 'networks:\\n' >> "${OVERRIDE_FILE}"
    printf '  %s:\\n' "${DOCKER_NETWORK}" >> "${OVERRIDE_FILE}"
    printf '    external: true\\n' >> "${OVERRIDE_FILE}"

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
    CID="$(docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" ps -q "${TARGET}" 2>/dev/null || true)"
    : "${CID:=}"
    if [ -z "$CID" ]; then
      echo "ERROR: ${TARGET} not found after up -d"
      docker compose -f "${APP_DIR}/docker-compose.yml" -f "${OVERRIDE_FILE}" ps || true
      docker logs --tail=200 "${TARGET}" || true
      rm -f "${OVERRIDE_FILE}"
      exit 1
    fi
    echo "[INFO] ${TARGET} CID=${CID}"

    echo "STEP[7] ========== env keys (masked) =========="
    docker inspect "${CID}" --format '{{range .Config.Env}}{{println .}}{{end}}' \
      | grep -E '^SPRING_DATASOURCE_URL=|^SPRING_DATASOURCE_USERNAME=|^SPRING_DATASOURCE_PASSWORD=|^FRONT_API_URL=|^MINIO_URL=|^MINIO_BUCKET=' \
      | sed 's/=.*/=<redacted>/' || true

    echo "STEP[8] ========== DB TCP test =========="
    # DB_URL에서 host:port 뽑기(미매치 시 스킵)
    HOSTPORT="$(printf '%s' "$DB_URL" | sed -nE 's#^jdbc:[a-zA-Z0-9]+://([^/]+)/.*#\\1#p')"
    HOST="${HOSTPORT%:*}"; PORT="${HOSTPORT#*:}"
    [ "$HOST" = "$PORT" ] && PORT=3306
    if [ -n "${HOSTPORT}" ] && [ -n "${HOST}" ]; then
      echo "[TCP test] ${TARGET} -> $HOST:$PORT"
      docker run --rm --network "container:${TARGET}" busybox sh -lc "nc -vz -w3 $HOST $PORT || true"
    else
      echo "[WARN] could not parse DB_URL host:port → skip TCP test"
    fi

    echo "STEP[9] ========== last logs (tail) =========="
    docker logs --tail=60 "${TARGET}" || true

    echo "STEP[9.1] ========== forbid management/server address in Env/Cmd =========="
    FORBIDDEN_ENV=$(docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' \
      | grep -Ei '^SPRING_APPLICATION_JSON=.*(management[.]server[.]address|server[.]address)' || true)

    if [ -n "$FORBIDDEN_ENV" ]; then
      echo "[ERROR] Forbidden management/server address related env detected:"
      echo "$FORBIDDEN_ENV"
      exit 1
    fi

    FORBIDDEN_CMD=$(docker inspect -f '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' "$CID" \
      | grep -E -- '--management[.]server[.]address=|--server[.]address=' || true)
    if [ -n "$FORBIDDEN_CMD" ]; then
      echo "[ERROR] Forbidden flags in CMD/Entrypoint:"
      echo "$FORBIDDEN_CMD"
      exit 1
    fi

    echo "STEP[10] ========== cleanup =========="
    rm -f "${OVERRIDE_FILE}"
    echo "STEP[DONE] =========="
    '''
        }
      }
    }

    stage('Healthcheck NEXT') {
      steps {
        sh '''#!/bin/sh
    set -Eeuo pipefail

    TARGET="app-${NEXT_COLOR}"
    TARGET="$(printf '%s' "${TARGET}" | tr -d '\\r' | xargs)"
    echo "[health] TARGET=${TARGET}"
    [ -n "${TARGET}" ] || { echo "[health] TARGET empty"; exit 1; }

    # (A0) docker health 우선 대기
    echo "[health] wait container health=healthy"
    t=0
    while :; do
      st=$(docker inspect -f '{{.State.Health.Status}}' "${TARGET}" 2>/dev/null || echo "unknown")
      echo "  state=$st (t=${t}s)"
      [ "$st" = "healthy" ] && echo "[health] container says healthy" && break
      [ $t -ge 240 ] && echo "[health] container health timeout" && break
      sleep 3; t=$((t+3))
    done

    # 컨테이너 존재 확인 (최대 60s)
    t=0
    while [ $t -lt 60 ]; do
      docker ps --format '{{.Names}}' | grep -qx "${TARGET}" && break || true
      sleep 2; t=$((t+2))
    done
    if ! docker ps --format '{{.Names}}' | grep -qx "${TARGET}" >/dev/null 2>&1; then
      echo "[health] ${TARGET} not found"
      docker compose -f "${APP_DIR}/docker-compose.yml" ps || true
      docker ps -a || true
      exit 1
    fi

    # (A) 컨테이너 내부: 필수 게이트
    echo "[health] in-container warmup (localhost v4/v6 + listen check)"
    A_OK=0
    set +e
    docker exec "${TARGET}" sh -lc '
      for i in $(seq 1 120); do
        # 1) LISTEN 여부
        if command -v ss >/dev/null 2>&1; then
          ss -lntp | grep -E ":8080\\b" >/dev/null && echo "  [ss] listen ok" && exit 0 || true
        elif command -v netstat >/dev/null 2>&1; then
          netstat -lntp 2>/dev/null | grep -E ":8080\\b" >/dev/null && echo "  [netstat] listen ok" && exit 0 || true
        fi
        # 2) curl localhost (IPv4/IPv6)
        c4=$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/actuator/health || true)
        [ "$c4" = "200" ] && echo "  [curl v4] 200" && exit 0
        c6=$(curl -g -sS -o /dev/null -w "%{http_code}" "http://[::1]:8080/actuator/health" || true)
        [ "$c6" = "200" ] && echo "  [curl v6] 200" && exit 0
        echo "  wait.. (#$i) v4=$c4 v6=$c6"
        sleep 2
      done
      echo "  [A] warmup TIMEOUT"; exit 2
    '
    A_RC=$?
    set -e
    if [ $A_RC -eq 0 ]; then
      echo "[health][A] OK"
      A_OK=1
    else
      echo "[health][A] FAIL (rc=$A_RC)"
    fi

    # (B) 도커 네트워크 경유: 비차단 참고 체크
    echo "[health] network check via ${DOCKER_NETWORK} (non-blocking)"
    B_OK=0
    end=$(( $(date +%s) + 180 ))
    while [ "$(date +%s)" -lt "$end" ]; do
      set +e
      docker run --rm --network "${DOCKER_NETWORK}" \
        -e TARGET="${TARGET}" curlimages/curl:latest sh -lc '
          url="http://$TARGET:8080/actuator/health";
          code=$(curl -sS -o /tmp/body -w "%{http_code}" "$url" || true);
          if [ "$code" = "200" ]; then
            grep -q "\"status\":\"UP\"" /tmp/body && echo ok;
          elif [ "$code" = "401" ] || [ "$code" = "302" ]; then
            echo ok;
          fi
        ' | grep -qx ok
      rc=$?
      set -e
      if [ $rc -eq 0 ]; then
        echo "[health][B] OK"
        B_OK=1
        break
      fi
      sleep 3
    done
    [ $B_OK -eq 1 ] || echo "[health][B] not confirmed (this is non-blocking)"

    # (C) 판정
    if [ $A_OK -ne 1 ]; then
      echo "[health] FAIL: app is not ready (A gate)"
      # 디버깅 덤프
      docker logs --tail=200 "${TARGET}" || true
      docker exec "${TARGET}" sh -lc '
        echo "[ps]"; ps -ef | grep -i "java\\|app.jar" | grep -v grep || true
        echo "[listen]"; (ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true) | cat
        echo "[env: SERVER/MANAGEMENT]"; env | grep -E "SERVER_ADDRESS|MANAGEMENT_SERVER|SPRING_APPLICATION_JSON" || true
      ' || true
      exit 1
    fi

    # (D) 성공 종료
    echo "[health] PASSED (A=required ok, B=non-blocking ${B_OK})"
    exit 0
    '''
      }
    }

    stage('Switch Nginx → NEXT') {
      steps {
        script {
          try {
            sh '''#!/bin/sh
    set -euo pipefail

    # 업스트림 전환
    printf 'set $active_upstream app-%s:8080;\\n' "${NEXT_COLOR}" > "${NGINX_ACTIVE_VAR}"

    # nginx reload (2회까지 재시도)
    if ! docker exec "${NGINX_CONTAINER}" nginx -s reload; then
      echo "[switch] reload failed → restarting container"
      docker restart "${NGINX_CONTAINER}" >/dev/null
    fi

    # 업스트림 응답 검증 (재시도)
    docker pull curlimages/curl:latest >/dev/null 2>&1 || true
    end=$(( $(date +%s) + 60 ))
    ok=0
    while [ "$(date +%s)" -lt "$end" ]; do
      set +e
      code=$(docker run --rm --network "${DOCKER_NETWORK}" curlimages/curl:latest \
               curl -s -o /tmp/body -w "%{http_code}" "http://${NGINX_CONTAINER}/actuator/health" || true)
      body=$(docker run --rm --network "${DOCKER_NETWORK}" curlimages/curl:latest \
               sh -lc 'curl -s "http://'${NGINX_CONTAINER}'/actuator/health" || true')
      set -e

      if [ "$code" = "200" ]; then
        printf "%s" "$body" | grep -q '"status":"UP"' && ok=1 && break || true
      elif [ "$code" = "401" ] || [ "$code" = "302" ]; then
        ok=1; break
      fi
      sleep 2
    done

    [ $ok -eq 1 ] && echo "[switch] verification OK" && exit 0
    echo "[switch] verification FAILED"
    exit 2
    '''
          } catch (err) {
            // 자동 롤백
            sh '''#!/bin/sh
    set +e
    echo "[SWITCH-ROLLBACK] revert to CURRENT"
    printf 'set $active_upstream app-%s:8080;\\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
    docker exec "${NGINX_CONTAINER}" nginx -s reload || docker restart "${NGINX_CONTAINER}" || true
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