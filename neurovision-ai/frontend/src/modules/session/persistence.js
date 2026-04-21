/**
 * NeuroVision — Persistence
 * Saves and restores user settings between sessions.
 *
 * Usage:
 *   import { Persistence } from '@/modules/session/persistence.js';
 *   Persistence.saveSettings({ goal: 'instagram' });
 *   const settings = Persistence.loadSettings();
 */

import { StorageService } from '../../services/storageService.js';
import { setState } from '../../core/state.js';
import { Logger } from '../../core/logger.js';
import { STORAGE_KEY_SETTINGS } from '../../constants/limits.js';

const log = Logger.create('Persistence');

const DEFAULTS = {
  goal:          'general',
  featureExplain: false,
  featureOverlay: true,
};

export const Persistence = {
  /**
   * Save settings to localStorage.
   * @param {Object} settings
   */
  saveSettings(settings) {
    const current = this.loadSettings();
    StorageService.set(STORAGE_KEY_SETTINGS, { ...current, ...settings });
    log.debug('Settings saved', settings);
  },

  /**
   * Load settings from localStorage (with defaults).
   * @returns {Object}
   */
  loadSettings() {
    return StorageService.get(STORAGE_KEY_SETTINGS, DEFAULTS);
  },

  /**
   * Apply saved settings to global state.
   */
  restore() {
    const settings = this.loadSettings();
    setState(settings);
    log.info('Settings restored', settings);
  },

  /** Wipe all persisted data (for sign-out / clear data flows). */
  clear() {
    StorageService.clearAll();
    log.info('Persistence cleared');
  },
};

export default Persistence;
