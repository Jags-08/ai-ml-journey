/**
 * NEUROWELL — storage.js
 * LocalStorage-based database layer (simulates SQL)
 * Tables: users, health_logs, symptoms, alerts, chat_history
 */

const DB = {

  /* ────── USERS ────── */
  getUser(email) {
    const users = JSON.parse(localStorage.getItem('nw_users') || '{}');
    return users[email] || null;
  },
  saveUser(email, data) {
    const users = JSON.parse(localStorage.getItem('nw_users') || '{}');
    users[email] = { ...users[email], ...data, email, updatedAt: new Date().toISOString() };
    localStorage.setItem('nw_users', JSON.stringify(users));
    return users[email];
  },
  getAllUsers() {
    return Object.values(JSON.parse(localStorage.getItem('nw_users') || '{}'));
  },

  /* ────── SESSIONS ────── */
  setSession(email) {
    localStorage.setItem('nw_session', JSON.stringify({ email, loginAt: new Date().toISOString() }));
  },
  getSession() {
    const s = localStorage.getItem('nw_session');
    return s ? JSON.parse(s) : null;
  },
  clearSession() {
    localStorage.removeItem('nw_session');
  },

  /* ────── HEALTH LOGS ────── */
  saveLog(email, log) {
    const key = `nw_logs_${email}`;
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    const entry = {
      id:        Date.now(),
      timestamp: new Date().toISOString(),
      date:      new Date().toISOString().split('T')[0],
      ...log
    };
    logs.unshift(entry);
    localStorage.setItem(key, JSON.stringify(logs));
    return entry;
  },
  getLogs(email, limit = 30) {
    const key = `nw_logs_${email}`;
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    return logs.slice(0, limit);
  },
  getLogByDate(email, date) {
    const logs = this.getLogs(email, 90);
    return logs.find(l => l.date === date) || null;
  },
  getLogsRange(email, days = 7) {
    const logs = this.getLogs(email, 90);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return logs.filter(l => new Date(l.timestamp) >= cutoff);
  },

  /* ────── ALERTS ────── */
  saveAlert(email, alert) {
    const key = `nw_alerts_${email}`;
    const alerts = JSON.parse(localStorage.getItem(key) || '[]');
    const entry = {
      id:        Date.now(),
      timestamp: new Date().toISOString(),
      read:      false,
      ...alert
    };
    alerts.unshift(entry);
    localStorage.setItem(key, JSON.stringify(alerts.slice(0, 50)));
    return entry;
  },
  getAlerts(email, unreadOnly = false) {
    const key = `nw_alerts_${email}`;
    const alerts = JSON.parse(localStorage.getItem(key) || '[]');
    return unreadOnly ? alerts.filter(a => !a.read) : alerts;
  },
  markAlertRead(email, id) {
    const key = `nw_alerts_${email}`;
    const alerts = JSON.parse(localStorage.getItem(key) || '[]');
    const a = alerts.find(x => x.id === id);
    if (a) { a.read = true; localStorage.setItem(key, JSON.stringify(alerts)); }
  },
  clearAlerts(email) {
    localStorage.removeItem(`nw_alerts_${email}`);
  },

  /* ────── CHAT HISTORY ────── */
  saveChat(email, messages) {
    localStorage.setItem(`nw_chat_${email}`, JSON.stringify(messages.slice(-60)));
  },
  getChat(email) {
    return JSON.parse(localStorage.getItem(`nw_chat_${email}`) || '[]');
  },
  clearChat(email) {
    localStorage.removeItem(`nw_chat_${email}`);
  },

  /* ────── STATS / COMPUTED ────── */
  computeHealthScore(logs) {
    if (!logs || logs.length === 0) return 50;
    const recent = logs.slice(0, 7);
    let score = 0;
    recent.forEach(log => {
      // Sleep: 0-10 scale, ideal 7-9h = 10pts
      const sleepScore = log.sleep >= 7 && log.sleep <= 9 ? 10
        : log.sleep >= 6 ? 7 : log.sleep >= 5 ? 4 : 2;
      // Water: 8 glasses ideal
      const waterScore = Math.min(10, (log.water / 8) * 10);
      // Activity: 0-10
      const actScore = Math.min(10, (log.activity / 60) * 10);
      // Stress: inverse (0-10, 10=best)
      const stressScore = 10 - log.stress;
      // Mood: direct 1-10
      const moodScore = log.mood;
      // Symptoms penalty
      const symPenalty = (log.symptoms || []).length * 1.5;

      const dayScore = ((sleepScore + waterScore + actScore + stressScore + moodScore) / 5) * 10 - symPenalty;
      score += Math.max(0, Math.min(100, dayScore));
    });
    return Math.round(score / recent.length);
  },

  getWeeklyAverages(email) {
    const logs = this.getLogsRange(email, 7);
    if (logs.length === 0) return {};
    const sum = logs.reduce((acc, l) => ({
      sleep:    acc.sleep    + (l.sleep    || 0),
      water:    acc.water    + (l.water    || 0),
      activity: acc.activity + (l.activity || 0),
      stress:   acc.stress   + (l.stress   || 0),
      mood:     acc.mood     + (l.mood     || 0),
    }), { sleep:0, water:0, activity:0, stress:0, mood:0 });
    const n = logs.length;
    return {
      sleep:    +(sum.sleep    / n).toFixed(1),
      water:    +(sum.water    / n).toFixed(1),
      activity: +(sum.activity / n).toFixed(0),
      stress:   +(sum.stress   / n).toFixed(1),
      mood:     +(sum.mood     / n).toFixed(1),
    };
  },

  /* ────── DATA EXPORT ────── */
  exportUserData(email) {
    return {
      user:    this.getUser(email),
      logs:    this.getLogs(email, 90),
      alerts:  this.getAlerts(email),
      chat:    this.getChat(email),
      exportedAt: new Date().toISOString()
    };
  }
};

// ── Make globally available ──
window.DB = DB;
