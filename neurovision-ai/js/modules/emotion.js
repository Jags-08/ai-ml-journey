/**
 * emotion.js — Emotion analysis logic.
 * Rule: No DOM, no state, no UI.
 */

import { seededRng, hashStr } from '../utils.js';

const EMOTIONS = ['Happy', 'Neutral', 'Surprised', 'Focused', 'Calm', 'Uncertain', 'Sad'];

const EMOTION_DESCRIPTIONS = {
  Happy:     'showing positive emotion — likely comfortable or pleased',
  Neutral:   'composed and attentive — may be focused or in a professional context',
  Surprised: 'expressing surprise or heightened alertness',
  Focused:   'deeply concentrated — engaged with something in the scene',
  Calm:      'relaxed and at ease in the environment',
  Uncertain: 'showing signs of hesitancy or mild concern',
  Sad:       'displaying low affect — may be experiencing difficulty',
};

/**
 * Simulate face + emotion detection.
 * Only runs if people are detected.
 *
 * @param {Array}            detections  - from runDetection()
 * @param {HTMLImageElement} image
 * @param {string}           imageName
 * @returns {Array<EmotionResult>}
 */
export function runEmotionAnalysis(detections, image, imageName = '') {
  const people = detections.filter(d => d.label === 'person');
  if (!people.length) return [];

  const seed = hashStr('emo' + imageName + image.naturalWidth);
  const rng  = seededRng(seed + 7);

  return people.map((person, idx) => {
    // Dominant emotion
    const dominant = EMOTIONS[Math.floor(rng() * EMOTIONS.length)];

    // Build score distribution
    const scores = {};
    let remaining = 1;
    EMOTIONS.forEach((emo, i) => {
      if (emo === dominant) return;
      const share = rng() * 0.3 * remaining;
      scores[emo] = share;
      remaining -= share;
    });
    scores[dominant] = remaining;

    // Normalize so all sum to 1
    const total = Object.values(scores).reduce((s, v) => s + v, 0);
    Object.keys(scores).forEach(k => scores[k] = scores[k] / total);

    // Sort for display
    const sorted = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4); // top 4 emotions

    return {
      faceId:   idx + 1,
      dominant,
      scores: Object.fromEntries(sorted),
      bbox:   person.bbox,
    };
  });
}

/**
 * Convert emotion results to natural language.
 * @param {Array} emotions
 * @returns {{ summary: string, headline: string }}
 */
export function humanizeEmotions(emotions) {
  if (!emotions.length) {
    return {
      summary:  null,
      headline: 'No faces detected in this image.',
    };
  }

  const dominants  = emotions.map(e => e.dominant);
  const counts     = {};
  dominants.forEach(d => { counts[d] = (counts[d] || 0) + 1; });

  const topEmo   = Object.entries(counts).sort(([,a],[,b]) => b - a)[0][0];
  const faceWord = emotions.length === 1 ? 'person' : `${emotions.length} people`;
  const desc     = EMOTION_DESCRIPTIONS[topEmo] || topEmo.toLowerCase();

  const headline = emotions.length === 1
    ? `The person appears ${topEmo.toLowerCase()} — ${desc}.`
    : `${faceWord} detected. Predominant mood: ${topEmo.toLowerCase()}.`;

  const summary = emotions.length === 1
    ? `1 face detected. Dominant emotion: **${topEmo}**.`
    : `${emotions.length} faces detected. ${Object.entries(counts)
        .sort(([,a],[,b]) => b - a)
        .map(([emo, cnt]) => `${cnt === 1 ? 'one' : cnt} ${emo.toLowerCase()}`)
        .join(', ')}.`;

  return { summary, headline };
}

export { EMOTION_DESCRIPTIONS };
