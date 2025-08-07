#!/bin/bash

# Voice Sales Trainer - Database Backup and Recovery Script
# Comprehensive backup solution with automated retention and cloud storage support

set -euo pipefail

# Configuration
PROJECT_NAME="voice-sales-trainer"
BACKUP_DIR="/opt/backups/${PROJECT_NAME}"
S3_BACKUP_BUCKET="${BACKUP_S3_BUCKET:-}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOG_FILE="/var/log/${PROJECT_NAME}/backup.log"

# Database configuration from environment
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${POSTGRES_DB:-voice_sales_trainer}"
DB_USER="${POSTGRES_USER:-voice_trainer}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
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
Voice Sales Trainer Backup Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    backup          Create full backup (default)
    restore         Restore from backup
    list            List available backups
    cleanup         Clean old backups
    schedule        Setup automated backup schedule
    verify          Verify backup integrity
    upload          Upload backups to cloud storage

Options:
    --type TYPE     Backup type: full, database, files (default: full)
    --name NAME     Custom backup name
    --retention N   Keep backups for N days (default: 30)
    --compress      Compress backup files
    --encrypt       Encrypt backup files
    --s3            Upload to S3 after backup
    --verify        Verify backup after creation
    --quiet         Suppress non-error output
    --help          Show this help message

Restore Options:
    --backup NAME   Specific backup to restore
    --latest        Restore latest backup
    --date DATE     Restore backup from specific date (YYYY-MM-DD)
    --dry-run       Show what would be restored without doing it

Examples:
    $0                                  # Create full backup
    $0 backup --type database --s3     # Database backup with S3 upload
    $0 restore --latest                 # Restore latest backup
    $0 restore --backup backup_20240115_143022  # Restore specific backup
    $0 list                            # List all backups
    $0 cleanup --retention 7           # Keep only 7 days of backups
    $0 schedule                        # Setup daily backup cron job

EOF
}

# Check prerequisites
check_prerequisites() {
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Load environment variables
    if [[ -f ".env" ]]; then
        set -a
        source .env
        set +a
    fi
    
    # Check AWS CLI if S3 backup requested
    if [[ -n "${S3_BACKUP_BUCKET}" ]] && ! command -v aws &> /dev/null; then
        warning "AWS CLI not found. S3 backups will be disabled."
        S3_BACKUP_BUCKET=""
    fi
    
    # Check GPG for encryption
    if [[ "${ENCRYPT_BACKUP:-false}" == "true" ]] && ! command -v gpg &> /dev/null; then
        warning "GPG not found. Backup encryption will be disabled."
    fi
}

# Create database backup
backup_database() {
    local backup_name="$1"
    local backup_path="$2"
    
    log "Creating database backup: $backup_name"
    
    # Check if database container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create database dump
    local db_backup_file="${backup_path}/database.sql"
    
    if ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=custom \
        > "${db_backup_file}.custom"; then
        error "Database backup failed"
        return 1
    fi
    
    # Also create plain text backup for easier restore
    if ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --create \
        > "$db_backup_file"; then
        error "Plain text database backup failed"
        return 1
    fi
    
    # Get database statistics
    local db_size=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | tr -d ' \n')
    
    local table_count=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
    
    log "Database backup completed - Size: $db_size, Tables: $table_count"
    
    # Store metadata
    cat > "${backup_path}/database_metadata.json" << EOF
{
    "database": "$DB_NAME",
    "size": "$db_size",
    "table_count": $table_count,
    "backup_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "postgres_version": "$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -t -c 'SELECT version();' | head -n1 | tr -d '\n')"
}
EOF
    
    return 0
}

# Backup Redis data
backup_redis() {
    local backup_path="$1"
    
    log "Creating Redis backup..."
    
    # Check if Redis container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
        warning "Redis container is not running, skipping Redis backup"
        return 0
    fi
    
    # Create Redis backup
    local redis_backup_file="${backup_path}/redis.rdb"
    
    # Save current Redis state
    if ! docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE; then
        warning "Redis BGSAVE failed"
        return 1
    fi
    
    # Wait for background save to complete
    local save_complete=false
    for i in {1..30}; do
        if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli LASTSAVE > /dev/null 2>&1; then
            save_complete=true
            break
        fi
        sleep 1
    done
    
    if [[ "$save_complete" != true ]]; then
        warning "Redis background save did not complete in time"
        return 1
    fi
    
    # Copy RDB file
    if docker-compose -f "$COMPOSE_FILE" exec -T redis cat /data/dump.rdb > "$redis_backup_file" 2>/dev/null; then
        log "Redis backup completed"
    else
        warning "Failed to copy Redis RDB file"
        return 1
    fi
    
    return 0
}

# Backup application files
backup_files() {
    local backup_path="$1"
    
    log "Creating file backup..."
    
    # Backup uploads directory
    if [[ -d "uploads" ]] && [[ -n "$(ls -A uploads 2>/dev/null)" ]]; then
        log "Backing up uploads directory..."
        cp -r uploads "${backup_path}/"
        
        # Get upload statistics
        local upload_count=$(find uploads -type f | wc -l)
        local upload_size=$(du -sh uploads | cut -f1)
        
        log "Uploads backup completed - Files: $upload_count, Size: $upload_size"
    fi
    
    # Backup logs (recent only)
    if [[ -d "logs" ]]; then
        log "Backing up recent logs..."
        mkdir -p "${backup_path}/logs"
        
        # Only backup logs from last 7 days
        find logs -name "*.log" -mtime -7 -exec cp {} "${backup_path}/logs/" \; 2>/dev/null || true
    fi
    
    # Backup configuration files
    log "Backing up configuration files..."
    local config_files=(".env" "nginx.conf" "logging.conf" "$COMPOSE_FILE")
    
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "${backup_path}/"
        fi
    done
    
    # Backup SSL certificates (if present)
    if [[ -d "ssl" ]]; then
        cp -r ssl "${backup_path}/"
        log "SSL certificates backed up"
    fi
    
    return 0
}

# Create full backup
create_backup() {
    local backup_type="${BACKUP_TYPE:-full}"
    local backup_name="${BACKUP_NAME:-}"
    local compress="${COMPRESS_BACKUP:-true}"
    local encrypt="${ENCRYPT_BACKUP:-false}"
    local verify="${VERIFY_BACKUP:-false}"
    local upload_s3="${UPLOAD_S3:-false}"
    
    if [[ -z "$backup_name" ]]; then
        backup_name="${PROJECT_NAME}_${backup_type}_$(date +%Y%m%d_%H%M%S)"
    fi
    
    local backup_path="${BACKUP_DIR}/${backup_name}"
    mkdir -p "$backup_path"
    
    log "Creating $backup_type backup: $backup_name"
    
    # Create backup metadata
    cat > "${backup_path}/backup_metadata.json" << EOF
{
    "name": "$backup_name",
    "type": "$backup_type",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "backup_version": "1.0.0"
}
EOF
    
    # Perform backup based on type
    local backup_success=true
    
    case $backup_type in
        "database")
            if ! backup_database "$backup_name" "$backup_path"; then
                backup_success=false
            fi
            ;;
        "files")
            if ! backup_files "$backup_path"; then
                backup_success=false
            fi
            ;;
        "full"|*)
            if ! backup_database "$backup_name" "$backup_path"; then
                backup_success=false
            fi
            if ! backup_redis "$backup_path"; then
                warning "Redis backup failed, continuing..."
            fi
            if ! backup_files "$backup_path"; then
                backup_success=false
            fi
            ;;
    esac
    
    if [[ "$backup_success" != true ]]; then
        error "Backup creation failed"
        rm -rf "$backup_path"
        return 1
    fi
    
    # Compress backup
    if [[ "$compress" == "true" ]]; then
        log "Compressing backup..."
        cd "$BACKUP_DIR"
        if tar -czf "${backup_name}.tar.gz" "$backup_name"; then
            rm -rf "$backup_name"
            backup_path="${backup_path}.tar.gz"
            log "Backup compressed successfully"
        else
            error "Backup compression failed"
            return 1
        fi
        cd - > /dev/null
    fi
    
    # Encrypt backup
    if [[ "$encrypt" == "true" ]] && command -v gpg &> /dev/null; then
        log "Encrypting backup..."
        local gpg_recipient="${GPG_RECIPIENT:-backup@$(hostname)}"
        
        if gpg --trust-model always --encrypt --recipient "$gpg_recipient" \
           --output "${backup_path}.gpg" "$backup_path"; then
            rm -f "$backup_path"
            backup_path="${backup_path}.gpg"
            log "Backup encrypted successfully"
        else
            warning "Backup encryption failed"
        fi
    fi
    
    # Verify backup
    if [[ "$verify" == "true" ]]; then
        if verify_backup "$backup_name"; then
            log "Backup verification passed"
        else
            warning "Backup verification failed"
        fi
    fi
    
    # Upload to S3
    if [[ "$upload_s3" == "true" ]] && [[ -n "$S3_BACKUP_BUCKET" ]]; then
        if upload_to_s3 "$backup_path" "$backup_name"; then
            log "Backup uploaded to S3 successfully"
        else
            warning "S3 upload failed"
        fi
    fi
    
    log "Backup completed: $(basename "$backup_path")"
    echo "$(basename "$backup_path")"  # Return backup filename
    
    return 0
}

# Upload backup to S3
upload_to_s3() {
    local local_path="$1"
    local backup_name="$2"
    
    if [[ -z "$S3_BACKUP_BUCKET" ]]; then
        error "S3 bucket not configured"
        return 1
    fi
    
    log "Uploading backup to S3: s3://${S3_BACKUP_BUCKET}/${backup_name}"
    
    # Upload with metadata
    if aws s3 cp "$local_path" "s3://${S3_BACKUP_BUCKET}/${backup_name}" \
        --metadata "project=${PROJECT_NAME},timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --storage-class STANDARD_IA; then
        log "S3 upload completed"
        return 0
    else
        error "S3 upload failed"
        return 1
    fi
}

# List available backups
list_backups() {
    local show_s3="${SHOW_S3:-false}"
    
    log "Available local backups:"
    
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        info "No local backups found"
    else
        # List local backups with details
        find "$BACKUP_DIR" -name "${PROJECT_NAME}_*" -type f | sort -r | while read -r backup; do
            local name=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d. -f1)
            
            echo "  $name ($size, $date)"
        done
    fi
    
    # List S3 backups if requested
    if [[ "$show_s3" == "true" ]] && [[ -n "$S3_BACKUP_BUCKET" ]] && command -v aws &> /dev/null; then
        log "Available S3 backups:"
        
        if aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive | grep "${PROJECT_NAME}_" | sort -r | head -20; then
            :  # Command succeeded
        else
            warning "Failed to list S3 backups"
        fi
    fi
}

# Restore from backup
restore_backup() {
    local backup_name="${BACKUP_NAME:-latest}"
    local dry_run="${DRY_RUN:-false}"
    local backup_date="${BACKUP_DATE:-}"
    
    local backup_path=""
    
    # Find backup file
    if [[ "$backup_name" == "latest" ]]; then
        backup_path=$(find "$BACKUP_DIR" -name "${PROJECT_NAME}_*" -type f | sort -r | head -n1)
        if [[ -z "$backup_path" ]]; then
            error "No backups found"
            return 1
        fi
        backup_name=$(basename "$backup_path")
    elif [[ -n "$backup_date" ]]; then
        backup_path=$(find "$BACKUP_DIR" -name "${PROJECT_NAME}_*${backup_date}*" -type f | head -n1)
        if [[ -z "$backup_path" ]]; then
            error "No backup found for date: $backup_date"
            return 1
        fi
        backup_name=$(basename "$backup_path")
    else
        # Look for exact match
        for ext in "" ".tar.gz" ".gpg"; do
            if [[ -f "${BACKUP_DIR}/${backup_name}${ext}" ]]; then
                backup_path="${BACKUP_DIR}/${backup_name}${ext}"
                break
            fi
        done
        
        if [[ -z "$backup_path" ]]; then
            error "Backup not found: $backup_name"
            return 1
        fi
    fi
    
    log "Restoring from backup: $(basename "$backup_path")"
    
    if [[ "$dry_run" == "true" ]]; then
        log "DRY RUN - Would restore from: $backup_path"
        return 0
    fi
    
    # Create temporary directory for extraction
    local temp_dir=$(mktemp -d)
    
    # Extract backup
    local extract_dir="$temp_dir"
    
    if [[ "$backup_path" == *.gpg ]]; then
        log "Decrypting backup..."
        if ! gpg --decrypt "$backup_path" > "${temp_dir}/backup.tar.gz"; then
            error "Failed to decrypt backup"
            rm -rf "$temp_dir"
            return 1
        fi
        backup_path="${temp_dir}/backup.tar.gz"
    fi
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        log "Extracting compressed backup..."
        if ! tar -xzf "$backup_path" -C "$temp_dir"; then
            error "Failed to extract backup"
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Find extracted directory
        extract_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "${PROJECT_NAME}_*" | head -n1)
        if [[ -z "$extract_dir" ]]; then
            error "Invalid backup structure"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        extract_dir="$backup_path"
    fi
    
    # Stop services before restore
    log "Stopping services for restore..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore database
    if [[ -f "${extract_dir}/database.sql" ]]; then
        log "Restoring database..."
        
        # Start database service
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        
        # Wait for database to be ready
        local db_ready=false
        for ((i=1; i<=60; i++)); do
            if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready \
               -U "$DB_USER" -d postgres > /dev/null 2>&1; then
                db_ready=true
                break
            fi
            sleep 2
        done
        
        if [[ "$db_ready" != true ]]; then
            error "Database failed to start"
            rm -rf "$temp_dir"
            return 1
        fi
        
        # Restore database
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
           -U "$DB_USER" -d postgres < "${extract_dir}/database.sql"; then
            log "Database restored successfully"
        else
            error "Database restore failed"
            rm -rf "$temp_dir"
            return 1
        fi
    fi
    
    # Restore Redis
    if [[ -f "${extract_dir}/redis.rdb" ]]; then
        log "Restoring Redis data..."
        
        # Start Redis service
        docker-compose -f "$COMPOSE_FILE" up -d redis
        sleep 5
        
        # Copy RDB file (Redis must be stopped for this)
        docker-compose -f "$COMPOSE_FILE" stop redis
        
        # Copy backup RDB file
        docker-compose -f "$COMPOSE_FILE" run --rm -v "${extract_dir}:/backup" redis \
            sh -c "cp /backup/redis.rdb /data/dump.rdb && chown redis:redis /data/dump.rdb"
        
        docker-compose -f "$COMPOSE_FILE" up -d redis
        log "Redis data restored"
    fi
    
    # Restore files
    if [[ -d "${extract_dir}/uploads" ]]; then
        log "Restoring uploads..."
        rm -rf uploads
        cp -r "${extract_dir}/uploads" ./
        log "Uploads restored"
    fi
    
    # Restore configuration files (with confirmation)
    local config_files=("nginx.conf" "logging.conf")
    for file in "${config_files[@]}"; do
        if [[ -f "${extract_dir}/${file}" ]]; then
            if [[ -f "$file" ]]; then
                cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
            fi
            cp "${extract_dir}/${file}" ./
            log "Configuration restored: $file"
        fi
    done
    
    # Start all services
    log "Starting all services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    sleep 30
    
    # Verify restore
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
       -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log "Restore verification passed"
    else
        warning "Restore verification failed"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "Restore completed successfully"
    return 0
}

# Verify backup integrity
verify_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    # Find backup file with extensions
    for ext in "" ".tar.gz" ".gpg"; do
        if [[ -f "${backup_path}${ext}" ]]; then
            backup_path="${backup_path}${ext}"
            break
        fi
    done
    
    if [[ ! -f "$backup_path" ]]; then
        error "Backup file not found: $backup_name"
        return 1
    fi
    
    log "Verifying backup: $(basename "$backup_path")"
    
    # Basic file integrity check
    if [[ "$backup_path" == *.tar.gz ]]; then
        if tar -tzf "$backup_path" > /dev/null 2>&1; then
            log "Archive integrity check passed"
        else
            error "Archive integrity check failed"
            return 1
        fi
    fi
    
    # TODO: Add more comprehensive verification
    # - Database dump validation
    # - File count verification
    # - Checksums verification
    
    return 0
}

# Clean old backups
cleanup_backups() {
    local retention_days="${RETENTION_DAYS}"
    
    log "Cleaning backups older than $retention_days days..."
    
    local deleted_count=0
    
    # Clean local backups
    while IFS= read -r -d '' backup; do
        if [[ -f "$backup" ]]; then
            rm -f "$backup"
            ((deleted_count++))
            log "Deleted old backup: $(basename "$backup")"
        fi
    done < <(find "$BACKUP_DIR" -name "${PROJECT_NAME}_*" -type f -mtime +$retention_days -print0 2>/dev/null)
    
    # Clean S3 backups if configured
    if [[ -n "$S3_BACKUP_BUCKET" ]] && command -v aws &> /dev/null; then
        log "Cleaning old S3 backups..."
        
        local cutoff_date=$(date -d "$retention_days days ago" +%Y-%m-%d 2>/dev/null || \
                           date -v-${retention_days}d +%Y-%m-%d 2>/dev/null)
        
        aws s3 ls "s3://${S3_BACKUP_BUCKET}/" | while read -r line; do
            local backup_date=$(echo "$line" | awk '{print $1}')
            local backup_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$backup_date" < "$cutoff_date" ]] && [[ "$backup_name" == ${PROJECT_NAME}_* ]]; then
                if aws s3 rm "s3://${S3_BACKUP_BUCKET}/${backup_name}"; then
                    ((deleted_count++))
                    log "Deleted old S3 backup: $backup_name"
                fi
            fi
        done 2>/dev/null || true
    fi
    
    if [[ $deleted_count -eq 0 ]]; then
        info "No old backups found to delete"
    else
        log "Deleted $deleted_count old backups"
    fi
}

# Setup automated backup schedule
setup_schedule() {
    local schedule="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily
    local cron_user="${CRON_USER:-$(whoami)}"
    
    log "Setting up automated backup schedule: $schedule"
    
    # Create backup script wrapper
    local wrapper_script="/usr/local/bin/${PROJECT_NAME}-backup"
    
    cat > "$wrapper_script" << EOF
#!/bin/bash
cd "$PWD"
export PATH="\$PATH:/usr/local/bin:/usr/bin:/bin"
$(realpath "$0") backup --type full --s3 --cleanup
EOF
    
    chmod +x "$wrapper_script"
    
    # Add to crontab
    (crontab -u "$cron_user" -l 2>/dev/null; echo "$schedule $wrapper_script") | \
        crontab -u "$cron_user" -
    
    log "Automated backup schedule configured for user: $cron_user"
    log "Schedule: $schedule"
    log "Script: $wrapper_script"
    
    # Show next few scheduled runs
    log "Next scheduled backup times:"
    echo "$schedule $wrapper_script" | cronexpr -n 5 2>/dev/null || \
        info "Install cronexpr to see next scheduled times"
}

# Parse command line arguments
COMMAND="backup"
BACKUP_TYPE="full"
BACKUP_NAME=""
COMPRESS_BACKUP="true"
ENCRYPT_BACKUP="false"
VERIFY_BACKUP="false"
UPLOAD_S3="false"
DRY_RUN="false"
SHOW_S3="false"
BACKUP_DATE=""
QUIET="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        backup|restore|list|cleanup|schedule|verify|upload)
            COMMAND="$1"
            shift
            ;;
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --name)
            BACKUP_NAME="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --backup)
            BACKUP_NAME="$2"
            shift 2
            ;;
        --date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        --compress)
            COMPRESS_BACKUP="true"
            shift
            ;;
        --encrypt)
            ENCRYPT_BACKUP="true"
            shift
            ;;
        --s3)
            UPLOAD_S3="true"
            shift
            ;;
        --verify)
            VERIFY_BACKUP="true"
            shift
            ;;
        --latest)
            BACKUP_NAME="latest"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --show-s3)
            SHOW_S3="true"
            shift
            ;;
        --quiet)
            QUIET="true"
            shift
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

# Redirect output if quiet mode
if [[ "$QUIET" == "true" ]]; then
    exec > /dev/null
fi

# Initialize
check_prerequisites

# Execute command
case $COMMAND in
    "backup")
        create_backup
        if [[ "${UPLOAD_S3}" == "true" ]] || [[ -n "${S3_BACKUP_BUCKET}" ]]; then
            UPLOAD_S3="true" create_backup
        fi
        cleanup_backups
        ;;
    
    "restore")
        restore_backup
        ;;
    
    "list")
        list_backups
        ;;
    
    "cleanup")
        cleanup_backups
        ;;
    
    "schedule")
        setup_schedule
        ;;
    
    "verify")
        if [[ -n "$BACKUP_NAME" ]]; then
            verify_backup "$BACKUP_NAME"
        else
            error "Backup name required for verification"
            exit 1
        fi
        ;;
    
    "upload")
        if [[ -n "$BACKUP_NAME" ]] && [[ -n "$S3_BACKUP_BUCKET" ]]; then
            backup_path="${BACKUP_DIR}/${BACKUP_NAME}"
            upload_to_s3 "$backup_path" "$BACKUP_NAME"
        else
            error "Backup name and S3 bucket required for upload"
            exit 1
        fi
        ;;
    
    *)
        error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac