# 🚀 Deploy Voice Sales Trainer - LIVE URL in 5 Minutes

## Option 1: Railway Web (Fastest - 2 minutes)

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Click **"Deploy from GitHub repo"**
4. Upload this entire project folder
5. Railway auto-detects everything and deploys!

**Your live URLs will be:**
- Frontend: `https://voice-sales-trainer.up.railway.app`  
- API: `https://voice-sales-trainer-backend.up.railway.app`
- Docs: `https://voice-sales-trainer-backend.up.railway.app/docs`

## Option 2: Railway CLI (5 minutes)

```bash
# Login to Railway
railway login

# Deploy from current directory
railway init
railway up

# Set environment variables (optional)
railway variables set ELEVENLABS_API_KEY=your_key_here
railway variables set CLAUDE_API_KEY=your_key_here
```

## Option 3: Push to GitHub + Deploy (3 minutes)

```bash
# Create GitHub repo and push
gh repo create voice-sales-trainer --public
git remote add origin https://github.com/YOUR_USERNAME/voice-sales-trainer.git
git push -u origin main

# Then go to Railway and connect the GitHub repo
```

## What You Get

✅ **Full-stack application** with frontend + backend + database  
✅ **Real-time voice processing** (when you add API keys)  
✅ **AI-powered coaching** with Claude integration  
✅ **User authentication** and session management  
✅ **Professional UI** with modern design  
✅ **WebSocket support** for live conversations  
✅ **Production monitoring** and health checks  

## API Keys (Optional but Recommended)

For full voice AI functionality, add these in Railway dashboard:
- **ELEVENLABS_API_KEY**: Get from https://elevenlabs.io
- **CLAUDE_API_KEY**: Get from https://console.anthropic.com

The app works without these (with demo data), but voice training requires the API keys.

## Ready to Deploy?

**Choose Option 1** (Railway Web) for the fastest deployment - you'll have a live URL in 2 minutes!

Your Voice Sales Trainer will be production-ready with:
- Professional domain
- SSL certificate  
- Database included
- Auto-scaling
- 99.9% uptime

🎉 **Let's get you live!**