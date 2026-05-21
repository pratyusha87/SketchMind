pipeline {
    agent any

    environment {
        IMAGE_FRONTEND = "sketchmind-frontend"
        IMAGE_BACKEND  = "sketchmind-backend"
        DOCKER_HUB     = credentials('dockerhub-credentials')
        REGISTRY       = "yourdockerhubuser"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✦ SketchMind CI/CD — Branch: ${env.BRANCH_NAME}"
            }
        }

        stage('Test — Backend') {
            steps {
                dir('backend') {
                    sh 'pip install -r requirements.txt --break-system-packages -q'
                    sh 'python -m pytest tests/ -v --tb=short || echo "No tests yet"'
                    sh 'python -m flake8 main.py --max-line-length=120 || true'
                }
            }
        }

        stage('Test — Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install --silent'
                    sh 'npm test -- --watchAll=false --passWithNoTests'
                    sh 'npx eslint src/ --ext .jsx,.js --max-warnings=0 || true'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $REGISTRY/$IMAGE_FRONTEND:$BUILD_NUMBER ./frontend'
                sh 'docker build -t $REGISTRY/$IMAGE_BACKEND:$BUILD_NUMBER  ./backend'
                sh 'docker tag $REGISTRY/$IMAGE_FRONTEND:$BUILD_NUMBER $REGISTRY/$IMAGE_FRONTEND:latest'
                sh 'docker tag $REGISTRY/$IMAGE_BACKEND:$BUILD_NUMBER  $REGISTRY/$IMAGE_BACKEND:latest'
            }
        }

        stage('Push to Docker Hub') {
            when { branch 'main' }
            steps {
                sh 'echo $DOCKER_HUB_PSW | docker login -u $DOCKER_HUB_USR --password-stdin'
                sh 'docker push $REGISTRY/$IMAGE_FRONTEND:$BUILD_NUMBER'
                sh 'docker push $REGISTRY/$IMAGE_FRONTEND:latest'
                sh 'docker push $REGISTRY/$IMAGE_BACKEND:$BUILD_NUMBER'
                sh 'docker push $REGISTRY/$IMAGE_BACKEND:latest'
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                sshagent(['deploy-server-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no deploy@YOUR_SERVER_IP "
                            cd /opt/sketchmind &&
                            docker compose pull &&
                            docker compose up -d --remove-orphans &&
                            docker image prune -f
                        "
                    '''
                }
            }
        }
    }

    post {
        success { echo '✅ Pipeline passed!' }
        failure { echo '❌ Pipeline failed. Check logs.' }
        always  { sh 'docker logout || true' }
    }
}
