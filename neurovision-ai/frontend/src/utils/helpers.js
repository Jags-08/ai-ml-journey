/**
 * NeuroVision — Helpers
 * General-purpose utility functions used across the codebase.
 */

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Clamp a value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Linear interpolate between a and b by t.
 * @param {number} a
 * @param {number} b
 * @param {number} t - [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Generate a short unique ID.
 * @param {number} [len=8]
 * @returns {string}
 */
export function uid(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

/**
 * Format a date to a readable string.
 * @param {Date|number} date
 * @returns {string}
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Capitalise first letter of each word.
 * @param {string} str
 * @returns {string}
 */
export function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Wait ms milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Parse a dataURL to get MIME type.
 * @param {string} dataURL
 * @returns {string}
 */
export function mimeFromDataURL(dataURL) {
  return dataURL.split(';')[0].split(':')[1] || 'image/jpeg';
}
