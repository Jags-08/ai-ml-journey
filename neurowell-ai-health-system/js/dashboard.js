/**
 * NEUROWELL — dashboard.js
 * Dashboard: Charts, Health Logging, Score, Alerts
 */

let charts = {};
let currentUser = null;
let selectedSymptoms = [];

const SYMPTOMS = ['headache','fatigue','stress','anxiety','back pain','nausea',
                  'dizziness','insomnia','chest pain','shortness of breath','joint pain','brain fog'];

/* ════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  currentUser = Auth.guard();
  if (!currentUser) return;

  renderDashboard();
  initLogForm();
  initChartTabs();
  loadAlerts();
  loadLogHistory();
  renderWeekDots();

  // Auto-refresh every 30s
  setInterval(renderDashboard, 30000);
});

/* ════════════════════════════════════════════
   MAIN RENDER
   ════════════════════════════════════════════ */
function renderDashboard() {
  const email = currentUser.email;
  const logs  = DB.getLogs(email, 30);
  const score = DB.computeHealthScore(logs);
  const avgs  = DB.getWeeklyAverages(email);

  // Health Score Ring
  renderScoreRing('score-ring', score, 130);

  // Metric Cards
  updateMetric('m-sleep',    avgs.sleep,    'h',   avgs.sleep    >= 7 ? 'up' : 'down');
  updateMetric('m-water',    avgs.water,    'gl',  avgs.water    >= 8 ? 'up' : 'down');
  updateMetric('m-activity', avgs.activity, 'min', avgs.activity >= 30 ? 'up' : 'down');
  updateMetric('m-mood',     avgs.mood,     '/10', avgs.mood     >= 6 ? 'up' : 'down');

  // Charts
  renderSleepChart(email);
  renderWaterChart(email);
  renderMoodChart(email);
  renderRadarChart(email, avgs);

  // Run pattern analysis
  const { newAlerts } = PatternEngine.runAndSaveAlerts(email);
  if (newAlerts.length > 0) {
    showToast(`${newAlerts.length} new health alert(s) detected`, 'warning');
    loadAlerts();
    updateAlertBadge();
  }
}

function updateMetric(id, val, unit, trend) {
  const el = document.getElementById(id);
  if (!el) return;
  const valEl = el.querySelector('.metric-value');
  if (valEl) valEl.innerHTML = `${val || '—'}<span class="metric-unit">${unit}</span>`;
  const trendEl = el.querySelector('.metric-trend');
  if (trendEl) {
    trendEl.className = `metric-trend ${trend}`;
    trendEl.innerHTML = trend === 'up' ? '↑ On track' : trend === 'down' ? '↓ Below goal' : '→ Stable';
  }
}

/* ════════════════════════════════════════════
   CHARTS (Chart.js)
   ════════════════════════════════════════════ */
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0d1628',
      borderColor: 'rgba(0,229,255,0.3)',
      borderWidth: 1,
      titleColor: '#00e5ff',
      bodyColor: '#8ab4cc',
      padding: 10,
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(0,229,255,0.06)' },
      ticks: { color: '#4a6d84', font: { size: 11 } }
    },
    y: {
      grid: { color: 'rgba(0,229,255,0.06)' },
      ticks: { color: '#4a6d84', font: { size: 11 } }
    }
  }
};

function getLast7(email, field) {
  const labels = DateUtils.last7DayLabels();
  const logs   = DB.getLogsRange(email, 7);
  const data   = labels.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const log = logs.find(l => l.date === dateStr);
    return log ? (log[field] || 0) : null;
  });
  return { labels, data };
}

function createOrUpdate(id, type, data, options) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) {
    charts[id].data = data;
    charts[id].update('none');
    return;
  }
  charts[id] = new Chart(ctx, { type, data, options: { ...CHART_DEFAULTS, ...options } });
}

function renderSleepChart(email) {
  const { labels, data } = getLast7(email, 'sleep');
  createOrUpdate('sleepChart', 'line', {
    labels,
    datasets: [{
      data,
      borderColor:     '#00e5ff',
      backgroundColor: 'rgba(0,229,255,0.08)',
      borderWidth: 2,
      pointBackgroundColor: '#00e5ff',
      pointRadius: 4,
      tension: 0.4,
      fill: true,
      spanGaps: true
    }]
  }, {
    scales: {
      ...CHART_DEFAULTS.scales,
      y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 12, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v + 'h' } }
    }
  });
}

function renderWaterChart(email) {
  const { labels, data } = getLast7(email, 'water');
  createOrUpdate('waterChart', 'bar', {
    labels,
    datasets: [{
      data,
      backgroundColor: data.map(v => v >= 8 ? 'rgba(57,255,143,0.7)' : v >= 5 ? 'rgba(255,171,0,0.7)' : 'rgba(255,61,107,0.7)'),
      borderColor:     data.map(v => v >= 8 ? '#39ff8f' : v >= 5 ? '#ffab00' : '#ff3d6b'),
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  }, {
    scales: {
      ...CHART_DEFAULTS.scales,
      y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 12, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v + ' gl' } }
    }
  });
}

function renderMoodChart(email) {
  const { labels: lM, data: dM } = getLast7(email, 'mood');
  const { data: dS }             = getLast7(email, 'stress');
  createOrUpdate('moodChart', 'line', {
    labels: lM,
    datasets: [
      {
        label: 'Mood',
        data: dM,
        borderColor: '#b388ff',
        backgroundColor: 'rgba(179,136,255,0.08)',
        borderWidth: 2, pointRadius: 4, tension: 0.4, fill: true, spanGaps: true
      },
      {
        label: 'Stress',
        data: dS,
        borderColor: '#ff3d6b',
        backgroundColor: 'rgba(255,61,107,0.04)',
        borderWidth: 2, pointRadius: 4, tension: 0.4, fill: true, spanGaps: true,
        borderDash: [4,3]
      }
    ]
  }, {
    plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, labels: { color: '#8ab4cc', font: { size: 11 } } } },
    scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 10 } }
  });
}

function renderRadarChart(email, avgs) {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  const data = {
    labels: ['Sleep', 'Hydration', 'Activity', 'Low Stress', 'Mood'],
    datasets: [{
      data: [
        Math.min(10, (avgs.sleep / 9) * 10),
        Math.min(10, (avgs.water / 8) * 10),
        Math.min(10, (avgs.activity / 60) * 10),
        10 - avgs.stress,
        avgs.mood
      ],
      borderColor:       '#00e5ff',
      backgroundColor:   'rgba(0,229,255,0.1)',
      pointBackgroundColor: '#00e5ff',
      pointRadius: 4,
      borderWidth: 2
    }]
  };
  if (charts['radarChart']) {
    charts['radarChart'].data = data; charts['radarChart'].update(); return;
  }
  charts['radarChart'] = new Chart(ctx, {
    type: 'radar', data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 10,
          angleLines: { color: 'rgba(0,229,255,0.1)' },
          grid:       { color: 'rgba(0,229,255,0.1)' },
          pointLabels: { color: '#8ab4cc', font: { size: 11 } },
          ticks: { display: false }
        }
      }
    }
  });
}

/* ════════════════════════════════════════════
   CHART TABS
   ════════════════════════════════════════════ */
function initChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('.chart-card');
      group.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Could switch chart datasets for week/month view
    });
  });
}

/* ════════════════════════════════════════════
   LOG FORM
   ════════════════════════════════════════════ */
function initLogForm() {
  // Slider labels
  ['sleep','water','activity','stress','mood'].forEach(field => {
    const slider = document.getElementById(`log-${field}`);
    const display = document.getElementById(`${field}-val`);
    if (slider && display) {
      display.textContent = slider.value;
      slider.addEventListener('input', () => { display.textContent = slider.value; });
    }
  });

  // Symptom tags
  const tagContainer = document.getElementById('symptom-tags');
  if (tagContainer) {
    SYMPTOMS.forEach(sym => {
      const tag = document.createElement('span');
      tag.className   = 'symptom-tag';
      tag.textContent = sym;
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        if (tag.classList.contains('selected')) {
          selectedSymptoms.push(sym);
        } else {
          selectedSymptoms = selectedSymptoms.filter(s => s !== sym);
        }
      });
      tagContainer.appendChild(tag);
    });
  }

  // Submit
  const form = document.getElementById('health-log-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = form.querySelector('[type=submit]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

      const log = {
        sleep:    +document.getElementById('log-sleep').value,
        water:    +document.getElementById('log-water').value,
        activity: +document.getElementById('log-activity').value,
        stress:   +document.getElementById('log-stress').value,
        mood:     +document.getElementById('log-mood').value,
        symptoms: [...selectedSymptoms],
        notes:    document.getElementById('log-notes')?.value || ''
      };

      DB.saveLog(currentUser.email, log);
      showToast('Health data logged successfully! ✅', 'success');

      // Reset
      selectedSymptoms = [];
      document.querySelectorAll('.symptom-tag.selected').forEach(t => t.classList.remove('selected'));
      if (document.getElementById('log-notes')) document.getElementById('log-notes').value = '';

      submitBtn.disabled = false;
      submitBtn.innerHTML = '💾 Save Today\'s Log';

      // Refresh dashboard
      await new Promise(r => setTimeout(r, 300));
      renderDashboard();
      loadAlerts();
      loadLogHistory();
      renderWeekDots();
    });
  }

  // Voice for notes
  if (VoiceInput) {
    VoiceInput.bindToInput('log-notes', 'voice-notes-btn', () => {});
  }
}

/* ════════════════════════════════════════════
   ALERTS FEED
   ════════════════════════════════════════════ */
function loadAlerts() {
  const container = document.getElementById('alerts-feed');
  if (!container) return;

  const alerts = DB.getAlerts(currentUser.email).slice(0, 6);
  if (alerts.length === 0) {
    container.innerHTML = `<div class="alert alert-info"><span class="alert-icon">ℹ️</span>No alerts yet. Log your health data to get started.</div>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="alert-item lvl-${a.level}" onclick="markRead(${a.id})">
      <span class="alert-emoji">${a.emoji || '⚠️'}</span>
      <div class="alert-text">
        <strong>${a.title}</strong>
        ${a.message}
        <div class="alert-time">${DateUtils.relativeTime(a.timestamp)}</div>
      </div>
      ${!a.read ? '<span class="pulse-dot" style="margin-left:auto;flex-shrink:0"></span>' : ''}
    </div>
  `).join('');
}

function markRead(id) {
  DB.markAlertRead(currentUser.email, id);
  updateAlertBadge();
}
window.markRead = markRead;

/* ════════════════════════════════════════════
   LOG HISTORY
   ════════════════════════════════════════════ */
function loadLogHistory() {
  const container = document.getElementById('log-history');
  if (!container) return;

  const logs = DB.getLogs(currentUser.email, 7);
  if (logs.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No logs yet. Log your first day above!</p>`;
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="log-entry">
      <span class="log-entry-date">${log.date}</span>
      <div class="log-entry-pills">
        <span class="log-pill">🌙 ${log.sleep}h</span>
        <span class="log-pill">💧 ${log.water}gl</span>
        <span class="log-pill">🏃 ${log.activity}m</span>
        <span class="log-pill">😤 ${log.stress}/10</span>
        <span class="log-pill">😊 ${log.mood}/10</span>
        ${(log.symptoms||[]).map(s => `<span class="log-pill" style="border-color:rgba(255,61,107,0.4);color:var(--red)">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════
   WEEK DOT CALENDAR
   ════════════════════════════════════════════ */
function renderWeekDots() {
  const container = document.getElementById('week-dots');
  if (!container) return;

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  container.innerHTML = '';

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const log     = DB.getLogByDate(currentUser.email, dateStr);
    const score   = log ? DB.computeHealthScore([log]) : null;

    let dotClass = '';
    let dotLabel = '—';
    if (log) {
      dotClass = score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad';
      dotLabel = score;
    }

    const col = document.createElement('div');
    col.className = 'day-col';
    col.innerHTML = `
      <span class="day-label">${days[d.getDay()]}</span>
      <div class="day-dot ${dotClass}" title="${dateStr}">${log ? dotLabel : '·'}</div>
    `;
    container.appendChild(col);
  }
}

/* ════════════════════════════════════════════
   PDF REPORT BUTTON
   ════════════════════════════════════════════ */
window.downloadReport = async function() {
  showToast('Generating your health report...', 'info');
  try {
    await PDFReporter.generate(currentUser.email);
  } catch (err) {
    showToast('Failed to generate report: ' + err.message, 'error');
    console.error(err);
  }
};
