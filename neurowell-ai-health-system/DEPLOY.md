# 🚀 NeuroWell — Deployment Guide

## ⚡ Quick: Local Dev (No setup needed)
Just open `index.html` in Chrome/Edge — everything works locally.

---

## 🌐 Option 1: GitHub Pages (FREE, easiest)

### Steps:
```bash
# 1. Create GitHub repo
git init
git add .
git commit -m "NeuroWell v2"
git remote add origin https://github.com/YOUR_USERNAME/neurowell.git
git push -u origin main

# 2. GitHub → Settings → Pages → Source: main branch → Save
# Your app will be live at: https://YOUR_USERNAME.github.io/neurowell/
```

### ⚠️ LM Studio + GitHub Pages
Since LM Studio runs on `localhost:1234`, the **AI chat won't work** from GitHub Pages (different origin). Solutions:

**Option A — Proxy API (Recommended):**
Deploy a tiny backend that forwards requests to LM Studio:
```js
// server.js (Node.js + Express)
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();
app.use(cors({ origin: 'https://your-github-pages-url.com' }));
app.use('/api/llm', createProxyMiddleware({ target: 'http://localhost:1234', changeOrigin: true, pathRewrite: {'^/api/llm': ''} }));
app.listen(3001);
```
Then update `llm-config.js`:
```js
baseURL: 'https://your-server.com/api/llm/v1'
```

**Option B — Cloudflare Tunnel (No server needed):**
```bash
# Install cloudflared
cloudflared tunnel --url http://localhost:1234
# Get a public URL like: https://xxxx.trycloudflare.com
# Update llm-config.js: baseURL: 'https://xxxx.trycloudflare.com/v1'
```

---

## 🐳 Option 2: Netlify (FREE, drag & drop)
1. Go to **netlify.com** → New site → Drag & drop the `neurowell/` folder
2. Site is live instantly
3. Use Cloudflare Tunnel or a proxy for LM Studio (same as above)

---

## 🖥️ Option 3: Self-host on VPS (Full control)

### Nginx setup:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/neurowell;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }

    # Proxy LM Studio API (if running on same machine)
    location /api/llm/ {
        proxy_pass http://localhost:1234/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Headers *;
    }
}
```

```bash
# Deploy files
scp -r neurowell/ user@yourserver:/var/www/neurowell
# Install nginx
sudo apt install nginx -y
# Copy config and reload
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS (required for Voice API):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔧 LM Studio CORS Setup (Required for all deployments)

In LM Studio → Local Server tab:
1. ✅ Enable CORS
2. Set Allowed Origins: `*` (or your specific domain)
3. Start server on port 1234

---

## 🗃️ Environment Variables (for production)
Create a `.env` file (never commit this):
```
LLM_BASE_URL=http://localhost:1234/v1
LLM_API_KEY=lm-studio
APP_SECRET=your-random-secret
```
Then reference in `llm-config.js` via your backend.

---

## 📱 PWA Install
Once hosted on HTTPS, users can:
- **Mobile:** Open in Chrome → "Add to Home Screen"
- **Desktop:** Chrome address bar → install icon
- Works **offline** for dashboard/history (AI chat requires server)

---

## 🔐 Security Checklist for Production
- [ ] Never expose LM Studio port directly to internet
- [ ] Always use a proxy/tunnel with authentication
- [ ] Enable HTTPS (required for Voice API + PWA)
- [ ] Add rate limiting to your API proxy
- [ ] Backup `localStorage` data periodically (export feature)
- [ ] Set Content-Security-Policy headers

---

*NeuroWell AI — Private, local-first health intelligence.*
