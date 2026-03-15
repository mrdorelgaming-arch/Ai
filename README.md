# 🧠 AI-Powered Smart Study Assistant

A full-stack AI study tool built with React.js + Anthropic Claude AI.
Deployed on Netlify with a secure serverless backend.

## ✨ Features
- 📄 **Content Analyzer** — Extracts key points, concepts, difficulty
- ✏️ **Quiz Generator** — 5 MCQs with scoring & explanations
- 💬 **AI Tutor Chat** — Multi-turn conversational tutor
- 📊 **Smart Summary** — One-liner, bullets, study tips, related topics

## 🛠 Tech Stack
- **Frontend:** React 18, JSX, CSS-in-JS
- **Backend:** Netlify Serverless Functions (Node.js)
- **AI:** Anthropic Claude Sonnet 4
- **Hosting:** Netlify (free tier)

---

## 🚀 Deploy to Netlify (GitHub → Netlify)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - AI Study Assistant"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-study-assistant.git
git push -u origin main
```

### Step 2 — Connect to Netlify
1. Go to [netlify.com](https://netlify.com) → Sign up free
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **"Deploy site"**

### Step 3 — Add API Key
1. In Netlify dashboard → Your site → **Site configuration**
2. Go to **Environment variables** → **Add variable**
3. Key: `ANTHROPIC_API_KEY`
4. Value: `sk-ant-your-key-here` (from [console.anthropic.com](https://console.anthropic.com))
5. Click **Save** → **Deploys** → **Trigger deploy**

✅ Your site is live!

---

## 💻 Run Locally

```bash
npm install
# Create .env file:
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env
npm start
# Open http://localhost:3000
```

## 📁 Project Structure
```
ai-study-assistant/
├── src/
│   ├── App.js              ← Main React app (all UI + AI logic)
│   └── index.js            ← React entry point
├── public/
│   └── index.html          ← HTML template
├── netlify/
│   └── functions/
│       └── claude.js       ← Secure API proxy (API key lives here)
├── netlify.toml            ← Build config + routing
├── package.json            ← Dependencies
└── README.md               ← This file
```

## 🔒 Security
- API key is stored as a **Netlify environment variable**
- Key is **never** sent to the browser
- Netlify Function acts as a secure proxy

## 👨‍💻 Author
**[Your Name]** — Degree Project 2024-2025
Department of Computer Science & Engineering
