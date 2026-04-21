/**
 * NeuroVision — Storage Service
 * Safe wrapper around localStorage/sessionStorage.
 * Never throws — degrades gracefully in private mode.
 *
 * Usage:
 *   import { StorageService } from '@/services/storageService.js';
 *   StorageService.set('nv_plan', 'pro');
 *   const plan = StorageService.get('nv_plan', 'free');
 */

import { Logger } from '../core/logger.js';

const log = Logger.create('StorageService');

function _isAvailable(type = 'localStorage') {
  try {
    const storage = window[type];
    const key = '__nv_test__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const _localOk   = _isAvailable('localStorage');
const _sessionOk = _isAvailable('sessionStorage');

export const StorageService = {
  // ── LocalStorage ──────────────────────────────────────────
  /**
   * @param {string} key
   * @param {any} value - Will be JSON-serialized
   * @returns {boolean} success
   */
  set(key, value) {
    if (!_localOk) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      log.warn(`set(${key}) failed:`, e.message);
      return false;
    }
  },

  /**
   * @param {string} key
   * @param {any} [defaultValue]
   * @returns {any} parsed value or default
   */
  get(key, defaultValue = null) {
    if (!_localOk) return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  /**
   * @param {string} key
   */
  remove(key) {
    if (!_localOk) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },

  /** Clear all NeuroVision keys (prefix nv_) */
  clearAll() {
    if (!_localOk) return;
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('nv_'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  },

  // ── SessionStorage (tab-scoped) ──────────────────────────
  session: {
    set(key, value) {
      if (!_sessionOk) return false;
      try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
    get(key, defaultValue = null) {
      if (!_sessionOk) return defaultValue;
      try {
        const raw = sessionStorage.getItem(key);
        return raw == null ? defaultValue : JSON.parse(raw);
      } catch { return defaultValue; }
    },
    remove(key) {
      if (!_sessionOk) return;
      try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    },
  },

  // ── Availability flags ────────────────────────────────────
  isAvailable:        _localOk,
  isSessionAvailable: _sessionOk,
};

export default StorageService;
