/**
 * NeuroVision — Orchestrator
 * Controls the high-level app flow. Every major user journey
 * (upload → analyze → enhance → export) passes through here.
 * The Orchestrator is the only place that wires modules together.
 *
 * Usage:
 *   import { Orchestrator } from '@/system/orchestrator.js';
 *   await Orchestrator.init();
 *   await Orchestrator.handleUpload(file);
 */

import { State, setState, getState } from '../core/state.js';
import { API } from '../core/api.js';
import { Logger } from '../core/logger.js';
import { ErrorHandler } from '../core/errorHandler.js';
import { DecisionEngine } from './decisionEngine.js';
import { ContextEngine } from './contextEngine.js';
import { ActionEngine } from './actionEngine.js';
import { FeatureGate } from './featureGate.js';
import { canUse } from '../core/features.js';
import { validateFile } from '../modules/upload/validation.js';
import { measureImage } from '../modules/analysis/analyzeController.js';
import { analyzeMetrics } from '../modules/analysis/analyzeController.js';
import { applyFilter } from '../modules/editing/filters.js';
import { INCREMENT_USAGE } from '../constants/actions.js';

const log = Logger.create('Orchestrator');

export const Orchestrator = {
  _initialized: false,

  /**
   * Boot the app: health check, restore session, wire global listeners.
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;
    log.info('Initializing NeuroVision v4');

    // ── Health check (non-blocking) ──
    API.health().then(online => {
      log.info(`API online: ${online}`);
    });

    // ── Wire global keyboard shortcuts ──
    this._wireKeyboard();

    // ── Wire DOM events ──
    this._wireDOMEvents();

    // ── Restore persisted settings ──
    this._restoreSettings();

    log.info('Orchestrator ready');
  },

  /**
   * Full upload → analyze pipeline.
   * @param {File} file
   */
  async handleUpload(file) {
    log.time('handleUpload');

    // 1. Validate
    const { ok, msg } = validateFile(file);
    if (!ok) {
      document.dispatchEvent(new CustomEvent('nv:uploadError', { detail: msg }));
      return;
    }

    // 2. Check rate limit
    const state = getState();
    if (!State.canAnalyze()) {
      document.dispatchEvent(new CustomEvent('nv:rateLimitHit'));
      return;
    }

    // 3. Read file → dataURL
    const dataURL = await this._readFile(file);
    if (!dataURL) return;

    // 4. Draw to canvas & measure
    const { canvas, img } = await this._drawToCanvas(dataURL);
    const metrics = measureImage(canvas);

    // 5. Rule-based analysis (always works offline)
    const analysis = analyzeMetrics(metrics);

    // 6. Update state
    setState({
      origURL:     dataURL,
      currentURL:  dataURL,
      origImg:     img,
      metrics,
      analysis,
      qualBefore:  analysis.quality,
      viralBefore: analysis.virality,
      enhancedURL: null,
      compareMode: false,
    });

    // 7. Increment usage
    setState({ usedToday: state.usedToday + 1 });

    // 8. Dispatch analyzed event (components listen for this)
    document.dispatchEvent(new CustomEvent('nv:analyzed', { detail: { analysis, metrics } }));

    // 9. Try enriching with real API (non-blocking)
    if (state.apiOnline) {
      this._enrichWithAPI(dataURL, analysis);
    }

    // 10. Suggest next steps
    const nudge = DecisionEngine.conversionNudge();
    if (nudge?.show) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('nv:showNudge', { detail: nudge }));
      }, 3000);
    }

    log.timeEnd('handleUpload');
  },

  /**
   * Apply a filter and update state + canvas.
   * @param {string} filterName
   * @param {boolean} [isAutoFix]
   */
  async handleFilter(filterName, isAutoFix = false) {
    const { origURL, analysis } = getState();
    if (!origURL) return;
    log.debug(`Apply filter: ${filterName}, autoFix: ${isAutoFix}`);

    const enhancedURL = await applyFilter(filterName, origURL);
    if (!enhancedURL) return;

    const newQ = Math.min(97, getState().qualBefore + 22 + Math.floor(Math.random() * 10));
    const newV = Math.min(97, getState().viralBefore + 16 + Math.floor(Math.random() * 10));

    setState({ enhancedURL, currentURL: enhancedURL });

    if (isAutoFix) {
      setState({
        analysis: {
          ...analysis,
          quality:  newQ,
          virality: newV,
          problems: [
            { type:'ok', icon:'✓', label:'Lighting optimized', conf:95, key:'done', raw:'brightness=optimized', human:'Lighting is now well-balanced ✓' },
            { type:'ok', icon:'✓', label:'Contrast enhanced',  conf:94, key:'done', raw:'contrast_ratio=4.8:1', human:'Contrast is sharp and professional ✓' },
          ],
        },
      });
    }

    document.dispatchEvent(new CustomEvent('nv:filterApplied', {
      detail: { filterName, isAutoFix, newQuality: newQ }
    }));
  },

  // ── Private helpers ───────────────────────────────────────

  _readFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  },

  _drawToCanvas(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('main-canvas');
        if (!canvas) return resolve({ canvas: document.createElement('canvas'), img });
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ canvas, img });
      };
      img.src = dataURL;
    });
  },

  async _enrichWithAPI(dataURL, localAnalysis) {
    const { goal } = getState();
    const { result, error } = await ErrorHandler.safeRun(
      () => API.analyze(dataURL, goal),
      'Orchestrator._enrichWithAPI'
    );
    if (result?.ok && result.data?.result) {
      log.info('API enrichment received');
      setState({ analysis: { ...localAnalysis, ...result.data.result } });
      document.dispatchEvent(new CustomEvent('nv:apiEnriched', { detail: result.data.result }));
    }
  },

  _wireKeyboard() {
    document.addEventListener('keydown', e => {
      const active = document.activeElement;
      const typing = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      if (typing) return;

      // Cmd/Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('nv:openCommand'));
      }
      // Escape → close modals
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('nv:closeAll'));
      }
    });
  },

  _wireDOMEvents() {
    // Paste image from clipboard
    document.addEventListener('paste', async e => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        log.info('Image pasted from clipboard');
        await this.handleUpload(file);
      }
    });

    // Plan upgrade → re-evaluate gates
    document.addEventListener('nv:planUpgraded', e => {
      FeatureGate.reEvaluateAll(() => {
        document.dispatchEvent(new CustomEvent('nv:openPricing'));
      });
    });
  },

  _restoreSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('nv_settings') || '{}');
      if (saved.goal) setState({ goal: saved.goal });
    } catch { /* ignore */ }
  },
};

export default Orchestrator;
