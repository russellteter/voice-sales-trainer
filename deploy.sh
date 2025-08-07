#!/bin/bash

# Voice Sales Trainer - Production Deployment Script
# Comprehensive deployment automation with health checks and rollback capability

set -euo pipefail

# Configuration
PROJECT_NAME="voice-sales-trainer"
PROJECT_DIR="/opt/voice-sales-trainer"
BACKUP_DIR="/opt/backups/${PROJECT_NAME}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
LOG_FILE="/var/log/${PROJECT_NAME}/deploy.log"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] [$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" >&2
    echo "[ERROR] [$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] [$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[WARNING] [$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] [$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[INFO] [$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
Voice Sales Trainer Deployment Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    deploy          Full deployment (default)
    update          Update existing deployment
    rollback        Rollback to previous version
    backup          Create backup only
    health-check    Run health checks only
    logs            Show deployment logs

Options:
    --no-backup     Skip backup creation
    --no-rollback   Disable automatic rollback on failure
    --force         Force deployment without confirmation
    --version TAG   Deploy specific version/tag
    --help          Show this help message

Examples:
    $0                          # Full deployment with backup
    $0 deploy --force           # Force deployment without confirmation
    $0 update --version v2.1.0  # Update to specific version
    $0 rollback                 # Rollback to previous version
    $0 logs                     # Show deployment logs

EOF
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as appropriate user
    if [[ $EUID -eq 0 ]]; then
        error "Do not run this script as root. Use a dedicated deployment user."
        exit 1
    fi
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if in correct directory
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Production compose file not found: $COMPOSE_FILE"
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        error "Please copy production.env.example to .env and configure it"
        exit 1
    fi
    
    # Validate environment file
    log "Validating environment configuration..."
    
    required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET_KEY" "ELEVENLABS_API_KEY" "CLAUDE_API_KEY")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=$" "$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing or empty required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        exit 1
    fi
    
    # Check disk space
    available_space=$(df . | awk 'NR==2 {print $4}')
    required_space=5242880  # 5GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space. Required: 5GB, Available: $((available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p logs backups uploads monitoring/grafana/dashboards ssl
    
    log "Prerequisites check completed successfully"
}

# Create backup
create_backup() {
    if [[ "${SKIP_BACKUP:-false}" == "true" ]]; then
        log "Skipping backup creation as requested"
        return 0
    fi
    
    log "Creating deployment backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${PROJECT_NAME}_backup_${backup_timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "${POSTGRES_USER:-voice_trainer}" \
            -d "${POSTGRES_DB:-voice_sales_trainer}" \
            > "${backup_path}/database.sql" || {
            error "Database backup failed"
            return 1
        }
        log "Database backup completed"
    else
        warning "PostgreSQL container not running, skipping database backup"
    fi
    
    # Backup uploads directory
    if [[ -d "uploads" ]] && [[ -n "$(ls -A uploads 2>/dev/null)" ]]; then
        log "Backing up uploads directory..."
        cp -r uploads "${backup_path}/"
    fi
    
    # Backup configuration files
    log "Backing up configuration files..."
    cp "$ENV_FILE" "${backup_path}/"
    cp "$COMPOSE_FILE" "${backup_path}/"
    
    # Create backup metadata
    cat > "${backup_path}/metadata.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "deployment_type": "${DEPLOYMENT_TYPE:-full}",
    "services": $(docker-compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | jq -R . | jq -s . || echo '[]')
}
EOF
    
    # Compress backup
    log "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name" && rm -rf "$backup_name"
    cd - > /dev/null
    
    # Keep only last 10 backups
    find "$BACKUP_DIR" -name "${PROJECT_NAME}_backup_*.tar.gz" -type f | \
        sort -r | tail -n +11 | xargs -r rm -f
    
    # Store backup path for potential rollback
    echo "${BACKUP_DIR}/${backup_name}.tar.gz" > /tmp/last_backup_path
    
    log "Backup created: ${backup_name}.tar.gz"
    return 0
}

# Health check function
health_check() {
    local service="$1"
    local url="$2"
    local retries="${3:-$HEALTH_CHECK_RETRIES}"
    local interval="${4:-$HEALTH_CHECK_INTERVAL}"
    
    log "Performing health check for $service..."
    
    for ((i=1; i<=retries; i++)); do
        if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
            log "$service health check passed (attempt $i/$retries)"
            return 0
        fi
        
        if [[ $i -lt $retries ]]; then
            info "Health check failed for $service (attempt $i/$retries), retrying in ${interval}s..."
            sleep "$interval"
        fi
    done
    
    error "$service health check failed after $retries attempts"
    return 1
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to become healthy..."
    
    local timeout=300  # 5 minutes
    local start_time=$(date +%s)
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $timeout ]]; then
            error "Services did not become healthy within timeout period"
            return 1
        fi
        
        # Check Docker Compose health status
        local unhealthy_services=$(docker-compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}\t{{.Status}}" | \
                                  grep -v "Up (healthy)" | grep -v "SERVICE" | awk '{print $1}' | tr '\n' ' ')
        
        if [[ -z "$unhealthy_services" ]]; then
            log "All services are healthy"
            return 0
        fi
        
        info "Waiting for services to become healthy: $unhealthy_services"
        sleep 10
    done
}

# Deploy application
deploy_application() {
    log "Starting deployment process..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    if ! docker-compose -f "$COMPOSE_FILE" pull; then
        error "Failed to pull Docker images"
        return 1
    fi
    
    # Start database and Redis first
    log "Starting core services (database, Redis)..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    local db_ready=false
    for ((i=1; i<=30; i++)); do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready \
           -U "${POSTGRES_USER:-voice_trainer}" \
           -d "${POSTGRES_DB:-voice_sales_trainer}" > /dev/null 2>&1; then
            db_ready=true
            break
        fi
        sleep 5
    done
    
    if [[ "$db_ready" != true ]]; then
        error "Database failed to become ready"
        return 1
    fi
    
    log "Database is ready"
    
    # Run database migrations
    log "Running database migrations..."
    if ! docker-compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head; then
        error "Database migrations failed"
        return 1
    fi
    
    # Start application services with zero downtime deployment
    log "Deploying application services..."
    
    # Scale up new instances
    docker-compose -f "$COMPOSE_FILE" up -d --scale backend=2 --scale frontend=2
    
    # Wait for new instances to be healthy
    if ! wait_for_services; then
        error "New service instances failed to become healthy"
        return 1
    fi
    
    # Scale down to desired count
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Start monitoring and proxy services
    log "Starting monitoring and proxy services..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx prometheus grafana loki
    
    log "Application deployment completed"
    return 0
}

# Run comprehensive health checks
run_health_checks() {
    log "Running comprehensive health checks..."
    
    local base_url="https://$(grep FRONTEND_URL .env | cut -d'=' -f2 | sed 's|https://||')"
    local api_url="https://$(grep BACKEND_URL .env | cut -d'=' -f2 | sed 's|https://||')"
    
    # Frontend health check
    if ! health_check "Frontend" "http://localhost:3000/api/health" 15 5; then
        return 1
    fi
    
    # Backend API health check
    if ! health_check "Backend API" "http://localhost:8000/health" 15 5; then
        return 1
    fi
    
    # Database connectivity check
    if ! docker-compose -f "$COMPOSE_FILE" exec -T backend python -c \
        "from config.database import engine; engine.execute('SELECT 1')"; then
        error "Database connectivity check failed"
        return 1
    fi
    
    # Redis connectivity check
    if ! docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null; then
        error "Redis connectivity check failed"
        return 1
    fi
    
    # API endpoint checks
    local api_endpoints=("/api/v1/scenarios" "/api/v1/auth/register" "/metrics")
    for endpoint in "${api_endpoints[@]}"; do
        if ! curl -f -s --max-time 10 "http://localhost:8000${endpoint}" > /dev/null; then
            error "API endpoint check failed: $endpoint"
            return 1
        fi
    done
    
    log "All health checks passed successfully"
    return 0
}

# Rollback deployment
rollback_deployment() {
    log "Starting rollback process..."
    
    local backup_path
    if [[ -f /tmp/last_backup_path ]]; then
        backup_path=$(cat /tmp/last_backup_path)
    else
        # Find most recent backup
        backup_path=$(find "$BACKUP_DIR" -name "${PROJECT_NAME}_backup_*.tar.gz" -type f | sort -r | head -n1)
    fi
    
    if [[ -z "$backup_path" ]] || [[ ! -f "$backup_path" ]]; then
        error "No backup found for rollback"
        return 1
    fi
    
    log "Rolling back using backup: $(basename "$backup_path")"
    
    # Stop current services
    log "Stopping current services..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Extract backup
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_path" -C "$temp_dir"
    local backup_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "${PROJECT_NAME}_backup_*" | head -n1)
    
    if [[ -z "$backup_dir" ]]; then
        error "Invalid backup structure"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Restore configuration
    if [[ -f "${backup_dir}/.env" ]]; then
        cp "${backup_dir}/.env" ./
        log "Environment configuration restored"
    fi
    
    # Restore database
    if [[ -f "${backup_dir}/database.sql" ]]; then
        log "Restoring database..."
        
        # Start database service
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        
        # Wait for database
        sleep 30
        
        # Restore database
        docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
            -U "${POSTGRES_USER:-voice_trainer}" \
            -d "${POSTGRES_DB:-voice_sales_trainer}" \
            < "${backup_dir}/database.sql"
        
        log "Database restored"
    fi
    
    # Restore uploads
    if [[ -d "${backup_dir}/uploads" ]]; then
        rm -rf uploads
        cp -r "${backup_dir}/uploads" ./
        log "Uploads directory restored"
    fi
    
    # Start services
    log "Starting services with restored configuration..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait and verify
    if wait_for_services && run_health_checks; then
        log "Rollback completed successfully"
        rm -rf "$temp_dir"
        return 0
    else
        error "Rollback verification failed"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Main deployment function
main_deploy() {
    local should_rollback="${ROLLBACK_ON_FAILURE}"
    
    # Create backup
    if ! create_backup; then
        error "Backup creation failed, aborting deployment"
        exit 1
    fi
    
    # Deploy application
    if ! deploy_application; then
        error "Application deployment failed"
        
        if [[ "$should_rollback" == "true" ]]; then
            warning "Attempting automatic rollback..."
            if rollback_deployment; then
                log "Automatic rollback completed"
                exit 1
            else
                error "Automatic rollback failed - manual intervention required"
                exit 2
            fi
        else
            exit 1
        fi
    fi
    
    # Run health checks
    if ! run_health_checks; then
        error "Health checks failed after deployment"
        
        if [[ "$should_rollback" == "true" ]]; then
            warning "Attempting automatic rollback due to failed health checks..."
            if rollback_deployment; then
                log "Automatic rollback completed"
                exit 1
            else
                error "Automatic rollback failed - manual intervention required"
                exit 2
            fi
        else
            exit 1
        fi
    fi
    
    # Clean up old Docker images
    log "Cleaning up unused Docker images..."
    docker image prune -f
    
    log "Deployment completed successfully!"
    log "Application is now running and healthy"
    
    # Show service status
    info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Show URLs
    local frontend_url=$(grep FRONTEND_URL .env | cut -d'=' -f2)
    local backend_url=$(grep BACKEND_URL .env | cut -d'=' -f2)
    
    info "Access URLs:"
    info "  Frontend: $frontend_url"
    info "  API: $backend_url"
    info "  API Documentation: $backend_url/docs"
    info "  Health Check: $backend_url/health"
}

# Parse command line arguments
COMMAND="deploy"
SKIP_BACKUP=false
ROLLBACK_ON_FAILURE=true
FORCE_DEPLOY=false
VERSION_TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|update|rollback|backup|health-check|logs)
            COMMAND="$1"
            shift
            ;;
        --no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --version)
            VERSION_TAG="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Execute command
case $COMMAND in
    "deploy"|"update")
        log "Starting $COMMAND process..."
        check_prerequisites
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            echo -e "${YELLOW}This will deploy the Voice Sales Trainer application.${NC}"
            echo -e "${YELLOW}Current services will be updated/restarted.${NC}"
            read -p "Do you want to continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Deployment cancelled by user"
                exit 0
            fi
        fi
        
        main_deploy
        ;;
    
    "rollback")
        log "Starting rollback process..."
        check_prerequisites
        
        echo -e "${YELLOW}This will rollback the application to the previous version.${NC}"
        echo -e "${YELLOW}Current data may be lost if not backed up.${NC}"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
        
        rollback_deployment
        ;;
    
    "backup")
        log "Creating backup..."
        check_prerequisites
        create_backup
        ;;
    
    "health-check")
        log "Running health checks..."
        run_health_checks
        ;;
    
    "logs")
        if [[ -f "$LOG_FILE" ]]; then
            tail -f "$LOG_FILE"
        else
            error "Log file not found: $LOG_FILE"
            exit 1
        fi
        ;;
    
    *)
        error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac