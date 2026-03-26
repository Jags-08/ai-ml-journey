import { useState, useEffect, useRef, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ─────────────────────── FONTS & GLOBAL CSS ─────────────────────── */
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&family=Rajdhani:wght@400;500;600;700&display=swap";
document.head.appendChild(_fl);

const _gs = document.createElement("style");
_gs.textContent = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#03080f; --bg2:#060e1a; --s1:#081320; --s2:#0b1828; --s3:#0f2035;
  --b1:#0d2440; --b2:#133060; --b3:#1a4080;
  --blue:#0af; --cyan:#00ffe0; --green:#39ff8a; --amber:#ffb300;
  --red:#ff4466; --purple:#a855f7; --pink:#f472b6;
  --text:#c8dff5; --muted:#2a4a68; --muted2:#4a7090;
  --mono:'JetBrains Mono',monospace;
  --sans:'Outfit',sans-serif;
  --display:'Rajdhani',sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--sans);overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:4px}
input,textarea{
  background:rgba(10,170,255,0.04);border:1px solid var(--b2);
  color:var(--text);font-family:var(--sans);border-radius:8px;
  padding:10px 14px;outline:none;font-size:13px;width:100%;
  transition:border-color .2s,box-shadow .2s;
}
input:focus,textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,255,224,.07)}
input[type=range]{
  -webkit-appearance:none;height:2px;background:var(--b2);
  border-radius:2px;padding:0;border:none;cursor:pointer;box-shadow:none;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:14px;height:14px;border-radius:50%;
  background:var(--cyan);cursor:pointer;box-shadow:0 0 10px rgba(0,255,224,.55);
}
input[type=number]{-moz-appearance:textfield}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 6px currentColor}50%{box-shadow:0 0 18px currentColor}}
@keyframes alertSlide{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(600%)}}
@keyframes countUp{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)}}
.fu{animation:fadeUp .35s ease both}
.pu{animation:pulse 2s infinite}
.alert-in{animation:alertSlide .4s ease both}
.count-up{animation:countUp .5s ease both}
.shake{animation:shake .5s ease}
.recharts-tooltip-wrapper{outline:none!important}
`;
document.head.appendChild(_gs);

/* ─────────────────────── SAMPLE DATA ENGINE ─────────────────────── */
// Pre-seeded data that GUARANTEES detectable patterns
const buildSampleData = () => {
  const base = [
    // 14 days of data — carefully crafted to trigger multiple patterns
    { sleep:4.5, water:1.0, activity:1800, mood:4, stress:8, energy:3, heartRate:88, weight:69.2, symptoms:["fatigue","headache"] },
    { sleep:5.0, water:1.2, activity:2100, mood:4, stress:8, energy:3, heartRate:86, weight:69.1, symptoms:["fatigue","headache"] },
    { sleep:4.8, water:0.9, activity:1500, mood:3, stress:9, energy:2, heartRate:90, weight:69.3, symptoms:["fatigue","headache","irritability"] },
    { sleep:5.2, water:1.1, activity:2000, mood:3, stress:9, energy:3, heartRate:87, weight:69.0, symptoms:["fatigue","back pain"] },
    { sleep:6.0, water:1.5, activity:3200, mood:5, stress:7, energy:4, heartRate:82, weight:68.8, symptoms:["fatigue"] },
    { sleep:6.5, water:1.8, activity:4500, mood:5, stress:6, energy:5, heartRate:80, weight:68.7, symptoms:[] },
    { sleep:7.0, water:2.0, activity:5500, mood:6, stress:5, energy:6, heartRate:76, weight:68.6, symptoms:[] },
    { sleep:4.5, water:1.0, activity:1900, mood:3, stress:9, energy:2, heartRate:89, weight:68.8, symptoms:["fatigue","headache","anxiety"] },
    { sleep:4.0, water:0.8, activity:1200, mood:3, stress:9, energy:2, heartRate:92, weight:68.9, symptoms:["fatigue","headache"] },
    { sleep:4.2, water:1.0, activity:1600, mood:4, stress:8, energy:3, heartRate:88, weight:68.8, symptoms:["fatigue","nausea"] },
    { sleep:5.5, water:1.4, activity:2800, mood:4, stress:7, energy:4, heartRate:83, weight:68.7, symptoms:["fatigue"] },
    { sleep:4.8, water:1.1, activity:2200, mood:3, stress:9, energy:3, heartRate:87, weight:68.9, symptoms:["fatigue","headache","muscle ache"] },
    { sleep:4.5, water:1.0, activity:1700, mood:3, stress:9, energy:2, heartRate:91, weight:69.0, symptoms:["fatigue","headache"] },
    { sleep:5.0, water:1.3, activity:2100, mood:4, stress:8, energy:3, heartRate:86, weight:68.9, symptoms:["fatigue"] },
  ];
  const dayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return base.map((d, i) => ({
    id: i + 1,
    date: dayLabels[i],
    fullDate: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString("en-GB"),
    dayNum: i,
    ...d,
  }));
};

/* ─────────────────────── PATTERN DETECTION ENGINE ─────────────────────── */

const THRESHOLDS = {
  sleep: { low: 6, critical: 5 },
  water: { low: 1.5, critical: 1.0 },
  activity: { low: 3000, critical: 2000 },
  mood: { low: 5, critical: 3 },
  stress: { high: 7, critical: 9 },
  energy: { low: 4, critical: 2 },
  heartRate: { high: 85, critical: 92 },
};

const detectPatterns = (data) => {
  if (!data || data.length < 3) return [];
  const alerts = [];
  const N = data.length;
  const recent = data.slice(-7);   // last 7 days window
  const last3  = data.slice(-3);
  const last5  = data.slice(-5);

  /* ── helper: count consecutive from end ── */
  const consecutive = (arr, pred) => {
    let count = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (pred(arr[i])) count++; else break;
    }
    return count;
  };

  /* ── helper: count days meeting condition in window ── */
  const countDays = (arr, pred) => arr.filter(pred).length;

  /* ── helper: symptom frequency ── */
  const symptomFreq = (arr, sym) =>
    arr.filter(d => d.symptoms?.some(s => s.toLowerCase().includes(sym))).length;

  /* ── helper: trend slope (positive = rising) ── */
  const slope = (arr, key) => {
    if (arr.length < 2) return 0;
    const first = arr.slice(0, Math.floor(arr.length / 2));
    const second = arr.slice(Math.floor(arr.length / 2));
    const avg = a => a.reduce((s, x) => s + (+x[key]), 0) / a.length;
    return avg(second) - avg(first);
  };

  /* ════════════ PATTERN 1: BURNOUT RISK ════════════ */
  const burnoutDays = countDays(recent, d =>
    +d.sleep < THRESHOLDS.sleep.low &&
    +d.stress >= THRESHOLDS.stress.high &&
    +d.energy <= THRESHOLDS.energy.low
  );
  const fatigueDays = symptomFreq(recent, "fatigue");
  if (burnoutDays >= 4 || (burnoutDays >= 3 && fatigueDays >= 4)) {
    const consSleep = consecutive(data, d => +d.sleep < THRESHOLDS.sleep.low);
    alerts.push({
      id: "burnout",
      severity: "critical",
      icon: "🔥",
      title: "Burnout Risk Detected",
      headline: `Low sleep + high stress + fatigue reported for ${burnoutDays} of the last 7 days`,
      detail: `Your average sleep was ${(recent.reduce((s,d)=>s+(+d.sleep),0)/recent.length).toFixed(1)}h (below 6h threshold), stress averaged ${(recent.reduce((s,d)=>s+(+d.stress),0)/recent.length).toFixed(1)}/10, and fatigue appeared ${fatigueDays} days.`,
      evidence: [
        `Sleep under 6h → ${burnoutDays} days`,
        `Stress above 7/10 → ${countDays(recent, d => +d.stress >= 7)} days`,
        `Fatigue symptom logged → ${fatigueDays} days`,
        `Energy below 4/10 → ${countDays(recent, d => +d.energy <= 4)} days`,
      ],
      risk: "Possible burnout syndrome — chronic exhaustion affecting cognitive & physical health",
      action: "Prioritise 7–9h sleep, reduce workload, schedule a rest day. Consider speaking to a doctor.",
      days: burnoutDays,
      trend: slope(recent, "energy"),
    });
  }

  /* ════════════ PATTERN 2: SLEEP DEPRIVATION STREAK ════════════ */
  const consLowSleep = consecutive(data, d => +d.sleep < THRESHOLDS.sleep.low);
  if (consLowSleep >= 3) {
    const avgSleep = (data.slice(-consLowSleep).reduce((s,d)=>s+(+d.sleep),0)/consLowSleep).toFixed(1);
    alerts.push({
      id: "sleep_dep",
      severity: consLowSleep >= 5 ? "critical" : "warning",
      icon: "🌙",
      title: "Sleep Deprivation Streak",
      headline: `You slept under 6h for ${consLowSleep} consecutive days`,
      detail: `Average sleep over this streak: ${avgSleep}h/night. The recommended minimum is 7h. Cumulative sleep debt builds significantly after 3+ days.`,
      evidence: [
        `Consecutive nights under 6h → ${consLowSleep} days`,
        `Average sleep this streak → ${avgSleep}h`,
        `Lowest night → ${Math.min(...data.slice(-consLowSleep).map(d=>+d.sleep))}h`,
      ],
      risk: "Sleep deprivation impairs memory, mood regulation, immune function, and increases accident risk",
      action: "Aim for 7–9h tonight. Avoid screens 1h before bed. Maintain a consistent sleep schedule.",
      days: consLowSleep,
      trend: slope(data.slice(-consLowSleep), "sleep"),
    });
  }

  /* ════════════ PATTERN 3: DEHYDRATION PATTERN ════════════ */
  const dehydrationDays = countDays(recent, d => +d.water < THRESHOLDS.water.low);
  const headacheDays = symptomFreq(recent, "headache");
  if (dehydrationDays >= 4) {
    alerts.push({
      id: "dehydration",
      severity: dehydrationDays >= 6 ? "critical" : "warning",
      icon: "💧",
      title: "Chronic Dehydration Pattern",
      headline: `Water intake below 1.5L for ${dehydrationDays} of last 7 days`,
      detail: `Your average water intake was ${(recent.reduce((s,d)=>s+(+d.water),0)/recent.length).toFixed(1)}L/day against a recommended 2–3L. ${headacheDays > 2 ? `Headaches appeared on ${headacheDays} of these days — a common dehydration symptom.` : ''}`,
      evidence: [
        `Days under 1.5L → ${dehydrationDays}`,
        `Average intake → ${(recent.reduce((s,d)=>s+(+d.water),0)/recent.length).toFixed(1)}L`,
        headacheDays > 0 ? `Co-occurring headaches → ${headacheDays} days` : null,
      ].filter(Boolean),
      risk: "Chronic low hydration affects energy, cognition, kidney function and can trigger persistent headaches",
      action: "Set hourly hydration reminders. Target 2.5–3L/day. Start mornings with 500ml of water.",
      days: dehydrationDays,
      trend: slope(recent, "water"),
    });
  }

  /* ════════════ PATTERN 4: STRESS SPIRAL ════════════ */
  const consHighStress = consecutive(data, d => +d.stress >= THRESHOLDS.stress.high);
  const stressSlope = slope(recent, "stress");
  if (consHighStress >= 4 || (consHighStress >= 3 && stressSlope > 0.5)) {
    const moodDuringStress = data.slice(-consHighStress).reduce((s,d)=>s+(+d.mood),0)/consHighStress;
    alerts.push({
      id: "stress_spiral",
      severity: consHighStress >= 6 ? "critical" : "warning",
      icon: "⚡",
      title: "Stress Spiral Pattern",
      headline: `Stress above 7/10 for ${consHighStress} consecutive days${stressSlope > 0.5 ? " and still rising" : ""}`,
      detail: `Average stress: ${(data.slice(-consHighStress).reduce((s,d)=>s+(+d.stress),0)/consHighStress).toFixed(1)}/10. Mood during this period averaged ${moodDuringStress.toFixed(1)}/10 — a ${moodDuringStress < 5 ? "significant" : "moderate"} drop.`,
      evidence: [
        `Consecutive high-stress days → ${consHighStress}`,
        `Stress trend → ${stressSlope > 0 ? "↑ Rising" : "→ Stable"}`,
        `Mood impact → avg ${moodDuringStress.toFixed(1)}/10`,
        `Co-occurring anxiety symptoms → ${symptomFreq(recent, "anxiety")} days`,
      ],
      risk: "Prolonged elevated stress elevates cortisol, disrupts sleep, weakens immunity and cardiovascular health",
      action: "Try daily 10-min meditation, breathing exercises, or a walk. Identify and address the stress source.",
      days: consHighStress,
      trend: stressSlope,
    });
  }

  /* ════════════ PATTERN 5: CHRONIC LOW ENERGY ════════════ */
  const consLowEnergy = consecutive(data, d => +d.energy <= THRESHOLDS.energy.low + 1);
  if (consLowEnergy >= 4) {
    const energySl = slope(data.slice(-consLowEnergy), "energy");
    alerts.push({
      id: "low_energy",
      severity: consLowEnergy >= 6 ? "critical" : "warning",
      icon: "⚡",
      title: "Chronic Low Energy",
      headline: `Energy reported at 4/10 or below for ${consLowEnergy} consecutive days`,
      detail: `Your energy has been consistently depleted. Average: ${(data.slice(-consLowEnergy).reduce((s,d)=>s+(+d.energy),0)/consLowEnergy).toFixed(1)}/10. This pattern often signals physical or emotional exhaustion.`,
      evidence: [
        `Consecutive low-energy days → ${consLowEnergy}`,
        `Energy trend → ${energySl < -0.2 ? "↓ Worsening" : "→ Flat"}`,
        `Correlated fatigue symptoms → ${symptomFreq(data.slice(-consLowEnergy), "fatigue")} days`,
      ],
      risk: "Persistent low energy may indicate nutritional deficiency, thyroid issues, depression, or overtraining",
      action: "Review sleep quality, nutrition, and iron/B12 intake. Consult a doctor if this persists beyond 2 weeks.",
      days: consLowEnergy,
      trend: energySl,
    });
  }

  /* ════════════ PATTERN 6: RECURRING HEADACHES ════════════ */
  const recentHeadaches = symptomFreq(data.slice(-10), "headache");
  if (recentHeadaches >= 5) {
    alerts.push({
      id: "headache",
      severity: recentHeadaches >= 7 ? "critical" : "warning",
      icon: "🧠",
      title: "Recurring Headache Pattern",
      headline: `Headaches logged on ${recentHeadaches} of the last 10 days`,
      detail: `Headaches are occurring nearly daily. Analysis shows correlation with dehydration (${dehydrationDays} low-water days) and poor sleep (${countDays(data.slice(-10), d=>+d.sleep<6)} nights under 6h).`,
      evidence: [
        `Headache frequency → ${recentHeadaches}/10 days`,
        `Co-occurring low hydration → ${countDays(data.slice(-10), d=>+d.water<1.5)} days`,
        `Co-occurring poor sleep → ${countDays(data.slice(-10), d=>+d.sleep<6)} days`,
      ],
      risk: "Frequent headaches can signal dehydration, tension, hypertension, or sleep disorders",
      action: "Increase water intake, ensure 7h+ sleep, reduce screen time. Seek medical advice if persistent.",
      days: recentHeadaches,
      trend: 0,
    });
  }

  /* ════════════ PATTERN 7: SEDENTARY LIFESTYLE ALERT ════════════ */
  const consSedentary = consecutive(data, d => +d.activity < THRESHOLDS.activity.low);
  if (consSedentary >= 4) {
    const avgSteps = (data.slice(-consSedentary).reduce((s,d)=>s+(+d.activity),0)/consSedentary).toFixed(0);
    alerts.push({
      id: "sedentary",
      severity: consSedentary >= 7 ? "critical" : "info",
      icon: "🦵",
      title: "Sedentary Pattern Detected",
      headline: `Step count below 3,000/day for ${consSedentary} consecutive days`,
      detail: `Average of ${parseInt(avgSteps).toLocaleString()} steps/day — well below the WHO-recommended 7,500–10,000 steps. Inactivity compounds stress and energy issues.`,
      evidence: [
        `Consecutive low-activity days → ${consSedentary}`,
        `Average daily steps → ${parseInt(avgSteps).toLocaleString()}`,
        `Days under 2,000 steps → ${countDays(data.slice(-consSedentary), d=>+d.activity<2000)}`,
      ],
      risk: "Prolonged inactivity increases risk of metabolic syndrome, mood disorders, and cardiovascular disease",
      action: "Start with a 20-minute daily walk. Take standing breaks every 45 minutes.",
      days: consSedentary,
      trend: slope(data.slice(-consSedentary), "activity"),
    });
  }

  /* ════════════ PATTERN 8: MOOD DECLINE ════════════ */
  const moodSlope5 = slope(data.slice(-5), "mood");
  const avgMoodRecent = recent.reduce((s,d)=>s+(+d.mood),0)/recent.length;
  if (moodSlope5 < -0.8 && avgMoodRecent < 5.5) {
    alerts.push({
      id: "mood_decline",
      severity: avgMoodRecent < 4 ? "critical" : "warning",
      icon: "🌧️",
      title: "Mood Decline Trend",
      headline: `Mood has been declining over the last 5 days — now averaging ${avgMoodRecent.toFixed(1)}/10`,
      detail: `From ${(+data[data.length-5]?.mood||0).toFixed(1)} to ${(+data[data.length-1]?.mood||0).toFixed(1)}/10 — a ${Math.abs(moodSlope5).toFixed(1)} point drop. This trend often precedes more serious emotional difficulties.`,
      evidence: [
        `5-day mood slope → ↓${Math.abs(moodSlope5).toFixed(1)} points`,
        `Current 7-day avg → ${avgMoodRecent.toFixed(1)}/10`,
        `Days below mood 4 → ${countDays(recent, d=>+d.mood<4)}`,
      ],
      risk: "Sustained low mood can develop into depression, especially when combined with poor sleep and high stress",
      action: "Connect with friends/family, engage in activities you enjoy. Consult a mental health professional if needed.",
      days: 5,
      trend: moodSlope5,
    });
  }

  /* ════════════ PATTERN 9: ELEVATED RESTING HEART RATE ════════════ */
  const highHRDays = countDays(recent, d => +d.heartRate >= THRESHOLDS.heartRate.high);
  const avgHR = recent.reduce((s,d)=>s+(+d.heartRate),0)/recent.length;
  if (highHRDays >= 4 || avgHR >= 88) {
    alerts.push({
      id: "heart_rate",
      severity: avgHR >= 92 ? "critical" : "warning",
      icon: "🫀",
      title: "Elevated Resting Heart Rate",
      headline: `Resting HR above 85 bpm for ${highHRDays} of the last 7 days`,
      detail: `Average resting HR: ${avgHR.toFixed(0)} bpm. A healthy resting HR is 60–80 bpm. Elevated HR often reflects chronic stress, poor sleep, or overtraining.`,
      evidence: [
        `Days above 85 bpm → ${highHRDays}`,
        `7-day avg HR → ${avgHR.toFixed(0)} bpm`,
        `Highest reading → ${Math.max(...recent.map(d=>+d.heartRate))} bpm`,
      ],
      risk: "Consistently elevated resting HR is associated with cardiovascular stress and autonomic dysregulation",
      action: "Practice slow breathing, reduce caffeine, ensure adequate rest. Consult a doctor if above 100 bpm consistently.",
      days: highHRDays,
      trend: slope(recent, "heartRate"),
    });
  }

  /* ════════════ PATTERN 10: COMBINED SYMPTOM CLUSTER ════════════ */
  const anxietyDays = symptomFreq(recent, "anxiety");
  const nausea = symptomFreq(recent, "nausea");
  const musclePain = symptomFreq(data.slice(-7), "muscle") + symptomFreq(data.slice(-7), "ache") + symptomFreq(data.slice(-7), "pain");
  if (anxietyDays >= 2 && fatigueDays >= 4 && (musclePain >= 2 || headacheDays >= 3)) {
    alerts.push({
      id: "somatic",
      severity: "warning",
      icon: "🔍",
      title: "Multi-Symptom Pattern",
      headline: "Cluster of physical and emotional symptoms detected across the past week",
      detail: `Fatigue (${fatigueDays}d), anxiety (${anxietyDays}d), physical pain (${musclePain}d), and headaches (${headacheDays}d) appearing together is a recognisable pattern of chronic stress affecting the body.`,
      evidence: [
        `Fatigue → ${fatigueDays} days`,
        `Anxiety → ${anxietyDays} days`,
        `Headaches → ${headacheDays} days`,
        `Muscle/body pain → ${musclePain} days`,
      ],
      risk: "This symptom cluster is consistent with chronic stress somatisation or possible viral illness",
      action: "Rest, hydrate, and reduce demands. If multiple symptoms persist beyond 2 weeks, consult a doctor.",
      days: 7,
      trend: 0,
    });
  }

  // Sort by severity
  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
};

/* ─────────────────────── HELPERS ─────────────────────── */
const avg = (a, k) => a.length ? (a.reduce((s,x)=>s+(+x[k]),0)/a.length).toFixed(1) : 0;
const SEV_COLOR = { critical: "var(--red)", warning: "var(--amber)", info: "var(--cyan)" };
const SEV_BG    = { critical: "rgba(255,68,102,.08)", warning: "rgba(255,179,0,.07)", info: "rgba(0,200,255,.06)" };
const SEV_BORDER= { critical: "rgba(255,68,102,.28)", warning: "rgba(255,179,0,.25)", info: "rgba(0,200,255,.22)" };
const SEV_LABEL = { critical: "CRITICAL", warning: "WARNING", info: "INFO" };

const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,padding:"8px 12px",fontFamily:"var(--mono)",fontSize:11}}>
      <div style={{color:"var(--muted2)",marginBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
};

/* ─────────────────────── ALERT CARD ─────────────────────── */
const AlertCard = ({ alert, index, expanded, onToggle }) => {
  const c = SEV_COLOR[alert.severity];
  return (
    <div className="alert-in" style={{
      animationDelay:`${index * 0.07}s`,
      background: SEV_BG[alert.severity],
      border: `1px solid ${SEV_BORDER[alert.severity]}`,
      borderLeft: `4px solid ${c}`,
      borderRadius: "0 12px 12px 0",
      overflow: "hidden",
      transition: "transform .2s",
    }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateX(3px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>

      {/* Header row */}
      <div style={{
        display:"flex",alignItems:"flex-start",gap:14,padding:"16px 18px",
        cursor:"pointer",
      }} onClick={onToggle}>
        <div style={{
          width:42,height:42,borderRadius:10,flexShrink:0,
          background:`${c}18`,border:`1px solid ${c}35`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
          boxShadow:`0 0 12px ${c}25`,
        }}>{alert.icon}</div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5,flexWrap:"wrap"}}>
            <span style={{fontFamily:"var(--display)",fontSize:16,fontWeight:700,color:c}}>{alert.title}</span>
            <span style={{
              fontFamily:"var(--mono)",fontSize:9,color:c,
              background:`${c}15`,border:`1px solid ${c}35`,
              padding:"1px 7px",borderRadius:4,letterSpacing:1.5,
              animation: alert.severity==="critical" ? "pulse 2s infinite" : "none",
            }}>{SEV_LABEL[alert.severity]}</span>
            <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",marginLeft:"auto"}}>
              {alert.days}d pattern
            </span>
          </div>

          {/* Headline — the plain-language summary */}
          <div style={{
            fontFamily:"var(--mono)",fontSize:12,
            color:"var(--text)",lineHeight:1.5,
            background:"rgba(0,0,0,0.3)",borderRadius:6,
            padding:"6px 10px",
            borderLeft:`2px solid ${c}`,
            marginBottom: expanded ? 12 : 0,
          }}>
            "{alert.headline}"
          </div>
        </div>

        <div style={{color:"var(--muted2)",fontSize:16,flexShrink:0,marginTop:10,transition:"transform .2s",
          transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="fu" style={{padding:"0 18px 18px 74px",display:"grid",gap:12}}>
          {/* Detail text */}
          <div style={{fontSize:13,color:"var(--text)",lineHeight:1.65}}>{alert.detail}</div>

          {/* Evidence */}
          <div style={{background:"rgba(0,0,0,0.25)",border:"1px solid var(--b2)",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Evidence</div>
            <div style={{display:"grid",gap:5}}>
              {alert.evidence.map((ev,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontFamily:"var(--mono)",fontSize:11}}>
                  <span style={{color:c,fontSize:8}}>◆</span>
                  <span style={{color:"var(--text)"}}>{ev}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div style={{background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"10px 14px",
            border:`1px solid ${c}20`}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Possible Risk</div>
            <div style={{fontSize:12,color:c,lineHeight:1.5}}>{alert.risk}</div>
          </div>

          {/* Action */}
          <div style={{background:"rgba(57,255,138,0.05)",border:"1px solid rgba(57,255,138,0.2)",borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--green)",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Recommended Action</div>
            <div style={{fontSize:12,color:"var(--text)",lineHeight:1.55}}>{alert.action}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────── STAT CARD ─────────────────────── */
const StatCard = ({icon,label,value,unit,color,tag,alertFlag}) => (
  <div className="fu" style={{
    background:"var(--s2)",border:`1px solid ${alertFlag?"var(--b2)":"var(--b1)"}`,
    borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden",
    cursor:"default",transition:"border-color .2s,transform .15s",
    ...(alertFlag?{borderColor:color,boxShadow:`0 0 12px ${color}18`}:{})
  }}
    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
    onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
    <div style={{position:"absolute",top:0,right:0,width:50,height:50,borderRadius:"0 12px 0 50px",background:`${color}12`}}/>
    {alertFlag && <div className="pu" style={{position:"absolute",top:10,right:10,width:7,height:7,borderRadius:"50%",background:color}}/>}
    <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
    <div style={{fontFamily:"var(--mono)",fontSize:22,fontWeight:600,color,lineHeight:1}}>{value}<span style={{fontSize:11,color:"var(--muted2)",marginLeft:3}}>{unit}</span></div>
    <div style={{fontSize:10,color:"var(--muted2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,marginTop:5}}>{label}</div>
    {tag&&<div style={{position:"absolute",bottom:10,right:10,fontSize:9,fontFamily:"var(--mono)",color,background:`${color}15`,padding:"1px 6px",borderRadius:4,border:`1px solid ${color}30`}}>{tag}</div>}
  </div>
);

/* ─────────────────────── PATTERN TIMELINE ─────────────────────── */
const PatternTimeline = ({ data, alerts }) => {
  const criticalDays = new Set();
  const warningDays  = new Set();
  alerts.forEach(a => {
    data.slice(-a.days).forEach(d => {
      if (a.severity === "critical") criticalDays.add(d.id);
      else if (a.severity === "warning") warningDays.add(d.id);
    });
  });
  return (
    <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18,marginBottom:16}}>
      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Pattern Timeline · {data.length}-Day View</div>
      <div style={{display:"flex",gap:4,alignItems:"flex-end"}}>
        {data.map((d,i) => {
          const score = Math.min(100,Math.round((+d.sleep/8)*30+(+d.water/3)*20+(+d.mood/10)*20+((10-+d.stress)/10)*15+(+d.energy/10)*15));
          const isCrit = criticalDays.has(d.id);
          const isWarn = warningDays.has(d.id);
          const barColor = isCrit?"var(--red)":isWarn?"var(--amber)":score>70?"var(--green)":"var(--cyan)";
          return (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{
                width:"100%",height:`${score*1.1}px`,maxHeight:110,minHeight:8,
                background:barColor,borderRadius:"3px 3px 0 0",opacity:.85,
                boxShadow: isCrit?`0 0 8px var(--red)`:isWarn?`0 0 5px var(--amber)`:"none",
                transition:"all .3s",position:"relative",
              }}>
                {(isCrit||isWarn)&&(
                  <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                    fontSize:8,color:isCrit?"var(--red)":"var(--amber)"}}>
                    {isCrit?"!":"·"}
                  </div>
                )}
              </div>
              <div style={{fontSize:8,color:"var(--muted)",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>{d.date}</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
        {[
          {c:"var(--red)",label:"Critical pattern"},
          {c:"var(--amber)",label:"Warning pattern"},
          {c:"var(--green)",label:"Healthy"},
          {c:"var(--cyan)",label:"Moderate"},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:5,fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)"}}>
            <div style={{width:8,height:8,borderRadius:2,background:l.c}}/>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────── MAIN APP ─────────────────────── */
const TABS = [
  {id:"dashboard",icon:"◈", label:"Dashboard"},
  {id:"alerts",   icon:"⚠",  label:"Alerts"},
  {id:"patterns", icon:"◉",  label:"Patterns"},
  {id:"log",      icon:"✛",  label:"Log Health"},
  {id:"ai",       icon:"◎",  label:"AI Insights"},
];

export default function NeuroWell() {
  const [tab,   setTab]   = useState("dashboard");
  const [data,  setData]  = useState(buildSampleData());
  const [form,  setForm]  = useState({sleep:7,water:2,activity:6000,mood:7,stress:4,energy:7,heartRate:72,weight:68,symptoms:""});
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [newAlertAnim,  setNewAlertAnim]  = useState(false);
  const chatRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(()=>{ chatRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  // Pattern detection — runs every time data changes
  const alerts = useMemo(() => detectPatterns(data), [data]);
  const criticalCount = alerts.filter(a=>a.severity==="critical").length;
  const warningCount  = alerts.filter(a=>a.severity==="warning").length;

  const set    = (k) => (e) => setForm(f=>({...f,[k]:+e.target.value}));
  const setStr = (k) => (e) => setForm(f=>({...f,[k]:e.target.value}));

  const logHealth = () => {
    const entry = {
      id: Date.now(), date: new Date().toLocaleDateString("en",{weekday:"short"}),
      fullDate: new Date().toLocaleDateString("en-GB"), dayNum: data.length,
      ...form,
      symptoms: form.symptoms ? form.symptoms.split(",").map(s=>s.trim()).filter(Boolean) : [],
    };
    setData(p=>[...p.slice(-13), entry]);
    setSaved(true);
    setNewAlertAnim(true);
    setTimeout(()=>setSaved(false), 3000);
    setTimeout(()=>setNewAlertAnim(false), 2000);
  };

  const buildCtx = () => {
    const alertSummary = alerts.map(a=>`[${a.severity.toUpperCase()}] ${a.title}: ${a.headline}`).join("\n");
    return `NeuroWell System · ${data.length}-day health log:\n`+
      data.map(d=>`[${d.date}] sleep:${d.sleep}h water:${d.water}L steps:${d.activity} mood:${d.mood}/10 stress:${d.stress}/10 energy:${d.energy}/10 hr:${d.heartRate} symptoms:${d.symptoms?.join(",")||"none"}`).join("\n")+
      `\n\nDETECTED PATTERNS & ALERTS:\n${alertSummary||"No active alerts."}`+
      `\n\nAverages: sleep:${avg(data,"sleep")}h water:${avg(data,"water")}L mood:${avg(data,"mood")}/10 stress:${avg(data,"stress")}/10 energy:${avg(data,"energy")}/10`;
  };

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs(p=>[...p,{role:"user",content:q}]);
    setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`You are NeuroWell AI — a health intelligence system that analyses patterns. You have access to the user's health data AND detected patterns/alerts. Reference specific patterns when relevant. Be empathetic, specific, and actionable. Always recommend a doctor for medical concerns.\n\n${buildCtx()}`,
          messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:q}],
        }),
      });
      const d = await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.map(b=>b.text||"").join("")||"No response."}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",content:"⚠ Connection error. Please try again."}]); }
    finally { setBusy(false); }
  };

  /* ── Derived ── */
  const latest   = data[data.length-1]||{};
  const hs       = Math.min(100,Math.round((+latest.sleep/8)*30+(+latest.water/3)*20+(+latest.mood/10)*20+((10-(+latest.stress||5))/10)*15+(+latest.energy/10)*15));
  const hc       = hs>=75?"var(--green)":hs>=50?"var(--amber)":"var(--red)";
  const radarD   = [{s:"Sleep",v:Math.round((+latest.sleep/9)*10)},{s:"Hydration",v:Math.round((+latest.water/3)*10)},{s:"Activity",v:Math.round((+latest.activity/10000)*10)},{s:"Mood",v:+latest.mood||0},{s:"Energy",v:+latest.energy||0},{s:"Calm",v:Math.max(0,10-(+latest.stress||5))}];

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",
      backgroundImage:"radial-gradient(ellipse 60% 25% at 50% 0%,rgba(0,170,255,0.045) 0%,transparent 65%)"}}>

      {/* ── NAV ── */}
      <header style={{
        position:"sticky",top:0,zIndex:200,height:60,
        background:"rgba(3,8,15,0.94)",backdropFilter:"blur(22px)",
        borderBottom:"1px solid var(--b1)",
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",gap:12,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,
            background:"linear-gradient(135deg,#0af 0%,#00ffe0 100%)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16,fontWeight:800,color:"#000",boxShadow:"0 0 16px rgba(0,200,255,.35)"}}>⬡</div>
          <div>
            <div style={{fontFamily:"var(--display)",fontWeight:700,fontSize:16,letterSpacing:1.5,
              background:"linear-gradient(90deg,#0af,#00ffe0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              NEUROWELL
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:7.5,color:"var(--muted2)",letterSpacing:2.5,textTransform:"uppercase"}}>
              AI Health Intelligence System
            </div>
          </div>
        </div>

        <nav style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center"}}>
          {TABS.map(t=>{
            const isAlertTab = t.id==="alerts";
            const alertBadge = isAlertTab && (criticalCount+warningCount) > 0;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background:tab===t.id?"rgba(0,200,255,0.1)":"transparent",
                border:tab===t.id?"1px solid rgba(0,200,255,0.3)":"1px solid transparent",
                color:tab===t.id?"var(--cyan)":isAlertTab&&criticalCount>0?"var(--red)":"var(--muted2)",
                borderRadius:8,padding:"5px 12px",cursor:"pointer",
                fontFamily:"var(--mono)",fontSize:11,transition:"all .18s",
                display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
                position:"relative",
              }}>
                <span style={{fontSize:10}}>{t.icon}</span>{t.label}
                {alertBadge&&(
                  <span className={criticalCount>0?"shake":""} style={{
                    background:criticalCount>0?"var(--red)":"var(--amber)",
                    color:"#fff",borderRadius:8,fontSize:9,fontWeight:700,
                    padding:"1px 5px",marginLeft:2,fontFamily:"var(--mono)",
                  }}>{criticalCount+warningCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {criticalCount>0&&(
            <div style={{
              display:"flex",alignItems:"center",gap:5,
              background:"rgba(255,68,102,.12)",border:"1px solid rgba(255,68,102,.3)",
              borderRadius:7,padding:"3px 10px",
            }}>
              <div className="pu" style={{width:6,height:6,borderRadius:"50%",background:"var(--red)"}}/>
              <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",letterSpacing:1}}>
                {criticalCount} CRITICAL
              </span>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div className="pu" style={{width:6,height:6,borderRadius:"50%",background:"var(--cyan)"}}/>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--mono)",fontSize:8.5,color:"var(--cyan)",letterSpacing:1}}>SYSTEM ACTIVE</div>
              <div style={{fontFamily:"var(--mono)",fontSize:7.5,color:"var(--muted)",letterSpacing:0.5}}>PATTERN ENGINE LIVE</div>
            </div>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1080,margin:"0 auto",padding:"20px 14px"}}>

        {/* ════════════ DASHBOARD ════════════ */}
        {tab==="dashboard"&&(
          <div className="fu">
            {/* Alert banner */}
            {alerts.length>0&&(
              <div style={{
                background:"rgba(255,68,102,.06)",border:"1px solid rgba(255,68,102,.22)",
                borderRadius:12,padding:"12px 18px",marginBottom:18,
                display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>⚠</span>
                  <div>
                    <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--red)",textTransform:"uppercase",letterSpacing:1.5}}>Active Health Alerts</div>
                    <div style={{fontFamily:"var(--sans)",fontSize:12,color:"var(--text)",marginTop:2}}>
                      {criticalCount} critical · {warningCount} warnings detected from your health pattern data
                    </div>
                  </div>
                </div>
                <button onClick={()=>setTab("alerts")} style={{
                  marginLeft:"auto",background:"rgba(255,68,102,.12)",
                  border:"1px solid rgba(255,68,102,.3)",color:"var(--red)",
                  padding:"7px 16px",borderRadius:8,cursor:"pointer",
                  fontFamily:"var(--mono)",fontSize:11,fontWeight:600,transition:"all .2s",
                }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,68,102,.22)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(255,68,102,.12)"}>
                  View All Alerts →
                </button>
              </div>
            )}

            {/* Header row */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:14}}>
              <div>
                <h1 style={{fontFamily:"var(--display)",fontSize:22,fontWeight:700,letterSpacing:-0.3,
                  background:"linear-gradient(90deg,#c8dff5,#0af)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  Health Intelligence Dashboard
                </h1>
                <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>
                  {new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                  &nbsp;·&nbsp;{data.length} days tracked
                </p>
              </div>
              {/* Score ring */}
              <div style={{display:"flex",alignItems:"center",gap:16,background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:14,padding:"14px 20px"}}>
                <div style={{position:"relative",width:66,height:66}}>
                  <svg width={66} height={66} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={33} cy={33} r={26} fill="none" stroke="var(--b2)" strokeWidth={5}/>
                    <circle cx={33} cy={33} r={26} fill="none" stroke={hc} strokeWidth={5}
                      strokeDasharray={`${2*Math.PI*26*hs/100} ${2*Math.PI*26*(1-hs/100)}`}
                      strokeLinecap="round" style={{filter:`drop-shadow(0 0 6px ${hc})`}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:17,fontWeight:600,color:hc}}>{hs}</span>
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2}}>Health Score</div>
                  <div style={{fontFamily:"var(--display)",fontSize:20,fontWeight:700,color:hc,marginTop:1}}>{hs>=75?"Optimal":hs>=50?"Moderate":"Low"}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",marginTop:1}}>{alerts.length} patterns detected</div>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:10,marginBottom:16}}>
              <StatCard icon="🌙" label="Sleep"      value={latest.sleep} unit="hrs" color="var(--blue)"   tag={+latest.sleep>=7?"Optimal":"Low"} alertFlag={+latest.sleep<6}/>
              <StatCard icon="💧" label="Hydration"  value={latest.water} unit="L"   color="var(--cyan)"  tag={+latest.water>=2?"Good":"Low"} alertFlag={+latest.water<1.5}/>
              <StatCard icon="👣" label="Steps"      value={(+latest.activity||0).toLocaleString()} unit="" color="var(--amber)" alertFlag={+latest.activity<3000}/>
              <StatCard icon="😊" label="Mood"       value={`${latest.mood}/10`} unit="" color={+latest.mood>=7?"var(--green)":+latest.mood>=5?"var(--amber)":"var(--red)"} alertFlag={+latest.mood<5}/>
              <StatCard icon="⚡" label="Energy"     value={`${latest.energy}/10`} unit="" color="var(--amber)" alertFlag={+latest.energy<=4}/>
              <StatCard icon="🫀" label="Heart Rate" value={latest.heartRate} unit="bpm" color="var(--red)" alertFlag={+latest.heartRate>85}/>
            </div>

            {/* Pattern timeline bar */}
            <PatternTimeline data={data} alerts={alerts}/>

            {/* Charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Sleep & Energy Trend</div>
                <ResponsiveContainer width="100%" height={165}>
                  <AreaChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0af" stopOpacity={.35}/><stop offset="100%" stopColor="#0af" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ffe0" stopOpacity={.28}/><stop offset="100%" stopColor="#00ffe0" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(13,36,64,.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={6} stroke="var(--red)" strokeDasharray="3 3" opacity={0.5}/>
                    <Area type="monotone" dataKey="sleep"  name="Sleep (h)"  stroke="#0af"    fill="url(#sg)" strokeWidth={2} dot={false}/>
                    <Area type="monotone" dataKey="energy" name="Energy /10" stroke="#00ffe0" fill="url(#eg)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Mood vs Stress Correlation</div>
                <ResponsiveContainer width="100%" height={165}>
                  <LineChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(13,36,64,.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis domain={[0,10]} tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={7} stroke="var(--amber)" strokeDasharray="3 3" opacity={0.5}/>
                    <Line type="monotone" dataKey="mood"   name="Mood"   stroke="#39ff8a" strokeWidth={2} dot={{fill:"#39ff8a",r:3,strokeWidth:0}}/>
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="#ff4466" strokeWidth={2} dot={{fill:"#ff4466",r:3,strokeWidth:0}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Daily Steps · Activity</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(13,36,64,.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={3000} stroke="var(--amber)" strokeDasharray="3 3" opacity={0.5}/>
                    <Bar dataKey="activity" name="Steps" fill="var(--amber)" radius={[3,3,0,0]} opacity={.85}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Today's Wellness Radar</div>
                <ResponsiveContainer width="100%" height={140}>
                  <RadarChart data={radarD} cx="50%" cy="50%" outerRadius="60%">
                    <PolarGrid stroke="var(--b2)"/>
                    <PolarAngleAxis dataKey="s" tick={{fill:"var(--muted2)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Radar dataKey="v" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={.1} strokeWidth={1.8}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ ALERTS TAB ════════════ */}
        {tab==="alerts"&&(
          <div className="fu">
            {/* Header */}
            <div style={{marginBottom:22}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                <h1 style={{fontFamily:"var(--display)",fontSize:24,fontWeight:700,
                  background:"linear-gradient(90deg,#ff8899,#ff4466)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                  Health Alerts
                </h1>
                <div style={{display:"flex",gap:8}}>
                  {criticalCount>0&&<span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--red)",background:"rgba(255,68,102,.15)",border:"1px solid rgba(255,68,102,.3)",padding:"2px 10px",borderRadius:5}}>{criticalCount} CRITICAL</span>}
                  {warningCount>0&&<span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--amber)",background:"rgba(255,179,0,.12)",border:"1px solid rgba(255,179,0,.28)",padding:"2px 10px",borderRadius:5}}>{warningCount} WARNINGS</span>}
                </div>
              </div>
              <p style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)"}}>
                Pattern detection engine · Analysed {data.length} days of health data · {alerts.length} patterns found
              </p>
            </div>

            {alerts.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14}}>
                <div style={{fontSize:44,marginBottom:14,opacity:.4}}>✦</div>
                <div style={{fontFamily:"var(--display)",fontSize:18,fontWeight:600,color:"var(--green)",marginBottom:6}}>No Patterns Detected</div>
                <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted2)"}}>All health metrics are within normal ranges. Keep up the good work!</div>
              </div>
            ):(
              <div style={{display:"grid",gap:12}}>
                {alerts.map((a,i)=>(
                  <AlertCard key={a.id} alert={a} index={i}
                    expanded={expandedAlert===a.id}
                    onToggle={()=>setExpandedAlert(p=>p===a.id?null:a.id)}/>
                ))}
              </div>
            )}

            {/* Ask AI about alerts */}
            {alerts.length>0&&(
              <div style={{marginTop:20,background:"rgba(0,200,255,.06)",border:"1px solid rgba(0,200,255,.2)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <span style={{fontSize:18}}>◎</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--cyan)",marginBottom:3}}>AI can explain these alerts in detail</div>
                  <div style={{fontFamily:"var(--sans)",fontSize:12,color:"var(--muted2)"}}>
                    The AI has full access to your patterns and can answer questions like "What should I do about my burnout risk?" or "How are my sleep and mood linked?"
                  </div>
                </div>
                <button onClick={()=>{setTab("ai");setInput("Explain my most critical health alerts and what I should do");}} style={{
                  background:"rgba(0,200,255,.12)",border:"1px solid rgba(0,200,255,.28)",
                  color:"var(--cyan)",padding:"8px 16px",borderRadius:8,cursor:"pointer",
                  fontFamily:"var(--mono)",fontSize:11,fontWeight:600,whiteSpace:"nowrap",
                  transition:"all .2s",
                }}>Ask AI →</button>
              </div>
            )}
          </div>
        )}

        {/* ════════════ PATTERNS TAB ════════════ */}
        {tab==="patterns"&&(
          <div className="fu">
            <div style={{marginBottom:22}}>
              <h1 style={{fontFamily:"var(--display)",fontSize:24,fontWeight:700,
                background:"linear-gradient(90deg,#c8dff5,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Pattern Analysis
              </h1>
              <p style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",marginTop:3}}>
                Recurring symptom tracker · Correlation maps · Risk heatmap · {data.length}-day analysis
              </p>
            </div>

            {/* Symptom frequency */}
            <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:20,marginBottom:14}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Symptom Frequency · Last {data.length} Days</div>
              {(() => {
                const symMap = {};
                data.forEach(d=>d.symptoms?.forEach(s=>{symMap[s]=(symMap[s]||0)+1;}));
                const sorted = Object.entries(symMap).sort((a,b)=>b[1]-a[1]);
                if(!sorted.length) return <div style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:12,textAlign:"center",padding:20}}>No symptoms logged yet</div>;
                return(
                  <div style={{display:"grid",gap:8}}>
                    {sorted.map(([sym,count])=>{
                      const pct = (count/data.length)*100;
                      const color = pct>50?"var(--red)":pct>30?"var(--amber)":"var(--cyan)";
                      return(
                        <div key={sym} style={{display:"grid",gridTemplateColumns:"120px 1fr auto",alignItems:"center",gap:12}}>
                          <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text)",textTransform:"capitalize"}}>{sym}</span>
                          <div style={{height:6,background:"var(--b2)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3,
                              boxShadow:`0 0 6px ${color}`,transition:"width .6s ease"}}/>
                          </div>
                          <span style={{fontFamily:"var(--mono)",fontSize:11,color,minWidth:60,textAlign:"right"}}>
                            {count}d &nbsp;<span style={{color:"var(--muted2)",fontSize:9}}>({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Correlation matrix */}
            <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:20,marginBottom:14}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Key Correlations Detected</div>
              {[
                {a:"sleep",b:"energy",label:"Sleep → Energy"},
                {a:"sleep",b:"mood",label:"Sleep → Mood"},
                {a:"stress",b:"mood",label:"Stress → Mood (inverse)"},
                {a:"water",b:"energy",label:"Hydration → Energy"},
                {a:"activity",b:"mood",label:"Activity → Mood"},
                {a:"stress",b:"heartRate",label:"Stress → Heart Rate"},
              ].map(({a,b,label})=>{
                const pairs = data.filter(d=>d[a]!==undefined&&d[b]!==undefined);
                if(pairs.length<3) return null;
                const meanA = pairs.reduce((s,d)=>s+(+d[a]),0)/pairs.length;
                const meanB = pairs.reduce((s,d)=>s+(+d[b]),0)/pairs.length;
                const num   = pairs.reduce((s,d)=>s+(+d[a]-meanA)*(+d[b]-meanB),0);
                const den   = Math.sqrt(pairs.reduce((s,d)=>s+(+d[a]-meanA)**2,0)*pairs.reduce((s,d)=>s+(+d[b]-meanB)**2,0));
                const r     = den===0?0:num/den;
                const absR  = Math.abs(r);
                const strength = absR>0.6?"Strong":absR>0.35?"Moderate":"Weak";
                const direction = r>0?"Positive":"Negative";
                const color = absR>0.6?(r>0?"var(--green)":"var(--red)"):absR>0.35?"var(--amber)":"var(--muted2)";
                return(
                  <div key={label} style={{
                    display:"flex",alignItems:"center",gap:14,
                    padding:"10px 0",borderBottom:"1px solid var(--b1)",
                  }}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"var(--sans)",fontSize:12,color:"var(--text)",marginBottom:3}}>{label}</div>
                      <div style={{height:4,background:"var(--b2)",borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${absR*100}%`,height:"100%",background:color,borderRadius:2,transition:"width .6s ease"}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",minWidth:110}}>
                      <div style={{fontFamily:"var(--mono)",fontSize:13,color,fontWeight:600}}>r = {r.toFixed(2)}</div>
                      <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)"}}>{strength} {direction}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Health score over time */}
            <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,padding:18,marginBottom:14}}>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Health Score Evolution · {data.length} Days</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.map(d=>({
                  ...d,
                  score:Math.min(100,Math.round((+d.sleep/8)*30+(+d.water/3)*20+(+d.mood/10)*20+((10-(+d.stress||5))/10)*15+(+d.energy/10)*15))
                }))} margin={{top:0,right:0,bottom:0,left:-22}}>
                  <defs>
                    <linearGradient id="scoreG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={.35}/>
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(13,36,64,.9)"/>
                  <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                  <YAxis domain={[0,100]} tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={75} stroke="var(--green)" strokeDasharray="3 3" opacity={0.4}/>
                  <ReferenceLine y={50} stroke="var(--amber)" strokeDasharray="3 3" opacity={0.4}/>
                  <Area type="monotone" dataKey="score" name="Health Score" stroke="#a855f7" fill="url(#scoreG)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <PatternTimeline data={data} alerts={alerts}/>
          </div>
        )}

        {/* ════════════ LOG HEALTH ════════════ */}
        {tab==="log"&&(
          <div className="fu" style={{maxWidth:660,margin:"0 auto"}}>
            <div style={{marginBottom:20}}>
              <h1 style={{fontFamily:"var(--display)",fontSize:24,fontWeight:700,
                background:"linear-gradient(90deg,#c8dff5,#0af)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Log Today's Health
              </h1>
              <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>
                {new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                &nbsp;·&nbsp;<span style={{color:"var(--purple)"}}>Pattern engine re-runs after each log</span>
              </p>
            </div>

            {saved&&(
              <div className={`alert-in ${newAlertAnim?"shake":""}`} style={{
                background:"rgba(57,255,138,.07)",border:"1px solid rgba(57,255,138,.28)",
                borderRadius:10,padding:"12px 16px",marginBottom:16,
                color:"var(--green)",fontFamily:"var(--mono)",fontSize:12,
                display:"flex",alignItems:"center",gap:10,
              }}>
                <span>✓</span>
                <div>
                  <div>Health data logged successfully</div>
                  <div style={{fontSize:10,color:"var(--muted2)",marginTop:2}}>
                    Pattern engine re-analysed · {alerts.length} pattern{alerts.length!==1?"s":""} detected
                    {criticalCount>0&&<span style={{color:"var(--red)",marginLeft:8}}>{criticalCount} critical alert{criticalCount!==1?"s":""}</span>}
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"grid",gap:12}}>
              {/* Sleep */}
              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>🌙 Sleep Duration</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:20,color:form.sleep>=7?"var(--blue)":"var(--red)",fontWeight:500}}>{form.sleep}<span style={{fontSize:11,color:"var(--muted2)"}}>h</span></span>
                </div>
                <input type="range" min={0} max={12} step={0.5} value={form.sleep} onChange={set("sleep")}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontFamily:"var(--mono)",fontSize:9,color:form.sleep<6?"var(--red)":form.sleep<7?"var(--amber)":"var(--green)"}}>
                  <span>0h</span><span>{form.sleep<6?"⚠ Below alert threshold (6h)":form.sleep<7?"Below optimal":"✓ Optimal range"}</span><span>12h</span>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>💧 Water</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:18,color:form.water<1.5?"var(--red)":"var(--cyan)",fontWeight:500}}>{form.water}L</span>
                  </div>
                  <input type="range" min={0} max={5} step={0.25} value={form.water} onChange={set("water")}/>
                </div>
                <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>👣 Steps</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:13,color:form.activity<3000?"var(--amber)":"var(--green)",fontWeight:500}}>{(+form.activity).toLocaleString()}</span>
                  </div>
                  <input type="range" min={0} max={15000} step={250} value={form.activity} onChange={set("activity")}/>
                </div>
              </div>

              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,marginBottom:16}}>Mental & Energy — Rated 1–10</div>
                <div style={{display:"grid",gap:14}}>
                  {[
                    {k:"mood",  icon:"😊",label:"Mood",   color:"var(--green)"},
                    {k:"stress",icon:"😤",label:"Stress", color:"var(--red)"},
                    {k:"energy",icon:"⚡",label:"Energy", color:"var(--amber)"},
                  ].map(({k,icon,label,color})=>(
                    <div key={k} style={{display:"grid",gridTemplateColumns:"1fr 44px",gap:12,alignItems:"center"}}>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontSize:12,color:"var(--text)"}}>{icon} {label}</span>
                          <span style={{fontFamily:"var(--mono)",fontSize:13,color,fontWeight:600}}>{form[k]}/10</span>
                        </div>
                        <input type="range" min={1} max={10} step={1} value={form[k]} onChange={set(k)}/>
                        {k==="stress"&&form[k]>=8&&<div style={{marginTop:4,fontSize:9,color:"var(--red)",fontFamily:"var(--mono)"}}>⚠ Will trigger stress spiral pattern</div>}
                        {k==="energy"&&form[k]<=3&&<div style={{marginTop:4,fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)"}}>⚠ Low energy pattern alert threshold</div>}
                        {k==="sleep"&&form[k]<6&&<div style={{marginTop:4,fontSize:9,color:"var(--red)",fontFamily:"var(--mono)"}}>⚠ Below sleep alert threshold</div>}
                      </div>
                      <div style={{position:"relative",width:44,height:44}}>
                        <svg width={44} height={44} style={{transform:"rotate(-90deg)"}}>
                          <circle cx={22} cy={22} r={17} fill="none" stroke="var(--b2)" strokeWidth={3.5}/>
                          <circle cx={22} cy={22} r={17} fill="none" stroke={color} strokeWidth={3.5}
                            strokeDasharray={`${2*Math.PI*17*(form[k]/10)} ${2*Math.PI*17*(1-form[k]/10)}`}
                            strokeLinecap="round" style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:12,fontWeight:600,color}}>{form[k]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                  <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:10}}>🫀 Heart Rate (bpm)</label>
                  <input type="number" min={40} max={200} value={form.heartRate} onChange={set("heartRate")}/>
                  {form.heartRate>85&&<div style={{marginTop:5,fontSize:9,color:"var(--amber)",fontFamily:"var(--mono)"}}>⚠ Elevated resting HR</div>}
                </div>
                <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                  <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:10}}>⚖️ Weight (kg)</label>
                  <input type="number" min={30} max={250} step={0.1} value={form.weight} onChange={set("weight")}/>
                </div>
              </div>

              <div style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:12,padding:18}}>
                <label style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:10}}>
                  🩺 Symptoms
                  <span style={{color:"var(--muted)",textTransform:"none",letterSpacing:0,fontFamily:"var(--sans)",fontSize:11,fontWeight:400,marginLeft:6}}>comma-separated · adds to pattern detection</span>
                </label>
                <input type="text" placeholder="e.g. headache, fatigue, anxiety, nausea, back pain…" value={form.symptoms} onChange={setStr("symptoms")}/>
                <div style={{marginTop:6,fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)"}}>Tracked keywords: fatigue · headache · anxiety · nausea · muscle ache · back pain · irritability</div>
              </div>

              <button onClick={logHealth} style={{
                background:"linear-gradient(135deg,#0af 0%,#00ffe0 100%)",
                border:"none",borderRadius:10,padding:"14px",
                color:"#000",fontFamily:"var(--mono)",fontSize:13,fontWeight:700,
                cursor:"pointer",letterSpacing:1,width:"100%",
                boxShadow:"0 0 20px rgba(0,200,255,.22)",transition:"opacity .2s,transform .1s",
              }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.99)"}
                onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
                ⬡ &nbsp;LOG & RUN PATTERN DETECTION
              </button>
            </div>
          </div>
        )}

        {/* ════════════ AI INSIGHTS ════════════ */}
        {tab==="ai"&&(
          <div className="fu" style={{maxWidth:720,margin:"0 auto"}}>
            <div style={{marginBottom:18}}>
              <h1 style={{fontFamily:"var(--display)",fontSize:24,fontWeight:700,
                background:"linear-gradient(90deg,#c8dff5,#00ffe0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                AI Health Insights
              </h1>
              <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>
                Claude has access to your {data.length}-day history + {alerts.length} detected patterns · Ask anything
              </p>
            </div>

            {/* Active alerts summary */}
            {alerts.length>0&&(
              <div style={{
                background:"rgba(255,68,102,.06)",border:"1px solid rgba(255,68,102,.22)",
                borderRadius:10,padding:"12px 16px",marginBottom:14,
              }}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--red)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>
                  Patterns in context for AI
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {alerts.slice(0,5).map(a=>(
                    <span key={a.id} style={{
                      fontFamily:"var(--mono)",fontSize:10,
                      color:SEV_COLOR[a.severity],
                      background:SEV_BG[a.severity],
                      border:`1px solid ${SEV_BORDER[a.severity]}`,
                      padding:"2px 9px",borderRadius:4,
                    }}>{a.icon} {a.title}</span>
                  ))}
                </div>
              </div>
            )}

            {msgs.length===0&&(
              <div className="fu" style={{marginBottom:14}}>
                <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:2.5,marginBottom:8}}>Pattern-aware questions:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {[
                    "Explain my burnout risk alert",
                    "Why am I getting recurring headaches?",
                    "How are sleep and mood connected in my data?",
                    "What's causing my low energy pattern?",
                    "Give me a recovery plan for this week",
                    "Is my heart rate a concern?",
                    "What would improve my health score fastest?",
                    "Summarise all my health patterns",
                  ].map(q=>(
                    <button key={q} onClick={()=>{setInput(q);inputRef.current?.focus();}} style={{
                      background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,
                      padding:"7px 12px",color:"var(--muted2)",fontFamily:"var(--mono)",
                      fontSize:10,cursor:"pointer",transition:"all .2s",
                    }} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b1)";e.currentTarget.style.color="var(--muted2)";}}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:14,
              minHeight:340,maxHeight:460,overflowY:"auto",padding:18,
              marginBottom:12,display:"flex",flexDirection:"column",gap:14,
            }}>
              {msgs.length===0&&(
                <div style={{margin:"auto",textAlign:"center",padding:40}}>
                  <div style={{fontSize:42,marginBottom:12,opacity:.3,filter:"drop-shadow(0 0 14px rgba(0,200,255,.5))"}}>◎</div>
                  <div style={{fontFamily:"var(--display)",fontSize:16,fontWeight:600,color:"var(--muted2)"}}>NeuroWell AI is ready</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)",marginTop:5}}>I know about your {alerts.length} detected patterns · Ask me anything</div>
                </div>
              )}
              {msgs.map((m,i)=>(
                <div key={i} className="fu" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="assistant"&&(
                    <div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginRight:10,marginTop:1,
                      background:"linear-gradient(135deg,#0af,#00ffe0)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:800,color:"#000",
                      boxShadow:"0 0 10px rgba(0,200,255,.3)"}}>◎</div>
                  )}
                  <div style={{
                    maxWidth:"82%",
                    background:m.role==="user"?"rgba(0,170,255,0.08)":"var(--s3)",
                    border:`1px solid ${m.role==="user"?"rgba(0,170,255,.2)":"var(--b1)"}`,
                    borderRadius:m.role==="user"?"12px 3px 12px 12px":"3px 12px 12px 12px",
                    padding:"11px 15px",fontSize:13,lineHeight:1.7,
                    color:m.role==="user"?"var(--blue)":"var(--text)",
                    fontFamily:m.role==="user"?"var(--mono)":"var(--sans)",
                    whiteSpace:"pre-wrap",
                  }}>{m.content}</div>
                </div>
              ))}
              {busy&&(
                <div className="fu" style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:8,
                    background:"linear-gradient(135deg,#0af,#00ffe0)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:800,color:"#000"}}>◎</div>
                  <div style={{background:"var(--s3)",border:"1px solid var(--b1)",
                    borderRadius:"3px 12px 12px 12px",padding:"11px 16px",
                    fontFamily:"var(--mono)",fontSize:12,color:"var(--muted2)"}}>
                    <span className="pu">Analysing your patterns…</span>
                  </div>
                </div>
              )}
              <div ref={chatRef}/>
            </div>

            <div style={{display:"flex",gap:10}}>
              <input ref={inputRef} type="text"
                placeholder="Ask about your alerts, patterns, recovery plan…"
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                style={{flex:1}}/>
              <button onClick={send} disabled={busy||!input.trim()} style={{
                background:busy||!input.trim()?"var(--b1)":"linear-gradient(135deg,#0af,#00ffe0)",
                border:"none",borderRadius:9,padding:"0 22px",
                color:"#000",fontFamily:"var(--mono)",fontSize:13,fontWeight:700,
                cursor:busy||!input.trim()?"not-allowed":"pointer",
                transition:"all .2s",whiteSpace:"nowrap",flexShrink:0,
                boxShadow:busy||!input.trim()?"none":"0 0 14px rgba(0,200,255,.28)",
              }}>{busy?"…":"Send →"}</button>
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",textAlign:"center",marginTop:8}}>
              ⚠ Not a substitute for professional medical advice · Consult your doctor for health concerns
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
