/**
 * NeuroVision — Global State
 * Single source of truth for the entire app.
 * Uses a lightweight subscriber pattern — no external dependencies.
 *
 * Usage:
 *   import { State, getState, setState, subscribe } from '@/core/state.js';
 *   setState({ zoom: 1.5 });
 *   const { plan } = getState();
 *   subscribe('zoom', newZoom => updateZoomLabel(newZoom));
 */

import { DEFAULT_GOAL } from '../constants/goals.js';
import {
  FREE_DAILY_LIMIT,
  STORAGE_KEY_PLAN,
  STORAGE_KEY_USAGE,
  STORAGE_KEY_DATE,
  STORAGE_KEY_SETTINGS,
} from '../constants/limits.js';
import { Logger } from './logger.js';

const log = Logger.create('State');

// ── Load persisted values safely ─────────────────────────
function loadPersisted() {
  try {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
    const usedToday = storedDate === today
      ? parseInt(localStorage.getItem(STORAGE_KEY_USAGE) || '0', 10)
      : 0;
    return {
      plan:      localStorage.getItem(STORAGE_KEY_PLAN) || 'free',
      usedToday,
    };
  } catch {
    return { plan: 'free', usedToday: 0 };
  }
}

const persisted = loadPersisted();

// ── Initial State ─────────────────────────────────────────
/** @type {import('../types/analysis.types').AppState & import('../types/api.types').UserSession} */
const INITIAL_STATE = {
  // ── Image ──
  origURL:      null,
  enhancedURL:  null,
  currentURL:   null,
  origImg:      null,
  metrics:      null,
  analysis:     null,

  // ── Canvas ──
  zoom:         1,
  overlayOn:    true,
  compareMode:  false,
  cmpX:         0.5,
  qualBefore:   0,
  viralBefore:  0,

  // ── Session / Plan ──
  plan:         persisted.plan,
  usedToday:    persisted.usedToday,
  limitFree:    FREE_DAILY_LIMIT,

  // ── UI ──
  goal:         DEFAULT_GOAL,
  chatOpen:     false,
  chatHistory:  [],
  apiOnline:    false,
  retryCount:   0,

  // ── Batch ──
  batchQueue:   [],
  batchRunning: false,
  batchDone:    0,
  batchErrors:  0,

  // ── Network ──
  isOnline:     navigator.onLine,
  isSlowConn:   false,

  // ── Feature toggles (runtime) ──
  featureExplain: false,
  featureOverlay: true,
  featurePersist: true,
};

// ── Subscriber map: key → Set<callback> ──────────────────
const _subscribers = new Map();

let _state = { ...INITIAL_STATE };

// ── Core API ─────────────────────────────────────────────
/**
 * Get entire state snapshot (do not mutate directly).
 * @returns {typeof INITIAL_STATE}
 */
export function getState() {
  return _state;
}

/**
 * Merge partial update into state, then notify subscribers.
 * @param {Partial<typeof INITIAL_STATE>} patch
 */
export function setState(patch) {
  const prev = _state;
  _state = { ..._state, ...patch };
  log.debug('setState', patch);

  // Notify key-specific subscribers
  for (const key of Object.keys(patch)) {
    const subs = _subscribers.get(key);
    if (subs) subs.forEach(cb => cb(_state[key], prev[key]));
  }

  // Always notify wildcard '*' subscribers
  const all = _subscribers.get('*');
  if (all) all.forEach(cb => cb(_state, prev));

  // Persist plan/usage changes
  if ('plan' in patch || 'usedToday' in patch) _persist();
}

/**
 * Subscribe to a specific state key or '*' for all changes.
 * @param {string} key - State key or '*'
 * @param {Function} callback - (newVal, prevVal) => void
 * @returns {Function} unsubscribe function
 */
export function subscribe(key, callback) {
  if (!_subscribers.has(key)) _subscribers.set(key, new Set());
  _subscribers.get(key).add(callback);
  return () => _subscribers.get(key)?.delete(callback);
}

/**
 * Reset state to initial values (keeps persisted plan/usage).
 */
export function resetState() {
  const { plan, usedToday } = _state;
  _state = { ...INITIAL_STATE, plan, usedToday };
  const all = _subscribers.get('*');
  if (all) all.forEach(cb => cb(_state, null));
}

// ── Persist plan & usage to localStorage ─────────────────
function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY_PLAN,  _state.plan);
    localStorage.setItem(STORAGE_KEY_USAGE, String(_state.usedToday));
    localStorage.setItem(STORAGE_KEY_DATE,  new Date().toDateString());
  } catch { /* private mode — silently ignore */ }
}

// ── Convenience selectors ─────────────────────────────────
export const State = {
  get:        getState,
  set:        setState,
  subscribe,
  reset:      resetState,

  isProUser:  () => _state.plan !== 'free',
  canAnalyze: () => _state.plan !== 'free' || _state.usedToday < _state.limitFree,
  hasImage:   () => Boolean(_state.origURL),
  hasAnalysis:() => Boolean(_state.analysis),
};

export default State;
