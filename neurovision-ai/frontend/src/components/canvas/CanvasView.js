/**
 * NeuroVision — Canvas View Component
 * Manages the main image canvas: zoom, pan, compare slider, overlay toggle.
 * All pixel work delegated to ImageService.
 *
 * Usage:
 *   import { CanvasView } from '@/components/canvas/CanvasView.js';
 *   CanvasView.init();
 */

import { getState, setState, subscribe } from '../../core/state.js';
import { ImageService } from '../../services/imageService.js';
import { applyDIPOp, exportImage } from '../../modules/editing/enhancements.js';
import { Orchestrator } from '../../system/orchestrator.js';
import { throttle } from '../../utils/performance.js';
import { Logger } from '../../core/logger.js';
import {
  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
} from '../../constants/limits.js';

const log = Logger.create('CanvasView');

export const CanvasView = {
  _cmpDragging: false,

  init() {
    this._bindToolbar();
    this._bindCompare();
    this._bindZoom();
    this._subscribeState();
    // Expose to global scope for backward-compat (ActionEngine uses these)
    window.applyFilter = (f) => Orchestrator.handleFilter(f);
    window.applyDIPOp  = (op) => applyDIPOp(op);
    window.exportImg   = (fmt) => exportImage(fmt);
    window.toggleCmp   = () => this.toggleCompare();
    log.info('CanvasView ready');
  },

  // ── Zoom ─────────────────────────────────────────────────
  setZoom(z) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    setState({ zoom: clamped });
    const canvas = document.getElementById('main-canvas');
    const wrap   = document.querySelector('.c-wrap');
    if (canvas && wrap) {
      canvas.style.transform = `scale(${clamped})`;
      canvas.style.transformOrigin = '0 0';
      wrap.style.overflow = clamped > 1 ? 'auto' : 'hidden';
    }
    const lbl = document.querySelector('.zoom-lbl');
    if (lbl) lbl.textContent = `${Math.round(clamped * 100)}%`;
  },

  zoomIn()  { this.setZoom(getState().zoom + ZOOM_STEP); },
  zoomOut() { this.setZoom(getState().zoom - ZOOM_STEP); },
  zoomFit() { this.setZoom(1); },

  // ── Overlay ───────────────────────────────────────────────
  toggleOverlay() {
    const on = !getState().overlayOn;
    setState({ overlayOn: on });
    const overlay = document.getElementById('overlay-canvas');
    if (overlay) overlay.style.opacity = on ? '1' : '0';
    document.querySelector('.cb[data-action="overlay"]')?.classList.toggle('on', on);
  },

  // ── Compare ───────────────────────────────────────────────
  toggleCompare() {
    const { enhancedURL } = getState();
    if (!enhancedURL) return;
    const on = !getState().compareMode;
    setState({ compareMode: on });
    this._updateCompareUI(on);
  },

  _updateCompareUI(on) {
    const cmpCanvas  = document.getElementById('cmp-canvas');
    const divLine    = document.getElementById('cmp-divline');
    const handle     = document.getElementById('cmp-handle');
    const labels     = document.querySelector('.cmp-labels');
    const delta      = document.getElementById('score-delta');
    const togBtn     = document.querySelector('.cmp-togbtn');

    [cmpCanvas, divLine, handle, labels].forEach(el => {
      if (el) el.style.display = on ? (el === labels ? 'flex' : 'block') : 'none';
    });
    if (handle)  handle.style.display = on ? 'flex' : 'none';
    if (togBtn)  togBtn.classList.toggle('on', on);

    if (on) {
      // Draw original on cmp canvas
      const { origURL } = getState();
      const main = document.getElementById('main-canvas');
      if (cmpCanvas && origURL && main) {
        cmpCanvas.width  = main.width;
        cmpCanvas.height = main.height;
        const img = new Image();
        img.onload = () => cmpCanvas.getContext('2d').drawImage(img, 0, 0, main.width, main.height);
        img.src = origURL;
      }
      this._updateCompareSlider(0.5);

      // Show score delta
      const { qualBefore, analysis } = getState();
      const qAfter = analysis?.quality ?? qualBefore;
      if (delta && qAfter > qualBefore) {
        delta.style.display = 'flex';
        delta.innerHTML = `✨ +${qAfter - qualBefore} quality`;
      }
    } else {
      if (delta) delta.style.display = 'none';
    }
  },

  _updateCompareSlider(x) {
    setState({ cmpX: x });
    const main    = document.getElementById('main-canvas');
    const cmp     = document.getElementById('cmp-canvas');
    const divLine = document.getElementById('cmp-divline');
    const handle  = document.getElementById('cmp-handle');
    if (!main) return;
    const pct = x * 100;
    if (cmp) {
      cmp.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
    if (divLine) divLine.style.left = `${pct}%`;
    if (handle)  handle.style.left  = `${pct}%`;
  },

  // ── Toolbar buttons ───────────────────────────────────────
  _bindToolbar() {
    document.querySelectorAll('.cb[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'zoom-in')  this.zoomIn();
        if (action === 'zoom-out') this.zoomOut();
        if (action === 'zoom-fit') this.zoomFit();
        if (action === 'overlay')  this.toggleOverlay();
        if (action === 'compare')  this.toggleCompare();
        if (action === 'sharpen')  window.applyDIPOp?.('sharpen');
        if (action === 'reset')    document.dispatchEvent(new CustomEvent('nv:resetImage'));
      });
    });

    // Export buttons
    document.querySelectorAll('.exp-btn[data-format]').forEach(btn => {
      btn.addEventListener('click', () => exportImage(btn.dataset.format));
    });
  },

  // ── Compare slider drag ───────────────────────────────────
  _bindCompare() {
    const divLine = document.getElementById('cmp-divline');
    const handle  = document.getElementById('cmp-handle');
    const wrap    = document.querySelector('.c-wrap');
    if (!wrap) return;

    const onMove = throttle((e) => {
      if (!this._cmpDragging || !getState().compareMode) return;
      const rect = wrap.getBoundingClientRect();
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      this._updateCompareSlider(x);
    }, 16);

    [divLine, handle].forEach(el => {
      el?.addEventListener('mousedown',  () => { this._cmpDragging = true; });
      el?.addEventListener('touchstart', () => { this._cmpDragging = true; }, { passive: true });
    });

    document.addEventListener('mousemove',  onMove);
    document.addEventListener('touchmove',  onMove, { passive: true });
    document.addEventListener('mouseup',   () => { this._cmpDragging = false; });
    document.addEventListener('touchend',  () => { this._cmpDragging = false; });
  },

  // ── Mouse wheel zoom ─────────────────────────────────────
  _bindZoom() {
    const wrap = document.querySelector('.c-wrap');
    wrap?.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      this.setZoom(getState().zoom + delta);
    }, { passive: false });
  },

  // ── State subscriptions ───────────────────────────────────
  _subscribeState() {
    subscribe('analysis', (analysis) => {
      if (!analysis) return;
      const { overlayOn } = getState();
      const main    = document.getElementById('main-canvas');
      const overlay = document.getElementById('overlay-canvas');
      if (main && overlay && overlayOn) {
        ImageService.drawOverlays(analysis.detections, main, overlay, getState().featureExplain);
      }
    });

    subscribe('featureExplain', () => {
      const { analysis, overlayOn } = getState();
      if (!analysis || !overlayOn) return;
      const main    = document.getElementById('main-canvas');
      const overlay = document.getElementById('overlay-canvas');
      if (main && overlay) {
        ImageService.drawOverlays(analysis.detections, main, overlay, getState().featureExplain);
      }
    });
  },
};

export default CanvasView;
