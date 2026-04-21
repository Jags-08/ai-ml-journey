/**
 * NeuroVision — Error Handler
 * Centralized error classification, recovery suggestions,
 * and global uncaught error capture.
 *
 * Usage:
 *   import { ErrorHandler } from '@/core/errorHandler.js';
 *   ErrorHandler.handle(error, 'UploadController');
 *   const msg = ErrorHandler.userMessage(error);
 */

import { Logger } from './logger.js';
const log = Logger.create('ErrorHandler');

// ── Error Types ───────────────────────────────────────────
export const ERR = {
  NETWORK:    'ERR_NETWORK',
  TIMEOUT:    'ERR_TIMEOUT',
  VALIDATION: 'ERR_VALIDATION',
  API:        'ERR_API',
  CANVAS:     'ERR_CANVAS',
  STORAGE:    'ERR_STORAGE',
  UNKNOWN:    'ERR_UNKNOWN',
};

// ── Friendly user messages per error type ─────────────────
const USER_MESSAGES = {
  [ERR.NETWORK]:    'Connection issue. Check your internet and try again.',
  [ERR.TIMEOUT]:    'The request took too long. Please try again.',
  [ERR.VALIDATION]: 'Invalid input — please check your file or settings.',
  [ERR.API]:        'AI service returned an error. Retrying may help.',
  [ERR.CANVAS]:     'Image processing failed. Try a different image.',
  [ERR.STORAGE]:    'Could not save to local storage. Private mode?',
  [ERR.UNKNOWN]:    'Something went wrong. Please try again.',
};

// ── Classify native JS errors into our type enum ─────────
function classify(error) {
  if (!error) return ERR.UNKNOWN;
  const msg = (error.message || '').toLowerCase();
  if (error.name === 'AbortError' || msg.includes('abort')) return ERR.TIMEOUT;
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) return ERR.NETWORK;
  if (msg.includes('timeout')) return ERR.TIMEOUT;
  if (msg.includes('quota') || msg.includes('storage')) return ERR.STORAGE;
  if (msg.includes('canvas') || msg.includes('image') || msg.includes('2d')) return ERR.CANVAS;
  if (error.status >= 400) return ERR.API;
  return ERR.UNKNOWN;
}

// ── Recovery suggestions per error type ──────────────────
const RECOVERY = {
  [ERR.NETWORK]:    ['Check your connection', 'Try again in a moment', 'Switch to offline/demo mode'],
  [ERR.TIMEOUT]:    ['Retry the request', 'Try a smaller image', 'Switch to demo mode'],
  [ERR.VALIDATION]: ['Check the file format (JPG/PNG/WebP)', 'Ensure file is under 20 MB'],
  [ERR.API]:        ['Retry the request', 'Use local processing mode'],
  [ERR.CANVAS]:     ['Try a different image format', 'Reload the page'],
  [ERR.STORAGE]:    ['Disable private browsing', 'Clear site storage in browser settings'],
  [ERR.UNKNOWN]:    ['Reload the page', 'Try again'],
};

// ── Main Handler ──────────────────────────────────────────
export const ErrorHandler = {
  /**
   * Handle an error: classify, log, and optionally report.
   * @param {Error|any} error
   * @param {string} [context] - Module/function name for logging
   * @returns {{ type: string, message: string, recovery: string[] }}
   */
  handle(error, context = 'Unknown') {
    const type = classify(error);
    const message = USER_MESSAGES[type];
    const recovery = RECOVERY[type];

    log.error(`[${context}] ${type}:`, error?.message || error);

    return { type, message, recovery };
  },

  /**
   * Get a user-friendly message for an error.
   * @param {Error|any} error
   * @returns {string}
   */
  userMessage(error) {
    return USER_MESSAGES[classify(error)] || USER_MESSAGES[ERR.UNKNOWN];
  },

  /**
   * Wrap an async function with automatic error handling.
   * Returns { result, error } — never throws.
   * @template T
   * @param {() => Promise<T>} fn
   * @param {string} [context]
   * @returns {Promise<{ result: T|null, error: null|{ type: string, message: string } }>}
   */
  async safeRun(fn, context = 'Unknown') {
    try {
      const result = await fn();
      return { result, error: null };
    } catch (e) {
      const info = this.handle(e, context);
      return { result: null, error: info };
    }
  },
};

// ── Global uncaught error capture ────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    ErrorHandler.handle(e.reason, 'UnhandledPromise');
  });
  window.addEventListener('error', (e) => {
    ErrorHandler.handle(e.error || e.message, 'GlobalError');
  });
}

export default ErrorHandler;
