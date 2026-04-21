/**
 * NeuroVision — useAnalysis Hook
 * Exposes analysis state and score animation helpers.
 *
 * Usage:
 *   import { useAnalysis } from '@/hooks/useAnalysis.js';
 *   const analysis = useAnalysis();
 *   analysis.animateScore('sq-q', 'sqb-q', 55, 88, 'var(--green)');
 */

import { getState, subscribe } from '../core/state.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('useAnalysis');

export function useAnalysis() {
  /**
   * Animate a score counter from `from` to `to`.
   * @param {string} valElId   - Element showing the number
   * @param {string} barElId   - Element showing the bar fill
   * @param {number} from
   * @param {number} to
   * @param {string} color     - CSS color string
   */
  function animateScore(valElId, barElId, from, to, color) {
    const valEl = document.getElementById(valElId);
    const barEl = document.getElementById(barElId);
    if (!valEl && !barEl) return;

    const duration = 1200;
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const cur = Math.round(from + (to - from) * eased);

      if (valEl) { valEl.textContent = cur; valEl.style.color = color; }
      if (barEl) { barEl.style.width = `${cur}%`; barEl.style.background = color; }

      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * Get a color string based on score value.
   * @param {number} score
   * @returns {string}
   */
  function scoreColor(score) {
    if (score >= 70) return 'var(--green)';
    if (score >= 50) return 'var(--amber)';
    return 'var(--red)';
  }

  /** Subscribe to analysis changes */
  function onChange(cb) {
    return subscribe('analysis', cb);
  }

  return {
    animateScore,
    scoreColor,
    onChange,

    get analysis()  { return getState().analysis; },
    get quality()   { return getState().analysis?.quality ?? 0; },
    get virality()  { return getState().analysis?.virality ?? 0; },
    get problems()  { return getState().analysis?.problems ?? []; },
    get detections(){ return getState().analysis?.detections ?? []; },
    get scene()     { return getState().analysis?.scene ?? null; },
  };
}

export default useAnalysis;
