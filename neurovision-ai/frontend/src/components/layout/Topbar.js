/**
 * NeuroVision — Topbar Component
 * Renders and wires the top navigation bar.
 * Handles: logo, API status, plan badge, pricing CTA, top progress bar.
 *
 * Usage:
 *   import { Topbar } from '@/components/layout/Topbar.js';
 *   Topbar.init();
 */

import { subscribe, getState } from '../../core/state.js';
import { Analytics } from '../../utils/analytics.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('Topbar');

export const Topbar = {
  init() {
    this._bindPricingBtn();
    this._bindCommandKey();
    this._subscribeApiStatus();
    this._subscribePlan();
    log.info('Topbar ready');
  },

  // ── Progress bar ──────────────────────────────────────────
  startProgress() {
    const bar = document.getElementById('top-bar');
    if (bar) bar.classList.add('active');
  },

  stopProgress() {
    const bar  = document.getElementById('top-bar');
    const fill = document.getElementById('top-bar-fill');
    if (!bar || !fill) return;
    bar.classList.remove('active');
    bar.classList.add('done');
    fill.style.width = '100%';
    setTimeout(() => { bar.classList.remove('done'); fill.style.width = '0%'; }, 500);
  },

  // ── Private ───────────────────────────────────────────────
  _bindPricingBtn() {
    document.getElementById('nav-cta')?.addEventListener('click', () => {
      Analytics.conversion('pricing_open', { source: 'nav' });
      document.dispatchEvent(new CustomEvent('nv:openPricing'));
    });
  },

  _bindCommandKey() {
    document.getElementById('cmd-hint')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('nv:openCommand'));
    });
  },

  _subscribeApiStatus() {
    const dot  = document.querySelector('.trust-dot');
    const text = document.querySelector('.nav-trust span');
    subscribe('apiOnline', (online) => {
      if (!dot || !text) return;
      dot.style.background  = online ? 'var(--green)' : 'var(--amber)';
      text.textContent = online ? 'AI Online' : 'Local Mode';
    });
  },

  _subscribePlan() {
    const badge = document.getElementById('nav-plan-badge');
    subscribe('plan', (plan) => {
      if (!badge) return;
      badge.textContent = plan === 'free' ? 'Free' : plan === 'pro' ? '⚡ Pro' : '👥 Team';
      badge.dataset.plan = plan;
    });
  },
};

export default Topbar;
