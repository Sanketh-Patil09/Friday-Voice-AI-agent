# 🚀 GitHub Deployment Guide - Friday AI Agent

## Step 1: Initialize Git Repository Locally

```bash
cd /c/Users/mrnek/Desktop/voice_agent_project/pipecat-examples/websocket

# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Friday AI Agent - Premium voice assistant with Pipecat, Groq, Deepgram, ElevenLabs"
```

## Step 2: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `friday-ai-agent`
3. **Description**: `Premium real-time AI voice assistant with live waveform visualization, web search, and glassmorphic UI`
4. **Visibility**: **Public** (if you want it open-source)
5. **DO NOT initialize** with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 3: Connect Local Repository to GitHub

Replace `YOUR_USERNAME` with your GitHub username:

```bash
cd /c/Users/mrnek/Desktop/voice_agent_project/pipecat-examples/websocket

# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/friday-ai-agent.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Or using SSH (if configured):**
```bash
git remote add origin git@github.com:YOUR_USERNAME/friday-ai-agent.git
git branch -M main
git push -u origin main
```

## Step 4: Verify on GitHub

1. Go to: https://github.com/YOUR_USERNAME/friday-ai-agent
2. You should see all files pushed
3. README.md should display nicely on the landing page

## Step 5: Add GitHub Topics (for discoverability)

1. Go to your repo settings
2. Scroll to **"Topics"**
3. Add these tags:
   - `ai`
   - `voice-agent`
   - `pipecat`
   - `groq`
   - `deepgram`
   - `elevenlabs`
   - `websocket`
   - `realtime`

## Step 6: Update Remote URLs (if needed)

If you made a mistake with the remote:

```bash
# Check current remote
git remote -v

# Remove incorrect remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/YOUR_USERNAME/friday-ai-agent.git

# Verify
git remote -v
```

## Step 7: Future Commits & Pushes

```bash
# Make changes to files
# ...

# Stage changes
git add .

# Commit
git commit -m "Add feature description"

# Push to GitHub
git push origin main
```

## Step 8 (Optional): Add GitHub Actions CI/CD

Create `.github/workflows/test.yml`:

```yaml
name: Friday AI Tests

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11']
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        run: |
          cd server
          pip install -r requirements.txt
      - name: Lint with ruff
        run: |
          cd server
          ruff check .
```

## ✅ Checklist Before Publishing

- [ ] Git initialized and pushed to GitHub
- [ ] README.md is comprehensive and clear
- [ ] .gitignore properly excludes sensitive files
- [ ] LICENSE file present
- [ ] `.env.example` shows required API keys (without actual values)
- [ ] Project builds without errors (`npm run build` in client, Python runs in server)
- [ ] GitHub Topics added for discoverability
- [ ] Repository description is clear and compelling

## 🚨 Important: Protect Secrets

**NEVER commit or push:**
- `.env` files (only `.env.example`)
- API keys or tokens
- Database files with real data
- `node_modules/` or `venv/`

These are protected by `.gitignore` ✅

## 📡 Sharing Your Repository

Once pushed, share your repo link:
```
https://github.com/YOUR_USERNAME/friday-ai-agent
```

Include setup instructions in issue templates:

1. Copy `.env.example` to `.env`
2. Add your API keys
3. Run `python server.py`
4. Run `npm run dev`
5. Visit http://localhost:5173

## 🎯 Next Steps

After publishing:
1. **Add badges** to README (build status, version, etc.)
2. **Create GitHub Pages** for documentation
3. **Set up Discussions** for community Q&A
4. **Add Contributing Guidelines** (CONTRIBUTING.md)
5. **Create Release Tags** for versions

---

**You're ready to ship Friday AI Agent to the world! 🚀**
