/**
 * NeuroVision — Filters Module
 * Public API for applying image filters.
 * Delegates pixel work to ImageService — modules stay clean.
 *
 * Usage:
 *   import { applyFilter } from '@/modules/editing/filters.js';
 *   const dataURL = await applyFilter('vivid', origURL);
 */

import { ImageService } from '../../services/imageService.js';
import { getState } from '../../core/state.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('Filters');

export const FILTER_META = {
  enhance:   { label:'✨ Enhance',   desc:'Balanced brightness + contrast boost' },
  vivid:     { label:'🌈 Vivid',     desc:'Saturated, punchy colors' },
  warm:      { label:'🌅 Warm',      desc:'Golden, summer tones' },
  cool:      { label:'❄ Cool',       desc:'Crisp, clean blue tones' },
  cinematic: { label:'🎬 Cinematic', desc:'Film-grade professional look' },
  bw:        { label:'⬛ B&W',       desc:'Classic black and white' },
  matte:     { label:'🎭 Matte',     desc:'Faded, editorial finish' },
};

/**
 * Apply a named filter to the original image data URL.
 * Also paints the result onto the main canvas.
 * @param {string} filterName
 * @param {string} [sourceDataURL] - Defaults to state.origURL
 * @returns {Promise<string|null>} enhanced dataURL or null on failure
 */
export async function applyFilter(filterName, sourceDataURL) {
  const src = sourceDataURL || getState().origURL;
  if (!src) { log.warn('applyFilter: no source image'); return null; }

  log.debug(`Applying filter: ${filterName}`);
  const canvas = document.getElementById('main-canvas');
  const dataURL = await ImageService.applyFilter(filterName, src, canvas || undefined);
  log.debug('Filter applied');
  return dataURL;
}

/**
 * Reset canvas back to the original image.
 * @returns {Promise<void>}
 */
export async function resetToOriginal() {
  const { origURL } = getState();
  if (!origURL) return;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('main-canvas');
      if (canvas) {
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
      }
      resolve();
    };
    img.src = origURL;
  });
}

export default { applyFilter, resetToOriginal, FILTER_META };
