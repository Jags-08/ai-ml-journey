/**
 * actions.js — Actions panel UI.
 * Rule: DOM rendering. Fires callbacks on user action.
 */

import { $, show, hide } from '../utils.js';
import { getFilters }     from '../modules/image.js';

let _onFilterApply = null;
let _onActionClick = null;
let _activeFilter  = null;

/**
 * Initialise callbacks.
 * @param {Function} onFilterApply  (filterName) => void
 * @param {Function} onActionClick  (actionId)   => void
 */
export function initActions(onFilterApply, onActionClick) {
  _onFilterApply = onFilterApply;
  _onActionClick = onActionClick;
  renderFilterGrid();
}

/**
 * Render contextual action suggestions based on analysis results.
 * Called after analysis completes.
 *
 * @param {Array} detections
 * @param {Array} emotions
 */
export function renderSuggestedActions(detections, emotions) {
  const container = $('#suggested-actions');
  if (!container) return;

  const labels     = detections.map(d => d.label);
  const hasPersons = labels.includes('person');
  const hasCars    = labels.some(l => ['car','truck','bus'].includes(l));
  const hasAnimals = labels.some(l => ['dog','cat','bird'].includes(l));
  const hasFaces   = emotions.length > 0;
  const isIndoor   = labels.some(l => ['chair','laptop','cup','book','phone','bottle'].includes(l));

  const suggestions = [];

  // Always present: Auto-enhance
  suggestions.push({
    id:   'auto-enhance',
    icon: '✨',
    name: 'Auto-enhance',
    desc: 'Balance brightness, contrast and saturation',
    filter: 'enhance',
  });

  // Contextual based on scene
  if (hasFaces) {
    suggestions.push({
      id:   'blur-faces',
      icon: '🙈',
      name: 'Blur faces',
      desc: 'Anonymise detected people for privacy',
      filter: 'blur_faces',
    });
  }

  if (hasPersons && !hasFaces) {
    suggestions.push({
      id:   'sharpen',
      icon: '🔍',
      name: 'Sharpen details',
      desc: 'Clarify edges for better visibility',
      filter: 'sharpen',
    });
  }

  if (hasCars || !isIndoor) {
    suggestions.push({
      id:   'cinematic',
      icon: '🎬',
      name: 'Cinematic grade',
      desc: 'Apply a film-style colour grade',
      filter: 'cinematic',
    });
  }

  if (isIndoor) {
    suggestions.push({
      id:   'warm',
      icon: '🔥',
      name: 'Warm the scene',
      desc: 'Push to golden, cosy tones',
      filter: 'warm',
    });
  }

  if (!isIndoor && !hasCars) {
    suggestions.push({
      id:   'vivid',
      icon: '🎨',
      name: 'Boost vibrancy',
      desc: 'Make colours richer and more saturated',
      filter: 'vivid',
    });
  }

  // Always: Export
  suggestions.push({
    id:     'export',
    icon:   '💾',
    name:   'Export image',
    desc:   'Download as PNG with options',
    action: 'openExport',
  });

  // Render with staggered animation
  const html = suggestions.map((s, i) => `
    <button
      class="action-btn"
      data-filter="${s.filter || ''}"
      data-action="${s.action || ''}"
      style="animation-delay:${i * 60}ms"
    >
      <span class="action-btn-icon">${s.icon}</span>
      <span class="action-btn-text">
        <span class="action-btn-name">${s.name}</span>
        <span class="action-btn-desc">${s.desc}</span>
      </span>
      <span class="action-btn-arrow">›</span>
    </button>`).join('');

  container.innerHTML = html;

  // Bind clicks
  container.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const action = btn.dataset.action;
      if (filter) {
        _onFilterApply?.(filter);
        setActiveActionBtn(btn);
      } else if (action) {
        _onActionClick?.(action);
      }
    });
  });
}

/**
 * Clear suggestions back to empty state.
 */
export function clearSuggestedActions() {
  const container = $('#suggested-actions');
  if (!container) return;
  container.innerHTML = `
    <div class="panel-empty" id="actions-empty">
      <div class="panel-empty-icon">⚡</div>
      <p>Contextual suggestions after analysis</p>
    </div>`;
}

/**
 * Build the static filter grid (always visible in workspace).
 */
export function renderFilterGrid() {
  const grid = $('#filter-grid');
  if (!grid) return;

  const filters = getFilters();
  const keys    = ['enhance','brightness','contrast','sharpen','warm','cool','vivid','bw','cinematic'];

  grid.innerHTML = keys.map(k => {
    const f = filters[k];
    if (!f) return '';
    // Get just the emoji + short name
    const parts = f.label.split(' ');
    const emoji = parts[0];
    const name  = parts.slice(1).join(' ');
    return `
      <button class="filter-btn" data-filter="${k}" title="${f.desc}">
        ${emoji} ${name}
      </button>`;
  }).join('');

  // Bind clicks
  grid.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      _onFilterApply?.(filter);
      // Visual active state
      grid.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/**
 * Highlight the active suggested action button.
 */
function setActiveActionBtn(btn) {
  document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/**
 * Reset active filter state (called on undo).
 */
export function resetActiveFilter() {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
}
