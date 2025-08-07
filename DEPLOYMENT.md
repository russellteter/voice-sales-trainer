# Voice Sales Trainer - Production Deployment Guide

This guide provides comprehensive instructions for deploying the Voice Sales Trainer application to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Environment Setup](#environment-setup)
4. [SSL Certificate Configuration](#ssl-certificate-configuration)
5. [Database Setup](#database-setup)
6. [Docker Deployment](#docker-deployment)
7. [Nginx Configuration](#nginx-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup and Recovery](#backup-and-recovery)
10. [Security Hardening](#security-hardening)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (recommended)
- **CPU**: Minimum 4 cores, 8 cores recommended for production
- **RAM**: Minimum 8GB, 16GB+ recommended for production
- **Storage**: Minimum 100GB SSD, 500GB+ recommended
- **Network**: Static IP address, proper DNS configuration

### Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y nginx certbot python3-certbot-nginx curl wget git htop
```

### External Services

1. **Database**: PostgreSQL 15+ (can be containerized or external)
2. **Redis**: For caching and session management
3. **DNS**: Properly configured A/AAAA records
4. **SSL Certificate**: Let's Encrypt or commercial certificate
5. **API Keys**: ElevenLabs and Claude API keys

## Server Requirements

### Production Server Specifications

| Component | Minimum | Recommended | High-Load |
|-----------|---------|-------------|-----------|
| CPU | 4 cores | 8 cores | 16+ cores |
| RAM | 8GB | 16GB | 32GB+ |
| Storage | 100GB SSD | 500GB SSD | 1TB+ NVMe |
| Network | 100Mbps | 1Gbps | 10Gbps |
| Concurrent Users | 50 | 200 | 1000+ |

### Port Configuration

```bash
# Required open ports
80/tcp    # HTTP (redirects to HTTPS)
443/tcp   # HTTPS
22/tcp    # SSH (restrict to specific IPs)
```

## Environment Setup

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/voice-sales-trainer
sudo chown $USER:$USER /opt/voice-sales-trainer
cd /opt/voice-sales-trainer

# Clone repository
git clone https://github.com/yourusername/voice-sales-trainer.git .
```

### 2. Environment Configuration

```bash
# Copy environment template
cp production.env.example .env

# Edit environment file
nano .env
```

### 3. Required Environment Variables

Update `.env` with your production values:

```env
# Database (Use external managed database for production)
DATABASE_URL=postgresql://username:password@db-host:5432/voice_sales_trainer

# Security
JWT_SECRET_KEY=your-256-bit-secret-key
SECRET_KEY=your-unique-secret-key

# Domain configuration
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com

# API Keys
ELEVENLABS_API_KEY=your-elevenlabs-api-key
CLAUDE_API_KEY=your-claude-api-key

# SSL
USE_SSL=true
FORCE_HTTPS=true

# Performance
MAX_CONCURRENT_SESSIONS=200
WORKER_PROCESSES=4
```

## SSL Certificate Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# Stop nginx if running
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com

# Create SSL directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Option 2: Commercial Certificate

```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificate files
cp your-domain.crt ssl/
cp your-domain.key ssl/
cp ca-bundle.crt ssl/

# Set proper permissions
chmod 600 ssl/your-domain.key
chmod 644 ssl/your-domain.crt ssl/ca-bundle.crt
```

## Database Setup

### Option 1: Managed Database (Recommended)

Use a managed PostgreSQL service like AWS RDS, Google Cloud SQL, or DigitalOcean Managed Databases.

```sql
-- Create database and user
CREATE DATABASE voice_sales_trainer;
CREATE USER voice_trainer WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE voice_sales_trainer TO voice_trainer;
ALTER USER voice_trainer CREATEDB;
```

### Option 2: Self-hosted Database

```bash
# Create database backup directory
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql

# Setup automated backups
echo "0 2 * * * postgres pg_dump voice_sales_trainer > /var/backups/postgresql/backup-\$(date +\%Y\%m\%d-\%H\%M\%S).sql" | sudo crontab -u postgres -
```

## Docker Deployment

### 1. Build and Deploy

```bash
# Create required directories
mkdir -p logs backups uploads monitoring/grafana/dashboards

# Set proper permissions
sudo chown -R 1000:1000 logs uploads backups

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 2. Database Migration

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verify migration
docker-compose -f docker-compose.prod.yml exec backend alembic current
```

### 3. Health Check

```bash
# Check backend health
curl -f http://localhost:8000/health

# Check frontend
curl -f http://localhost:3000/api/health

# Check all services
docker-compose -f docker-compose.prod.yml exec backend python -c "
import requests
import sys
try:
    resp = requests.get('http://localhost:8000/health')
    print('Backend:', resp.status_code)
    resp = requests.get('http://localhost:3000/api/health')
    print('Frontend:', resp.status_code)
except Exception as e:
    print('Error:', e)
    sys.exit(1)
"
```

## Nginx Configuration

### 1. Install Custom Configuration

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test configuration
sudo nginx -t

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Verify Load Balancing

```bash
# Check backend distribution
curl -H "Host: api.your-domain.com" http://localhost/api/v1/health

# Check WebSocket proxying
curl -H "Host: api.your-domain.com" -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/ws/voice
```

## Monitoring Setup

### 1. Configure Monitoring Stack

```bash
# Create monitoring configuration
mkdir -p monitoring/{prometheus,grafana/provisioning/{dashboards,datasources},loki}

# Setup Prometheus configuration
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'voice-sales-trainer-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: /metrics
    scrape_interval: 30s
    
  - job_name: 'voice-sales-trainer-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: /api/metrics
    scrape_interval: 30s
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
    scrape_interval: 30s
EOF

# Setup Grafana datasource
cat > monitoring/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
EOF
```

### 2. Access Monitoring Dashboards

- **Grafana**: https://your-domain.com:3001 (admin/admin)
- **Prometheus**: http://localhost:9090 (internal access only)

## Backup and Recovery

### 1. Automated Backup Script

```bash
# Make backup script executable
chmod +x backup.sh

# Test backup
./backup.sh

# Setup automated backups
echo "0 2 * * * cd /opt/voice-sales-trainer && ./backup.sh" | crontab -
```

### 2. Recovery Procedure

```bash
# List available backups
./backup.sh --list

# Restore from specific backup
./restore.sh backup-20240101-020000.sql

# Verify restoration
docker-compose -f docker-compose.prod.yml exec postgres psql -U voice_trainer -d voice_sales_trainer -c "SELECT COUNT(*) FROM users;"
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. System Security

```bash
# Disable unused services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Setup fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Configure automatic security updates
sudo apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
```

### 3. Application Security

```bash
# Set proper file permissions
sudo chown -R 1000:1000 /opt/voice-sales-trainer
sudo chmod -R 755 /opt/voice-sales-trainer
sudo chmod 600 .env

# Secure Docker daemon
echo '{"icc": false, "userland-proxy": false, "live-restore": true}' | sudo tee /etc/docker/daemon.json
sudo systemctl reload docker
```

## Performance Optimization

### 1. System Optimization

```bash
# Optimize system limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. Database Optimization

```sql
-- Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U voice_trainer voice_sales_trainer

-- Create indexes
CREATE INDEX CONCURRENTLY idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY idx_sessions_created_at ON sessions(created_at);
CREATE INDEX CONCURRENTLY idx_scenarios_category ON scenarios(category);

-- Analyze tables
ANALYZE;
```

### 3. Application Optimization

```bash
# Optimize Docker images
docker system prune -a -f

# Monitor resource usage
docker stats

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=2 --scale frontend=2
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Check system resources
df -h
free -m
docker system df
```

#### 2. Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec backend python -c "
from config.database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
"
```

#### 3. SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -in ssl/your-domain.crt -text -noout | grep "Not After"

# Test SSL configuration
curl -I https://your-domain.com
```

#### 4. Performance Issues

```bash
# Monitor system resources
top
iotop
netstat -tulpn

# Check application metrics
curl http://localhost:8000/metrics
```

### Log Analysis

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100 backend

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View system logs
journalctl -u docker -f
```

### Emergency Recovery

```bash
# Emergency restart all services
docker-compose -f docker-compose.prod.yml restart

# Rollback to previous version
git checkout HEAD~1
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Emergency backup
./backup.sh emergency
```

## Maintenance

### Regular Maintenance Tasks

1. **Daily**: Monitor logs and system resources
2. **Weekly**: Review performance metrics and security logs
3. **Monthly**: Update system packages and Docker images
4. **Quarterly**: Review and rotate API keys and certificates

### Update Procedure

```bash
# 1. Create backup
./backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Update environment if needed
cp production.env.example .env.new
# Merge changes manually

# 4. Rebuild and deploy
docker-compose -f docker-compose.prod.yml build --pull
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 6. Verify deployment
curl -f https://your-domain.com/health
```

### Monitoring Checklist

- [ ] All services are running and healthy
- [ ] SSL certificates are valid and not expiring soon
- [ ] Database backups are being created successfully
- [ ] System resources are within acceptable limits
- [ ] No critical errors in logs
- [ ] External API integrations are working
- [ ] Load balancer is distributing traffic correctly

## Support and Contact

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review application logs for specific error messages
3. Consult the API documentation for integration issues
4. Create an issue in the project repository with deployment logs

## Security Considerations

- Regularly update all system packages and Docker images
- Monitor security advisories for dependencies
- Implement proper access controls and audit logging
- Use strong passwords and enable 2FA where possible
- Regularly review and rotate API keys and secrets
- Monitor for suspicious activities and implement alerting

---

**Note**: This deployment guide assumes a Linux-based production environment. For other operating systems or cloud platforms, adjust the instructions accordingly.