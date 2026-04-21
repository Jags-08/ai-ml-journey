/**
 * NeuroVision — API Layer
 * All backend calls live here. UI modules never call fetch() directly.
 * Handles: timeouts, retries with exponential backoff, FormData prep.
 *
 * Usage:
 *   import { API } from '@/core/api.js';
 *   const result = await API.analyze(dataURL, 'instagram');
 */

import CFG from './config.js';
import { Logger } from './logger.js';
import { setState } from './state.js';
import {
  API_TIMEOUT_MS,
  ANALYZE_TIMEOUT_MS,
  ENHANCE_TIMEOUT_MS,
  CHAT_TIMEOUT_MS,
  HEALTH_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
} from '../constants/limits.js';

const log = Logger.create('API');

// ── Low-level fetch with timeout ──────────────────────────
async function _fetch(url, opts = {}, timeoutMs = API_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  log.debug(`→ ${opts.method || 'GET'} ${url}`);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(timer);
    const data = res.ok ? await res.json().catch(() => null) : null;
    log.debug(`← ${res.status} ${url}`, data);
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(timer);
    const error = e.name === 'AbortError' ? 'timeout' : e.message;
    log.warn(`✗ ${url}`, error);
    return { ok: false, error };
  }
}

// ── Retry wrapper with exponential backoff ────────────────
async function _withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result.ok) return result;
    if (i < retries - 1) {
      const wait = RETRY_BASE_DELAY_MS * Math.pow(2, i);
      log.info(`Retry ${i + 1}/${retries} in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return { ok: false, error: 'Max retries exceeded' };
}

// ── Convert dataURL → Blob ────────────────────────────────
async function _dataURLtoBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

// ── Public API object ─────────────────────────────────────
export const API = {
  get base() { return CFG.apiBase; },

  // ── Health check ────────────────────────────────────────
  async health() {
    const r = await _fetch(`${this.base}/health`, {}, HEALTH_TIMEOUT_MS);
    setState({ apiOnline: r.ok });
    return r.ok;
  },

  // ── Analyze image ────────────────────────────────────────
  /**
   * @param {string} imageDataURL
   * @param {string} goal
   * @returns {Promise<import('../types/api.types').ApiResponse>}
   */
  async analyze(imageDataURL, goal) {
    const blob = await _dataURLtoBlob(imageDataURL);
    const fd = new FormData();
    fd.append('image', blob, 'image.jpg');
    fd.append('goal', goal);
    return _withRetry(() => _fetch(
      `${this.base}/analyze`,
      { method: 'POST', body: fd },
      ANALYZE_TIMEOUT_MS
    ));
  },

  // ── Enhance image ────────────────────────────────────────
  /**
   * @param {string} imageDataURL
   * @param {string} filter
   * @param {string} goal
   * @returns {Promise<import('../types/api.types').ApiResponse>}
   */
  async enhance(imageDataURL, filter, goal) {
    const blob = await _dataURLtoBlob(imageDataURL);
    const fd = new FormData();
    fd.append('image', blob, 'image.jpg');
    fd.append('filter', filter);
    fd.append('goal', goal);
    return _withRetry(() => _fetch(
      `${this.base}/enhance`,
      { method: 'POST', body: fd },
      ENHANCE_TIMEOUT_MS
    ));
  },

  // ── Chat ─────────────────────────────────────────────────
  /**
   * @param {string} message
   * @param {{ quality?: number, scene?: string, goal?: string }} context
   * @returns {Promise<import('../types/api.types').ApiResponse>}
   */
  async chat(message, context = {}) {
    return _fetch(
      `${this.base}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      },
      CHAT_TIMEOUT_MS
    );
  },

  // ── Batch analyze (pro only) ─────────────────────────────
  async batchAnalyze(imageDataURLs, goal) {
    const fd = new FormData();
    for (let i = 0; i < imageDataURLs.length; i++) {
      const blob = await _dataURLtoBlob(imageDataURLs[i]);
      fd.append('images', blob, `image_${i}.jpg`);
    }
    fd.append('goal', goal);
    return _withRetry(() => _fetch(
      `${this.base}/batch`,
      { method: 'POST', body: fd },
      ENHANCE_TIMEOUT_MS * imageDataURLs.length
    ));
  },
};

export default API;
