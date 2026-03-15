# 🧠 AI Study Assistant

An AI-powered study tool built with React.js and the Google Gemini API.

## Features
- 📄 **Content Analysis** — Extracts subject, difficulty, key points & concepts
- ✏️ **Quiz Generator** — Creates 5 multiple-choice questions with scoring
- 💬 **AI Tutor Chat** — Multi-turn conversation with context awareness
- 📊 **Smart Summary** — One-liner, bullet points, study tips & related topics

## Setup

### Local Development
1. Clone / unzip the project
2. Run `npm install`
3. Run `npm start`
4. Enter your Google AI API key in the app banner (get one free at https://aistudio.google.com/app/apikey)

### Netlify Deployment
1. Push to GitHub or drag-and-drop this folder into Netlify
2. In Netlify → Site Settings → Environment Variables, add:
   - `GOOGLE_API_KEY` = your Google AI API key
3. Deploy — build command is `npm run build`, publish dir is `build`

## Tech Stack
- React 18
- Google Gemini 1.5 Flash API
- Netlify Functions (serverless backend)
