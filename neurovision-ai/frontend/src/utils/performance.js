/**
 * NeuroVision — Performance Utils
 * Prevents the canvas/animation/analytics stack from lagging,
 * especially critical on mobile and slow Indian connections.
 *
 * Usage:
 *   import { debounce, throttle, LazyLoader } from '@/utils/performance.js';
 *   window.addEventListener('resize', throttle(onResize, 100));
 *   const lazySearch = debounce(search, 300);
 */

import { DEBOUNCE_INPUT_MS, THROTTLE_SCROLL_MS, LAZY_LOAD_ROOT_MARGIN } from '../constants/limits.js';

/**
 * Debounce: delay execution until after `wait` ms of silence.
 * @param {Function} fn
 * @param {number} [wait]
 * @returns {Function}
 */
export function debounce(fn, wait = DEBOUNCE_INPUT_MS) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttle: allow at most one call per `limit` ms.
 * @param {Function} fn
 * @param {number} [limit]
 * @returns {Function}
 */
export function throttle(fn, limit = THROTTLE_SCROLL_MS) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Lazy-load elements with data-src attribute using IntersectionObserver.
 * Falls back to immediate load if IntersectionObserver is not available.
 * @param {string} [selector]
 */
export function initLazyLoader(selector = '[data-lazy]') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(el => _load(el));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { _load(e.target); obs.unobserve(e.target); }
    });
  }, { rootMargin: LAZY_LOAD_ROOT_MARGIN });

  els.forEach(el => obs.observe(el));
}

function _load(el) {
  if (el.dataset.src)   el.src   = el.dataset.src;
  if (el.dataset.style) el.style.cssText = el.dataset.style;
  el.classList.add('loaded');
}

/**
 * Scroll reveal: animate elements into view.
 * @param {string} [selector]
 */
export function initScrollReveal(selector = '.reveal') {
  const els = document.querySelectorAll(selector);
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('vis'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
}

/**
 * requestAnimationFrame loop runner.
 * Returns a stop function.
 * @param {(timestamp: number) => void} fn
 * @returns {{ stop: Function }}
 */
export function rafLoop(fn) {
  let id;
  function tick(ts) { fn(ts); id = requestAnimationFrame(tick); }
  id = requestAnimationFrame(tick);
  return { stop: () => cancelAnimationFrame(id) };
}
