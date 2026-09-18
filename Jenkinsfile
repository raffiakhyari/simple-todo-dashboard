pipeline {

    agent any

    environment {
        REGISTRY = 'docker.io'

        DOCKER_DEV  = 'raffiakhyari/todo-dashboard-dev'
        DOCKER_PROD = 'raffiakhyari/todo-dashboard'

        FRONTEND_DIR = 'app'
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
        // Prepare Docker Image
        // ============================================================

        stage('Prepare Image') {
            steps {
                script {

                    if (env.BRANCH_NAME == 'main') {
                        env.DOCKER_NAME = env.DOCKER_PROD
                    } else {
                        env.DOCKER_NAME = env.DOCKER_DEV
                    }

                    env.IMAGE = "${env.DOCKER_NAME}:${env.BUILD_NUMBER}"

                    echo """
                    ==========================================
                    DOCKER IMAGE
                    ==========================================
                    Branch : ${env.BRANCH_NAME}
                    Image  : ${env.IMAGE}
                    ==========================================
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
        // Build Next.js
        // ============================================================

        stage('Build Next.js') {
            steps {
                dir("${FRONTEND_DIR}") {
                    sh '''
                        set -e

                        echo "=========================================="
                        echo "Building Next.js Application"
                        echo "=========================================="

                        npm run build

                        echo "=========================================="
                        echo "Next.js Build SUCCESS"
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

                    echo "Image: ${IMAGE}"

                    DOCKER_BUILDKIT=1 docker build \
                        --pull \
                        -t "${IMAGE}" \
                        -f Dockerfile \
                        .

                    echo "=========================================="
                    echo "Docker Build SUCCESS"
                    echo "=========================================="

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
                        --exit-code 1 \
                        --ignore-unfixed \
                        "${IMAGE}"

                    echo "=========================================="
                    echo "Trivy Scan SUCCESS"
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
                        echo "Docker Logout"
                        echo "=========================================="

                        docker logout "${REGISTRY}"

                        echo "=========================================="
                        echo "Push SUCCESS"
                        echo "=========================================="
                    '''
                }
            }
        }
    }

    // ================================================================
    // Post Actions
    // ================================================================

    post {

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
        }

        failure {
            echo """
            ==========================================
            PIPELINE FAILED
            ==========================================

            Application : todo-dashboard
            Branch      : ${env.BRANCH_NAME}
            Build       : ${env.BUILD_NUMBER}

            ==========================================
            """
        }

        always {
            script {

                if (env.IMAGE) {

                    sh """
                        echo "=========================================="
                        echo "Cleaning Local Docker Image"
                        echo "=========================================="

                        docker image rm \
                            "${env.IMAGE}" \
                            || true
                    """
                }
            }
        }
    }
}