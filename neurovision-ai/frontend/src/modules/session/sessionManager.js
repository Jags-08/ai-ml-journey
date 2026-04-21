/**
 * NeuroVision — Session Manager
 * Manages plan upgrades, usage counting, and session lifecycle.
 *
 * Usage:
 *   import { SessionManager } from '@/modules/session/sessionManager.js';
 *   SessionManager.upgradePlan('pro');
 *   SessionManager.incrementUsage();
 */

import { setState, getState } from '../../core/state.js';
import { StorageService } from '../../services/storageService.js';
import { FeatureGate } from '../../system/featureGate.js';
import { Logger } from '../../core/logger.js';
import {
  STORAGE_KEY_PLAN,
  STORAGE_KEY_USAGE,
  STORAGE_KEY_DATE,
  FREE_DAILY_LIMIT,
} from '../../constants/limits.js';

const log = Logger.create('SessionManager');

export const SessionManager = {
  /**
   * Upgrade (or downgrade) the user's plan.
   * Updates state + persists + re-evaluates feature gates.
   * @param {'free'|'pro'|'team'} plan
   */
  upgradePlan(plan) {
    log.info(`Plan changed: ${getState().plan} → ${plan}`);
    setState({ plan });
    StorageService.set(STORAGE_KEY_PLAN, plan);
    document.dispatchEvent(new CustomEvent('nv:planUpgraded', { detail: { plan } }));
    FeatureGate.reEvaluateAll();
  },

  /**
   * Increment today's usage counter. Returns false if over limit.
   * @returns {boolean} whether usage was incremented
   */
  incrementUsage() {
    const { plan, usedToday, limitFree } = getState();
    if (plan !== 'free') return true; // pro = unlimited
    if (usedToday >= limitFree) return false;
    setState({ usedToday: usedToday + 1 });
    StorageService.set(STORAGE_KEY_USAGE, usedToday + 1);
    StorageService.set(STORAGE_KEY_DATE,  new Date().toDateString());
    log.debug(`Usage: ${usedToday + 1}/${limitFree}`);
    return true;
  },

  /** Check if user can run another analysis. */
  canAnalyze() {
    const { plan, usedToday, limitFree } = getState();
    return plan !== 'free' || usedToday < limitFree;
  },

  /** Returns remaining free uses for today. */
  remaining() {
    const { plan, usedToday, limitFree } = getState();
    if (plan !== 'free') return Infinity;
    return Math.max(0, limitFree - usedToday);
  },

  /** Reset daily counter (called on new day). */
  resetDaily() {
    setState({ usedToday: 0 });
    StorageService.set(STORAGE_KEY_USAGE, 0);
    StorageService.set(STORAGE_KEY_DATE,  new Date().toDateString());
  },
};

export default SessionManager;
