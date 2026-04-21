/**
 * NeuroVision — Landing Page Module
 * Handles: scroll animations, positioning section counters,
 * hero CTA smooth scroll, stat counter animation.
 * Separate from AppPage so the landing experience loads independently.
 */

import { initScrollReveal } from '../utils/performance.js';
import { Analytics } from '../utils/analytics.js';

export const LandingPage = {
  init() {
    initScrollReveal();
    this._animateStats();
    this._bindCTAs();
    Analytics.page('landing');
  },

  _animateStats() {
    const stats = document.querySelectorAll('.stat-v');
    if (!stats.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const suf = el.querySelector('.suf')?.textContent || '';
        const raw = parseFloat(el.textContent.replace(suf, ''));
        if (isNaN(raw)) return;

        let start = null;
        const duration = 1400;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const cur = raw < 10
            ? (raw * eased).toFixed(1)
            : Math.round(raw * eased);
          el.innerHTML = `${cur}<span class="suf">${suf}</span>`;
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    stats.forEach(el => obs.observe(el));
  },

  _bindCTAs() {
    document.querySelectorAll('[data-scroll-to]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.scrollTo);
        target?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  },
};

export default LandingPage;
