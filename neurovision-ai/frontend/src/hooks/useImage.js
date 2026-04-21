/**
 * NeuroVision — useImage Hook
 * Encapsulates all image state and upload/reset actions.
 * Components call this to interact with image state cleanly.
 *
 * Usage:
 *   import { useImage } from '@/hooks/useImage.js';
 *   const img = useImage();
 *   img.upload(file);
 *   img.reset();
 *   img.origURL // reactive getter
 */

import { State, setState, subscribe, getState } from '../core/state.js';
import { Orchestrator } from '../system/orchestrator.js';
import { Logger } from '../core/logger.js';

const log = Logger.create('useImage');

export function useImage() {
  /** Upload a File — triggers full analyze pipeline */
  async function upload(file) {
    log.debug('upload called', file?.name);
    await Orchestrator.handleUpload(file);
  }

  /** Reset everything back to blank state */
  function reset() {
    setState({
      origURL: null, enhancedURL: null, currentURL: null,
      origImg: null, metrics: null, analysis: null,
      qualBefore: 0, viralBefore: 0,
      compareMode: false, zoom: 1,
    });
    const canvas = document.getElementById('main-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    const overlay = document.getElementById('overlay-canvas');
    if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    log.info('Image state reset');
  }

  /** Apply filter + update state */
  async function applyFilter(filterName, isAutoFix = false) {
    await Orchestrator.handleFilter(filterName, isAutoFix);
  }

  /** Subscribe to a specific image state key */
  function on(key, callback) {
    return subscribe(key, callback);
  }

  return {
    // Actions
    upload,
    reset,
    applyFilter,
    on,

    // Reactive getters (snapshot at call time)
    get origURL()     { return getState().origURL; },
    get enhancedURL() { return getState().enhancedURL; },
    get currentURL()  { return getState().currentURL; },
    get metrics()     { return getState().metrics; },
    get analysis()    { return getState().analysis; },
    get hasImage()    { return State.hasImage(); },
    get hasAnalysis() { return State.hasAnalysis(); },
    get qualBefore()  { return getState().qualBefore; },
  };
}

export default useImage;
