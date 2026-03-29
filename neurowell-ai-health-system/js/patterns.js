/**
 * NEUROWELL — patterns.js
 * Smart Pattern Detection Engine
 * Detects recurring symptoms, risky patterns, generates health alerts
 */

const PatternEngine = {

  /* ── Rule Definitions ── */
  rules: [
    {
      id: 'burnout_risk',
      name: 'Burnout Risk',
      emoji: '🔥',
      level: 'danger',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 3) return null;
        const lowSleep   = recent.filter(l => l.sleep < 6).length;
        const highStress = recent.filter(l => l.stress >= 7).length;
        const fatigue    = recent.filter(l => (l.symptoms||[]).includes('fatigue')).length;
        if (lowSleep >= 3 && highStress >= 3) {
          return `Low sleep + high stress reported for ${Math.max(lowSleep,highStress)} days → Possible burnout risk`;
        }
        if (fatigue >= 3 && lowSleep >= 2) {
          return `Fatigue + low sleep for ${fatigue} days → Consider rest and recovery`;
        }
        return null;
      }
    },
    {
      id: 'dehydration',
      name: 'Dehydration Risk',
      emoji: '💧',
      level: 'warning',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 3) return null;
        const lowWater = recent.filter(l => l.water < 5).length;
        if (lowWater >= 3) {
          return `Water intake below 5 glasses for ${lowWater} days → Risk of dehydration`;
        }
        return null;
      }
    },
    {
      id: 'chronic_headache',
      name: 'Chronic Headache',
      emoji: '🤕',
      level: 'warning',
      check(logs) {
        const recent = logs.slice(0, 7);
        const headaches = recent.filter(l => (l.symptoms||[]).includes('headache')).length;
        if (headaches >= 3) {
          return `Headache reported ${headaches} times in the last 7 days → Consider consulting a doctor`;
        }
        return null;
      }
    },
    {
      id: 'sedentary_alert',
      name: 'Sedentary Lifestyle',
      emoji: '🦥',
      level: 'warning',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 3) return null;
        const inactive = recent.filter(l => l.activity < 20).length;
        if (inactive >= 4) {
          return `Physical activity below 20 mins for ${inactive} days → Aim for 30+ mins daily`;
        }
        return null;
      }
    },
    {
      id: 'anxiety_trend',
      name: 'Rising Anxiety',
      emoji: '😰',
      level: 'warning',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 3) return null;
        const anxious = recent.filter(l => (l.symptoms||[]).includes('anxiety')).length;
        const stressed = recent.filter(l => l.stress >= 7).length;
        if (anxious >= 2 && stressed >= 3) {
          return `Anxiety + high stress pattern detected for ${stressed} days → Try mindfulness exercises`;
        }
        return null;
      }
    },
    {
      id: 'sleep_excellence',
      name: 'Great Sleep Streak!',
      emoji: '🌙',
      level: 'success',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 4) return null;
        const goodSleep = recent.filter(l => l.sleep >= 7.5).length;
        if (goodSleep >= 4) {
          return `Excellent sleep for ${goodSleep} consecutive days → Keep it up!`;
        }
        return null;
      }
    },
    {
      id: 'mood_drop',
      name: 'Mood Decline',
      emoji: '😔',
      level: 'warning',
      check(logs) {
        if (logs.length < 4) return null;
        const recent3 = logs.slice(0, 3).map(l => l.mood);
        const prev3   = logs.slice(3, 6).map(l => l.mood);
        if (!recent3.length || !prev3.length) return null;
        const recentAvg = recent3.reduce((a,b) => a+b, 0) / recent3.length;
        const prevAvg   = prev3.reduce((a,b) => a+b, 0)   / prev3.length;
        if (prevAvg - recentAvg > 2.5 && recentAvg < 4) {
          return `Mood score dropped by ${(prevAvg-recentAvg).toFixed(1)} points this week → Consider talking to someone`;
        }
        return null;
      }
    },
    {
      id: 'hydration_streak',
      name: 'Hydration Champion!',
      emoji: '🏆',
      level: 'success',
      check(logs) {
        const recent = logs.slice(0, 5);
        if (recent.length < 4) return null;
        const hydrated = recent.filter(l => l.water >= 8).length;
        if (hydrated >= 4) {
          return `8+ glasses of water for ${hydrated} days → Outstanding hydration habit!`;
        }
        return null;
      }
    },
    {
      id: 'nausea_pattern',
      name: 'Recurring Nausea',
      emoji: '🤢',
      level: 'danger',
      check(logs) {
        const recent = logs.slice(0, 7);
        const nausea = recent.filter(l => (l.symptoms||[]).includes('nausea')).length;
        if (nausea >= 3) {
          return `Nausea reported ${nausea} times this week → Recommend medical consultation`;
        }
        return null;
      }
    },
    {
      id: 'high_activity',
      name: 'Active Lifestyle!',
      emoji: '💪',
      level: 'success',
      check(logs) {
        const recent = logs.slice(0, 7);
        if (recent.length < 5) return null;
        const active = recent.filter(l => l.activity >= 45).length;
        if (active >= 5) {
          return `45+ minutes of activity for ${active} days → You're crushing your fitness goals!`;
        }
        return null;
      }
    }
  ],

  /**
   * Run all rules against recent logs
   * Returns array of {id, name, emoji, level, message}
   */
  analyze(logs) {
    if (!logs || logs.length < 2) return [];
    const findings = [];
    for (const rule of this.rules) {
      const msg = rule.check(logs);
      if (msg) {
        findings.push({
          id:      rule.id,
          name:    rule.name,
          emoji:   rule.emoji,
          level:   rule.level,
          message: msg
        });
      }
    }
    return findings;
  },

  /**
   * Run analysis and persist new alerts
   */
  runAndSaveAlerts(email) {
    const logs    = DB.getLogs(email, 30);
    const results = this.analyze(logs);
    const existing = DB.getAlerts(email).map(a => a.patternId).filter(Boolean);

    const newAlerts = [];
    for (const r of results) {
      if (!existing.includes(r.id)) {
        const alert = DB.saveAlert(email, {
          patternId: r.id,
          level:     r.level,
          title:     r.name,
          message:   r.message,
          emoji:     r.emoji
        });
        newAlerts.push(alert);
      }
    }
    return { results, newAlerts };
  },

  /**
   * Build a text summary of health for AI context
   */
  buildHealthContext(email) {
    const logs  = DB.getLogs(email, 7);
    const avgs  = DB.getWeeklyAverages(email);
    const score = DB.computeHealthScore(logs);
    const alerts = this.analyze(logs);

    // Collect recent symptoms
    const symCount = {};
    logs.forEach(l => (l.symptoms||[]).forEach(s => { symCount[s] = (symCount[s]||0)+1; }));
    const topSymptoms = Object.entries(symCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,c])=>`${s}(${c}x)`);

    return `
User Health Summary (last 7 days):
- Health Score: ${score}/100
- Avg Sleep: ${avgs.sleep}h/night
- Avg Water: ${avgs.water} glasses/day
- Avg Activity: ${avgs.activity} mins/day
- Avg Stress: ${avgs.stress}/10
- Avg Mood: ${avgs.mood}/10
- Recurring Symptoms: ${topSymptoms.join(', ') || 'none'}
- Active Alerts: ${alerts.map(a => a.name).join(', ') || 'none'}
    `.trim();
  },

  /**
   * Generate weekly insight text
   */
  generateWeeklyInsight(email) {
    const avgs  = DB.getWeeklyAverages(email);
    const logs  = DB.getLogs(email, 7);
    const score = DB.computeHealthScore(logs);
    const patterns = this.analyze(logs);

    const tips = [];
    if (avgs.sleep < 6.5) tips.push('Prioritise 7-9 hours of sleep nightly');
    if (avgs.water < 6)   tips.push('Increase water intake to at least 8 glasses/day');
    if (avgs.activity < 30) tips.push('Add 30+ minutes of movement daily');
    if (avgs.stress > 7)  tips.push('Practice stress-reduction techniques like deep breathing or meditation');
    if (avgs.mood < 5)    tips.push('Consider speaking with a mental health professional');

    return {
      score,
      averages: avgs,
      patterns,
      tips,
      summary: `Your health score this week is ${score}/100. ${
        score >= 80 ? 'Excellent work!' :
        score >= 60 ? 'Good, but there\'s room to improve.' :
        'Several areas need attention.'
      }`
    };
  }
};

window.PatternEngine = PatternEngine;
