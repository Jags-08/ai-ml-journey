/**
 * NeuroVision — Network Service
 * Monitors connection state, quality, and API reachability.
 * Critical for India users on 2G/3G — always has offline fallback.
 *
 * Usage:
 *   import { NetworkService } from '@/services/networkService.js';
 *   NetworkService.init();
 *   const { isOnline, isSlowConn } = NetworkService.status();
 */

import { setState } from '../core/state.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('NetworkService');

// Connection quality thresholds
const SLOW_TYPES   = ['slow-2g', '2g'];
const MEDIUM_TYPES = ['3g'];

export const NetworkService = {
  _wasOffline: false,
  _callbacks: [],

  /**
   * Initialize listeners. Call once on app boot.
   */
  init() {
    window.addEventListener('offline', () => this._handleOffline());
    window.addEventListener('online',  () => this._handleOnline());

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      this._evalConnection(conn);
      conn.addEventListener('change', () => this._evalConnection(conn));
    }

    log.info(`Network init. Online: ${navigator.onLine}`);
  },

  /**
   * Returns current network status snapshot.
   */
  status() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = conn?.effectiveType ?? 'unknown';
    return {
      isOnline:   navigator.onLine,
      isSlowConn: SLOW_TYPES.includes(effectiveType),
      isMedium:   MEDIUM_TYPES.includes(effectiveType),
      effectiveType,
      rtt:        conn?.rtt ?? null,
      downlink:   conn?.downlink ?? null,
    };
  },

  /**
   * Register a callback for connection changes.
   * @param {(status: Object) => void} cb
   * @returns {Function} unsubscribe
   */
  onChange(cb) {
    this._callbacks.push(cb);
    return () => { this._callbacks = this._callbacks.filter(f => f !== cb); };
  },

  _handleOffline() {
    log.warn('Connection lost — switching to offline mode');
    this._wasOffline = true;
    setState({ isOnline: false, apiOnline: false });
    this._notify({ type: 'offline', msg: '📡 Offline — working in local mode' });
    this._showIndicator('offline', '📡 Offline — working in local mode');
  },

  _handleOnline() {
    log.info('Connection restored');
    setState({ isOnline: true });
    if (this._wasOffline) {
      this._wasOffline = false;
      this._notify({ type: 'online', msg: '✅ Back online' });
      this._showIndicator('back', '✅ Back online');
      setTimeout(() => this._hideIndicator(), 3500);
    }
  },

  _evalConnection(conn) {
    const type = conn.effectiveType;
    const isSlow = SLOW_TYPES.includes(type);
    setState({ isSlowConn: isSlow });
    if (isSlow) {
      log.warn(`Slow connection detected: ${type}`);
      this._showIndicator('slow', `⚠ Slow connection (${type}) — analysis may take longer`);
    }
  },

  _notify(data) {
    this._callbacks.forEach(cb => cb({ ...data, ...this.status() }));
  },

  _showIndicator(type, msg) {
    const el = document.getElementById('net-indicator');
    if (!el) return;
    const ic = el.querySelector('#net-ind-icon');
    const m  = el.querySelector('#net-ind-msg');
    el.className = `show ${type}`;
    if (ic) ic.textContent = type === 'offline' ? '📡' : type === 'slow' ? '⚡' : '✅';
    if (m)  m.textContent  = msg;
  },

  _hideIndicator() {
    const el = document.getElementById('net-indicator');
    if (el) el.classList.remove('show');
  },
};

export default NetworkService;
