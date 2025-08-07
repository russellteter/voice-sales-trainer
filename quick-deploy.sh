#!/bin/bash

# Voice Sales Trainer - Quick Deployment Script
# Get your app live in 15 minutes!

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
PLATFORMS=("railway" "render" "digitalocean" "aws")
SELECTED_PLATFORM=""
PROJECT_NAME="voice-sales-trainer"

# Logging functions
log() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ [ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}⚠️  [WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

title() {
    echo -e "${BOLD}${BLUE}$1${NC}"
}

# Show banner
show_banner() {
    cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        🎯 Voice Sales Trainer - Quick Deploy            ║
║                                                          ║
║        Get your AI-powered voice training platform      ║
║        live in just 15 minutes!                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
    echo
}

# Check prerequisites
check_prerequisites() {
    title "🔍 Checking Prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "backend" ]]; then
        error "Please run this script from the Voice Sales Trainer root directory"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3.8+ first."
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    log "All prerequisites are met!"
}

# Get API keys from user
get_api_keys() {
    title "🔑 API Keys Setup"
    echo "You'll need API keys from:"
    echo "  • ElevenLabs (for voice synthesis)"
    echo "  • Claude/Anthropic (for AI coaching)"
    echo
    
    # ElevenLabs API Key
    while [[ -z "${ELEVENLABS_API_KEY:-}" ]]; do
        echo -n "Enter your ElevenLabs API key: "
        read -s ELEVENLABS_API_KEY
        echo
        if [[ -z "$ELEVENLABS_API_KEY" ]]; then
            warning "ElevenLabs API key is required for voice functionality"
        fi
    done
    
    # Claude API Key
    while [[ -z "${CLAUDE_API_KEY:-}" ]]; do
        echo -n "Enter your Claude API key: "
        read -s CLAUDE_API_KEY
        echo
        if [[ -z "$CLAUDE_API_KEY" ]]; then
            warning "Claude API key is required for AI coaching features"
        fi
    done
    
    # Generate JWT secret
    JWT_SECRET_KEY=$(openssl rand -hex 32)
    
    log "API keys configured successfully!"
}

# Platform selection
select_platform() {
    title "🚀 Select Deployment Platform"
    echo
    echo "Choose your deployment platform:"
    echo
    echo "1) Railway      - Fast, easy, built-in databases ($20-100/mo)"
    echo "2) Render       - Great free tier, simple setup ($0-75/mo)"
    echo "3) DigitalOcean - Balanced features and cost ($40-150/mo)"
    echo "4) Manual Setup - I'll configure it myself"
    echo
    echo -n "Enter your choice (1-4): "
    read -n 1 choice
    echo
    echo
    
    case $choice in
        1) SELECTED_PLATFORM="railway";;
        2) SELECTED_PLATFORM="render";;
        3) SELECTED_PLATFORM="digitalocean";;
        4) SELECTED_PLATFORM="manual";;
        *) 
            warning "Invalid selection, defaulting to Railway"
            SELECTED_PLATFORM="railway"
            ;;
    esac
    
    log "Selected platform: $SELECTED_PLATFORM"
}

# Railway deployment
deploy_railway() {
    title "🚂 Deploying to Railway"
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        info "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    info "Please login to Railway (browser will open)..."
    railway login
    
    # Initialize project
    info "Initializing Railway project..."
    railway init
    
    # Add databases
    info "Adding PostgreSQL database..."
    railway add postgresql
    
    info "Adding Redis cache..."
    railway add redis
    
    # Set environment variables
    info "Configuring environment variables..."
    railway variables set ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY"
    railway variables set CLAUDE_API_KEY="$CLAUDE_API_KEY"
    railway variables set JWT_SECRET_KEY="$JWT_SECRET_KEY"
    railway variables set ENVIRONMENT="production"
    railway variables set DEBUG="false"
    railway variables set LOG_LEVEL="INFO"
    railway variables set MAX_CONCURRENT_SESSIONS="100"
    
    # Deploy backend
    info "Deploying backend service..."
    cd backend
    railway up --detach
    cd ..
    
    # Deploy frontend
    info "Deploying frontend service..."
    railway up --detach
    
    # Get the URL
    FRONTEND_URL=$(railway status --json | jq -r '.services[] | select(.name=="frontend") | .url')
    BACKEND_URL=$(railway status --json | jq -r '.services[] | select(.name=="backend") | .url')
    
    # Update CORS settings
    railway variables set FRONTEND_URL="$FRONTEND_URL"
    railway variables set BACKEND_URL="$BACKEND_URL"
    railway variables set CORS_ALLOWED_ORIGINS="$FRONTEND_URL"
    
    log "Railway deployment initiated!"
    log "Frontend URL: $FRONTEND_URL"
    log "Backend URL: $BACKEND_URL"
}

# Render deployment
deploy_render() {
    title "🎨 Setting up Render Deployment"
    
    info "Creating render.yaml configuration..."
    
    # The render.yaml file is already created by the strategy guide
    
    warning "Manual steps required:"
    echo "1. Go to https://render.com and create account"
    echo "2. Connect your GitHub repository"
    echo "3. Create a new Blueprint and upload the render.yaml file"
    echo "4. Set these environment variables in Render dashboard:"
    echo "   - ELEVENLABS_API_KEY: $ELEVENLABS_API_KEY"
    echo "   - CLAUDE_API_KEY: $CLAUDE_API_KEY"
    echo "   - JWT_SECRET_KEY: $JWT_SECRET_KEY"
    echo "5. Deploy the blueprint"
    
    log "Render configuration files created! Follow the manual steps above."
}

# DigitalOcean deployment
deploy_digitalocean() {
    title "🌊 Setting up DigitalOcean Deployment"
    
    # Check doctl CLI
    if ! command -v doctl &> /dev/null; then
        warning "DigitalOcean CLI (doctl) not found"
        echo "Please install it: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        echo "Then run: doctl auth init"
        return 1
    fi
    
    info "Creating DigitalOcean app specification..."
    
    # Update the .do/app.yaml with actual values
    sed -i "s/your-elevenlabs-key-here/$ELEVENLABS_API_KEY/g" .do/app.yaml
    sed -i "s/your-claude-key-here/$CLAUDE_API_KEY/g" .do/app.yaml
    sed -i "s/your-jwt-secret-key-here/$JWT_SECRET_KEY/g" .do/app.yaml
    
    info "Deploying to DigitalOcean..."
    doctl apps create --spec .do/app.yaml
    
    log "DigitalOcean deployment initiated!"
    log "Check your DigitalOcean dashboard for deployment status"
}

# Manual setup instructions
show_manual_setup() {
    title "📋 Manual Setup Instructions"
    
    echo "Environment variables you need to set:"
    echo
    echo "DATABASE_URL=postgresql://user:pass@host:5432/voice_sales_trainer"
    echo "REDIS_URL=redis://:password@host:6379/0"
    echo "ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY"
    echo "CLAUDE_API_KEY=$CLAUDE_API_KEY"
    echo "JWT_SECRET_KEY=$JWT_SECRET_KEY"
    echo "ENVIRONMENT=production"
    echo "DEBUG=false"
    echo "FRONTEND_URL=https://your-domain.com"
    echo "BACKEND_URL=https://api.your-domain.com"
    echo "CORS_ALLOWED_ORIGINS=https://your-domain.com"
    echo
    echo "Deployment commands:"
    echo "1. Backend: cd backend && pip install -r requirements.txt && gunicorn main:app --worker-class uvicorn.workers.UvicornWorker"
    echo "2. Frontend: npm ci && npm run build && npm start"
    echo "3. Database: cd backend && alembic upgrade head"
    echo
    log "Manual setup guide created!"
}

# Health check
run_health_check() {
    title "🔍 Running Health Checks"
    
    if [[ "$SELECTED_PLATFORM" == "railway" ]]; then
        info "Waiting for services to start..."
        sleep 60
        
        # Get service URLs
        FRONTEND_URL=$(railway status --json | jq -r '.services[] | select(.name=="frontend") | .url')
        BACKEND_URL=$(railway status --json | jq -r '.services[] | select(.name=="backend") | .url')
        
        # Test backend
        if curl -f -s --max-time 30 "$BACKEND_URL/health" > /dev/null; then
            log "Backend health check passed!"
        else
            warning "Backend health check failed. Services may still be starting..."
        fi
        
        # Test frontend
        if curl -f -s --max-time 30 "$FRONTEND_URL/api/health" > /dev/null; then
            log "Frontend health check passed!"
        else
            warning "Frontend health check failed. Services may still be starting..."
        fi
    else
        info "Health checks will need to be run manually after deployment completes"
    fi
}

# Show success message
show_success() {
    title "🎉 Deployment Complete!"
    
    cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 Your Voice Sales Trainer is now LIVE! 🚀          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
    
    echo
    log "Platform: $SELECTED_PLATFORM"
    
    if [[ "$SELECTED_PLATFORM" == "railway" ]]; then
        echo "🌐 Frontend: $FRONTEND_URL"
        echo "🔧 Backend: $BACKEND_URL"
        echo "📚 API Docs: $BACKEND_URL/docs"
        echo "💓 Health: $BACKEND_URL/health"
    fi
    
    echo
    echo "Next steps:"
    echo "1. Test your application"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up monitoring alerts"
    echo "4. Review security settings"
    echo
    
    info "Check the PRODUCTION_DEPLOYMENT_STRATEGY.md file for advanced configuration!"
}

# Main execution
main() {
    show_banner
    check_prerequisites
    get_api_keys
    select_platform
    
    case $SELECTED_PLATFORM in
        "railway")
            deploy_railway
            run_health_check
            ;;
        "render")
            deploy_render
            ;;
        "digitalocean")
            deploy_digitalocean
            ;;
        "manual")
            show_manual_setup
            ;;
    esac
    
    show_success
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Deployment cancelled by user${NC}"; exit 130' INT

# Run main function
main "$@"