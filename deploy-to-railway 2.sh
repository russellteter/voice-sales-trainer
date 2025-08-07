#!/bin/bash

echo "🚀 Voice Sales Trainer - Railway Deployment Guide"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Install Railway CLI${NC}"
echo "Run this command to install Railway CLI:"
echo "npm install -g @railway/cli"
echo ""

echo -e "${BLUE}Step 2: Login to Railway${NC}"
echo "Create account and login:"
echo "railway login"
echo ""

echo -e "${BLUE}Step 3: Initialize Railway Project${NC}"
echo "In this directory, run:"
echo "railway init"
echo ""

echo -e "${BLUE}Step 4: Deploy the Application${NC}"
echo "Deploy both frontend and backend:"
echo "railway up"
echo ""

echo -e "${BLUE}Step 5: Set Environment Variables${NC}"
echo "Add your API keys (optional but recommended):"
echo "railway variables set ELEVENLABS_API_KEY=your_elevenlabs_key"
echo "railway variables set CLAUDE_API_KEY=your_claude_key"
echo "railway variables set DATABASE_URL=postgresql://..."
echo ""

echo -e "${YELLOW}Alternative: Use Railway Web Interface${NC}"
echo "1. Go to https://railway.app"
echo "2. Click 'Deploy from GitHub repo'"
echo "3. Connect your GitHub account"
echo "4. Upload this project"
echo "5. Railway will automatically detect and deploy both services"
echo ""

echo -e "${GREEN}Your app will be live at:${NC}"
echo "Frontend: https://[your-project].up.railway.app"
echo "API: https://[your-project]-backend.up.railway.app"
echo ""

echo -e "${GREEN}🎉 That's it! Your Voice Sales Trainer will be live!${NC}"