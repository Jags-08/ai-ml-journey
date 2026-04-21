/**
 * NeuroVision — Onboarding Flow
 * Loading screen boot sequence + demo slider interactions.
 *
 * Usage:
 *   import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow.js';
 *   await OnboardingFlow.boot();
 */

import { Topbar } from '../layout/Topbar.js';
import { NetworkService } from '../../services/networkService.js';
import { initScrollReveal } from '../../utils/performance.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('OnboardingFlow');

const BOOT_STEPS = [
  { id:'ls1', label:'Loading neural engine…' },
  { id:'ls2', label:'Calibrating pixel analysis…' },
  { id:'ls3', label:'Connecting to AI backend…' },
  { id:'ls4', label:'Ready.' },
];

export const OnboardingFlow = {
  /**
   * Run the loading screen sequence, then reveal the app.
   * @returns {Promise<void>}
   */
  async boot() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    screen.classList.add('on');

    const bar = document.getElementById('ls-bar');
    for (let i = 0; i < BOOT_STEPS.length; i++) {
      const step = BOOT_STEPS[i];
      await this._activateStep(step.id, (i + 1) / BOOT_STEPS.length * 100);
    }

    await new Promise(r => setTimeout(r, 350));
    screen.classList.remove('on');
    document.getElementById('nav')?.classList.remove('hidden');

    // Init reveal animations
    initScrollReveal();
    this._initDemoSlider();
    log.info('Boot complete');
  },

  _activateStep(stepId, pct) {
    return new Promise(resolve => {
      const steps = document.querySelectorAll('.ls-step');
      steps.forEach((el, i) => {
        if (el.id === stepId) {
          el.classList.add('on');
        } else if (steps[i - 1]?.id === stepId) {
          el.classList.add('done');
        }
      });
      const bar = document.getElementById('ls-bar');
      if (bar) bar.style.width = `${pct}%`;
      setTimeout(resolve, 320 + Math.random() * 280);
    });
  },

  // ── Demo before/after slider ─────────────────────────────
  _initDemoSlider() {
    const frame  = document.querySelector('.demo-frame');
    const demoA  = document.querySelector('.demo-a');
    const divLine= document.querySelector('.demo-divline');
    const handle = document.querySelector('.demo-divhandle');
    if (!frame || !demoA) return;

    let dragging = false;
    let pct = 50;

    const update = (x) => {
      const rect = frame.getBoundingClientRect();
      pct = Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100));
      demoA.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (divLine) divLine.style.left = `${pct}%`;
      if (handle)  handle.style.left  = `${pct}%`;
    };

    frame.addEventListener('mousedown',  (e) => { dragging = true; update(e.clientX); });
    frame.addEventListener('touchstart', (e) => { dragging = true; update(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mousemove',  (e) => { if (dragging) update(e.clientX); });
    document.addEventListener('touchmove',  (e) => { if (dragging) update(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup',   () => { dragging = false; });
    document.addEventListener('touchend',  () => { dragging = false; });

    // Auto-animate demo on load
    setTimeout(() => {
      const badge = document.querySelector('.demo-score-badge');
      if (badge) badge.classList.add('show');

      let dir = -1, pos = 50;
      const anim = setInterval(() => {
        if (dragging) return;
        pos += dir * 0.5;
        if (pos <= 20 || pos >= 80) dir *= -1;
        update(frame.getBoundingClientRect().left + frame.clientWidth * (pos / 100));
      }, 30);

      // Stop auto-anim when user interacts
      frame.addEventListener('mousedown', () => clearInterval(anim), { once: true });
      frame.addEventListener('touchstart', () => clearInterval(anim), { once: true, passive: true });
    }, 1200);
  },
};

export default OnboardingFlow;
