<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=240&text=NeuroWell&fontSize=80&fontColor=00E5FF&color=0:03050f,100:0d1628&desc=AI%20Personal%20Health%20Intelligence%20System&descSize=22&descAlignY=75&descAlign=50" width="100%" />

</div>

<br/>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=18&pause=1000&color=00E5FF&center=true&vCenter=true&width=600&lines=AI-Powered+Personal+Health+Tracker;Voice+Input+and+TTS+Output;Real-time+Emotion+Detection;Interactive+Charts+and+Health+Score;Local+LLM+Integration;Auto+Generated+Health+Reports;Secure+Login+and+Memory;Progressive+Web+App" />
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0-00E5FF?style=for-the-badge&logo=github&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-39ff8f?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/PRs-Welcome-00E5FF?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Status-Active-39ff8f?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Made%20with-❤️%20%26%20AI-ff3d6b?style=for-the-badge"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white"/>
  <img src="https://img.shields.io/badge/LM%20Studio-00E5FF?style=for-the-badge&logo=openai&logoColor=black"/>
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white"/>
</p>

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🧠 What is NeuroWell?

<img align="right" src="https://media.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif" width="280"/>

NeuroWell is a **full-stack AI-powered personal health intelligence system** that runs entirely in your browser — no external server, no cloud, 100% private.

It connects to your **local LLM via LM Studio** (OpenAI-compatible API) to give you a health-aware AI assistant that **remembers you**, detects your **emotions**, speaks back to you with **TTS**, and generates professional **PDF health reports** — all while tracking your sleep, hydration, activity, stress, and mood with beautiful interactive charts.

> 💡 Think of it as your personal AI doctor friend who knows your health history and is always available — running locally on your machine.

<br clear="right"/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## ✨ Features

<div align="center">

| # | Feature | Description | Tech |
|---|---------|-------------|------|
| 01 | 🤖 **Local AI Chat** | Streaming chat with your local LLM — no internet needed | LM Studio · OpenAI API |
| 02 | 🧠 **Long-term Memory** | AI remembers symptoms, goals & preferences across sessions | Custom extraction engine |
| 03 | 😰 **Emotion Detection** | Detects anxiety, sadness, frustration, fatigue & more in real-time | Heuristic NLP + LLM |
| 04 | 🎙️ **Voice Input** | Speak your questions instead of typing | Web Speech API |
| 05 | 🔊 **TTS Readback** | AI reads its responses aloud with speed & pitch controls | Speech Synthesis API |
| 06 | 📊 **Health Dashboard** | Sleep, water, activity, mood & stress charts + health score ring | Chart.js · SVG |
| 07 | 🔍 **Pattern Detection** | 10+ rules detect burnout, dehydration, chronic symptoms & more | Custom rule engine |
| 08 | 📄 **PDF Reports** | Auto-generated weekly health summaries with AI recommendations | jsPDF |
| 09 | 🔐 **Secure Auth** | Login/register with SHA-256 hashed passwords + route guards | Web Crypto API |
| 10 | 📱 **PWA + Offline** | Install like an app, works offline for dashboard & history | Service Worker |

</div>

<br/>

### 🔐 Secure Login System
- Register / Login with email + password
- SHA-256 password hashing (Web Crypto API)
- Session management via localStorage
- Route guards on all protected pages
- One-click demo account with seeded data

### 📊 Interactive Health Dashboard
- **Health Score Ring** — dynamic SVG gauge (0–100)
- **Week Calendar** — color-coded daily status dots
- **4 Metric Cards** — Sleep, Water, Activity, Mood with trends
- **Chart.js Charts:**
  - Sleep Line Chart (7-day)
  - Hydration Bar Chart (color-coded)
  - Mood vs Stress dual-line chart
  - Wellness Radar Chart (5-axis balance)
- **Daily Log Form** with sliders, symptom tags, voice notes

### 🧠 Smart Pattern Detection Engine
10+ rule-based pattern detectors:
- 🔥 Burnout Risk (low sleep + high stress)
- 💧 Dehydration Risk
- 🤕 Chronic Headache Pattern
- 🦥 Sedentary Lifestyle Alert
- 😰 Rising Anxiety Detection
- 🌙 Sleep Excellence Streak
- 😔 Mood Decline Detection
- 🏆 Hydration/Activity Achievements
- 🤢 Recurring Nausea Alert

### 🎙️ Voice Input (Web Speech API)
- Speak symptoms or notes instead of typing
- Live interim results display
- Visual recording indicator
- Works in Chrome, Edge, Safari

### 🤖 AI Chat Assistant
- Health-context-aware conversations
- Full chat history persistence
- Suggested questions & voice input support
- Markdown-formatted responses
- Quick context panel with live health data

### 📄 PDF Report Generator (jsPDF)
- Cover page with patient info
- Health score visualization
- Weekly averages table
- 7-day daily log table (color-coded)
- Pattern alerts section + AI recommendations
- Professional medical footer

### 📱 Progressive Web App (PWA)
- Install to home screen on mobile/desktop
- Offline support via Service Worker
- App-like experience + push notification ready

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 📸 Screenshots

### 📊 Dashboard
<img src="https://raw.githubusercontent.com/Jags-08/ai-ml-journey/main/neurowell-ai-health-system/assets/dashboard.png" />

### 🧠 AI Assistant
<img src="https://raw.githubusercontent.com/Jags-08/ai-ml-journey/main/neurowell-ai-health-system/assets/ai.png" />

### 📄 Reports
<img src="https://raw.githubusercontent.com/Jags-08/ai-ml-journey/main/neurowell-ai-health-system/assets/reports.png" />

### 📋 Log History
<img src="https://raw.githubusercontent.com/Jags-08/ai-ml-journey/main/neurowell-ai-health-system/assets/log.png" />

### ⚠️ Alerts
<img src="https://raw.githubusercontent.com/Jags-08/ai-ml-journey/main/neurowell-ai-health-system/assets/alerts.png" />

### 📑 PDF Report
<img src="./assets/pdf.png" width="80%"/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 📁 Project Structure

```
neurowell/
│
├── 📄 index.html           ← Login / Register / Landing page
├── 📊 dashboard.html       ← Main health hub (charts, log form, alerts)
├── 🧠 chat.html            ← AI assistant (streaming, voice, emotion)
├── 📋 reports.html         ← Full reports + log table + PDF download
├── 📱 manifest.json        ← PWA manifest (installable app)
├── ⚙️  sw.js               ← Service Worker (offline support)
│
├── css/
│   ├── 🎨 main.css         ← Design system (biopunk neural theme)
│   ├── 📊 dashboard.css    ← Charts, metric cards, log form styles
│   └── 💬 chat.css         ← Claude-style chat UI
│
├── js/
│   ├── 💾 storage.js       ← localStorage "SQL" database layer
│   ├── 🔐 auth.js          ← Login, register, sessions, route guards
│   ├── 🔍 patterns.js      ← Smart pattern detection engine (10+ rules)
│   ├── ⚙️  llm-config.js   ← LM Studio config · auto-detect · streaming
│   ├── 🧠 memory.js        ← Long-term memory extraction & injection
│   ├── 😰 emotion.js       ← Real-time emotion detection (10 emotions)
│   ├── 🔊 tts.js           ← Text-to-speech voice output
│   ├── 🎙️  voice.js        ← Web Speech API voice input
│   ├── 📄 pdf.js           ← jsPDF weekly health report generator
│   ├── 🖼️  app.js          ← Neural canvas, sidebar, toasts, utils
│   ├── 📊 dashboard.js     ← Chart.js charts, log form, metrics
│   └── 💬 chat.js          ← Streaming AI chat with memory + emotion
│
└── assets/
    └── icons/              ← PWA icons (icon-192.png, icon-512.png)
```

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🛠️ Tech Stack

<div align="center">

**💻 Core Languages**

<img src="https://skillicons.dev/icons?i=python,javascript,html,css&theme=dark"/>

<br/><br/>

**🤖 AI & LLM**

<img src="https://img.shields.io/badge/LM%20Studio-00E5FF?style=for-the-badge&logo=openai&logoColor=black"/>
&nbsp;
<img src="https://img.shields.io/badge/OpenAI%20Compatible%20API-412991?style=for-the-badge&logo=openai&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/GPT--4o%20OSS%2020B-00E5FF?style=for-the-badge&logo=openai&logoColor=black"/>
&nbsp;
<img src="https://img.shields.io/badge/Streaming%20SSE-39ff8f?style=for-the-badge&logo=lightning&logoColor=black"/>

<br/><br/>

**🎙️ Voice & Audio**

<img src="https://img.shields.io/badge/Web%20Speech%20API-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Speech%20Synthesis%20API-34A853?style=for-the-badge&logo=google&logoColor=white"/>

<br/><br/>

**📊 Visualization**

<img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/SVG%20Animations-FFB13B?style=for-the-badge&logo=svg&logoColor=black"/>

<br/><br/>

**📄 Reports & Storage**

<img src="https://img.shields.io/badge/jsPDF-FF0000?style=for-the-badge&logo=adobe&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/localStorage%20DB-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
&nbsp;
<img src="https://img.shields.io/badge/Web%20Crypto%20API-00897B?style=for-the-badge&logo=letsencrypt&logoColor=white"/>

<br/><br/>

**📱 PWA**

<img src="https://img.shields.io/badge/Service%20Worker-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white"/>
&nbsp;
<img src="https://img.shields.io/badge/Offline%20Ready-39ff8f?style=for-the-badge&logo=cloudflare&logoColor=black"/>

<br/><br/>

| Layer | Technology |
|-------|------------|
| Frontend UI | HTML5, CSS3, JavaScript |
| Styling | Custom CSS Design System |
| Charts | Chart.js |
| AI Backend | LM Studio · OpenAI-compatible API |
| PDF | jsPDF (CDN) |
| Voice | Web Speech API |
| Data Storage | localStorage (SQL-like) |
| PWA | Service Worker |
| Auth | Web Crypto (SHA-256) |
| Fonts | Google Fonts (DM Serif + Outfit + Space Mono) |

</div>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## ⚡ Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Jags-08/neurowell.git
cd neurowell
```

### 2️⃣ Set Up LM Studio

```
1. Download LM Studio → https://lmstudio.ai
2. Load any OpenAI-compatible model (e.g. GPT-4o OSS 20B)
3. Go to Local Server tab
4. Enable CORS → Allow all origins
5. Click "Start Server" on port 1234
```

### 3️⃣ Open the App

```bash
# Just open in Chrome or Edge — no build step needed!
open index.html

# Or use a local server:
npx serve .
# → http://localhost:3000
```

### 4️⃣ Try the Demo

```
Click "⚡ Try Demo Account" on the login page
→ Instantly loads 2 weeks of seeded health data
→ AI chat, charts, patterns, PDF — all ready to explore
```

> ✅ **No npm install. No backend setup. No API keys needed.** Just open and go.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🧠 Smart Pattern Detection Engine

NeuroWell automatically analyzes your health logs and fires alerts when risky patterns are detected:

```
🔥 "Low sleep + high stress for 4 days → Possible burnout risk"
💧 "Water intake below 5 glasses for 3 days → Risk of dehydration"
🤕 "Headache reported 3 times in 7 days → Consider consulting a doctor"
🦥 "Physical activity below 20 mins for 4 days → Aim for 30+ mins daily"
😰 "Anxiety + high stress pattern detected → Try mindfulness exercises"
🌙 "Excellent sleep for 4 consecutive days → Keep it up!"
😔 "Mood score dropped by 3 points this week → Consider talking to someone"
🏆 "8+ glasses of water for 4 days → Outstanding hydration habit!"
```

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 😰 Emotion Detection

The AI detects your emotional state from every message and adapts its tone:

<div align="center">

| Emotion | Trigger Keywords | AI Response Tone |
|---------|-----------------|------------------|
| 😰 Anxious | anxious, worried, panic, nervous | Calm & soothing |
| 😔 Sad | sad, depressed, hopeless, crying | Deep empathy |
| 😤 Frustrated | frustrated, angry, fed up | Validating & direct |
| 😊 Happy | great, amazing, excited, grateful | Upbeat & encouraging |
| 😴 Tired | tired, exhausted, drained, burnout | Gentle & simple |
| 🤕 In Pain | pain, hurt, ache, throbbing | Concerned & careful |
| 😨 Scared | scared, afraid, uncertain | Reassuring & factual |
| 😵 Overwhelmed | overwhelmed, can't cope, too much | Supportive & step-by-step |

</div>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🔐 Security & Privacy

```python
security = {
    "passwords"   : "SHA-256 hashed via Web Crypto API",
    "storage"     : "100% local — localStorage only, no server",
    "ai_calls"    : "localhost:1234 only — never leaves your machine",
    "sessions"    : "Browser session tokens with route guards",
    "tracking"    : "Zero — no analytics, no telemetry, no ads",
    "data_export" : "Full export available anytime"
}
```

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 📐 Design System

**🎨 Color Palette**

| Name | Hex | Usage |
|------|-----|-------|
| Background Void | `#03050f` | Page background |
| Cyan Accent | `#00e5ff` | Primary highlight |
| Bio Green | `#39ff8f` | Success & positive |
| Alert Amber | `#ffab00` | Warnings |
| Danger Red | `#ff3d6b` | Alerts & errors |
| Violet | `#b388ff` | Accents & mood |

**✍️ Typography**

| Role | Font |
|------|------|
| Display | `DM Serif Display` |
| UI | `Outfit` |
| Code / Numbers | `Space Mono` |

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🌐 Deploy Online

<details>
<summary><b>📦 GitHub Pages (Free)</b></summary>

```bash
git push origin main
# GitHub → Settings → Pages → Source: main → Save
# Live at: https://Jags-08.github.io/neurowell/
```
> Use Cloudflare Tunnel to expose LM Studio: `cloudflared tunnel --url http://localhost:1234`
</details>

<details>
<summary><b>🌩️ Netlify (Free, drag & drop)</b></summary>

```
1. netlify.com → New Site → Drag & drop the neurowell/ folder
2. Done — live in 30 seconds
```
</details>

<details>
<summary><b>🖥️ Self-hosted VPS (Nginx)</b></summary>

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/neurowell;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/llm/ {
        proxy_pass http://localhost:1234/;
        add_header Access-Control-Allow-Origin *;
    }
}
```
</details>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🗺️ Pages Overview

<div align="center">

| Page | File | Description |
|------|------|-------------|
| 🔐 Login / Register | `index.html` | Auth + animated landing with neural canvas |
| 📊 Dashboard | `dashboard.html` | Charts, health score ring, log form, smart alerts |
| 🧠 AI Assistant | `chat.html` | Streaming Claude-style chat with memory + voice |
| 📋 Reports | `reports.html` | Full data table + pattern analysis + PDF download |

</div>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 🎯 Roadmap

```
✅  Local LLM integration (LM Studio streaming)
✅  Voice input + TTS speaker output
✅  Emotion detection + adaptive AI tone
✅  Long-term memory across sessions
✅  10+ smart health pattern rules
✅  PDF health report generation
✅  SHA-256 secure authentication
✅  Progressive Web App (offline support)
🔄  Backend API (Flask / Node.js) with real SQL database
🔄  Deploy online with Cloudflare Tunnel
⬜  Wearable device integration (Fitbit, Apple Health)
⬜  Real-time sync across devices
⬜  Multi-language support
⬜  Medication & appointment reminders
⬜  Doctor sharing mode (export + QR)
⬜  RAG over personal health documents
⬜  Advanced ML predictions
```

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## ⚕️ Medical Disclaimer

> **NeuroWell AI is for informational and wellness purposes only.**
> It is NOT a substitute for professional medical consultation, diagnosis, or treatment.
> For medical emergencies or serious symptoms, always consult a licensed healthcare provider immediately.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 👨‍💻 Author

<div align="center">

<a href="https://github.com/Jags-08">
  <img src="https://img.shields.io/badge/GitHub-Jags--08-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117"/>
</a>
&nbsp;
<a href="https://www.linkedin.com/in/joshi-jagrut/?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BVyMul29iSIu9F1d2uKbdsA%3D%3D">
  <img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white"/>
</a>
&nbsp;
<a href="mailto:jagrutjoshi02@gmail.com">
  <img src="https://img.shields.io/badge/Gmail-jagrutjoshi02@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white"/>
</a>

<br/><br/>

**Jagrut Joshi** · B.Tech Computer Science · DY Patil International University, Pune

<br/>

<img src="https://media.giphy.com/media/LnQjpWaON8nhr21vNW/giphy.gif" width="50"/>

<br/>

*If you found this project useful, please consider giving it a ⭐ — it really helps!*

</div>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:03050f,30:00E5FF,70:00E5FF,100:03050f" width="100%"/>
</p>

## 📜 License

```
MIT License — free to use, modify, and distribute.
See LICENSE file for details.
```

<br/>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:03050f,30:0d1628,70:0d1628,100:03050f&height=120&section=footer&animation=fadeIn" width="100%" />
</p>
