/**
 * chat.js — Chat logic: context builder + fallback responses.
 * Rule: No DOM, no state mutations, returns strings only.
 */

import { humanizeDetections } from './detection.js';
import { humanizeEmotions }   from './emotion.js';

/**
 * Build a rich system prompt from current analysis results.
 * Injected into every LM Studio request.
 *
 * @param {Object} state  - AppState snapshot
 * @returns {string}
 */
export function buildSystemPrompt(state) {
  const { detections, emotions, imageName, imageWidth, imageHeight } = state;

  const { summary: detSummary, groups, keyFinding } = humanizeDetections(detections);
  const { headline: emoHeadline } = humanizeEmotions(emotions);

  const objectList = groups.map(g =>
    `  - ${g.count > 1 ? g.count + 'x ' : ''}${g.label} (${Math.round(g.maxConf * 100)}% confidence)`
  ).join('\n');

  const faceList = emotions.map(e =>
    `  - Face ${e.faceId}: dominant=${e.dominant} (${Math.round((e.scores[e.dominant]||0)*100)}%)`
  ).join('\n');

  return `You are NeuroVision Vision AI — an expert in computer vision, image analysis, and photo enhancement.

CURRENT IMAGE CONTEXT:
  Filename : "${imageName || 'unknown'}"
  Size     : ${imageWidth}×${imageHeight}px
  Objects  : ${detSummary}
${objectList ? objectList : '  (none)'}

EMOTION ANALYSIS:
  ${emoHeadline}
${faceList ? faceList : '  No faces detected.'}

KEY FINDING: ${keyFinding || 'N/A'}

INSTRUCTIONS:
- Answer questions specifically about this image and its analysis.
- Be insightful, concise, and actionable. No fluff.
- When suggesting improvements, reference actual detected elements.
- Current date: ${new Date().toLocaleDateString()}.`;
}

/**
 * Generate a smart fallback response when LM Studio is unavailable.
 * Produces context-aware answers from analysis data.
 *
 * @param {string} message  - user's message
 * @param {Object} state    - AppState snapshot
 * @returns {string}
 */
export function getFallbackResponse(message, state) {
  const msg = message.toLowerCase();
  const { detections, emotions, imageName } = state;

  const { summary: detSummary, groups, keyFinding } = humanizeDetections(detections);
  const { headline: emoHeadline } = humanizeEmotions(emotions);

  const labels = detections.map(d => d.label);
  const hasPersons = labels.includes('person');
  const hasCars    = labels.some(l => ['car','truck','bus'].includes(l));

  // Explain / describe
  if (/explain|describe|see|what.*image|what.*here|what.*happening|scene/.test(msg)) {
    const env = hasCars   ? 'an outdoor urban environment'
              : hasPersons ? 'a people-focused scene'
              : 'a general scene';
    const emo = emotions.length ? ` The mood reads as ${emotions[0].dominant.toLowerCase()}.` : '';
    return `${detSummary} This looks like ${env}.${emo} ${keyFinding || ''}`.trim();
  }

  // Improve / enhance
  if (/improv|enhanc|better|fix|quality/.test(msg)) {
    const tips = ['✨ Try "Auto-enhance" for a balanced boost.'];
    if (hasCars || labels.includes('tree')) tips.push('☀️ "Brighter" can help with outdoor/shadow exposure.');
    if (hasPersons) tips.push('🙈 "Blur faces" protects privacy if sharing publicly.');
    tips.push('🎬 "Cinematic" applies a film-grade colour grade for a polished look.');
    return tips.join('\n');
  }

  // Emotions / faces
  if (/emotion|face|feel|mood|express/.test(msg)) {
    if (!emotions.length) return 'No faces were detected in this image, so emotion analysis was not possible. Try an image with clearly visible faces.';
    const detail = emotions.map(e => {
      const top2 = Object.entries(e.scores).slice(0, 2);
      return `Face ${e.faceId}: ${top2.map(([k,v]) => `${k} ${Math.round(v*100)}%`).join(', ')}`;
    }).join('. ');
    return `${emoHeadline} ${detail}.`;
  }

  // Objects
  if (/object|detect|find|identif/.test(msg)) {
    return detections.length
      ? `Detected ${detections.length} object${detections.length > 1 ? 's' : ''}: ${groups.map(g => `${g.count > 1 ? g.count + 'x ' : ''}${g.label} (${Math.round(g.maxConf*100)}%)`).join(', ')}.`
      : 'No objects were confidently detected. The image may lack clear subjects or sufficient contrast.';
  }

  // Default
  return `I have full context of your image "${imageName}". ${detSummary} For richer analysis, connect LM Studio on port 1234 in config.js.`;
}
