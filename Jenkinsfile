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

    // 컨테이너/네트워크 명
    NGINX_CONTAINER    = 'anpetna-nginx'
    DOCKER_NETWORK     = 'anpetna_net'

    // 헬스/버전 태그
    HEALTH_TIMEOUT_SEC = '180'
    IMAGE_TAG_BASE     = "v1.0.${env.BUILD_NUMBER}"   // color는 뒤에서 붙임
  }

  stages {

    stage('Preflight') {
      steps {
        sh '''
          set -euxo pipefail

          # 워커 컨테이너에서 경로 접근 가능한지(볼륨 마운트) 사전 점검
          test -f "${APP_DIR}/docker-compose.yml" || { echo "Missing ${APP_DIR}/docker-compose.yml (worker volume?)"; exit 1; }
          test -d "${NGINX_DIR}" || { echo "Missing ${NGINX_DIR} (worker volume?)"; exit 1; }

          # docker/compose 사용 가능 여부(권한 포함)
          docker version >/dev/null
          docker compose version >/dev/null

          docker network ls | grep -w "${DOCKER_NETWORK}" >/dev/null || docker network create ${DOCKER_NETWORK} || true

          # active-upstream.var 최초 생성 (없으면 app-blue로 시작)
          if [ ! -f "${NGINX_ACTIVE_VAR}" ]; then
            mkdir -p "$(dirname ${NGINX_ACTIVE_VAR})"
            printf 'set $active_upstream app-blue;\\n' > "${NGINX_ACTIVE_VAR}"
          fi

          # nginx 컨테이너 확인 + 네트워크 연결 보정
          docker ps --format '{{.Names}}' | grep -w "${NGINX_CONTAINER}" >/dev/null || { echo "Nginx container ${NGINX_CONTAINER} not running"; exit 1; }
          docker network inspect ${DOCKER_NETWORK} | grep -q '"Name": "'${NGINX_CONTAINER}'"' || \
            docker network connect ${DOCKER_NETWORK} ${NGINX_CONTAINER} || true
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

   # 워크스페이스 내 Gradle 캐시
   export GRADLE_USER_HOME="$WORKSPACE/.gradle-cache"
   mkdir -p "$GRADLE_USER_HOME"

   # 네트워크 타임아웃 여유 (🚨 EOF는 맨 앞열!)
   cat > "$GRADLE_USER_HOME/gradle.properties" <<'EOF'
   org.gradle.daemon=false
   org.gradle.console=plain
   systemProp.org.gradle.internal.http.connectionTimeout=120000
   systemProp.org.gradle.internal.http.socketTimeout=120000
   EOF

   test -f ./gradlew || { echo "gradlew not found"; exit 1; }
   chmod +x ./gradlew

   ./gradlew --no-daemon --max-workers=1 \
     -Dorg.gradle.workers.max=1 \
     -Dorg.gradle.jvmargs=-Xmx1536m \
     -Dfile.encoding=UTF-8 \
     --info --stacktrace --console=plain \
     clean bootJar -x test

   ls -l build/libs/*.jar
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
   # 반대 색상도 미리 태깅 (manifest unknown 예방)
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

   # 배포 스테이지 호환: NEXT 이미지 한 줄짜리 파일과 전체 목록 둘 다 남김
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

    stage('Deploy NEXT (compose override)') {
      steps {
        withCredentials([
          string(credentialsId: 'db_url',  variable: 'DB_URL'),
          usernamePassword(credentialsId: 'db_userpass', usernameVariable: 'DB_USER', passwordVariable: 'DB_PASS')
        ]) {
          sh '''
    set -euxo pipefail
    TARGET="app-${NEXT_COLOR}"

    # image.tag가 없더라도 계산해서 사용 가능
    if [ -f image.tag ]; then
      IMAGE=$(cat image.tag)
    else
      IMAGE="${DOCKERHUB_REPO}:${IMAGE_TAG_BASE}-${NEXT_COLOR}"
    fi

    OVERRIDE_FILE="${WORKSPACE}/override-${TARGET}.yml"
    cat > "${OVERRIDE_FILE}" <<EOF
    services:
      ${TARGET}:
        image: ${IMAGE}
        environment:
          SPRING_DATASOURCE_URL: "${DB_URL}"
          SPRING_DATASOURCE_USERNAME: "${DB_USER}"
          SPRING_DATASOURCE_PASSWORD: "${DB_PASS}"
          SPRING_PROFILES_ACTIVE: "prod"
        networks:
          - ${DOCKER_NETWORK}
    networks:
      ${DOCKER_NETWORK}:
        external: true
    EOF

    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" pull ${TARGET} || true
    docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" up -d ${TARGET}

    shred -u "${OVERRIDE_FILE}" 2>/dev/null || rm -f "${OVERRIDE_FILE}"

    docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}' | grep -E "${TARGET}"
    '''
        }
      }
    }

    stage('Healthcheck NEXT') {
      steps {
        sh '''
          set -euxo pipefail
          TARGET="app-${NEXT_COLOR}"

          docker pull curlimages/curl:latest || true

          SECONDS=0
          until docker run --rm --network ${DOCKER_NETWORK} curlimages/curl:latest \
                  curl -fsS "http://${TARGET}:8080/actuator/health" | grep -q '"status":"UP"'; do
            if [ ${SECONDS} -ge ${HEALTH_TIMEOUT_SEC} ]; then
              echo "Healthcheck timeout for ${TARGET}"
              exit 1
            fi
            sleep 3
          done
          echo "NEXT ${NEXT_COLOR} is healthy"
        '''
      }
    }

    stage('Switch Nginx → NEXT') {
      steps {
        script {
          try {
            sh '''
              set -euxo pipefail
              # NEXT로 전환
              printf 'set $active_upstream app-%s:8080;\\n' "${NEXT_COLOR}" > "${NGINX_ACTIVE_VAR}"
              docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER}

              # 전환 검증: Nginx(게이트웨이)를 통해 백엔드 헬스가 통과해야 성공
              docker pull curlimages/curl:latest || true
              docker run --rm --network ${DOCKER_NETWORK} curlimages/curl:latest \
                curl -fsS "http://${NGINX_CONTAINER}/actuator/health" | grep -q '"status":"UP"'
            '''
          } catch (err) {
            // 즉시 롤백
            sh '''
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
        sh '''
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
      echo "✅ Switched to ${env.NEXT_COLOR} (${env.IMAGE_TAG_BASE}-${env.NEXT_COLOR})"
    }
    unsuccessful {
      script {
        sh '''
          set +e
          echo "[PIPELINE-ROLLBACK] revert Nginx to CURRENT & stop NEXT service"

          # 1) 라우팅 복구
          printf 'set $active_upstream app-%s:8080;\\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
          docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER} || true

          # 2) NEXT 서비스 중지/정리
          docker compose -f ${APP_DIR}/docker-compose.yml stop app-${NEXT_COLOR}  || true
          docker compose -f ${APP_DIR}/docker-compose.yml rm -f app-${NEXT_COLOR} || true

          # 3) (선택) 오버라이드 파일 치우기
          rm -f ${APP_DIR}/override-app-${NEXT_COLOR}.yml || true
          rm -f ${APP_DIR}/override-app-${CURRENT_COLOR}.yml || true
        '''
      }
    }
  }
}
