/**
 * NeuroVision — Context Engine
 * Builds and maintains a rich context object about the current
 * image, user intent, and session. Feeds into the AI chat and
 * decision engine so they always have full situational awareness.
 *
 * Usage:
 *   import { ContextEngine } from '@/system/contextEngine.js';
 *   const ctx = ContextEngine.build();
 *   // ctx = { quality, scene, goal, problems, userIntent, platform, ... }
 */

import { getState } from '../core/state.js';
import { GOAL_CONFIG } from '../constants/goals.js';
import { QUALITY_GOOD, QUALITY_GREAT } from '../constants/limits.js';

export const ContextEngine = {
  /**
   * Build the full context snapshot for AI/chat consumption.
   * @returns {Object}
   */
  build() {
    const state = getState();
    const { analysis, metrics, goal, plan, usedToday, limitFree, isOnline } = state;

    const goalCfg = GOAL_CONFIG[goal] || {};
    const q = analysis?.quality ?? null;
    const platform = this._detectPlatform();

    return {
      // ── Image context ──
      hasImage:     Boolean(state.origURL),
      hasEnhanced:  Boolean(state.enhancedURL),
      quality:      q,
      qualityLabel: q == null ? null : q >= QUALITY_GREAT ? 'great' : q >= QUALITY_GOOD ? 'good' : 'poor',
      scene:        analysis?.scene ?? null,
      detections:   analysis?.detections?.map(d => d.label) ?? [],
      problems:     analysis?.problems?.map(p => ({ type: p.type, label: p.label, key: p.key })) ?? [],
      critCount:    analysis?.problems?.filter(p => p.type === 'crit').length ?? 0,
      warnCount:    analysis?.problems?.filter(p => p.type === 'warn').length ?? 0,

      // ── User intent ──
      goal,
      goalLabel:    goalCfg.label ?? 'General',
      goalInsight:  goalCfg.insight ?? '',
      goalTips:     goalCfg.tips ?? [],

      // ── Session ──
      plan,
      isPro:        plan !== 'free',
      usageRemaining: Math.max(0, limitFree - usedToday),
      isOnline,

      // ── Environment ──
      platform,
      isMobile:     platform === 'mobile',
      viewport:     { w: window.innerWidth, h: window.innerHeight },

      // ── Metrics (technical, for AI context) ──
      metrics: metrics ? {
        brightness:   Math.round(metrics.avgBright),
        contrast:     Math.round(metrics.stdDev),
        colorfulness: Math.round(metrics.colorfulness),
        sharpness:    Math.round(metrics.sharpness),
        resolution:   metrics.w && metrics.h ? `${metrics.w}×${metrics.h}` : null,
      } : null,
    };
  },

  /**
   * Build a short summary string for API chat context (lightweight).
   * @returns {Object}
   */
  compact() {
    const ctx = this.build();
    return {
      quality: ctx.quality,
      scene:   ctx.scene,
      goal:    ctx.goal,
      plan:    ctx.plan,
      problems: ctx.problems.map(p => p.key).join(','),
    };
  },

  /**
   * Detect platform type based on UA + screen.
   * @returns {'mobile'|'tablet'|'desktop'}
   * @private
   */
  _detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(ua)) return 'mobile';
    if (/ipad|tablet/.test(ua) || window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  },

  /**
   * Infer what the user is most likely trying to accomplish
   * based on their goal, session, and image state.
   * @returns {string} intent description
   */
  inferIntent() {
    const state = getState();
    if (!state.origURL) return 'upload_image';
    if (!state.analysis) return 'analyze_image';
    if (!state.enhancedURL && state.analysis.quality < QUALITY_GOOD) return 'improve_quality';
    if (state.enhancedURL && !state.compareMode) return 'compare_results';
    if (state.enhancedURL) return 'export_image';
    return 'explore_features';
  },
};

export default ContextEngine;
