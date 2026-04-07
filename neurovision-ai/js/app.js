/**
 * app.js — Main controller. Connects everything. Stays clean.
 *
 * Flow: Upload → Analyze (auto) → Understand (insights) → Act → Refine
 *
 * Rule: app.js only wires modules together. No business logic lives here.
 */

import { AppState }  from './state.js';
import { toast, $, show, hide, toggle } from './utils.js';
import { sleep }     from './utils.js';
import { Config }    from './services/config.js';
import { chatWithLM } from './services/api.js';

// ── Modules (logic, no UI) ─────────────────────────────
import { loadImageFile, applyFilter, exportAsPNG, restoreFromDataURL, getFilters } from './modules/image.js';
import { runDetection }       from './modules/detection.js';
import { runEmotionAnalysis } from './modules/emotion.js';
import { buildSystemPrompt, getFallbackResponse } from './modules/chat.js';

// ── Components (UI) ────────────────────────────────────
import { initUpload, showUploadPhase, hideUploadPhase } from './components/upload.js';
import {
  initCanvas, getCanvas,
  showAnalyzing, updateAnalyzingStep, hideAnalyzing,
  renderImage, restoreCanvas,
  renderDetections, renderEmotions, clearOverlay,
} from './components/canvas.js';
import { renderInsights, showInsightsSkeleton, clearInsights } from './components/insights.js';
import {
  initActions, renderSuggestedActions, clearSuggestedActions, renderFilterGrid, resetActiveFilter,
} from './components/actions.js';
import {
  initChatUI, showChatBar, hideChatBar,
  appendMessage, appendTyping, removeTyping, setChatLoading,
  updateQuickPrompts, clearChat,
} from './components/chatUI.js';

// ══════════════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════════════

function init() {
  initCanvas();
  initUpload(handleFile);
  initActions(handleFilterApply, handleActionClick);
  initChatUI(handleChatSend);
  bindGlobalClicks();
  bindStateListeners();
}

// ══════════════════════════════════════════════════════
//   FILE HANDLING → triggers full auto-analysis
// ══════════════════════════════════════════════════════

async function handleFile(file) {
  try {
    // ── Step 1: Upload ────────────────────────────────
    setStep(1);
    AppState.reset();

    const image = await loadImageFile(file);
    AppState.set({
      image,
      imageName:   file.name,
      imageWidth:  image.naturalWidth,
      imageHeight: image.naturalHeight,
    });

    // Transition to workspace with image showing
    hideUploadPhase();
    showWorkspace();
    renderImage(image);
    updateTopbarMeta(file.name, image.naturalWidth, image.naturalHeight);

    // ── Step 2: Analyze (auto) ─────────────────────────
    setStep(2);
    AppState.set('phase', 'analyzing');
    showAnalyzing('Detecting objects', 5);
    showInsightsSkeleton();

    await sleep(Config.analysisDetectMs);
    updateAnalyzingStep('Running detection', 35);

    const detections = runDetection(image, file.name);

    await sleep(200);
    updateAnalyzingStep('Analysing faces', 60);

    const emotions = runEmotionAnalysis(detections, image, file.name);

    await sleep(Config.analysisEmotionMs);
    updateAnalyzingStep('Generating insights', 85);

    AppState.set({ detections, emotions });

    await sleep(Config.analysisInsightMs);
    updateAnalyzingStep('Done', 100);
    await sleep(200);

    hideAnalyzing();

    // Push initial snapshot
    const dataURL = getCanvas()?.toDataURL('image/png') || '';
    AppState.pushSnapshot(dataURL);

    // ── Step 3: Understand ─────────────────────────────
    setStep(3);
    AppState.set('phase', 'ready');

    renderInsights(detections, emotions);
    renderSuggestedActions(detections, emotions);
    updateQuickPrompts(emotions.length > 0);

    // Draw overlays
    redrawOverlay();

    // ── Step 4: Act (show controls) ──────────────────
    setStep(4);
    showTopbarActions();
    showChatBar();
    updateUndoRedo();

    toast(`Analysis complete — ${detections.length} object${detections.length !== 1 ? 's' : ''} detected`, 'ok');

  } catch (err) {
    console.error('[app] handleFile error:', err);
    hideAnalyzing();
    toast('Failed to load image — please try another file', 'err');
    showUploadPhase();
    hideWorkspace();
  }
}

// ══════════════════════════════════════════════════════
//   FILTER APPLICATION
// ══════════════════════════════════════════════════════

function handleFilterApply(filterName) {
  const canvas = getCanvas();
  if (!canvas || AppState.phase !== 'ready') return;

  try {
    const dataURL = applyFilter(canvas, filterName, AppState.detections);
    AppState.pushSnapshot(dataURL);
    AppState.set('activeFilter', filterName);
    updateUndoRedo();
    redrawOverlay();
    const filters = getFilters();
    toast(filters[filterName]?.label + ' applied' || 'Filter applied', 'ok');
  } catch (err) {
    console.error('[app] filter error:', err);
    toast('Filter failed', 'err');
  }
}

// ══════════════════════════════════════════════════════
//   ACTION CLICKS (export, etc.)
// ══════════════════════════════════════════════════════

function handleActionClick(actionId) {
  if (actionId === 'openExport')  openExport();
  if (actionId === 'newImage')    newImage();
  if (actionId === 'closeExport') closeExport();
  if (actionId === 'doExport')    doExport();
  if (actionId === 'undo')        undo();
  if (actionId === 'redo')        redo();
  if (actionId === 'toggleDetections') toggleDetections();
  if (actionId === 'toggleEmotions')   toggleEmotions();
}

// ══════════════════════════════════════════════════════
//   GLOBAL CLICK DELEGATION
// ══════════════════════════════════════════════════════

function bindGlobalClicks() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (target) handleActionClick(target.dataset.action);
  });

  // Export option selection
  document.addEventListener('click', e => {
    const opt = e.target.closest('[data-export]');
    if (opt) {
      document.querySelectorAll('.export-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      AppState.set('exportMode', parseInt(opt.dataset.export));
    }
  });

  // Close modal on backdrop click
  document.getElementById('export-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeExport();
  });
}

// ══════════════════════════════════════════════════════
//   STATE LISTENERS — react to state changes
// ══════════════════════════════════════════════════════

function bindStateListeners() {
  AppState.on('change:stack', () => updateUndoRedo());
  AppState.on('reset', () => {
    clearInsights();
    clearSuggestedActions();
    clearChat();
    clearOverlay();
    resetActiveFilter();
    setStep(1);
  });
}

// ══════════════════════════════════════════════════════
//   OVERLAY MANAGEMENT
// ══════════════════════════════════════════════════════

function redrawOverlay() {
  const { detections, emotions, showDetections, showEmotions, imageWidth, imageHeight } = AppState;
  clearOverlay();
  if (showDetections) renderDetections(detections, true, imageWidth, imageHeight);
  if (showEmotions)   renderEmotions(emotions, detections, true, imageWidth, imageHeight);
}

function toggleDetections() {
  AppState.set('showDetections', !AppState.showDetections);
  const btn = $('#toggle-det-btn');
  btn?.classList.toggle('on', AppState.showDetections);
  redrawOverlay();
}

function toggleEmotions() {
  AppState.set('showEmotions', !AppState.showEmotions);
  const btn = $('#toggle-emo-btn');
  btn?.classList.toggle('on', AppState.showEmotions);
  redrawOverlay();
}

// ══════════════════════════════════════════════════════
//   UNDO / REDO
// ══════════════════════════════════════════════════════

async function undo() {
  const dataURL = AppState.undoSnapshot();
  if (!dataURL) return;
  const canvas = getCanvas();
  if (canvas) await restoreFromDataURL(canvas, dataURL);
  resetActiveFilter();
  redrawOverlay();
  updateUndoRedo();
}

async function redo() {
  const dataURL = AppState.redoSnapshot();
  if (!dataURL) return;
  const canvas = getCanvas();
  if (canvas) await restoreFromDataURL(canvas, dataURL);
  redrawOverlay();
  updateUndoRedo();
}

function updateUndoRedo() {
  const undoBtn = $('#undo-btn');
  const redoBtn = $('#redo-btn');
  if (undoBtn) undoBtn.disabled = !AppState.canUndo();
  if (redoBtn) redoBtn.disabled = !AppState.canRedo();
}

// ══════════════════════════════════════════════════════
//   EXPORT
// ══════════════════════════════════════════════════════

function openExport() {
  const modal = $('#export-modal');
  if (modal) show(modal, 'flex');
}

function closeExport() {
  const modal = $('#export-modal');
  if (modal) hide(modal);
}

function doExport() {
  const canvas = getCanvas();
  if (!canvas) return;

  let exportCanvas = canvas;

  if (AppState.exportMode === 1) {
    // With detections drawn on
    const tmp = document.createElement('canvas');
    tmp.width  = canvas.width;
    tmp.height = canvas.height;
    const ctx  = tmp.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const oc = document.getElementById('overlay-canvas');
    if (oc) ctx.drawImage(oc, 0, 0);
    exportCanvas = tmp;
  } else if (AppState.exportMode === 2) {
    // Original image
    const tmp = document.createElement('canvas');
    tmp.width  = canvas.width;
    tmp.height = canvas.height;
    tmp.getContext('2d').drawImage(AppState.image, 0, 0, canvas.width, canvas.height);
    exportCanvas = tmp;
  }

  exportAsPNG(exportCanvas, 'neurovision-' + Date.now() + '.png');
  closeExport();
  toast('Image exported', 'ok');
}

// ══════════════════════════════════════════════════════
//   NEW IMAGE
// ══════════════════════════════════════════════════════

function newImage() {
  AppState.reset();
  hideWorkspace();
  hideChatBar();
  showUploadPhase();
  hideTopbarActions();
  clearTopbarMeta();
}

// ══════════════════════════════════════════════════════
//   CHAT
// ══════════════════════════════════════════════════════

async function handleChatSend(message) {
  if (!message.trim()) return;

  appendMessage('user', message);
  AppState.chatHistory.push({ role: 'user', content: message });

  // Truncate history if too long
  if (AppState.chatHistory.length > Config.maxChatHistory * 2) {
    AppState.chatHistory = AppState.chatHistory.slice(-Config.maxChatHistory * 2);
  }

  const typingId = appendTyping();
  setChatLoading(true);

  let reply;
  try {
    const systemPrompt = buildSystemPrompt(AppState);
    reply = await chatWithLM(AppState.chatHistory, systemPrompt);
  } catch {
    reply = getFallbackResponse(message, AppState);
  }

  removeTyping(typingId);
  appendMessage('ai', reply);
  AppState.chatHistory.push({ role: 'assistant', content: reply });
  setChatLoading(false);
}

// ══════════════════════════════════════════════════════
//   UI HELPERS
// ══════════════════════════════════════════════════════

function showWorkspace() {
  show('#workspace', 'grid');
}

function hideWorkspace() {
  hide('#workspace');
}

function setStep(n) {
  document.querySelectorAll('.step').forEach((el, i) => {
    const stepNum = i + 1;
    el.classList.toggle('active', stepNum === n);
    el.classList.toggle('done',   stepNum < n);
  });
}

function updateTopbarMeta(name, w, h) {
  const meta    = $('#file-meta');
  const nameEl  = $('#file-name');
  const dimsEl  = $('#file-dims');
  if (nameEl) nameEl.textContent = name.length > 28 ? name.slice(0, 25) + '…' : name;
  if (dimsEl) dimsEl.textContent = `${w}×${h}`;
  if (meta)   show(meta, 'flex');
}

function clearTopbarMeta() {
  hide('#file-meta');
}

function showTopbarActions() {
  show('#new-btn', 'inline-flex');
  show('#export-btn', 'inline-flex');
}

function hideTopbarActions() {
  hide('#new-btn');
  hide('#export-btn');
}

// ══════════════════════════════════════════════════════
//   BOOT
// ══════════════════════════════════════════════════════

init();
