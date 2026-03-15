# ✦ StudyGenie — AI Study Assistant
### Powered by Google Gemini 1.5 Flash

A fully Google-powered AI study tool with 6 features built with React.

## Features
| Feature | Description |
|---------|-------------|
| 📊 Analyze | Deep AI breakdown — subject, concepts, exam tips |
| 🧩 Quiz | 6 auto-generated multiple-choice questions with scoring |
| 💬 Chat | Multi-turn AI tutor powered by Gemini |
| 📝 Summary | TL;DR, key points, study tips, related topics |
| 🗺️ Mind Map | Visual concept map of your material |
| 🔥 Flashcards | 10 flip-card memory cards |

## Setup

### Get a Free Google AI Key
1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the key (starts with `AIza...`)

### Local Development
```bash
npm install
npm start
```
Paste your key in the app header when it loads.

### Netlify Deployment
1. Push to GitHub or drag this folder into Netlify
2. Go to **Site Settings → Environment Variables**
3. Add: `GOOGLE_API_KEY` = your Google AI key
4. Deploy — build command: `npm run build`, publish dir: `build`

## Tech Stack
- React 18
- Google Gemini 1.5 Flash API
- Google Sans font
- Netlify Functions (optional secure proxy)
