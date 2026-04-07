/**
 * canvas.js — Canvas rendering and overlay UI.
 * Rule: Renders to DOM. Reads state passed in. No mutations.
 */

import { $, show, hide, hexAlpha } from '../utils.js';
import { renderImageToCanvas, restoreFromDataURL } from '../modules/image.js';

let _mainCanvas    = null;
let _overlayCanvas = null;
let _mainCtx       = null;
let _overlayCtx    = null;

/**
 * Initialise canvas references.
 */
export function initCanvas() {
  _mainCanvas    = $('#main-canvas');
  _overlayCanvas = $('#overlay-canvas');
  _mainCtx       = _mainCanvas?.getContext('2d');
  _overlayCtx    = _overlayCanvas?.getContext('2d');
}

/** Get main canvas element. */
export function getCanvas() { return _mainCanvas; }

// ── Analyzing overlay ───────────────────────────────────

export function showAnalyzing(stepLabel = 'Detecting objects', progress = 0) {
  const overlay = $('#analyzing-overlay');
  const label   = $('#analyzing-step-label');
  const bar     = $('#analyzing-bar');
  if (overlay) show(overlay, 'flex');
  if (label)   label.textContent = stepLabel;
  if (bar)     bar.style.width   = progress + '%';
}

export function updateAnalyzingStep(stepLabel, progress) {
  const label = $('#analyzing-step-label');
  const bar   = $('#analyzing-bar');
  if (label) label.textContent = stepLabel;
  if (bar)   bar.style.width   = progress + '%';
}

export function hideAnalyzing() {
  hide('#analyzing-overlay');
}

// ── Image render ────────────────────────────────────────

/**
 * Render an image onto the main canvas. Returns dataURL.
 */
export function renderImage(image) {
  if (!_mainCanvas) return '';
  return renderImageToCanvas(_mainCanvas, image, _overlayCanvas);
}

/**
 * Restore canvas from a data URL (for undo/redo).
 */
export function restoreCanvas(dataURL) {
  if (!_mainCanvas) return;
  return restoreFromDataURL(_mainCanvas, dataURL);
}

// ── Detection overlay ───────────────────────────────────

/**
 * Draw detection bounding boxes on the overlay canvas.
 * @param {Array}   detections
 * @param {boolean} visible
 * @param {number}  srcW  original image width
 * @param {number}  srcH  original image height
 */
export function renderDetections(detections, visible, srcW, srcH) {
  if (!_overlayCtx || !_overlayCanvas) return;
  const ctx = _overlayCtx;
  const cw  = _overlayCanvas.width;
  const ch  = _overlayCanvas.height;
  const scaleX = cw / srcW;
  const scaleY = ch / srcH;

  // Clear detection layer (keep emotion labels by re-drawing below)
  clearOverlay();

  if (!visible || !detections.length) return;

  detections.forEach(det => {
    const [x1, y1, x2, y2] = det.bbox;
    const sx = x1 * scaleX, sy = y1 * scaleY;
    const sw = (x2 - x1) * scaleX, sh = (y2 - y1) * scaleY;
    const color = det.color || '#4d7fff';

    // Box fill
    ctx.fillStyle = hexAlpha(color, 0.08);
    ctx.fillRect(sx, sy, sw, sh);

    // Box stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    drawCornerBox(ctx, sx, sy, sw, sh, Math.min(sw, sh) * 0.15);

    // Label tag
    const label = det.label;
    const conf  = Math.round(det.confidence * 100) + '%';
    const text  = label + ' ' + conf;
    const pad   = 4;
    const fh    = 11;
    ctx.font = `600 ${fh}px "JetBrains Mono", monospace`;
    const tw = ctx.measureText(text).width;

    // Tag background
    ctx.fillStyle = color;
    roundRect(ctx, sx, sy - fh - pad*2, tw + pad*2, fh + pad*2, 3);
    ctx.fill();

    // Tag text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, sx + pad, sy - pad);
  });
}

/**
 * Draw emotion indicators on the overlay canvas.
 */
export function renderEmotions(emotions, detections, visible, srcW, srcH) {
  if (!_overlayCtx || !_overlayCanvas) return;
  if (!visible || !emotions.length) return;

  const ctx    = _overlayCtx;
  const cw     = _overlayCanvas.width;
  const ch     = _overlayCanvas.height;
  const scaleX = cw / srcW;
  const scaleY = ch / srcH;

  const emoColors = {
    Happy:     '#00e5a0',
    Neutral:   '#94a3b8',
    Surprised: '#fbbf24',
    Focused:   '#4d7fff',
    Calm:      '#22d3ee',
    Uncertain: '#f472b6',
    Sad:       '#a78bfa',
  };

  emotions.forEach(emo => {
    const [x1, y1, x2, y2] = emo.bbox;
    const sx = x1 * scaleX;
    const ey = y2 * scaleY;  // below bounding box
    const sw = (x2 - x1) * scaleX;

    const label = emo.dominant;
    const color = emoColors[label] || '#4d7fff';
    const fh    = 10;
    const pad   = 3;

    ctx.font = `600 ${fh}px "JetBrains Mono", monospace`;
    const tw = ctx.measureText(label).width;

    // Badge below person bbox
    ctx.fillStyle = hexAlpha(color, 0.9);
    roundRect(ctx, sx + sw/2 - tw/2 - pad - 10, ey + 4, tw + pad*2 + 16, fh + pad*2, 3);
    ctx.fill();

    // Emoji
    ctx.font = `${fh+1}px serif`;
    const emojis = { Happy:'😊', Neutral:'😐', Surprised:'😮', Focused:'🎯', Calm:'😌', Uncertain:'😕', Sad:'😔' };
    ctx.fillText(emojis[label]||'', sx + sw/2 - tw/2 - pad - 8, ey + fh + pad + 4);

    // Text
    ctx.fillStyle = '#000';
    ctx.font = `700 ${fh}px "JetBrains Mono", monospace`;
    ctx.fillText(label, sx + sw/2 - tw/2 + 4, ey + fh + pad + 4);
  });
}

/**
 * Clear the overlay canvas entirely.
 */
export function clearOverlay() {
  if (_overlayCtx && _overlayCanvas) {
    _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);
  }
}

// ── Helpers ─────────────────────────────────────────────

/** Draw corner brackets instead of a full rectangle (cleaner detection style) */
function drawCornerBox(ctx, x, y, w, h, len) {
  ctx.beginPath();
  // TL
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  // TR
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  // BR
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  // BL
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
}

/** Draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
