/**
 * NeuroVision — Analysis Tests
 * Unit tests for the rule-based analysis engine.
 */

import { analyzeMetrics } from '../modules/analysis/analyzeController.js';

// ── Helpers ───────────────────────────────────────────────
const baseMetrics = (overrides = {}) => ({
  avgBright: 128, stdDev: 50, colorfulness: 18,
  sharpness: 20, avgR: 130, avgG: 125, avgB: 115,
  w: 1920, h: 1080,
  ...overrides,
});

// ── analyzeMetrics ─────────────────────────────────────────
describe('analyzeMetrics', () => {
  test('returns required shape', () => {
    const result = analyzeMetrics(baseMetrics());
    expect(result).toHaveProperty('problems');
    expect(result).toHaveProperty('quality');
    expect(result).toHaveProperty('virality');
    expect(result).toHaveProperty('scene');
    expect(result).toHaveProperty('detections');
    expect(result).toHaveProperty('analysisId');
    expect(Array.isArray(result.problems)).toBe(true);
  });

  test('scores in valid range', () => {
    const result = analyzeMetrics(baseMetrics());
    expect(result.quality).toBeGreaterThanOrEqual(12);
    expect(result.quality).toBeLessThanOrEqual(97);
    expect(result.virality).toBeGreaterThanOrEqual(12);
    expect(result.virality).toBeLessThanOrEqual(97);
  });

  test('dark image produces crit problem', () => {
    const result = analyzeMetrics(baseMetrics({ avgBright: 30 }));
    const crits = result.problems.filter(p => p.type === 'crit');
    expect(crits.length).toBeGreaterThan(0);
    expect(crits.some(p => p.key === 'dark')).toBe(true);
  });

  test('low contrast produces problem', () => {
    const result = analyzeMetrics(baseMetrics({ stdDev: 15 }));
    expect(result.problems.some(p => p.key === 'flat')).toBe(true);
  });

  test('blurry image produces blur problem', () => {
    const result = analyzeMetrics(baseMetrics({ sharpness: 3 }));
    expect(result.problems.some(p => p.key === 'blur')).toBe(true);
  });

  test('good image has fewer crits', () => {
    const result = analyzeMetrics(baseMetrics({
      avgBright: 140, stdDev: 55, sharpness: 22, colorfulness: 20,
    }));
    const crits = result.problems.filter(p => p.type === 'crit');
    expect(crits.length).toBe(0);
  });

  test('dark image quality lower than good image', () => {
    const dark = analyzeMetrics(baseMetrics({ avgBright: 25, stdDev: 12, sharpness: 3 }));
    const good = analyzeMetrics(baseMetrics({ avgBright: 145, stdDev: 60, sharpness: 22 }));
    expect(dark.quality).toBeLessThan(good.quality);
  });

  test('night scene detected for very dark image', () => {
    const result = analyzeMetrics(baseMetrics({ avgBright: 30 }));
    expect(result.scene).toBe('night');
  });
});
