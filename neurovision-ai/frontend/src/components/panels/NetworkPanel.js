/**
 * NeuroVision — Network Panel Component
 * Shows API connection status, online/offline indicator, speed info.
 */

import { subscribe, getState } from '../../core/state.js';
import { NetworkService } from '../../services/networkService.js';

export const NetworkPanel = {
  init() {
    NetworkService.init();
    this._subscribeState();
    this._updateIndicator();
  },

  _subscribeState() {
    subscribe('isOnline',   () => this._updateIndicator());
    subscribe('isSlowConn', () => this._updateIndicator());
    subscribe('apiOnline',  () => this._updateIndicator());
  },

  _updateIndicator() {
    const { isOnline, isSlowConn, apiOnline } = getState();
    const el = document.getElementById('net-indicator');
    if (!el) return;

    if (!isOnline) {
      el.className = 'show offline';
      el.querySelector('#net-ind-msg').textContent = '📡 Offline — working in local mode';
    } else if (isSlowConn) {
      el.className = 'show slow';
      el.querySelector('#net-ind-msg').textContent = '⚡ Slow connection detected';
    } else {
      el.classList.remove('show');
    }
  },
};

export default NetworkPanel;
