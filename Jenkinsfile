pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 15, unit: 'MINUTES')
    disableConcurrentBuilds(abortPrevious: true)
  }

  tools {
    nodejs 'node-22'
  }

  environment {
    CI = 'true'
    NEXT_TELEMETRY_DISABLED = '1'
    // Same base path as the GitHub Pages build
    NEXT_PUBLIC_BASE_PATH = '/BlastScript'
  }

  stages {
    stage('Install') {
      steps {
        sh 'node --version && npm --version'
        sh 'npm ci'
      }
    }

    stage('Typecheck core') {
      steps {
        sh 'npx tsc -p packages/core/tsconfig.json --noEmit'
      }
    }

    stage('Test core') {
      steps {
        sh 'npm run test:core'
      }
    }

    stage('Build playground') {
      steps {
        sh 'npm run build:playground'
      }
    }
  }

  post {
    success {
      sh 'tar -czf playground-out.tgz -C packages/playground out'
      archiveArtifacts artifacts: 'playground-out.tgz', fingerprint: true
    }
    cleanup {
      cleanWs()
    }
  }
}