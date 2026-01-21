#!/bin/bash

# Health check script for the backend application
# Run this script periodically to ensure the application is running

HEALTH_URL="http://localhost:3000/health"
LOG_FILE="./logs/health_check.log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

# Check if application is responding
check_health() {
    if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        log "✅ Application is healthy"
        return 0
    else
        log "❌ Application is not responding"
        return 1
    fi
}

# Check PM2 process
check_pm2() {
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "backend-app"; then
            log "✅ PM2 process is running"
            return 0
        else
            log "❌ PM2 process is not running"
            return 1
        fi
    else
        log "⚠️ PM2 not found, skipping PM2 check"
        return 0
    fi
}

# Check Docker container
check_docker() {
    if command -v docker &> /dev/null && docker ps | grep -q "backend"; then
        log "✅ Docker container is running"
        return 0
    else
        log "ℹ️ Docker container not found or not running"
        return 0
    fi
}

# Main health check
main() {
    log "🔍 Starting health check..."

    local health_status=0
    local pm2_status=0
    local docker_status=0

    check_health
    health_status=$?

    check_pm2
    pm2_status=$?

    check_docker
    docker_status=$?

    if [ $health_status -eq 0 ] || [ $pm2_status -eq 0 ] || [ $docker_status -eq 0 ]; then
        log "✅ Overall status: HEALTHY"
        exit 0
    else
        log "❌ Overall status: UNHEALTHY - Manual intervention required"
        exit 1
    fi
}

# Run main function
main