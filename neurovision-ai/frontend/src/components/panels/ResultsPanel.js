/**
 * NeuroVision — Results Panel Component
 * Renders the right-hand analysis panel:
 * quality scores, problems list, explain toggle, action buttons,
 * goal chips, auto-fix button, export strip, share card.
 *
 * Usage:
 *   import { ResultsPanel } from '@/components/panels/ResultsPanel.js';
 *   ResultsPanel.init();
 *   ResultsPanel.render(analysisResult, metrics);
 */

import { getState, setState, subscribe } from '../../core/state.js';
import { useAnalysis } from '../../hooks/useAnalysis.js';
import { Orchestrator } from '../../system/orchestrator.js';
import { DecisionEngine } from '../../system/decisionEngine.js';
import { GOAL_CONFIG, GOAL_LIST } from '../../constants/goals.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('ResultsPanel');
const analysis = useAnalysis();

export const ResultsPanel = {
  init() {
    this._bindGoalChips();
    this._bindExplainToggle();
    this._bindAutoFix();
    this._bindActions();
    this._bindShare();
    analysis.onChange((a) => { if (a) this.render(a); });
    log.info('ResultsPanel ready');
  },

  /**
   * Render the full results panel with analysis data.
   * @param {import('../../types/analysis.types').AnalysisResult} result
   */
  render(result) {
    log.debug('Rendering results panel');
    this._renderScores(result.quality, result.virality);
    this._renderProblems(result.problems);
    this._renderDetections(result.detections);
    this._updateAutoFix(result.quality);
    this._updateWowHeader(result);
    this._renderSuggestions(result);
  },

  // ── Scores ────────────────────────────────────────────────
  _renderScores(quality, virality) {
    const { qualBefore, viralBefore } = getState();
    analysis.animateScore('sq-q', 'sqb-q', qualBefore || 0, quality, analysis.scoreColor(quality));
    analysis.animateScore('sq-v', 'sqb-v', viralBefore || 0, virality, analysis.scoreColor(virality));

    const delta = quality - qualBefore;
    if (delta > 0 && qualBefore > 0) {
      const badge = document.getElementById('score-delta-q');
      if (badge) { badge.textContent = `+${delta}`; badge.style.display = 'block'; }
    }
  },

  // ── Problems ──────────────────────────────────────────────
  _renderProblems(problems) {
    const container = document.getElementById('problems-list');
    if (!container) return;
    const explain = getState().featureExplain;

    container.innerHTML = problems.map(p => `
      <div class="prob-item ${p.type}">
        <span class="prob-icon">${p.icon}</span>
        <div>
          ${p.label}
          ${explain
            ? `<span class="prob-explain">${p.human}</span>`
            : `<span class="prob-explain">${p.raw}</span>`
          }
        </div>
        <span style="margin-left:auto;font-size:10.5px;font-family:var(--mono);opacity:.6">${p.conf}%</span>
      </div>`
    ).join('');
  },

  // ── Detections ────────────────────────────────────────────
  _renderDetections(detections) {
    const container = document.getElementById('detections-list');
    if (!container) return;

    container.innerHTML = detections.map(d => `
      <div class="det-item" data-label="${d.label}">
        <div class="det-dot" style="background:${d.color}"></div>
        <span class="det-lbl">${d.label}</span>
        <span class="det-conf">${(d.conf * 100).toFixed(0)}%</span>
        <div class="det-bar2"><div class="det-bar2-fill" style="width:${d.conf*100}%;background:${d.color}"></div></div>
      </div>`
    ).join('');
  },

  // ── Wow header ────────────────────────────────────────────
  _updateWowHeader(result) {
    const el = document.getElementById('wow-headline');
    if (el) {
      const crits = result.problems.filter(p => p.type === 'crit');
      if (crits.length === 0) {
        el.textContent = `Looking good — ${result.quality}/100 quality`;
      } else {
        el.textContent = `Found ${crits.length + result.problems.filter(p=>p.type==='warn').length} issue${crits.length > 1 ? 's' : ''} to fix`;
      }
    }
    // Issue chips
    const chipsEl = document.getElementById('wow-chips');
    if (chipsEl) {
      const crits = result.problems.filter(p => p.type === 'crit').slice(0, 3);
      const warns = result.problems.filter(p => p.type === 'warn').slice(0, 2);
      chipsEl.innerHTML = [
        ...crits.map(p => `<span class="issue-chip crit">${p.icon} ${p.label}</span>`),
        ...warns.map(p => `<span class="issue-chip warn">${p.icon} ${p.label}</span>`),
      ].join('');
    }
  },

  // ── AutoFix button ────────────────────────────────────────
  _updateAutoFix(quality) {
    const btn = document.getElementById('auto-fix-btn');
    if (!btn) return;
    const hasCrits = (getState().analysis?.problems.filter(p=>p.type==='crit').length || 0) > 0;
    btn.querySelector('.fix-sub').textContent =
      hasCrits
        ? `Fix ${hasCrits} critical issue${hasCrits > 1 ? 's' : ''} automatically`
        : `Polish and optimize to 97+ quality`;
  },

  // ── Goal chips ────────────────────────────────────────────
  _bindGoalChips() {
    const container = document.getElementById('goal-chips');
    if (!container) return;

    // Build chips
    container.innerHTML = GOAL_LIST.map(g => `
      <button class="goal-chip${getState().goal === g ? ' active' : ''}" data-goal="${g}">
        ${GOAL_CONFIG[g]?.label || g}
      </button>`
    ).join('');

    container.addEventListener('click', e => {
      const btn = e.target.closest('.goal-chip');
      if (!btn) return;
      const goal = btn.dataset.goal;
      setState({ goal });

      container.querySelectorAll('.goal-chip').forEach(b => b.classList.toggle('active', b.dataset.goal === goal));

      const insight = document.getElementById('goal-insight');
      if (insight) {
        const cfg = GOAL_CONFIG[goal];
        insight.className = `goal-insight show ${cfg?.chiClass || 'general'}`;
        insight.textContent = cfg?.insight || '';
      }
    });
  },

  // ── Explain toggle ────────────────────────────────────────
  _bindExplainToggle() {
    const row = document.querySelector('.explain-row');
    if (!row) return;
    row.addEventListener('click', () => {
      const on = !getState().featureExplain;
      setState({ featureExplain: on });
      row.querySelector('.explain-tog-track')?.classList.toggle('on', on);
      const { analysis: a } = getState();
      if (a) this._renderProblems(a.problems);
    });
  },

  // ── Action buttons ────────────────────────────────────────
  _bindActions() {
    document.getElementById('auto-fix-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('auto-fix-btn');
      if (btn) { btn.disabled = true; btn.querySelector('.fix-title').textContent = 'Analyzing…'; }
      const goal = getState().goal;
      const filter = DecisionEngine.recommendFilter();
      await Orchestrator.handleFilter(filter, true);
      if (btn) { btn.disabled = false; btn.querySelector('.fix-title').textContent = '⚡ Auto Fix Everything'; }
    });
  },

  // ── Share card ────────────────────────────────────────────
  _bindShare() {
    subscribe('analysis', (a) => {
      if (!a || !getState().enhancedURL) return;
      const card = document.getElementById('share-card');
      if (card && a.quality >= 70) card.classList.add('show');
    });
  },

  // ── Next-step suggestions ─────────────────────────────────
  _renderSuggestions(result) {
    const el = document.getElementById('next-steps');
    if (!el) return;
    const steps = DecisionEngine.nextSteps().slice(0, 3);
    el.innerHTML = steps.map(s => `
      <div class="act-btn" data-action="${s.key}">
        <div class="act-icon">${s.icon}</div>
        <div><div class="act-name">${s.action}</div><div class="act-desc">${s.reason}</div></div>
      </div>`
    ).join('');

    el.querySelectorAll('.act-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.action;
        document.dispatchEvent(new CustomEvent('nv:action', { detail: { key } }));
      });
    });
  },
};

export default ResultsPanel;
