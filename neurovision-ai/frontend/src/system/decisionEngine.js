/**
 * NeuroVision — Decision Engine
 * Analyzes current app state and proactively suggests next actions.
 * This is what gives the app a "thinking" quality — it anticipates
 * what the user should do next without them asking.
 *
 * Usage:
 *   import { DecisionEngine } from '@/system/decisionEngine.js';
 *   const suggestions = DecisionEngine.nextSteps();
 *   const nudge = DecisionEngine.conversionNudge();
 */

import { getState } from '../core/state.js';
import { GOAL_CONFIG } from '../constants/goals.js';
import { QUALITY_GOOD, QUALITY_GREAT } from '../constants/limits.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('DecisionEngine');

export const DecisionEngine = {
  /**
   * Returns an ordered list of suggested next actions based on state.
   * @returns {Array<{ priority: number, icon: string, action: string, reason: string, key: string }>}
   */
  nextSteps() {
    const state = getState();
    const { analysis, metrics, goal, plan } = state;
    const suggestions = [];

    if (!state.origURL) {
      suggestions.push({
        priority: 10, icon: '📤', key: 'upload',
        action: 'Upload an image to get started',
        reason: 'Drop any JPG, PNG, or WebP — we analyze it in seconds',
      });
      return suggestions;
    }

    if (!analysis) {
      suggestions.push({
        priority: 10, icon: '🔍', key: 'analyze',
        action: 'Run AI analysis',
        reason: 'Get your quality score and issue breakdown',
      });
      return suggestions;
    }

    const q = analysis.quality;
    const goalCfg = GOAL_CONFIG[goal];

    // Auto fix if quality is low
    if (q < QUALITY_GOOD && !state.enhancedURL) {
      suggestions.push({
        priority: 9, icon: '⚡', key: 'autofix',
        action: 'Auto Fix Everything',
        reason: `Quality is ${q}/100 — Auto Fix can push it to 88+`,
      });
    }

    // Critical issues
    const crits = analysis.problems.filter(p => p.type === 'crit');
    crits.forEach(p => {
      suggestions.push({
        priority: 8, icon: p.icon, key: `fix_${p.key}`,
        action: `Fix: ${p.label}`,
        reason: p.human,
      });
    });

    // Goal-specific suggestion
    if (goalCfg?.filterPref && !state.enhancedURL) {
      suggestions.push({
        priority: 7, icon: '🎯', key: `goal_filter`,
        action: `Apply ${goalCfg.label} filter (${goalCfg.filterPref})`,
        reason: goalCfg.insight,
      });
    }

    // Compare if enhanced
    if (state.enhancedURL && !state.compareMode) {
      suggestions.push({
        priority: 6, icon: '⇄', key: 'compare',
        action: 'Compare Before vs After',
        reason: `Quality improved from ${state.qualBefore} → ${q}`,
      });
    }

    // Export if enhanced
    if (state.enhancedURL) {
      suggestions.push({
        priority: 5, icon: '📤', key: 'export',
        action: 'Export enhanced image',
        reason: 'Save the improved version to your device',
      });
    }

    // Upsell batch if free
    if (plan === 'free' && q >= QUALITY_GOOD) {
      suggestions.push({
        priority: 4, icon: '📦', key: 'batch',
        action: 'Process multiple images at once',
        reason: 'Upgrade to Pro for batch processing — save hours',
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  },

  /**
   * Returns a conversion nudge if conditions warrant showing one.
   * @returns {{ show: boolean, title: string, desc: string } | null}
   */
  conversionNudge() {
    const state = getState();
    if (state.plan !== 'free') return null;
    if (!state.analysis) return null;

    const improvement = state.analysis.quality - state.qualBefore;

    if (improvement >= 10) {
      return {
        show: true,
        title: '🔥 Unlock 4× better results',
        desc: `Your image improved by +${improvement} pts. Pro AI can push quality to 97+ and optimize for all platforms simultaneously.`,
      };
    }

    if (state.usedToday >= state.limitFree - 1) {
      return {
        show: true,
        title: '⚡ Almost at your daily limit',
        desc: `${state.limitFree - state.usedToday} free analysis remaining today. Pro gives you unlimited.`,
      };
    }

    return null;
  },

  /**
   * Suggests the best filter for the current image + goal combination.
   * @returns {string} filter name
   */
  recommendFilter() {
    const { metrics, goal, analysis } = getState();
    if (!metrics) return 'enhance';

    const goalCfg = GOAL_CONFIG[goal];
    if (goalCfg?.filterPref) return goalCfg.filterPref;

    // Fallback: pick based on metrics
    if (metrics.avgBright < 80) return 'enhance';
    if (metrics.colorfulness < 10) return 'vivid';
    if (analysis?.scene === 'portrait' || analysis?.scene === 'night') return 'warm';
    return 'cinematic';
  },

  /**
   * Generates an auto-greeting message for the AI chat.
   * @returns {string}
   */
  chatGreeting() {
    const { analysis } = getState();
    if (!analysis) return 'Upload an image and I\'ll analyze it for you instantly.';

    const q = analysis.quality;
    const topProblem = analysis.problems.find(p => p.type === 'crit') || analysis.problems[0];
    const goal = getState().goal;
    const goalCfg = GOAL_CONFIG[goal];

    if (q >= QUALITY_GREAT) {
      return `Your image is looking strong — ${q}/100! I've optimized it for ${goalCfg?.label || 'general'} use. What else would you like to tweak?`;
    }
    return `Analyzed! Quality score: ${q}/100. Top issue: ${topProblem?.label || 'needs improvement'}. ${topProblem?.human || ''} Want me to fix it automatically?`;
  },
};

export default DecisionEngine;
