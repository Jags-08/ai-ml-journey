/**
 * NeuroVision — Logger
 * Centralized, level-aware logging with production monitoring hooks.
 * In production: error/warn only (+ optional Sentry integration).
 * In dev: all levels with coloured prefixes.
 *
 * Usage:
 *   import { Logger } from '@/core/logger.js';
 *   const log = Logger.create('AnalysisModule');
 *   log.debug('metrics', metrics);
 *   log.error('API failed', err);
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const COLOURS = {
  debug: 'color:#60a5fa;font-weight:600',
  info:  'color:#10b981;font-weight:600',
  warn:  'color:#f59e0b;font-weight:600',
  error: 'color:#f43f5e;font-weight:700',
};

// Detect environment — works with Vite and plain browsers
const IS_DEV = (typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production')
  || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

const ACTIVE_LEVEL = IS_DEV ? 'debug' : 'warn';

// ── Remote reporting stub (plug in Sentry/Datadog here) ─
function remoteReport(level, namespace, args) {
  if (level !== 'error') return;
  // Example Sentry integration:
  // if (window.Sentry) window.Sentry.captureException(args[0] instanceof Error ? args[0] : new Error(String(args[0])), { extra: { namespace } });
  // For now, store in memory ring buffer
  Logger._errorBuffer.push({ ts: Date.now(), namespace, msg: String(args[0]) });
  if (Logger._errorBuffer.length > 100) Logger._errorBuffer.shift();
}

// ── Core Logger ──────────────────────────────────────────
export const Logger = {
  _errorBuffer: [],

  /**
   * Create a namespaced logger instance.
   * @param {string} namespace
   */
  create(namespace) {
    const ns = `[NV:${namespace}]`;
    const out = {};

    for (const [level, priority] of Object.entries(LEVELS)) {
      out[level] = (...args) => {
        if (priority < LEVELS[ACTIVE_LEVEL]) return;
        remoteReport(level, namespace, args);
        if (IS_DEV) {
          console[level === 'debug' ? 'log' : level](
            `%c${ns}`, COLOURS[level], ...args
          );
        } else if (level === 'error' || level === 'warn') {
          console[level](ns, ...args);
        }
      };
    }

    /** @param {string} label @param {string} [id] */
    out.time = (label, id = namespace) => {
      if (IS_DEV) console.time(`${ns} ${label} [${id}]`);
    };
    /** @param {string} label @param {string} [id] */
    out.timeEnd = (label, id = namespace) => {
      if (IS_DEV) console.timeEnd(`${ns} ${label} [${id}]`);
    };

    return out;
  },

  /** Return buffered errors (for debug panel / support reports) */
  getErrors() {
    return [...this._errorBuffer];
  },

  /** Clear error buffer */
  clearErrors() {
    this._errorBuffer = [];
  },
};

export default Logger;
