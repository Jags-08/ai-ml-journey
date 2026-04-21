/**
 * NeuroVision — useNetwork Hook
 * Access network status and subscribe to changes.
 *
 * Usage:
 *   import { useNetwork } from '@/hooks/useNetwork.js';
 *   const net = useNetwork();
 *   if (net.isOnline) runAPICall();
 *   net.onChange(status => updateUI(status));
 */

import { getState, subscribe } from '../core/state.js';
import { NetworkService } from '../services/networkService.js';

export function useNetwork() {
  function onChange(cb) {
    const unsubOnline   = subscribe('isOnline',   () => cb(NetworkService.status()));
    const unsubSlow     = subscribe('isSlowConn', () => cb(NetworkService.status()));
    const unsubApi      = subscribe('apiOnline',  () => cb(NetworkService.status()));
    return () => { unsubOnline(); unsubSlow(); unsubApi(); };
  }

  return {
    onChange,
    get isOnline()   { return getState().isOnline; },
    get isSlowConn() { return getState().isSlowConn; },
    get apiOnline()  { return getState().apiOnline; },
    get status()     { return NetworkService.status(); },
  };
}

export default useNetwork;
