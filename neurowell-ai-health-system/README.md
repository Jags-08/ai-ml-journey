# 🧠 NeuroWell – AI Personal Health Intelligence System

> A full-stack, AI-powered personal health tracking application with pattern detection, voice input, interactive dashboards, and PDF reports.

---

## 📁 Project Structure

```
neurowell/
├── index.html          ← Landing + Login/Register page
├── dashboard.html      ← Main health dashboard
├── chat.html           ← AI chat assistant
├── reports.html        ← Full reports + data table
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline PWA)
│
├── css/
│   ├── main.css        ← Design system (colors, layout, components)
│   ├── dashboard.css   ← Dashboard-specific styles
│   └── chat.css        ← Chat UI styles
│
├── js/
│   ├── storage.js      ← localStorage "database" layer (SQL-like)
│   ├── auth.js         ← Login, register, sessions, guards
│   ├── patterns.js     ← Smart pattern detection engine
│   ├── app.js          ← Shared UI: sidebar, toasts, canvas, utils
│   ├── voice.js        ← Web Speech API voice input
│   ├── pdf.js          ← jsPDF health report generator
│   ├── dashboard.js    ← Charts, log form, metrics
│   └── chat.js         ← Anthropic AI chat integration
│
└── assets/
    └── icons/          ← PWA icons (add icon-192.png, icon-512.png)
```

---

## 🚀 Features

### 🔐 Secure Login System
- Register / Login with email + password
- SHA-256 password hashing (Web Crypto API)
- Session management via localStorage
- Route guards on all protected pages
- One-click demo account with seeded data

### 📊 Interactive Health Dashboard
- **Health Score Ring** — dynamic SVG gauge (0-100)
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

### 🤖 AI Chat Assistant (Anthropic Claude API)
- Health-context-aware conversations
- Full chat history persistence
- Suggested questions
- Voice input support
- Markdown-formatted responses
- Quick context panel with live health data

### 📄 PDF Report Generator (jsPDF)
- Cover page with patient info
- Health score visualization
- Weekly averages table
- 7-day daily log table (color-coded)
- Pattern alerts section
- AI recommendations
- Professional medical footer

### 📱 Progressive Web App (PWA)
- Install to home screen on mobile/desktop
- Offline support via Service Worker
- App-like experience
- Push notification ready

---

## 🛠 Technology Stack

| Layer         | Technology               |
|---------------|--------------------------|
| Frontend UI   | HTML5, CSS3, JavaScript  |
| Styling       | Custom CSS Design System |
| Charts        | Chart.js                 |
| AI Backend    | Anthropic Claude API     |
| PDF           | jsPDF (CDN)              |
| Voice         | Web Speech API           |
| Data Storage  | localStorage (SQL-like)  |
| PWA           | Service Worker           |
| Auth          | Web Crypto (SHA-256)     |
| Fonts         | Google Fonts (DM Serif + Outfit + Space Mono) |

---

## ⚡ Quick Start

1. **Clone / Download** the project folder
2. **Open** `index.html` in a modern browser (Chrome recommended)
3. **Click** "Try Demo Account" for instant access with seeded data
4. Or **Register** a new account and start logging!

> **Note:** For the AI Chat feature, the Anthropic API is called directly from the browser. In production, proxy through a backend to protect your API key.

---

## 📐 Design System

**Palette:**
- Background Void: `#03050f`
- Cyan Accent: `#00e5ff`
- Bio Green: `#39ff8f`
- Alert Amber: `#ffab00`
- Danger Red: `#ff3d6b`
- Violet: `#b388ff`

**Typography:**
- Display: `DM Serif Display`
- UI: `Outfit`
- Code/Numbers: `Space Mono`

---

## 🗺 Pages

| Page             | File              | Description                    |
|------------------|-------------------|--------------------------------|
| Login/Register   | `index.html`      | Auth + landing                 |
| Dashboard        | `dashboard.html`  | Main health hub                |
| AI Assistant     | `chat.html`       | Claude-powered chat            |
| Reports          | `reports.html`    | Full data + PDF generation     |

---

## 🔮 Future Enhancements

- [ ] Backend API (Flask/Node.js) with real SQL database
- [ ] Real-time sync across devices
- [ ] Wearable device integration (Fitbit, Apple Health)
- [ ] Doctor sharing mode
- [ ] Medication reminders
- [ ] Multi-language support
- [ ] Advanced ML predictions

---

*NeuroWell AI – For informational purposes only. Always consult a healthcare professional.*
