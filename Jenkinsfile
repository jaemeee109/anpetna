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
    IMAGE_TAG          = "v1.0.${env.BUILD_NUMBER}"
    HEALTH_TIMEOUT_SEC = '180'
    NGINX_CONTAINER    = 'api-gateway'
  }

  // Webhook로 트리거; 폴백으로 가끔 폴링하고 싶으면 유지/조정
  triggers { pollSCM('@daily') }

  stages {
    stage('Checkout') {
      steps {
        git branch: "${BRANCH}", url: "${GIT_REPO}", credentialsId: 'git_access_token'
      }
    }

    stage('Select Color') {
      steps {
        script {
          def active = sh(
            script: "grep -oE 'app-(blue|green)' ${NGINX_DIR}/nginx.d/active-upstream.var | tail -n1 | cut -d'-' -f2",
            returnStdout: true
          ).trim()
          env.CURRENT_COLOR = (active in ['blue','green']) ? active : 'blue'
          env.NEXT_COLOR    = (env.CURRENT_COLOR == 'blue') ? 'green' : 'blue'
          echo "CURRENT=${env.CURRENT_COLOR}, NEXT=${env.NEXT_COLOR}"
        }
      }
    }

    stage('Build JAR') {
      steps {
        sh "./mvnw -q -DskipTests clean package"
      }
    }

    stage('Docker Build & Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-hub-access-token', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh """
            echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
            docker build -t ${DOCKERHUB_REPO}:${IMAGE_TAG}-${NEXT_COLOR} \
              --build-arg JAR_FILE=target/*.jar \
              -f Dockerfile .
            docker push ${DOCKERHUB_REPO}:${IMAGE_TAG}-${NEXT_COLOR}
            docker logout
          """
        }
      }
    }

    stage('Deploy NEXT') {
      steps {
        sh """
          export IMAGE_TAG=${IMAGE_TAG}
          cd ${APP_DIR}
          docker compose pull app-${NEXT_COLOR} || true
          docker compose up -d app-${NEXT_COLOR}
        """
      }
    }

    stage('Healthcheck NEXT') {
      steps {
        script {
          timeout(time: env.HEALTH_TIMEOUT_SEC.toInteger(), unit: 'SECONDS') {
            sh """
              for i in \$(seq 1 ${HEALTH_TIMEOUT_SEC}); do
                if docker inspect --format='{{json .State.Health.Status}}' app-${NEXT_COLOR} 2>/dev/null | grep -q healthy; then
                  echo "NEXT ${NEXT_COLOR} is healthy"
                  exit 0
                fi
                sleep 1
              done
              echo "Healthcheck failed for app-${NEXT_COLOR}"
              exit 1
            """
          }
        }
      }
    }

    stage('Switch Nginx → NEXT') {
      steps {
        sh """
          echo "set \\$active_upstream app-${NEXT_COLOR};" > ${NGINX_DIR}/nginx.d/active-upstream.var
          docker exec ${NGINX_CONTAINER} nginx -s reload || docker restart ${NGINX_CONTAINER}
        """
      }
    }

    stage('Drain & Stop PREV') {
      steps {
        sh """
          sleep 5
          cd ${APP_DIR}
          docker compose stop app-${CURRENT_COLOR} || true
          docker compose rm -f app-${CURRENT_COLOR} || true
        """
      }
    }
  }

  post {
    success {
      echo "Switched to ${env.NEXT_COLOR} (${env.IMAGE_TAG})"
    }
    failure {
      script {
        sh """
          echo "set \\$active_upstream app-${CURRENT_COLOR};" > ${NGINX_DIR}/nginx.d/active-upstream.var || true
          docker exec ${NGINX_CONTAINER} nginx -s reload || true
          cd ${APP_DIR} && docker compose stop app-${NEXT_COLOR} || true
        """
      }
    }
  }
}
