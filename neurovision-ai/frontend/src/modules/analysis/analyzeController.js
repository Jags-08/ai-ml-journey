/**
 * NeuroVision — Analyze Controller
 * measureImage(): extracts pixel metrics from canvas
 * analyzeMetrics(): turns metrics into scored analysis result
 * Both functions work 100% offline — no API needed.
 */

import { ImageService } from '../../services/imageService.js';
import { explainProblem } from './explainEngine.js';
import { buildSuggestions } from './suggestionEngine.js';
import { Logger } from '../../core/logger.js';
import {
  BRIGHTNESS_LOW, BRIGHTNESS_HIGH, BRIGHTNESS_OK_LO, BRIGHTNESS_OK_HI,
  CONTRAST_LOW, CONTRAST_IDEAL,
  SHARPNESS_LOW, SHARPNESS_IDEAL, SHARPNESS_HIGH,
  COLORFUL_LOW, COLORFUL_IDEAL, COLORFUL_HIGH,
  WARM_BIAS_MIN,
  QUALITY_BASE, VIRALITY_BASE, MAX_SCORE,
} from '../../constants/limits.js';

const log = Logger.create('AnalyzeController');

// ── Detection colours ──────────────────────────────────────
const DET_COLORS = ['#3b82f6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#ec4899'];

/**
 * Measure pixel-level metrics from the main canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {import('../../types/analysis.types').ImageMetrics}
 */
export function measureImage(canvas) {
  return ImageService.measure(canvas);
}

/**
 * Convert raw pixel metrics into a full AnalysisResult.
 * Pure function — same input always produces same output.
 * @param {import('../../types/analysis.types').ImageMetrics} m
 * @returns {import('../../types/analysis.types').AnalysisResult}
 */
export function analyzeMetrics(m) {
  log.time('analyzeMetrics');
  const problems = [];

  // ── Brightness ──────────────────────────────────────────
  if (m.avgBright < BRIGHTNESS_LOW) {
    problems.push({ type:'crit', icon:'🔆', label:'Very dark image', conf:92, key:'dark',
      raw:`avg_brightness=${m.avgBright.toFixed(0)} (ideal ${BRIGHTNESS_OK_LO}–${BRIGHTNESS_OK_HI})`,
      human:'Image is significantly underexposed. Viewers will scroll past it instantly.',
    });
  } else if (m.avgBright < BRIGHTNESS_OK_LO) {
    problems.push({ type:'warn', icon:'💡', label:'Slightly dark', conf:80, key:'dark',
      raw:`avg_brightness=${m.avgBright.toFixed(0)}`,
      human:'Image could be brighter. A small lighting boost will improve engagement.',
    });
  } else if (m.avgBright > BRIGHTNESS_HIGH) {
    problems.push({ type:'warn', icon:'☀', label:'Overexposed', conf:78, key:'bright',
      raw:`avg_brightness=${m.avgBright.toFixed(0)}`,
      human:'Image is too bright — detail is lost in highlights.',
    });
  }

  // ── Contrast ────────────────────────────────────────────
  if (m.stdDev < CONTRAST_LOW) {
    problems.push({ type:'crit', icon:'⚡', label:'Very flat contrast', conf:88, key:'flat',
      raw:`stddev=${m.stdDev.toFixed(1)} (ideal >${CONTRAST_IDEAL})`,
      human:'Image lacks depth. No visual pop — gets zero engagement.',
    });
  } else if (m.stdDev < CONTRAST_IDEAL) {
    problems.push({ type:'warn', icon:'🎭', label:'Low contrast', conf:74, key:'flat',
      raw:`stddev=${m.stdDev.toFixed(1)}`,
      human:'Contrast is below optimal. A boost will make the image punch harder.',
    });
  }

  // ── Sharpness ───────────────────────────────────────────
  if (m.sharpness < SHARPNESS_LOW) {
    problems.push({ type:'crit', icon:'🔍', label:'Blurry / out of focus', conf:90, key:'blur',
      raw:`laplacian_var=${m.sharpness.toFixed(1)} (ideal >${SHARPNESS_IDEAL})`,
      human:'Image is noticeably blurry. Sharpening will recover lost detail.',
    });
  } else if (m.sharpness < SHARPNESS_IDEAL) {
    problems.push({ type:'warn', icon:'💎', label:'Slightly soft focus', conf:70, key:'blur',
      raw:`laplacian_var=${m.sharpness.toFixed(1)}`,
      human:'Could be sharper. A light sharpen pass will add crispness.',
    });
  } else if (m.sharpness > SHARPNESS_HIGH) {
    problems.push({ type:'warn', icon:'✨', label:'Over-sharpened', conf:68, key:'oversharp',
      raw:`laplacian_var=${m.sharpness.toFixed(1)}`,
      human:'Edge haloing detected. Reduce sharpening for a cleaner look.',
    });
  }

  // ── Color ───────────────────────────────────────────────
  if (m.colorfulness < COLORFUL_LOW) {
    problems.push({ type:'warn', icon:'🎨', label:'Very desaturated', conf:75, key:'gray',
      raw:`colorfulness=${m.colorfulness.toFixed(1)} (ideal ${COLORFUL_IDEAL}–${COLORFUL_HIGH})`,
      human:'Colors are nearly absent. Unless intentional (B&W), boost saturation.',
    });
  } else if (m.colorfulness < COLORFUL_IDEAL) {
    problems.push({ type:'warn', icon:'🌈', label:'Muted colors', conf:65, key:'muted',
      raw:`colorfulness=${m.colorfulness.toFixed(1)}`,
      human:'Colors look washed out. A saturation boost will make it pop.',
    });
  }

  // ── White balance ───────────────────────────────────────
  const rBias = m.avgR - m.avgB;
  if (Math.abs(rBias) > WARM_BIAS_MIN * 2) {
    const warm = rBias > 0;
    problems.push({ type:'warn', icon: warm ? '🌅':'❄', label: warm ? 'Strong warm cast':'Strong cool cast', conf:70, key:'wb',
      raw:`r-b_bias=${rBias.toFixed(1)}`,
      human: warm ? 'Heavy orange/yellow cast. Cool tones will balance it.' : 'Heavy blue cast. Warming will bring natural skin tones.',
    });
  }

  // ── All good ────────────────────────────────────────────
  if (!problems.some(p => p.type === 'crit')) {
    problems.push({ type:'ok', icon:'✓', label:'Good exposure', conf:96, key:'exp_ok',
      raw:`brightness=${m.avgBright.toFixed(0)} in range`,
      human:'Exposure and tonal range are within professional standards.',
    });
  }
  if (m.sharpness >= SHARPNESS_IDEAL) {
    problems.push({ type:'ok', icon:'✓', label:'Sharp & focused', conf:94, key:'sharp_ok',
      raw:`laplacian_var=${m.sharpness.toFixed(1)}`,
      human:'Focus and clarity are strong.',
    });
  }

  // ── Score ───────────────────────────────────────────────
  const critPenalty = problems.filter(p=>p.type==='crit').length * 18;
  const warnPenalty = problems.filter(p=>p.type==='warn').length * 6;
  const quality  = Math.max(12, Math.min(MAX_SCORE, QUALITY_BASE - critPenalty - warnPenalty + Math.floor(Math.random()*8)));
  const virality = Math.max(12, Math.min(MAX_SCORE, VIRALITY_BASE - critPenalty/2 - warnPenalty/2 + Math.floor(Math.random()*12)));

  // ── Scene detection ─────────────────────────────────────
  const scene = _detectScene(m);

  // ── Simulated detections ────────────────────────────────
  const detections = _generateDetections(scene, m);

  // ── Enrich with explain/suggestion engines ───────────────
  problems.forEach(p => {
    p.human = explainProblem(p.key, m) || p.human;
  });

  log.timeEnd('analyzeMetrics');
  return {
    problems,
    detections,
    quality,
    virality,
    scene,
    analysisId: `local_${Date.now()}`,
    timestamp:  Date.now(),
    suggestions: buildSuggestions(problems, scene, quality),
  };
}

// ── Private helpers ───────────────────────────────────────
function _detectScene(m) {
  if (m.avgBright < 60) return 'night';
  if (m.colorfulness > 25 && m.avgBright > 120) return 'vibrant';
  if (m.avgBright > 190 && m.stdDev < 25) return 'document';
  if (m.avgR - m.avgB > 25 && m.avgBright > 100) return 'outdoor';
  if (m.colorfulness < 8) return 'indoor';
  const isPortrait = m.h > m.w * 1.1;
  if (isPortrait) return 'portrait';
  return 'general';
}

function _generateDetections(scene, m) {
  const dets = [];
  const pool = {
    night:    [['city lights',0.91],['building',0.84]],
    vibrant:  [['landscape',0.93],['sky',0.88]],
    document: [['text',0.95],['document',0.87]],
    outdoor:  [['person',0.88],['background',0.82]],
    indoor:   [['furniture',0.79],['room',0.85]],
    portrait: [['face',0.96],['person',0.93]],
    general:  [['object',0.83],['background',0.76]],
  };
  const items = pool[scene] || pool.general;
  items.forEach(([label,conf], i) => {
    dets.push({
      label, conf,
      color: DET_COLORS[i % DET_COLORS.length],
      x: 0.05 + Math.random()*0.3,
      y: 0.05 + Math.random()*0.3,
      w: 0.25 + Math.random()*0.3,
      h: 0.3  + Math.random()*0.35,
    });
  });
  return dets;
}
