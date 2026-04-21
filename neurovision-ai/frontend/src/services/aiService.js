/**
 * NeuroVision — AI Service
 * Clean abstraction over the API layer.
 * Implements local fallback when API is offline.
 * Swap backend providers here without touching any UI code.
 *
 * Usage:
 *   import { AIService } from '@/services/aiService.js';
 *   const result = await AIService.analyze(dataURL, goal);
 *   const reply  = await AIService.chat(message, context);
 */

import { API } from '../core/api.js';
import { getState } from '../core/state.js';
import { Logger } from '../core/logger.js';
import { ErrorHandler } from '../core/errorHandler.js';
import { analyzeMetrics } from '../modules/analysis/analyzeController.js';
import { DecisionEngine } from '../system/decisionEngine.js';
import { ActionEngine } from '../system/actionEngine.js';
import { GOAL_CONFIG } from '../constants/goals.js';
import {
  CHAT_REPLY_MIN_MS,
  CHAT_REPLY_MAX_MS,
} from '../constants/limits.js';

const log = Logger.create('AIService');

// ── Smart local chat reply builder ───────────────────────
function buildLocalReply(msg, context) {
  const lower = msg.toLowerCase();
  const { analysis, goal } = getState();
  const q = analysis?.quality ?? 55;
  const goalCfg = GOAL_CONFIG[goal] ?? {};

  // Check for actionable command first
  const matched = ActionEngine.match(lower);
  if (matched) {
    return {
      text:   `Got it — applying <strong>${matched.label}</strong> to your image now.`,
      action: { key: matched.key, label: matched.label },
    };
  }

  // Platform-specific advice
  if (lower.includes('instagram') || lower.includes('insta')) {
    return { text: `For Instagram: vivid colors and warm tones drive saves. Your quality is ${q}/100. ${q < 70 ? 'Try Auto Fix, then Vivid.' : 'Try Vivid filter for extra pop.'}`, action: { key:'vivid', label:'🌈 Apply Vivid' } };
  }
  if (lower.includes('linkedin')) {
    return { text: `For LinkedIn: professional, clean tone matters. ${q < 65 ? 'Recommend Cinematic filter.' : 'Image is LinkedIn-ready. Cinematic adds a polished finish.'}`, action: { key:'cinematic', label:'🎬 Cinematic' } };
  }
  if (lower.includes('shopify') || lower.includes('product') || lower.includes('ecommerce') || lower.includes('sell')) {
    return { text: `For e-commerce: sharp, accurately colored images reduce returns. ${q < 70 ? 'Auto Fix recommended.' : 'Strong product shot — Enhance adds clarity.'}`, action: { key:'enhance', label:'⚡ Enhance' } };
  }

  // Problem questions
  if (lower.includes('why') || lower.includes('problem') || lower.includes('wrong') || lower.includes('bad')) {
    if (!analysis) return { text: 'Upload an image first and I\'ll tell you exactly what\'s wrong with it.' };
    const probs = analysis.problems.filter(p => p.type !== 'ok');
    if (!probs.length) return { text: `Your image looks solid (quality: ${q}/100). Auto Fix will add a final polish.` };
    return { text: `Main issue: <strong>${probs[0].label}</strong>. ${probs[0].human}`, action: { key:'fix everything', label:'⚡ Fix Now' } };
  }

  // Score questions
  if (lower.includes('score') || lower.includes('quality') || lower.includes('how good')) {
    if (!analysis) return { text: 'Upload an image and I\'ll give you a detailed quality breakdown.' };
    return { text: `Visual Quality: ${q}/100 | Viral Potential: ${analysis.virality}/100. ${q < 70 ? 'Auto Fix can push it to 88+.' : 'Strong scores! Enhancement adds polish.'}` };
  }

  // Improvement suggestions
  if (lower.includes('improve') || lower.includes('better') || lower.includes('help')) {
    if (!analysis) return { text: 'Drop your image in the upload zone and I\'ll tell you exactly how to improve it.' };
    const next = DecisionEngine.nextSteps().slice(0, 3);
    const steps = next.map((s, i) => `${i+1}) ${s.action}`).join(', ');
    return { text: `Top suggestions: ${steps}`, action: { key:'fix everything', label:'⚡ Fix All' } };
  }

  // Default
  if (!analysis) return { text: 'I\'m ready! Drop an image in the upload area above, then ask me anything about it.' };
  return {
    text: `Your ${analysis.scene} image has quality ${q}/100 with ${analysis.detections.length} detected elements. ${goalCfg.insight || ''} What would you like to improve?`,
    action: q < 70 ? { key:'fix everything', label:'⚡ Auto Fix' } : null,
  };
}

// ── AI Service ────────────────────────────────────────────
export const AIService = {
  /**
   * Analyze an image: tries real API, falls back to local rule-based engine.
   * @param {string} dataURL
   * @param {string} goal
   * @returns {Promise<import('../types/analysis.types').AnalysisResult>}
   */
  async analyze(dataURL, goal) {
    if (getState().apiOnline) {
      const { result, error } = await ErrorHandler.safeRun(
        () => API.analyze(dataURL, goal),
        'AIService.analyze'
      );
      if (result?.ok && result.data?.result) {
        log.info('Analysis from API');
        return result.data.result;
      }
      log.warn('API analyze failed, falling back to local');
    }
    // Local fallback: measure + rule-based analysis
    // (canvas draw happens in Orchestrator before this is called)
    return null; // Orchestrator uses measureImage + analyzeMetrics directly
  },

  /**
   * Chat: tries real API, falls back to smart local replies.
   * @param {string} message
   * @param {Object} context
   * @returns {Promise<{ text: string, action?: { key: string, label: string } }>}
   */
  async chat(message, context = {}) {
    if (getState().apiOnline) {
      const { result } = await ErrorHandler.safeRun(
        () => API.chat(message, context),
        'AIService.chat'
      );
      if (result?.ok && result.data?.reply) {
        log.debug('Chat reply from API');
        return { text: result.data.reply, action: result.data.action || null };
      }
    }

    // Simulate thinking delay
    const delay = CHAT_REPLY_MIN_MS + Math.random() * (CHAT_REPLY_MAX_MS - CHAT_REPLY_MIN_MS);
    await new Promise(r => setTimeout(r, delay));
    log.debug('Chat reply from local engine');
    return buildLocalReply(message, context);
  },
};

export default AIService;
