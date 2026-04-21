/**
 * NeuroVision — App Page (Entry Point)
 * Boots every subsystem in the correct order.
 * This is the ONLY file that imports from all layers —
 * the single wire that connects the entire system.
 *
 * Loaded by: public/index.html → <script type="module" src="/src/pages/AppPage.js">
 */

// ── Core ──────────────────────────────────────────────────
import { Orchestrator }     from '../system/orchestrator.js';
import { Persistence }      from '../modules/session/persistence.js';
import { Analytics }        from '../utils/analytics.js';

// ── Components ────────────────────────────────────────────
import { OnboardingFlow }   from '../components/onboarding/OnboardingFlow.js';
import { Topbar }           from '../components/layout/Topbar.js';
import { CanvasView }       from '../components/canvas/CanvasView.js';
import { ResultsPanel }     from '../components/panels/ResultsPanel.js';
import { ScenePanel }       from '../components/panels/ScenePanel.js';
import { NetworkPanel }     from '../components/panels/NetworkPanel.js';
import { ChatPanel }        from '../components/chat/ChatPanel.js';
import { CommandPalette }   from '../components/command/CommandPalette.js';
import { UploadController } from '../modules/upload/uploadController.js';

// ── System ────────────────────────────────────────────────
import { FeatureGate }      from '../system/featureGate.js';
import { ActionEngine }     from '../system/actionEngine.js';
import { subscribe, setState, getState } from '../core/state.js';
import { SessionManager }   from '../modules/session/sessionManager.js';
import { Logger }           from '../core/logger.js';

const log = Logger.create('AppPage');

// ═══════════════════════════════════════════════════════════
// Boot sequence — order matters
// ═══════════════════════════════════════════════════════════
async function boot() {
  log.info('NeuroVision v4 — booting');

  // 1. Restore persisted user settings (plan, goal, etc.)
  Persistence.restore();

  // 2. Run the loading screen + inject HTML shell
  injectHTML();
  await OnboardingFlow.boot();

  // 3. Init global intelligence layer
  await Orchestrator.init();

  // 4. Init all UI components
  Topbar.init();
  CanvasView.init();
  ResultsPanel.init();
  ScenePanel.init();
  NetworkPanel.init();
  ChatPanel.init();
  CommandPalette.init();
  UploadController.init();

  // 5. Wire cross-cutting global events
  wireDOMEvents();
  wirePricingModal();
  wireToasts();
  wireRateLimitModal();
  wireResetFlow();

  // 6. Feature gate any [data-gate] elements on the page
  FeatureGate.reEvaluateAll(() => {
    document.dispatchEvent(new CustomEvent('nv:openPricing'));
  });

  // 7. Track page view
  Analytics.page('app');

  log.info('Boot complete ✓');
}

// ═══════════════════════════════════════════════════════════
// Cross-cutting event bus
// ═══════════════════════════════════════════════════════════
function wireDOMEvents() {
  // Analysis complete → show results view, hide upload section
  document.addEventListener('nv:analyzed', (e) => {
    const { analysis, metrics } = e.detail;
    document.getElementById('upload-section')?.classList.add('hidden');
    const av = document.getElementById('analysis-view');
    if (av) av.classList.add('show');
    Topbar.stopProgress();
    log.info('Analysis view shown');
  });

  // Filter applied → update share card visibility
  document.addEventListener('nv:filterApplied', (e) => {
    const { newQuality } = e.detail;
    if (newQuality >= 70) {
      document.getElementById('share-card')?.classList.add('show');
    }
    _showToast(`✨ Enhancement applied — quality boosted!`, 'success');
    Topbar.stopProgress();
  });

  // Action dispatched from next-steps or chat
  document.addEventListener('nv:action', (e) => {
    const { key } = e.detail;
    ActionEngine.run(key);
  });

  // Upload started → show top progress
  document.addEventListener('nv:uploadStart', () => Topbar.startProgress());

  // Open/close command palette
  document.addEventListener('nv:openCommand', () => {});  // handled by CommandPalette
  document.addEventListener('nv:closeAll', () => {
    document.getElementById('pricing-ov')?.classList.remove('open');
    document.getElementById('payment-ov')?.classList.remove('open');
    document.getElementById('ratelimit-ov')?.classList.remove('open');
  });

  // Network changes → toast
  document.addEventListener('nv:networkChange', (e) => {
    if (!e.detail.isOnline) _showToast('📡 Offline — using local processing', 'warn');
    else _showToast('✅ Back online', 'success');
  });

  // Reset image
  document.addEventListener('nv:resetImage', () => {
    import('../hooks/useImage.js').then(({ useImage }) => useImage().reset());
    document.getElementById('analysis-view')?.classList.remove('show');
    document.getElementById('upload-section')?.classList.remove('hidden');
  });

  // Plan upgraded → toast
  document.addEventListener('nv:planUpgraded', (e) => {
    _showToast(`⚡ Upgraded to ${e.detail.plan} — enjoy unlimited power!`, 'success');
  });

  // API enrichment received → subtle update
  document.addEventListener('nv:apiEnriched', () => {
    log.info('API enrichment applied');
  });
}

// ═══════════════════════════════════════════════════════════
// Pricing modal
// ═══════════════════════════════════════════════════════════
function wirePricingModal() {
  document.addEventListener('nv:openPricing', () => {
    document.getElementById('pricing-ov')?.classList.add('open');
    Analytics.conversion('pricing_open');
  });

  document.getElementById('pp-close')?.addEventListener('click', () => {
    document.getElementById('pricing-ov')?.classList.remove('open');
  });

  document.getElementById('pricing-ov')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('pricing-ov')) {
      document.getElementById('pricing-ov').classList.remove('open');
    }
  });

  // Plan CTAs
  document.querySelectorAll('.plan-cta[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if (plan === 'free') {
        document.getElementById('pricing-ov')?.classList.remove('open');
        return;
      }
      // Open payment flow
      document.getElementById('pricing-ov')?.classList.remove('open');
      document.getElementById('pay-plan-name').textContent =
        plan === 'pro' ? 'Pro — ₹799/month' : 'Team — ₹2,499/month';
      document.getElementById('payment-ov')?.classList.add('open');
      Analytics.conversion('upgrade_click', { plan });
    });
  });

  // Billing toggle
  document.querySelectorAll('.pp-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pp-toggle-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const yearly = btn.dataset.billing === 'yearly';
      document.querySelectorAll('.plan-price[data-monthly][data-yearly]').forEach(el => {
        el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly;
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════
// Payment modal
// ═══════════════════════════════════════════════════════════
function wirePaymentModal() {
  document.getElementById('pay-close')?.addEventListener('click', () => {
    document.getElementById('payment-ov')?.classList.remove('open');
  });

  document.getElementById('pay-submit')?.addEventListener('click', async () => {
    const btn = document.getElementById('pay-submit');
    btn.textContent = 'Processing…'; btn.disabled = true;
    await new Promise(r => setTimeout(r, 1800)); // Simulate payment
    document.getElementById('payment-ov')?.classList.remove('open');
    SessionManager.upgradePlan('pro');
    btn.textContent = 'Upgrade Now ⚡'; btn.disabled = false;
  });
}

// ═══════════════════════════════════════════════════════════
// Rate limit modal
// ═══════════════════════════════════════════════════════════
function wireRateLimitModal() {
  document.addEventListener('nv:rateLimitHit', () => {
    document.getElementById('ratelimit-ov')?.classList.add('open');
  });

  document.getElementById('rl-upgrade')?.addEventListener('click', () => {
    document.getElementById('ratelimit-ov')?.classList.remove('open');
    document.dispatchEvent(new CustomEvent('nv:openPricing'));
  });

  document.getElementById('rl-wait')?.addEventListener('click', () => {
    document.getElementById('ratelimit-ov')?.classList.remove('open');
  });
}

// ═══════════════════════════════════════════════════════════
// Reset flow
// ═══════════════════════════════════════════════════════════
function wireResetFlow() {
  // New image button in analysis view
  document.getElementById('new-image-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nv:resetImage'));
  });
}

// ═══════════════════════════════════════════════════════════
// Toast system
// ═══════════════════════════════════════════════════════════
function wireToasts() {
  // Global toast listener
  document.addEventListener('nv:toast', (e) => {
    _showToast(e.detail.msg, e.detail.type);
  });
}

function _showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toasts');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="ti2">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span class="tm">${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Make toast available globally for backward compat
window._showToast = _showToast;

// ═══════════════════════════════════════════════════════════
// HTML shell injection
// Injects the full app HTML into #app.
// This keeps the HTML in JS (single-file, no build required
// for dev). In production, use the pre-rendered index.html.
// ═══════════════════════════════════════════════════════════
function injectHTML() {
  const app = document.getElementById('app');
  if (!app || app.children.length > 0) return; // already rendered (SSR / pre-rendered)

  app.innerHTML = `
<!-- ── Top progress bar ── -->
<div id="top-bar"><div id="top-bar-fill"></div></div>

<!-- ── Loading Screen ── -->
<div id="loading-screen">
  <div class="ls-logo">🧠</div>
  <div class="ls-title">NeuroVision</div>
  <div class="ls-bar-track"><div id="ls-bar"></div></div>
  <div class="ls-steps">
    ${[
      ['ls1','🧠','Loading neural engine','init'],
      ['ls2','📐','Calibrating pixel analysis','ready'],
      ['ls3','🔗','Connecting to AI backend','ready'],
      ['ls4','✓','Ready','done'],
    ].map(([id,ic,label,st])=>`
    <div class="ls-step" id="${id}">
      <span class="ls-step-ic">${ic}</span>
      <span>${label}</span>
      <span class="ls-step-st">${st}</span>
    </div>`).join('')}
  </div>
</div>

<!-- ── Navigation ── -->
<nav id="nav">
  <a class="nav-logo" href="#">
    <div class="logo-icon">🧠</div>
    <span class="logo-txt">NeuroVision</span>
    <span class="logo-phase">v4</span>
  </a>
  <div class="nav-right">
    <div class="nav-trust"><span class="trust-dot"></span><span>AI Online</span></div>
    <button class="nav-btn" id="nav-cta">Upgrade ⚡</button>
  </div>
</nav>

<!-- ── Hero ── -->
<section id="hero">
  <div class="hero-eyebrow">
    <span class="eyebrow-dot">🧠</span>
    Real pixel-level AI analysis
  </div>
  <h1 class="hero-h1">AI that <span class="serif">understands</span><br>your images</h1>
  <p class="hero-sub">Upload any image. NeuroVision tells you exactly what's wrong with it — in plain English — then fixes it in one click.</p>
  <p class="hero-tagline">Not just filters. <strong>Real intelligence on every pixel.</strong></p>
  <div class="hero-cta">
    <button class="cta-primary" onclick="document.getElementById('upload-section').scrollIntoView({behavior:'smooth'})">
      🚀 Analyze My Image
    </button>
    <a class="cta-sec" href="#positioning">See how it works →</a>
  </div>
  <div class="hero-stats">
    <div class="stat"><div class="stat-v">2.4<span class="suf">M</span></div><div class="stat-l">Images analyzed</div></div>
    <div class="stat"><div class="stat-v">97<span class="suf">%</span></div><div class="stat-l">Max quality score</div></div>
    <div class="stat"><div class="stat-v">0.8<span class="suf">s</span></div><div class="stat-l">Avg analysis time</div></div>
    <div class="stat"><div class="stat-v">38<span class="suf">%</span></div><div class="stat-l">More engagement</div></div>
  </div>
  <!-- Demo slider -->
  <div class="demo-wrap reveal">
    <div class="demo-frame">
      <div class="demo-side" style="background:linear-gradient(135deg,#1c2230 0%,#141920 100%)">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;opacity:.2">🌆</div>
      </div>
      <div class="demo-side demo-a" style="background:linear-gradient(135deg,#1d6ef5 0%,#7c3aed 60%,#10b981 100%)">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;opacity:.4">🌆</div>
      </div>
      <div class="demo-divline"></div>
      <div class="demo-divhandle">⇄</div>
      <div class="demo-lbl b">BEFORE</div>
      <div class="demo-lbl a">AFTER</div>
      <div class="demo-score-badge">Quality: 43 → 91 ✨</div>
    </div>
  </div>
</section>

<!-- ── Upload Section ── -->
<section id="upload-section">
  <div class="upload-header reveal">
    <h2 class="upload-h2">Drop your image. Get the truth.</h2>
    <p class="upload-sub">JPG, PNG, WebP, GIF — up to 20 MB. Works 100% offline.</p>
  </div>
  <div class="upload-card" id="upload-card">
    <div class="upload-inner">
      <div class="upload-icon">📸</div>
      <div class="upload-title">Drop your image here</div>
      <div class="upload-desc">Or paste from clipboard (Ctrl+V)<br>We analyze every pixel instantly</div>
      <div class="upload-btn-row">
        <button class="upload-btn" id="browse-btn">Browse files</button>
        <span class="upload-paste-hint">or Ctrl+V to paste</span>
      </div>
      <div class="upload-formats">JPG · PNG · WebP · GIF · BMP</div>
    </div>
    <div class="upload-trust">🔒 Images never leave your browser unless you choose to use cloud AI</div>
  </div>
  <div class="upload-err" id="upload-err">
    <span>⚠</span>
    <span id="err-msg">Error</span>
    <button class="err-retry" onclick="document.getElementById('upload-err').classList.remove('show')">Dismiss</button>
  </div>
  <input type="file" id="file-input" accept="image/*" style="display:none">
</section>

<!-- ── Analysis View ── -->
<section id="analysis-view" style="padding:40px 24px 80px;max-width:1100px;margin:0 auto">
  <div class="analysis-wow">
    <div class="wow-eyebrow">🧠 NeuroVision Analysis Complete</div>
    <div class="wow-headline" id="wow-headline">Analyzing your image…</div>
    <div class="wow-issues" id="wow-chips"></div>
  </div>

  <div class="analysis-grid">
    <!-- Left: Canvas -->
    <div>
      <div class="canvas-frame">
        <div class="ctb">
          <button class="cb" data-action="zoom-out" title="Zoom out">−</button>
          <span class="zoom-lbl">100%</span>
          <button class="cb" data-action="zoom-in" title="Zoom in">+</button>
          <button class="cb" data-action="zoom-fit" title="Fit">⊡</button>
          <div class="cb-div"></div>
          <button class="cb on" data-action="overlay" title="Toggle overlay">◈</button>
          <button class="cb cmp-togbtn vis" data-action="compare" title="Compare">⇄</button>
          <div class="cb-div"></div>
          <button class="cb" data-action="sharpen" title="Sharpen">💎</button>
          <button class="cb" data-action="reset" title="Reset to original">↺</button>
        </div>
        <div class="c-wrap">
          <canvas id="main-canvas"></canvas>
          <canvas id="overlay-canvas"></canvas>
          <canvas id="cmp-canvas"></canvas>
          <div id="cmp-divline"></div>
          <div id="cmp-handle">⇄</div>
          <div class="cmp-labels">
            <span class="cmp-lbl2 orig">ORIGINAL</span>
            <span class="cmp-lbl2 enha">ENHANCED</span>
          </div>
          <div id="score-delta"></div>
        </div>
        <div class="status-bar">
          <div class="sb">W <span id="sb-w">–</span>px</div>
          <div class="sb">H <span id="sb-h">–</span>px</div>
          <div class="sb">Brightness <span id="sb-br">–</span></div>
          <div class="sb">Sharpness <span id="sb-sh">–</span></div>
          <div class="sb-sp"></div>
          <div class="sb">Scene: <span id="sb-scene">–</span></div>
        </div>
      </div>

      <!-- Filters strip -->
      <div class="ins-card" style="margin-top:14px">
        <div class="ins-hd"><div class="ins-title"><span class="icon">🎨</span>Quick Filters</div></div>
        <div class="ins-body" style="display:flex;gap:8px;flex-wrap:wrap">
          ${['enhance','vivid','warm','cool','cinematic','bw','matte'].map(f=>`
            <button class="exp-btn" onclick="window.applyFilter?.('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Right: Results panel -->
    <div>
      <!-- Scores -->
      <div class="ins-card">
        <div class="ins-hd"><div class="ins-title"><span class="icon">📊</span>Quality Scores</div></div>
        <div class="ins-body">
          <div class="score-ring-row">
            <div class="score-ring-item">
              <div class="score-ring-val" id="sq-q">0</div>
              <div class="score-ring-lbl">Visual Quality</div>
              <div class="score-ring-bar"><div class="score-ring-fill" id="sqb-q" style="width:0%"></div></div>
              <div class="score-delta-badge" id="score-delta-q"></div>
            </div>
            <div class="score-ring-item">
              <div class="score-ring-val" id="sq-v">0</div>
              <div class="score-ring-lbl">Viral Potential</div>
              <div class="score-ring-bar"><div class="score-ring-fill" id="sqb-v" style="width:0%"></div></div>
            </div>
          </div>
          <!-- Usage meter -->
          <div class="usage-meter-wrap">
            <div class="usage-track"><div class="usage-fill low" id="usage-fill" style="width:20%"></div></div>
            <div class="usage-lbl"><span>1 of 5 free analyses used</span><span id="usage-lbl-r">4 remaining</span></div>
          </div>
        </div>
      </div>

      <!-- Goal -->
      <div class="ins-card">
        <div class="ins-hd"><div class="ins-title"><span class="icon">🎯</span>Optimize For</div></div>
        <div class="ins-body">
          <div class="goal-row" id="goal-chips"></div>
          <div class="goal-insight" id="goal-insight"></div>
        </div>
      </div>

      <!-- Problems -->
      <div class="ins-card">
        <div class="ins-hd">
          <div class="ins-title"><span class="icon">🔍</span>Detected Issues</div>
        </div>
        <div class="ins-body">
          <div class="explain-row">
            <div class="explain-tog-track"><div class="explain-tog-knob"></div></div>
            <span class="explain-lbl-txt">Explain mode (plain English)</span>
          </div>
          <div id="problems-list"></div>
        </div>
      </div>

      <!-- Auto Fix -->
      <button id="auto-fix-btn">
        <div class="fix-icon">⚡</div>
        <div>
          <div class="fix-title">Auto Fix Everything</div>
          <span class="fix-sub">Fix all critical issues automatically</span>
        </div>
      </button>

      <!-- Detections -->
      <div class="ins-card">
        <div class="ins-hd"><div class="ins-title"><span class="icon">🎯</span>Object Detection</div></div>
        <div class="ins-body" id="detections-list"></div>
      </div>

      <!-- Export -->
      <div class="ins-card">
        <div class="ins-hd"><div class="ins-title"><span class="icon">📤</span>Export</div></div>
        <div class="ins-body">
          <div class="export-strip">
            <button class="exp-btn" data-format="jpeg">JPG</button>
            <button class="exp-btn" data-format="png">PNG</button>
            <button class="exp-btn" data-format="webp" data-gate="export_webp">WebP ⚡</button>
          </div>
        </div>
      </div>

      <!-- Next Steps -->
      <div class="ins-card">
        <div class="ins-hd"><div class="ins-title"><span class="icon">🚀</span>Suggested Next Steps</div></div>
        <div class="ins-body" id="next-steps"></div>
      </div>

      <!-- Share card -->
      <div id="share-card">
        <div class="share-title">🎉 Share your results</div>
        <div class="share-badges">
          <span class="share-badge">Quality improved</span>
          <span class="share-badge">AI-optimized</span>
        </div>
        <button class="share-btn" onclick="_showToast?.('Share link copied!','success')">Copy Share Link</button>
      </div>

      <!-- New image -->
      <button id="new-image-btn" class="act-btn" style="margin-top:14px;width:100%">
        <div class="act-icon">📷</div>
        <div><div class="act-name">Analyze another image</div><div class="act-desc">Upload a new image to start over</div></div>
      </button>
    </div>
  </div>
</section>

<!-- ── Chat FAB + Window ── -->
<button id="chat-fab" title="Chat with NeuroVision AI">💬
  <div id="chat-badge"></div>
</button>
<div id="chat-window">
  <div class="chat-hd">
    <div class="chat-hd-left">
      <div class="chat-hd-av">🧠</div>
      <div>
        <div class="chat-hd-name">NeuroVision AI</div>
        <div class="chat-hd-status">Online</div>
      </div>
    </div>
    <button class="chat-close" id="chat-close">✕</button>
  </div>
  <div id="chat-msgs"></div>
  <div class="chat-ft">
    <input id="chat-in" placeholder="Ask anything about your image…" maxlength="400">
    <button id="chat-send">↑</button>
  </div>
</div>

<!-- ── Conversion Nudge ── -->
<div id="conv-nudge">
  <button class="cn-close" id="cn-close">✕</button>
  <div class="cn-title"></div>
  <div class="cn-desc"></div>
  <button class="cn-cta" id="cn-cta">Upgrade to Pro ⚡</button>
</div>

<!-- ── Network Indicator ── -->
<div id="net-indicator">
  <span id="net-ind-icon">📡</span>
  <span id="net-ind-msg">Offline</span>
</div>

<!-- ── Toasts ── -->
<div id="toasts"></div>

<!-- ── Command Palette ── -->
<div id="cmd-overlay">
  <div class="cmd-box">
    <div class="cmd-input-wrap">
      <span class="cmd-ic">⌘</span>
      <input id="cmd-input" placeholder="Type a command or action…" autocomplete="off">
      <span class="cmd-esc" id="cmd-esc">ESC</span>
    </div>
    <div id="cmd-results"></div>
  </div>
</div>

<!-- ── Pricing Overlay ── -->
<div id="pricing-ov">
  <div class="pp-panel">
    <div class="pp-hd">
      <button class="pp-close" id="pp-close">✕</button>
      <div class="pp-title">Simple, honest pricing</div>
      <div class="pp-sub">Start free. Upgrade when you need more.</div>
      <div class="pp-toggle">
        <button class="pp-toggle-btn on" data-billing="monthly">Monthly</button>
        <button class="pp-toggle-btn" data-billing="yearly">Yearly <span class="pp-save-badge">Save 40%</span></button>
      </div>
    </div>
    <div class="pp-plans">
      <div class="plan-card">
        <div class="plan-name">Free</div>
        <div class="plan-price" data-monthly="₹0" data-yearly="₹0">₹0</div>
        <div class="plan-price-period">forever</div>
        <div class="plan-desc">Perfect for trying NeuroVision. No credit card required.</div>
        <div class="plan-divider"></div>
        <div class="plan-feat">✓ 5 analyses per day</div>
        <div class="plan-feat">✓ All filters</div>
        <div class="plan-feat">✓ AI chat</div>
        <div class="plan-feat">✓ JPG + PNG export</div>
        <div class="plan-feat locked">✗ Batch processing</div>
        <div class="plan-feat locked">✗ WebP export</div>
        <button class="plan-cta free-cta" data-plan="free">Continue Free</button>
      </div>
      <div class="plan-card pop">
        <div class="plan-pop-badge">Most Popular</div>
        <div class="plan-name">Pro</div>
        <div class="plan-price" data-monthly="₹799" data-yearly="₹479">₹799</div>
        <div class="plan-price-period">per month</div>
        <div class="plan-desc">Unlimited power for creators and professionals.</div>
        <div class="plan-divider"></div>
        <div class="plan-feat">✓ Unlimited analyses</div>
        <div class="plan-feat">✓ Batch processing (50 images)</div>
        <div class="plan-feat">✓ HD + WebP export</div>
        <div class="plan-feat">✓ Priority AI queue</div>
        <div class="plan-feat">✓ All filters + DIP ops</div>
        <button class="plan-cta pro-cta" data-plan="pro">Upgrade to Pro ⚡</button>
      </div>
      <div class="plan-card">
        <div class="plan-name">Team</div>
        <div class="plan-price" data-monthly="₹2,499" data-yearly="₹1,499">₹2,499</div>
        <div class="plan-price-period">per month</div>
        <div class="plan-desc">For agencies and teams that need to move fast.</div>
        <div class="plan-divider"></div>
        <div class="plan-feat">✓ Everything in Pro</div>
        <div class="plan-feat">✓ 5 team members</div>
        <div class="plan-feat">✓ Shared workspace</div>
        <div class="plan-feat">✓ API access</div>
        <div class="plan-feat">✓ Priority support</div>
        <button class="plan-cta team-cta" data-plan="team">Get Team Plan</button>
      </div>
    </div>
  </div>
</div>

<!-- ── Payment Overlay ── -->
<div id="payment-ov">
  <div class="pay-panel">
    <div class="pay-hd">
      <div class="pay-hd-title" id="pay-plan-name">Pro — ₹799/month</div>
      <button class="pay-close" id="pay-close">✕</button>
    </div>
    <div style="padding:24px 28px">
      <input class="pay-input" placeholder="Email address" type="email">
      <input class="pay-input" placeholder="Card number" maxlength="19" style="font-family:var(--mono)">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <input class="pay-input" placeholder="MM/YY" maxlength="5" style="margin-bottom:0">
        <input class="pay-input" placeholder="CVC" maxlength="4" style="margin-bottom:0">
      </div>
      <button id="pay-submit" style="width:100%;margin-top:18px;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--ff);transition:all .2s">
        Upgrade Now ⚡
      </button>
      <div style="text-align:center;font-size:11px;color:var(--t3);margin-top:10px">🔒 256-bit SSL encryption · Cancel anytime</div>
    </div>
  </div>
</div>

<!-- ── Rate Limit Modal ── -->
<div id="ratelimit-ov">
  <div class="rl-panel">
    <div style="font-size:36px;margin-bottom:12px">⚡</div>
    <div class="rl-title">Daily limit reached</div>
    <div class="rl-sub">You've used all 5 free analyses for today. Upgrade for unlimited access — no restrictions, no waiting.</div>
    <button class="rl-upgrade-btn" id="rl-upgrade">Upgrade to Pro — ₹799/month</button>
    <button class="rl-wait-btn" id="rl-wait">Wait until tomorrow (resets at midnight)</button>
  </div>
</div>
`;
}

// ── Fire! ─────────────────────────────────────────────────
boot().catch(e => console.error('[NeuroVision] Boot failed:', e));
