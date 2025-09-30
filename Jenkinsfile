pipeline {
  agent { label 'worker-1' }

  options {
    timestamps()
    ansiColor('xterm')        // AnsiColor 플러그인 없으면 이 줄만 주석처리
    disableConcurrentBuilds()
  }

  environment {
    // ── Git/Deploy 기본값
    GIT_REPO           = 'https://github.com/jaemeee109/anpetna.git'
    BRANCH             = 'MASTER'                       // 실제 브랜치명(대/소문자 정확히)
    DOCKERHUB_REPO     = 'rayoh95/anpetna'

    // ── 서버 경로(워커 컨테이너에 볼륨 마운트되어 있어야 함)
    APP_DIR            = '/opt/anpetna/app'
    NGINX_DIR          = '/opt/anpetna/nginx'
    NGINX_ACTIVE_VAR   = '/opt/anpetna/nginx/conf.d/active-upstream.var'

    // ── 컨테이너/네트워크 명
    NGINX_CONTAINER    = 'anpetna-nginx'                // 실제 nginx 컨테이너명으로 맞춰주세요
    DOCKER_NETWORK     = 'anpetna_net'

    // ── 헬스/버전 태그
    HEALTH_TIMEOUT_SEC = '180'
    IMAGE_TAG_BASE     = "v1.0.${env.BUILD_NUMBER}"     // color는 뒤에서 붙임(-blue/-green)
  }

  stages {

    stage('Preflight') {
      steps {
        sh '''
          set -euxo pipefail

          # 워커 컨테이너에서 경로 접근 가능한지(볼륨 마운트) 사전 점검
          test -f "${APP_DIR}/docker-compose.yml" || { echo "Missing ${APP_DIR}/docker-compose.yml (worker volume?)"; exit 1; }
          test -d "${NGINX_DIR}" || { echo "Missing ${NGINX_DIR} (worker volume?)"; exit 1; }

          # 네트워크 없으면 생성 (external 네트워크면 이미 존재할 수도 있음)
          docker network ls | grep -w "${DOCKER_NETWORK}" >/dev/null || docker network create ${DOCKER_NETWORK} || true

          # active-upstream.var 최초 생성 (없으면 app-blue로 시작)
          if [ ! -f "${NGINX_ACTIVE_VAR}" ]; then
            mkdir -p "$(dirname ${NGINX_ACTIVE_VAR})"
            printf 'set $active_upstream app-blue;\\n' > "${NGINX_ACTIVE_VAR}"
          fi

          # nginx 컨테이너가 살아있는지 점검
          docker ps --format '{{.Names}}' | grep -w "${NGINX_CONTAINER}" >/dev/null || {
            echo "Nginx container ${NGINX_CONTAINER} not running"; exit 1;
          }
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
          // compose 기본 파일의 ${IMAGE_TAG}를 안전하게 채워주기 위해 base만 세팅(override가 최종 반영)
          env.IMAGE_TAG     = env.IMAGE_TAG_BASE
          echo "CURRENT=${env.CURRENT_COLOR}, NEXT=${env.NEXT_COLOR}, IMAGE_TAG_BASE=${env.IMAGE_TAG_BASE}"
        }
      }
    }

    stage('Build (Gradle)') {
      steps {
        sh '''
          set -euxo pipefail
          chmod +x ./gradlew || true
          ./gradlew clean bootJar -x test

          # 산출물 확인
          ls -l build/libs/*.jar
        '''
      }
    }

    stage('Docker Build & Push') {
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

            docker build \
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
        // DB/시크릿은 Jenkins Credentials에서 주입
        withCredentials([
          string(credentialsId: 'db_url',  variable: 'DB_URL'),
          usernamePassword(credentialsId: 'db_userpass', usernameVariable: 'DB_USER', passwordVariable: 'DB_PASS')
        ]) {
          sh '''
            set -euxo pipefail
            IMAGE=$(cat image.tag)
            TARGET="app-${NEXT_COLOR}"

            # ── compose 기본 파일의 ${DOCKERHUB_REPO}/${IMAGE_TAG} 미설정으로 인한 오류 방지:
            # 기본 파일이 전체 서비스를 파싱할 때 변수가 비어 있으면 ':-blue' 같은 잘못된 참조가 생길 수 있으니
            # 아래처럼 유효한 기본값을 export 해둔다(override가 TARGET의 image를 덮어쓴다).
            export DOCKERHUB_REPO="${DOCKERHUB_REPO}"
            export IMAGE_TAG="${IMAGE_TAG}"

            # 서비스 오버라이드 파일(이미지 & env 덮어쓰기)
            cat > ${APP_DIR}/override-${TARGET}.yml <<EOF
            services:
              ${TARGET}:
                image: ${IMAGE}
                environment:
                  SPRING_DATASOURCE_URL: ${DB_URL}
                  SPRING_DATASOURCE_USERNAME: ${DB_USER}
                  SPRING_DATASOURCE_PASSWORD: ${DB_PASS}
                  SPRING_PROFILES_ACTIVE: prod
                networks:
                  - ${DOCKER_NETWORK}
            networks:
              ${DOCKER_NETWORK}:
                external: true
            EOF

            # 타깃 서비스만 교체/기동
            docker compose -f ${APP_DIR}/docker-compose.yml -f ${APP_DIR}/override-${TARGET}.yml up -d ${TARGET}

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

          # 동일 네트워크에서 http 헬스 체크
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

          # NEXT 중지
          docker compose -f ${APP_DIR}/docker-compose.yml stop app-${NEXT_COLOR} || true
        '''
      }
    }
  }
}
