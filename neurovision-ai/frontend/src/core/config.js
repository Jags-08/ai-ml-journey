/**
 * NeuroVision — Runtime Configuration
 * Loads the correct env config based on import.meta.env.MODE
 * then merges with any hardcoded defaults.
 *
 * Usage:
 *   import { CFG } from '@/core/config.js';
 *   fetch(CFG.apiBase + '/health')
 */

import { MAX_FILE_MB, ALLOWED_TYPES } from '../constants/limits.js';

// ── Dynamic env import ────────────────────────────────────
let envCfg = {};
try {
  if (typeof import.meta !== 'undefined') {
    const mode = import.meta.env?.MODE ?? 'development';
    if (mode === 'production') {
      const mod = await import('./env/prod.js');
      envCfg = mod.default;
    } else {
      const mod = await import('./env/dev.js');
      envCfg = mod.default;
    }
  }
} catch (e) {
  console.warn('[CFG] Could not load env config, using defaults');
}

// ── Base config (overrideable by env) ────────────────────
const BASE = {
  apiBase:      'http://localhost:8000',
  maxMB:        MAX_FILE_MB,
  allowedTypes: ALLOWED_TYPES,
  appName:      'NeuroVision',
  appVersion:   '4.0.0',
  debugMode:    true,
  analyticsEnabled: false,
  sentryDSN:    null,
};

export const CFG = {
  ...BASE,
  ...envCfg,
};

export default CFG;
