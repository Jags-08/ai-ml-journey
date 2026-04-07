/**
 * insights.js — Renders humanized analysis results to the left panel.
 * Rule: DOM rendering only. Reads data passed in, no state access.
 */

import { $, esc, pct } from '../utils.js';
import { humanizeDetections, groupDetections } from '../modules/detection.js';
import { humanizeEmotions }   from '../modules/emotion.js';

const EMOTION_COLORS = {
  Happy:     '#00e5a0',
  Neutral:   '#94a3b8',
  Surprised: '#fbbf24',
  Focused:   '#4d7fff',
  Calm:      '#22d3ee',
  Uncertain: '#f472b6',
  Sad:       '#a78bfa',
};

const EMOTION_EMOJIS = {
  Happy:'😊', Neutral:'😐', Surprised:'😮',
  Focused:'🎯', Calm:'😌', Uncertain:'😕', Sad:'😔',
};

/**
 * Render all insights to the panel.
 * @param {Array} detections
 * @param {Array} emotions
 */
export function renderInsights(detections, emotions) {
  const container = $('#insights-content');
  if (!container) return;

  const { summary, groups, keyFinding } = humanizeDetections(detections);
  const { summary: emoSummary, headline: emoHeadline } = humanizeEmotions(emotions);

  let html = '';

  // ── 1. Scene Summary Card ──────────────────────────
  html += `
  <div class="insight-card scene-card" style="animation-delay:0ms">
    <div class="insight-card-head">
      <span class="insight-card-icon">🌐</span>
      <span class="insight-card-title">Scene Summary</span>
    </div>
    <p class="insight-summary">${formatSummary(summary)}</p>
    ${groups.length ? `<div class="conf-row">
      <span class="conf-label">Confidence</span>
      <div class="conf-track"><div class="conf-fill" style="width:${Math.round(avgConf(detections)*100)}%"></div></div>
      <span class="conf-val">${Math.round(avgConf(detections)*100)}%</span>
    </div>` : ''}
  </div>`;

  // ── 2. Detected Objects Card ───────────────────────
  if (groups.length) {
    const tags = groups.map(g => `
      <div class="obj-tag">
        <span class="obj-tag-dot" style="background:${g.color}"></span>
        <span>${g.count > 1 ? g.count + '× ' : ''}${cap(g.label)}</span>
        <span class="obj-tag-conf">${pct(g.maxConf)}</span>
      </div>`).join('');

    html += `
    <div class="insight-card" style="animation-delay:80ms">
      <div class="insight-card-head">
        <span class="insight-card-icon">🎯</span>
        <span class="insight-card-title">Objects Detected</span>
      </div>
      <p class="insight-summary" style="font-size:12px;color:var(--ink2)">
        ${groups.length} ${groups.length === 1 ? 'type' : 'types'} · ${detections.length} total instance${detections.length !== 1 ? 's' : ''}
      </p>
      <div class="obj-tags">${tags}</div>
    </div>`;
  }

  // ── 3. Faces & Emotions Card ───────────────────────
  if (emotions.length) {
    const facesHtml = emotions.map(e => {
      const topEmotions = Object.entries(e.scores)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 3);

      const barsHtml = topEmotions.map(([emo, score]) => `
        <div class="emo-item">
          <div class="emo-row">
            <span class="emo-label">${EMOTION_EMOJIS[emo]||''} ${emo}</span>
            <span class="emo-pct">${pct(score)}</span>
          </div>
          <div class="emo-bar-track">
            <div class="emo-bar-fill" style="width:${pct(score)};background:${EMOTION_COLORS[emo]||'var(--blue)'}"></div>
          </div>
        </div>`).join('');

      return `
        <div style="margin-bottom:${emotions.length > 1 ? '14px' : '0'}">
          ${emotions.length > 1 ? `<p style="font-size:11px;color:var(--ink3);font-family:var(--fm);margin-bottom:8px">FACE ${e.faceId}</p>` : ''}
          <div class="emo-list">${barsHtml}</div>
        </div>`;
    }).join('');

    html += `
    <div class="insight-card" style="animation-delay:160ms">
      <div class="insight-card-head">
        <span class="insight-card-icon">😊</span>
        <span class="insight-card-title">Emotion Analysis</span>
      </div>
      <p class="insight-summary" style="font-size:12px;color:var(--ink2);margin-bottom:10px">${esc(emoHeadline)}</p>
      ${facesHtml}
    </div>`;
  } else if (detections.some(d => d.label === 'person')) {
    html += `
    <div class="insight-card" style="animation-delay:160ms">
      <div class="insight-card-head">
        <span class="insight-card-icon">😊</span>
        <span class="insight-card-title">Emotion Analysis</span>
      </div>
      <p class="insight-summary" style="font-size:12px;color:var(--ink2)">People detected but faces not clearly visible for emotion analysis.</p>
    </div>`;
  }

  // ── 4. Key Finding Card ────────────────────────────
  if (keyFinding) {
    html += `
    <div class="insight-card finding-card" style="animation-delay:240ms">
      <div class="insight-card-head">
        <span class="insight-card-icon">💡</span>
        <span class="insight-card-title">Key Finding</span>
      </div>
      <p class="insight-summary">${esc(keyFinding)}</p>
    </div>`;
  }

  container.innerHTML = html;
}

/**
 * Show the loading skeleton while analysis runs.
 */
export function showInsightsSkeleton() {
  const container = $('#insights-content');
  if (!container) return;

  container.innerHTML = `
    <div class="insight-card">
      <div class="skeleton" style="height:12px;width:60%;margin-bottom:10px"></div>
      <div class="skeleton" style="height:12px;width:90%;margin-bottom:6px"></div>
      <div class="skeleton" style="height:12px;width:75%"></div>
    </div>
    <div class="insight-card">
      <div class="skeleton" style="height:12px;width:50%;margin-bottom:10px"></div>
      <div class="skeleton" style="height:28px;width:100%;margin-bottom:6px"></div>
      <div class="skeleton" style="height:28px;width:80%"></div>
    </div>
    <div class="insight-card">
      <div class="skeleton" style="height:12px;width:55%;margin-bottom:10px"></div>
      <div class="skeleton" style="height:60px;width:100%"></div>
    </div>`;
}

/**
 * Clear insights back to empty state.
 */
export function clearInsights() {
  const container = $('#insights-content');
  if (!container) return;
  container.innerHTML = `
    <div class="panel-empty" id="insights-empty">
      <div class="panel-empty-icon">🧠</div>
      <p>Insights will auto-populate after upload</p>
    </div>`;
}

// ── Helpers ─────────────────────────────────────────────

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function avgConf(detections) {
  if (!detections.length) return 0;
  return detections.reduce((s, d) => s + d.confidence, 0) / detections.length;
}

function formatSummary(summary) {
  // Bold first noun phrase and key numbers
  return summary
    .replace(/(\d+) (people|person|car|truck|bicycle|bus|dog|cat|tree)/gi,
      (_, n, obj) => `<strong>${n} ${obj}</strong>`);
}
