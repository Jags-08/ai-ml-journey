/**
 * NeuroVision — Analytics
 * Lightweight event tracking. Plugs into any backend
 * (Mixpanel, Amplitude, Posthog) by swapping _send().
 *
 * Usage:
 *   import { Analytics } from '@/utils/analytics.js';
 *   Analytics.track('filter_applied', { filter: 'vivid', quality: 88 });
 *   Analytics.page('landing');
 */

import CFG from '../core/config.js';
import { getState } from '../core/state.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('Analytics');

// ── In-memory event buffer (flushed in batches) ───────────
const _queue = [];
let _flushTimer = null;

function _send(events) {
  if (!CFG.analyticsEnabled) return;
  // Replace with: fetch('/api/events', { method:'POST', body: JSON.stringify(events) })
  // Or: mixpanel.track(...), amplitude.logEvent(...), etc.
  log.debug('Analytics flush:', events.length, 'events');
}

function _flush() {
  if (!_queue.length) return;
  _send([..._queue]);
  _queue.length = 0;
}

function _enqueue(event) {
  _queue.push(event);
  clearTimeout(_flushTimer);
  _flushTimer = setTimeout(_flush, 3000); // batch flush every 3s
}

export const Analytics = {
  /**
   * Track a user action or system event.
   * @param {string} event
   * @param {Object} [props]
   */
  track(event, props = {}) {
    if (!CFG.analyticsEnabled) return;
    const { plan, goal, analysis } = getState();
    const enriched = {
      event,
      ts:     Date.now(),
      plan,
      goal,
      quality: analysis?.quality ?? null,
      ...props,
    };
    log.debug(`Track: ${event}`, enriched);
    _enqueue(enriched);
  },

  /**
   * Track a page view.
   * @param {string} pageName
   */
  page(pageName) {
    this.track('page_view', { page: pageName, url: window.location.pathname });
  },

  /**
   * Track conversion-related events.
   * @param {'upgrade_click'|'pricing_open'|'plan_changed'} action
   * @param {Object} [props]
   */
  conversion(action, props = {}) {
    this.track(`conversion_${action}`, props);
  },

  /** Force-flush the queue immediately. */
  flush: _flush,
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flush();
  });
}

export default Analytics;
