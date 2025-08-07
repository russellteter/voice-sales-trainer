#!/bin/bash

echo "🚀 Pushing Voice Sales Trainer to GitHub..."
echo "============================================="

# Get GitHub username from user
echo "What's your GitHub username?"
read -p "GitHub username: " GITHUB_USERNAME

echo ""
echo "📝 Setting up GitHub remote..."

# Add GitHub remote
git remote add origin https://github.com/$GITHUB_USERNAME/voice-sales-trainer.git

# Set main branch
git branch -M main

# Push to GitHub
echo "📤 Pushing code to GitHub..."
git push -u origin main

echo ""
echo "✅ Success! Your code is now on GitHub at:"
echo "🌐 https://github.com/$GITHUB_USERNAME/voice-sales-trainer"
echo ""
echo "🎯 Next step: Go to Railway and deploy from this GitHub repo!"
echo ""
echo "Railway deployment URL: https://railway.app"