pipeline {

    agent any

    environment {
        REGISTRY      = 'docker.io'
        DOCKER_DEV    = 'raffiakhyari/todo-dashboard-dev'
        DOCKER_PROD   = 'raffiakhyari/todo-dashboard'
        FRONTEND_DIR  = 'app'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)

        buildDiscarder(
            logRotator(
                numToKeepStr: '10'
            )
        )
    }

    stages {

        // ============================================================
        // Git
        // ============================================================

        stage('Git') {
            steps {

                step([$class: 'WsCleanup'])

                checkout scm

                script {

                    env.AUTHOR_NAME = sh(
                        script: "git log -1 --format=%aN ${env.GIT_COMMIT}",
                        returnStdout: true
                    ).trim()

                    env.COMMIT_MESSAGE = sh(
                        script: "git log -1 --format=%B ${env.GIT_COMMIT}",
                        returnStdout: true
                    ).trim()

                    echo """
                    ==========================================
                    BUILD INFORMATION
                    ==========================================
                    Application : todo-dashboard
                    Branch      : ${env.BRANCH_NAME}
                    Commit      : ${env.GIT_COMMIT}
                    Author      : ${env.AUTHOR_NAME}
                    Message     : ${env.COMMIT_MESSAGE}
                    Build       : ${env.BUILD_NUMBER}
                    ==========================================
                    """ 
                }
            }
        }


        // ============================================================
        // Prepare Environment
        // ============================================================

        stage('Prepare Environment') {
            steps {

                script {

                    if (env.BRANCH_NAME == 'main') {

                        env.DOCKER_NAME = env.DOCKER_PROD
                        env.API_URL = 'http://api.todo.local'

                    } else if (env.BRANCH_NAME == 'develop') {

                        env.DOCKER_NAME = env.DOCKER_DEV
                        env.API_URL = 'http://api.todo-dev.local'

                    } else {

                        error("Unsupported branch: ${env.BRANCH_NAME}")
                    }

                    env.IMAGE = "${env.DOCKER_NAME}:${env.BUILD_NUMBER}"

                    sh """
                        set -e

                        cd ${FRONTEND_DIR}

                        echo "=========================================="
                        echo "Preparing Environment"
                        echo "=========================================="

                        if [ ! -f .env.example ]; then
                            echo "ERROR: .env.example not found"
                            exit 1
                        fi

                        cp .env.example .env.local

                        sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${API_URL}|" .env.local

                        echo "API URL configured:"
                        grep '^NEXT_PUBLIC_API_URL=' .env.local

                        echo "=========================================="
                        echo "Environment SUCCESS"
                        echo "=========================================="
                    """
                }
            }
        }


        // ============================================================
        // Install Dependencies
        // ============================================================

        stage('Install Dependencies') {
            steps {

                dir("${FRONTEND_DIR}") {

                    sh '''
                        set -e

                        echo "=========================================="
                        echo "Node Version"
                        echo "=========================================="

                        node --version
                        npm --version

                        echo "=========================================="
                        echo "Installing Dependencies"
                        echo "=========================================="

                        npm ci

                        echo "=========================================="
                        echo "Dependencies SUCCESS"
                        echo "=========================================="
                    '''
                }
            }
        }


        // ============================================================
        // Lint
        // ============================================================

        stage('Lint') {
            steps {

                dir("${FRONTEND_DIR}") {

                    sh '''
                        set -e

                        echo "=========================================="
                        echo "Running ESLint"
                        echo "=========================================="

                        npm run lint

                        echo "=========================================="
                        echo "Lint SUCCESS"
                        echo "=========================================="
                    '''
                }
            }
        }


        // ============================================================
        // Docker Build
        // ============================================================

        stage('Build Image') {
            steps {

                sh '''
                    set -e

                    echo "=========================================="
                    echo "Building Docker Image"
                    echo "=========================================="

                    echo "Image  : ${IMAGE}"
                    echo "API URL: ${API_URL}"

                    DOCKER_BUILDKIT=1 docker build \
                        --pull \
                        -t "${IMAGE}" \
                        -f Dockerfile \
                        .

                    echo "=========================================="
                    echo "Docker Build SUCCESS"
                    echo "=========================================="

                    docker image inspect "${IMAGE}" >/dev/null

                    docker images "${DOCKER_NAME}"
                '''
            }
        }


        // ============================================================
        // Trivy Security Scan
        // ============================================================

        stage('Trivy Scan') {
            steps {

                sh '''
                    set -e

                    echo "=========================================="
                    echo "Trivy Vulnerability Scan"
                    echo "=========================================="

                    trivy image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        --ignore-unfixed \
                        "${IMAGE}"

                    echo "=========================================="
                    echo "Trivy Scan COMPLETED"
                    echo "=========================================="
                '''
            }
        }


        // ============================================================
        // Push Docker Image
        // ============================================================

        stage('Push Image') {
            steps {

                withCredentials([

                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )

                ]) {

                    sh '''
                        set -e

                        echo "=========================================="
                        echo "Docker Login"
                        echo "=========================================="

                        echo "${DOCKER_PASSWORD}" | docker login \
                            "${REGISTRY}" \
                            --username "${DOCKER_USERNAME}" \
                            --password-stdin

                        echo "=========================================="
                        echo "Pushing Image"
                        echo "=========================================="

                        docker push "${IMAGE}"

                        echo "=========================================="
                        echo "Push SUCCESS"
                        echo "=========================================="

                        docker logout "${REGISTRY}" || true
                    '''
                }
            }
        }
    }


    // ================================================================
    // Post Actions
    // ================================================================

    post {

        // ============================================================
        // SUCCESS → TRIGGER CD
        // ============================================================

        success {

            echo """
            ==========================================
            PIPELINE SUCCESS
            ==========================================
            Application : todo-dashboard
            Branch      : ${env.BRANCH_NAME}
            Build       : ${env.BUILD_NUMBER}
            Image       : ${env.IMAGE}
            Author      : ${env.AUTHOR_NAME}
            ==========================================
            """

            script {

                def cdJob =
                    "todo-dashboard-delivery/${env.BRANCH_NAME}"

                echo """
                ==========================================
                TRIGGER CD
                ==========================================
                CD Job : ${cdJob}
                Image  : ${env.IMAGE}
                Tag    : ${env.BUILD_NUMBER}
                ==========================================
                """

                build job: cdJob,

                    parameters: [

                        string(
                            name: 'IMAGE_REPO',
                            value: env.DOCKER_NAME
                        ),

                        string(
                            name: 'IMAGE_TAG',
                            value: env.BUILD_NUMBER
                        )
                    ],

                    wait: false
            }
        }


        // ============================================================
        // FAILURE
        // ============================================================

        failure {

            echo """
            ==========================================
            PIPELINE FAILED
            ==========================================
            Application : todo-dashboard
            Branch      : ${env.BRANCH_NAME}
            Build       : ${env.BUILD_NUMBER}

            CD WILL NOT BE TRIGGERED

            ==========================================
            """
        }


        // ============================================================
        // ALWAYS
        // ============================================================

        always {

            script {

                echo "=========================================="
                echo "Cleanup"
                echo "=========================================="

                // ------------------------------------------
                // Remove generated .env.local
                // ------------------------------------------

                sh """
                    if [ -f "${FRONTEND_DIR}/.env.local" ]; then
                        echo "Removing generated .env.local"
                        rm -f "${FRONTEND_DIR}/.env.local"
                    else
                        echo ".env.local not found - nothing to remove"
                    fi
                """


                // ------------------------------------------
                // Remove Docker image
                // ------------------------------------------

                if (env.IMAGE) {

                    sh """
                        if docker image inspect "${env.IMAGE}" >/dev/null 2>&1; then

                            echo "Removing Docker image:"
                            echo "${env.IMAGE}"

                            docker image rm "${env.IMAGE}" || true

                        else

                            echo "Docker image not found:"
                            echo "${env.IMAGE}"

                        fi
                    """
                }

                echo "=========================================="
                echo "Cleanup COMPLETED"
                echo "=========================================="
            }
        }
    }
}