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
     steps {
       sh '''
         set -euxo pipefail

         # Java 경로 확정 (inbound-agent 이미지 기준)
         export JAVA_HOME=/opt/java/openjdk
         export PATH="$JAVA_HOME/bin:$PATH"

         # Gradle Wrapper 존재/실행 가능 확인
         test -f ./gradlew || { echo "gradlew not found"; exit 1; }
         chmod +x ./gradlew

         # 빌드 (워커 1개, 테스트 스킵)
         ./gradlew --no-daemon --max-workers=1 \
           -Dorg.gradle.workers.max=1 \
           -Dorg.gradle.jvmargs=-Xmx1024m \
           -Dfile.encoding=UTF-8 \
           clean bootJar -x test

         # 산출물 검증
         ls -l build/libs/*.jar || { echo "JAR not found under build/libs"; exit 1; }
       '''
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
          sh '''
            set -euxo pipefail
            echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

            JAR_PATH=$(ls -1 build/libs/*.jar | head -n1)
            [ -f "$JAR_PATH" ] || (echo "JAR not found under build/libs"; exit 1)

            # NEXT 색상 태그
            IMAGE="${DOCKERHUB_REPO}:${IMAGE_TAG_BASE}-${NEXT_COLOR}"

            docker build --pull \
              --build-arg JAR_FILE="$JAR_PATH" \
              -t "$IMAGE" \
              -f Dockerfile .

            docker push "$IMAGE"
            docker logout || true

            echo "$IMAGE" > image.tag
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
            IMAGE=$(cat image.tag)
            TARGET="app-${NEXT_COLOR}"

            export DOCKERHUB_REPO="${DOCKERHUB_REPO}"
            export IMAGE_TAG="${IMAGE_TAG}"

            # 민감정보가 남지 않도록 override 파일은 워크스페이스(에이전트 디렉토리)에 임시 생성 후 사용/삭제
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

            # 항상 최신 이미지로 갱신 후 기동
            docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" pull ${TARGET} || true
            docker compose -f ${APP_DIR}/docker-compose.yml -f "${OVERRIDE_FILE}" up -d ${TARGET}

            # 임시 파일 즉시 삭제(로그에 값은 마스킹 처리됨)
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
        sh '''
          set -euxo pipefail
          printf 'set $active_upstream app-%s;\\n' "${NEXT_COLOR}" > "${NGINX_ACTIVE_VAR}"
          docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER}
        '''
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
    failure {
      script {
        sh '''
          set +e
          echo "[ROLLBACK] Switching Nginx back to CURRENT"
          printf 'set $active_upstream app-%s;\\n' "${CURRENT_COLOR}" > "${NGINX_ACTIVE_VAR}" || true
          docker exec ${NGINX_CONTAINER} nginx -s reload || true
          docker compose -f ${APP_DIR}/docker-compose.yml stop app-${NEXT_COLOR} || true
        '''
      }
    }
    always {
      // 워크스페이스에 override 파일이 남았을 가능성에 대비(더블 세이프티)
      sh 'rm -f "${WORKSPACE}"/override-app-*.yml || true'
    }
  }
}
