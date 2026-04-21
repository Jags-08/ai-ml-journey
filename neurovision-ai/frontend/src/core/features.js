/**
 * NeuroVision — Feature Flags
 * Runtime feature availability based on build-time flags + plan.
 * All feature checks flow through this module.
 *
 * Usage:
 *   import { FEAT, isEnabled } from '@/core/features.js';
 *   if (isEnabled('batch')) runBatch();
 */

import { getState } from './state.js';

// ── Static build-time flags (per env) ────────────────────
export const FEAT = {
  overlay:   true,
  explain:   false,   // toggled per-session by user
  persist:   true,
  analytics: false,   // enabled in prod
  commandPalette: true,
  scrollReveal:   true,
};

// ── Plan-based feature gates ──────────────────────────────
/** @type {Record<string, string[]>} feature → allowed plans */
const PLAN_RULES = {
  chat:        ['free', 'pro', 'team'],
  overlay:     ['free', 'pro', 'team'],
  explain:     ['free', 'pro', 'team'],
  compare:     ['free', 'pro', 'team'],
  export_jpeg: ['free', 'pro', 'team'],
  export_png:  ['free', 'pro', 'team'],
  export_webp: ['pro',  'team'],
  export_hd:   ['pro',  'team'],
  batch:       ['pro',  'team'],
  priority:    ['pro',  'team'],
  api_access:  ['pro',  'team'],
  team_share:  ['team'],
};

/**
 * Check whether a feature is available for the given plan.
 * Falls back to current session plan if not provided.
 * @param {string} feature
 * @param {string} [plan]
 * @returns {boolean}
 */
export function canUse(feature, plan) {
  const state = getState();
  const activePlan = plan ?? state.plan ?? 'free';

  // Dev overrides from env config
  if (state.featureOverrides?.[feature] === true) return true;

  const rules = PLAN_RULES[feature];
  if (!rules) return true; // unknown features allowed by default
  return rules.includes(activePlan);
}

/**
 * Check a static build-time feature flag.
 * @param {keyof typeof FEAT} flag
 * @returns {boolean}
 */
export function isEnabled(flag) {
  return Boolean(FEAT[flag]);
}

/**
 * Get all features the current plan can access.
 * @returns {string[]}
 */
export function availableFeatures() {
  const { plan } = getState();
  return Object.keys(PLAN_RULES).filter(f => canUse(f, plan));
}

/**
 * Get all features locked for the current plan (for upsell UI).
 * @returns {string[]}
 */
export function lockedFeatures() {
  const { plan } = getState();
  return Object.keys(PLAN_RULES).filter(f => !canUse(f, plan));
}

export default { FEAT, canUse, isEnabled, availableFeatures, lockedFeatures };
