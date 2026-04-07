/**
 * utils.js — Shared helpers. No UI logic, no state access.
 */

/** Query selector shorthand */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Show/hide elements */
export function show(el, display = '') {
  if (typeof el === 'string') el = $(el);
  if (el) el.style.display = display || '';
}

export function hide(el) {
  if (typeof el === 'string') el = $(el);
  if (el) el.style.display = 'none';
}

export function toggle(el, condition, display = '') {
  condition ? show(el, display) : hide(el);
}

/** Add / remove CSS class */
export function cls(el, ...names) {
  if (typeof el === 'string') el = $(el);
  if (el) el.classList.add(...names);
}

export function uncls(el, ...names) {
  if (typeof el === 'string') el = $(el);
  if (el) el.classList.remove(...names);
}

/** Safe HTML escape */
export function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

/** Format confidence 0-1 as percentage string */
export function pct(val) {
  return Math.round(val * 100) + '%';
}

/** Format file size */
export function fileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Debounce */
export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Sleep */
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Clamp */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Seeded pseudo-random number generator.
 * Produces deterministic results for consistent mock analysis.
 */
export function seededRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Generate a hash number from a string (for seeding).
 */
export function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Pick N items from array without replacement using seeded rng.
 */
export function pickN(arr, n, rng) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rng() * (copy.length - i));
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Capitalize first letter.
 */
export function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Pluralize a word.
 * pluralize(3, 'person', 'people') → '3 people'
 */
export function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : (plural || singular + 's')}`;
}

/**
 * Detection colors — consistent by label.
 */
const LABEL_COLORS = {
  person:    '#4d7fff',
  car:       '#00e5a0',
  truck:     '#22d3ee',
  bicycle:   '#a78bfa',
  motorcycle:'#f472b6',
  dog:       '#fbbf24',
  cat:       '#fb923c',
  chair:     '#94a3b8',
  laptop:    '#60a5fa',
  phone:     '#34d399',
  bottle:    '#e879f9',
  cup:       '#facc15',
  book:      '#f87171',
  bag:       '#818cf8',
  tree:      '#4ade80',
  bus:       '#38bdf8',
};

const FALLBACK_COLORS = [
  '#4d7fff','#00e5a0','#a78bfa','#fbbf24','#f472b6',
  '#22d3ee','#fb923c','#60a5fa','#34d399','#e879f9',
];

let colorIdx = 0;
const assignedColors = {};

export function colorForLabel(label) {
  const key = label.toLowerCase();
  if (LABEL_COLORS[key]) return LABEL_COLORS[key];
  if (!assignedColors[key]) {
    assignedColors[key] = FALLBACK_COLORS[colorIdx++ % FALLBACK_COLORS.length];
  }
  return assignedColors[key];
}

/**
 * Hex color → rgba string with alpha.
 */
export function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Show a toast notification.
 */
export function toast(msg, type = '', duration = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._tid);
  el._tid = setTimeout(() => el.classList.remove('show'), duration);
}
