/**
 * NEUROWELL — app.js
 * Shared UI: neural background, toasts, sidebar, modals, utils
 */

/* ════════════════════════════════════════════
   NEURAL CANVAS BACKGROUND
   ════════════════════════════════════════════ */
function initNeuralCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const nodes = Array.from({ length: 60 }, () => ({
    x:   Math.random() * canvas.width,
    y:   Math.random() * canvas.height,
    vx:  (Math.random() - 0.5) * 0.35,
    vy:  (Math.random() - 0.5) * 0.35,
    r:   1.5 + Math.random() * 2,
    pulse: Math.random() * Math.PI * 2
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = Date.now() * 0.001;

    // Update
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.03;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    // Connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[j].x - nodes[i].x;
        const dy   = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 140) {
          const alpha = (1 - dist/140) * 0.25;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach(n => {
      const brightness = 0.6 + 0.4 * Math.sin(n.pulse);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(0,229,255,${brightness * 0.7})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ════════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
window.showToast = showToast;

/* ════════════════════════════════════════════
   SIDEBAR SETUP
   ════════════════════════════════════════════ */
function initSidebar() {
  const user = Auth.current();
  if (!user) return;

  // Populate user card
  const avatar    = document.getElementById('user-avatar');
  const userName  = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  if (avatar)    avatar.textContent    = user.name.charAt(0).toUpperCase();
  if (userName)  userName.textContent  = user.name;
  if (userEmail) userEmail.textContent = user.email;

  // Alert badge
  updateAlertBadge();

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

  // Mobile toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar   = document.querySelector('.sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Highlight active nav
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
    item.addEventListener('click', () => {
      window.location.href = item.dataset.page;
    });
  });
}
window.initSidebar = initSidebar;

function updateAlertBadge() {
  const user = Auth.current();
  if (!user) return;
  const unread = DB.getAlerts(user.email, true).length;
  const badge  = document.getElementById('alert-badge');
  if (badge) {
    badge.textContent    = unread;
    badge.style.display  = unread > 0 ? 'inline' : 'none';
  }
}
window.updateAlertBadge = updateAlertBadge;

/* ════════════════════════════════════════════
   MODAL HELPER
   ════════════════════════════════════════════ */
function openModal(html, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  function close() {
    overlay.style.animation = 'fadeIn 0.2s ease reverse';
    setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 200);
  }

  return { close, overlay };
}
window.openModal = openModal;

/* ════════════════════════════════════════════
   HEALTH SCORE RING (SVG)
   ════════════════════════════════════════════ */
function renderScoreRing(containerId, score, size = 120) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const r = (size / 2) - 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const colorClass = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
  const color      = score >= 75 ? '#39ff8f' : score >= 50 ? '#ffab00' : '#ff3d6b';
  const label      = score >= 75 ? 'Excellent' : score >= 50 ? 'Fair' : 'Needs Work';

  container.innerHTML = `
    <svg class="score-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
      <circle class="score-track" cx="${size/2}" cy="${size/2}" r="${r}"/>
      <circle class="score-fill"
        cx="${size/2}" cy="${size/2}" r="${r}"
        stroke="url(#sg)"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${circumference}"
        style="transition:stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)"
      />
      <text class="score-number" x="${size/2}" y="${size/2 - 6}" fill="${color}">${score}</text>
      <text class="score-label-svg" x="${size/2}" y="${size/2 + 14}" fill="#4a6d84">${label}</text>
    </svg>
  `;

  // Animate after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const circle = container.querySelector('.score-fill');
      if (circle) circle.style.strokeDashoffset = offset;
    });
  });
}
window.renderScoreRing = renderScoreRing;

/* ════════════════════════════════════════════
   DATE UTILS
   ════════════════════════════════════════════ */
const DateUtils = {
  today()       { return new Date().toISOString().split('T')[0]; },
  formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  },
  formatTime(d) {
    return new Date(d).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  },
  relativeTime(d) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  },
  last7DayLabels() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }
};
window.DateUtils = DateUtils;

/* ════════════════════════════════════════════
   INIT ON DOM READY
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initNeuralCanvas();
  initSidebar();
});
