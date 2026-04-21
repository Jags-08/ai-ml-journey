/**
 * NeuroVision — Feature Gate (UI Layer)
 * Bridges canUse() checks to DOM: blurs locked UI,
 * injects upgrade prompts, intercepts clicks on gated features.
 *
 * Usage:
 *   import { FeatureGate } from '@/system/featureGate.js';
 *   FeatureGate.protect('batch', containerEl, () => openPricing());
 *   FeatureGate.guard('export_hd', () => doExport());
 */

import { canUse } from '../core/features.js';
import { getState } from '../core/state.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('FeatureGate');

// ── Upgrade copy per feature ──────────────────────────────
const GATE_COPY = {
  batch:      { icon: '📦', title: 'Batch — Pro Only', cta: 'Unlock Batch Processing' },
  export_hd:  { icon: '🖼', title: 'HD Export — Pro Only', cta: 'Upgrade for HD Export' },
  export_webp:{ icon: '💎', title: 'WebP Export — Pro Only', cta: 'Upgrade for WebP' },
  priority:   { icon: '⚡', title: 'Priority Queue — Pro Only', cta: 'Get Priority Processing' },
  api_access: { icon: '🔌', title: 'API Access — Pro Only', cta: 'Unlock API Access' },
  team_share: { icon: '👥', title: 'Team Share — Team Plan', cta: 'Upgrade to Team' },
  default:    { icon: '🔒', title: 'Pro Feature', cta: 'Upgrade to Unlock' },
};

export const FeatureGate = {
  /**
   * Visually lock a DOM element if the feature is not available.
   * Injects a blur overlay with upgrade CTA inside the container.
   * @param {string} feature
   * @param {HTMLElement} el
   * @param {Function} [onUpgradeClick]
   */
  protect(feature, el, onUpgradeClick) {
    if (!el) return;
    if (canUse(feature)) {
      this.unlock(el);
      return;
    }
    const copy = GATE_COPY[feature] || GATE_COPY.default;
    el.classList.add('pro-gate');
    const inner = el.querySelector(':scope > *:first-child');
    if (inner) inner.classList.add('pro-gate-blur');

    // Remove any existing badge
    el.querySelector('.pro-gate-badge')?.remove();

    const badge = document.createElement('div');
    badge.className = 'pro-gate-badge';
    badge.innerHTML = `
      <div class="pgb-icon">${copy.icon}</div>
      <div class="pgb-title">${copy.title}</div>
      <button class="pgb-btn">${copy.cta}</button>`;
    badge.querySelector('.pgb-btn').addEventListener('click', () => {
      log.info(`Gate clicked: ${feature}`);
      if (typeof onUpgradeClick === 'function') onUpgradeClick();
    });
    el.appendChild(badge);
  },

  /**
   * Remove gate UI from an element (after plan upgrade).
   * @param {HTMLElement} el
   */
  unlock(el) {
    if (!el) return;
    el.classList.remove('pro-gate');
    el.querySelector('.pro-gate-blur')?.classList.remove('pro-gate-blur');
    el.querySelector('.pro-gate-badge')?.remove();
  },

  /**
   * Guard a function call — run it if allowed, else open pricing.
   * @param {string} feature
   * @param {Function} fn - The action to run if allowed
   * @param {Function} [onDenied] - Fallback if denied
   * @returns {any}
   */
  guard(feature, fn, onDenied) {
    if (canUse(feature)) {
      return fn();
    }
    log.info(`Feature denied: ${feature} for plan "${getState().plan}"`);
    if (typeof onDenied === 'function') return onDenied();
    // Default: open pricing modal
    document.dispatchEvent(new CustomEvent('nv:openPricing', { detail: { feature } }));
  },

  /**
   * Re-evaluate all gates in the DOM after a plan change.
   * Elements with data-gate="featureName" are automatically handled.
   * @param {Function} [onUpgrade]
   */
  reEvaluateAll(onUpgrade) {
    document.querySelectorAll('[data-gate]').forEach(el => {
      const feature = el.dataset.gate;
      this.protect(feature, el, onUpgrade);
    });
  },
};

export default FeatureGate;
