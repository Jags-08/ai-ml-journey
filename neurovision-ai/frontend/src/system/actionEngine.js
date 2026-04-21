/**
 * NeuroVision — Action Engine
 * Translates user intent strings (from chat or command palette)
 * into concrete app actions. Single place where intent → execution lives.
 *
 * Usage:
 *   import { ActionEngine } from '@/system/actionEngine.js';
 *   const matched = ActionEngine.match('make it warm');
 *   if (matched) ActionEngine.run(matched.key);
 */

import { CHAT_CMD } from '../constants/actions.js';
import { canUse } from '../core/features.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('ActionEngine');

// ── Action Registry ───────────────────────────────────────
// key → { label, icon, feature, keywords, execute }
const _registry = new Map();

export const ActionEngine = {
  /**
   * Register an action.
   * @param {string} key - Unique action key (use CHAT_CMD constants)
   * @param {{ label: string, icon: string, feature?: string, keywords: string[], execute: Function }} def
   */
  register(key, def) {
    _registry.set(key, { key, ...def });
  },

  /**
   * Match raw user text against all registered action keywords.
   * @param {string} text
   * @returns {{ key: string, label: string, icon: string } | null}
   */
  match(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const [key, action] of _registry) {
      if (action.keywords.some(kw => lower.includes(kw))) {
        return { key, label: action.label, icon: action.icon };
      }
    }
    return null;
  },

  /**
   * Execute a registered action by key.
   * Checks feature gate before running.
   * @param {string} key
   * @returns {boolean} whether action ran successfully
   */
  run(key) {
    const action = _registry.get(key);
    if (!action) { log.warn(`Unknown action: ${key}`); return false; }

    if (action.feature && !canUse(action.feature)) {
      log.info(`Action "${key}" requires feature: ${action.feature}`);
      document.dispatchEvent(new CustomEvent('nv:openPricing', { detail: { feature: action.feature } }));
      return false;
    }

    try {
      log.debug(`Run action: ${key}`);
      action.execute();
      return true;
    } catch (e) {
      log.error(`Action "${key}" threw:`, e);
      return false;
    }
  },

  /**
   * Get all registered actions (for command palette rendering).
   * @returns {Array<{ key: string, label: string, icon: string, feature?: string }>}
   */
  all() {
    return [..._registry.values()].map(({ key, label, icon, feature }) => ({ key, label, icon, feature }));
  },

  /**
   * Get actions available for the current plan.
   * @returns {Array}
   */
  available() {
    return this.all().filter(a => !a.feature || canUse(a.feature));
  },
};

// ── Default Action Registrations ─────────────────────────
// These are filled in by modules when they initialize,
// using ActionEngine.register(). Defaults registered here
// reference window.* globals for backward compat during migration.

const _bind = (fn) => (...args) => {
  if (typeof fn === 'function') return fn(...args);
  log.warn(`Action function not yet available`);
};

ActionEngine.register(CHAT_CMD.IMPROVE_BRIGHTNESS, {
  label: '🔆 Boost Brightness', icon: '🔆',
  keywords: ['improve brightness', 'make brighter', 'too dark', 'lighten'],
  execute: _bind(() => window.applyFilter?.('enhance')),
});
ActionEngine.register(CHAT_CMD.FIX_LIGHTING, {
  label: '💡 Fix Lighting', icon: '💡',
  keywords: ['fix lighting', 'bad lighting', 'dark image'],
  execute: _bind(() => window.applyFilter?.('enhance')),
});
ActionEngine.register(CHAT_CMD.ADD_WARMTH, {
  label: '🌅 Add Warmth', icon: '🌅',
  keywords: ['add warmth', 'make warm', 'warmer', 'golden'],
  execute: _bind(() => window.applyFilter?.('warm')),
});
ActionEngine.register(CHAT_CMD.MAKE_COOL, {
  label: '❄️ Cool Tones', icon: '❄️',
  keywords: ['make cool', 'cooler', 'blue tones', 'cold'],
  execute: _bind(() => window.applyFilter?.('cool')),
});
ActionEngine.register(CHAT_CMD.BLACK_AND_WHITE, {
  label: '⬛ Black & White', icon: '⬛',
  keywords: ['black and white', 'grayscale', 'b&w', 'monochrome'],
  execute: _bind(() => window.applyFilter?.('bw')),
});
ActionEngine.register(CHAT_CMD.SHARPEN, {
  label: '💎 Sharpen', icon: '💎',
  keywords: ['sharpen', 'make sharp', 'crisp', 'unblur', 'blur'],
  execute: _bind(() => window.applyDIPOp?.('sharpen')),
});
ActionEngine.register(CHAT_CMD.FIX_EVERYTHING, {
  label: '⚡ Auto Fix', icon: '⚡',
  keywords: ['fix everything', 'auto fix', 'enhance', 'improve all', 'fix all'],
  execute: _bind(() => document.getElementById('auto-fix-btn')?.click()),
});
ActionEngine.register(CHAT_CMD.VIVID, {
  label: '🌈 Vivid', icon: '🌈',
  keywords: ['vivid', 'vibrant', 'saturate', 'colorful', 'pop'],
  execute: _bind(() => window.applyFilter?.('vivid')),
});
ActionEngine.register(CHAT_CMD.CINEMATIC, {
  label: '🎬 Cinematic', icon: '🎬',
  keywords: ['cinematic', 'film', 'professional', 'movie look'],
  execute: _bind(() => window.applyFilter?.('cinematic')),
});
ActionEngine.register(CHAT_CMD.COMPARE, {
  label: '⇄ Compare Before/After', icon: '⇄',
  keywords: ['compare', 'before after', 'before and after', 'difference'],
  execute: _bind(() => window.toggleCmp?.()),
});
ActionEngine.register(CHAT_CMD.EXPORT, {
  label: '📤 Export Image', icon: '📤',
  keywords: ['export', 'save', 'download', 'save image'],
  execute: _bind(() => window.exportImg?.('jpeg')),
});

export default ActionEngine;
