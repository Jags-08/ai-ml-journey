/**
 * NeuroVision — Suggestion Engine
 * Builds a prioritized, actionable suggestion list from analysis results.
 * Used by the Decision Engine and Results Panel.
 *
 * Usage:
 *   import { buildSuggestions } from '@/modules/analysis/suggestionEngine.js';
 *   const tips = buildSuggestions(problems, scene, quality);
 */

/**
 * @param {import('../../types/analysis.types').Problem[]} problems
 * @param {import('../../types/analysis.types').SceneType} scene
 * @param {number} quality
 * @returns {Array<{ icon: string, text: string, action: string }>}
 */
export function buildSuggestions(problems, scene, quality) {
  const suggestions = [];
  const crits = problems.filter(p => p.type === 'crit');
  const warns = problems.filter(p => p.type === 'warn');

  // Critical fixes first
  crits.forEach(p => {
    const fix = FIXES[p.key];
    if (fix) suggestions.push({ icon: p.icon, text: fix.text, action: fix.action, priority: 10 });
  });

  // Warning fixes
  warns.forEach(p => {
    const fix = FIXES[p.key];
    if (fix) suggestions.push({ icon: p.icon, text: fix.text, action: fix.action, priority: 6 });
  });

  // Scene-based tips
  const sceneTip = SCENE_TIPS[scene];
  if (sceneTip) suggestions.push({ ...sceneTip, priority: 4 });

  // Quality-based global tip
  if (quality >= 80) {
    suggestions.push({ icon:'🏆', text:'Quality is strong — apply Vivid for extra social impact.', action:'vivid', priority: 3 });
  } else if (quality < 50) {
    suggestions.push({ icon:'⚡', text:'Multiple issues detected. Auto Fix handles them all in one click.', action:'autofix', priority: 9 });
  }

  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map(({ icon, text, action }) => ({ icon, text, action }));
}

const FIXES = {
  dark:      { text: 'Brightness is low — apply Enhance to lift exposure.', action: 'enhance' },
  bright:    { text: 'Image is overexposed — Matte filter softens highlights.', action: 'matte' },
  blur:      { text: 'Blurry — use DIP Sharpen to recover edge detail.', action: 'sharpen' },
  oversharp: { text: 'Over-sharpened — Cinematic filter will smooth halos.', action: 'cinematic' },
  flat:      { text: 'Flat contrast — Enhance or Cinematic adds depth.', action: 'enhance' },
  muted:     { text: 'Muted colors — Vivid filter will restore vibrancy.', action: 'vivid' },
  gray:      { text: 'Desaturated — Vivid for color, or B&W for clean mono.', action: 'vivid' },
  wb:        { text: 'Color cast detected — Enhance will auto-balance tones.', action: 'enhance' },
};

const SCENE_TIPS = {
  night:    { icon:'🌙', text:'Night scene: try Vivid to recover shadow color.', action:'vivid' },
  vibrant:  { icon:'🌈', text:'Vibrant scene: Cinematic adds professional grade.', action:'cinematic' },
  document: { icon:'📄', text:'Document: Enhance boosts text contrast + clarity.', action:'enhance' },
  outdoor:  { icon:'🌿', text:'Outdoor: Warm filter adds golden-hour feel.', action:'warm' },
  portrait: { icon:'🙂', text:'Portrait: Warm tones + soft contrast is universally flattering.', action:'warm' },
  indoor:   { icon:'🏠', text:'Indoor: Enhance corrects artificial lighting tones.', action:'enhance' },
};
