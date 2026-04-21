/**
 * NeuroVision — Explain Engine
 * Generates context-aware, human-friendly problem explanations.
 * Richer than static strings — adapts based on metric severity.
 *
 * Usage:
 *   import { explainProblem } from '@/modules/analysis/explainEngine.js';
 *   const text = explainProblem('dark', metrics);
 */

/**
 * @param {string} key - Problem key (dark, blur, flat, muted, etc.)
 * @param {import('../../types/analysis.types').ImageMetrics} m
 * @returns {string}
 */
export function explainProblem(key, m) {
  const b = m?.avgBright ?? 128;
  const s = m?.sharpness ?? 15;
  const c = m?.colorfulness ?? 15;
  const sd = m?.stdDev ?? 40;

  const explanations = {
    dark: b < 50
      ? `Your image has a brightness of ${b.toFixed(0)}/255 — that's very dark. Viewers scrolling on a bright phone screen will skip this instantly. A +30–40 brightness boost will bring it into the professional range.`
      : `Brightness is ${b.toFixed(0)}/255, slightly below the 80–200 sweet spot. A small lift (∼+20) will increase perceived quality significantly.`,

    bright: `Brightness is ${b.toFixed(0)}/255 — clipping highlights. Reduce exposure slightly to recover blown-out detail in the bright areas.`,

    blur: s < 6
      ? `Laplacian variance is ${s.toFixed(1)} — the image is significantly out of focus. Our sharpen kernel will recover moderate blur, but very soft images may need a retake.`
      : `Sharpness score: ${s.toFixed(1)}. Slightly soft — a single sharpen pass at strength 2 will add visible crispness without introducing halo artifacts.`,

    oversharp: `Sharpness score is ${s.toFixed(1)} — edge ringing detected. The image has already been over-sharpened. Reduce USM to 0.5/1.0 radius.`,

    flat: sd < 20
      ? `Standard deviation: ${sd.toFixed(1)} — image is almost entirely grey. Dramatically flat with no tonal range. Contrast enhancement is critical.`
      : `Standard deviation: ${sd.toFixed(1)}. Contrast is below the ideal >45 threshold. A contrast lift will add depth and drama.`,

    muted: c < 8
      ? `Colorfulness index: ${c.toFixed(1)} — almost monochromatic. Consider a saturation boost of +30–40% for general use, or leave as-is for intentional B&W.`
      : `Colorfulness: ${c.toFixed(1)}. Colors look washed out. A +20% saturation boost will make the image pop on social feeds.`,

    gray: `Colorfulness index: ${c.toFixed(1)} — very close to greyscale. If this is intentional, apply the B&W filter for a clean look. Otherwise, add saturation.`,

    wb: `White balance bias detected (R−B = ${((m?.avgR??128)-(m?.avgB??128)).toFixed(0)}). Color cast is affecting perceived naturalness. Auto white-balance will neutralise this.`,

    exp_ok:   'Exposure is well within the professional range. No clipping in highlights or shadows.',
    sharp_ok: `Sharpness score: ${s.toFixed(1)} — crisp and focused. No sharpening required.`,
  };

  return explanations[key] || '';
}

export default explainProblem;
