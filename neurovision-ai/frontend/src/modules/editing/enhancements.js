/**
 * NeuroVision — Enhancements Module
 * DIP (Digital Image Processing) operations and image export.
 * Wires canvas ops to the public API.
 *
 * Usage:
 *   import { applyDIPOp, exportImage } from '@/modules/editing/enhancements.js';
 *   applyDIPOp('sharpen');
 *   exportImage('png');
 */

import { ImageService } from '../../services/imageService.js';
import { canUse } from '../../core/features.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('Enhancements');

export const DIP_OPS = {
  sharpen: { label:'💎 Sharpen', desc:'Laplacian sharpening kernel' },
};

/**
 * Apply a DIP operation directly to the main canvas (in-place).
 * @param {'sharpen'} op
 * @returns {string|null} updated dataURL
 */
export function applyDIPOp(op) {
  const canvas = document.getElementById('main-canvas');
  if (!canvas) { log.warn('No main canvas found'); return null; }
  log.debug(`DIP op: ${op}`);
  const dataURL = ImageService.applyDIPOp(op, canvas);
  return dataURL;
}

/**
 * Export the current enhanced (or original) image.
 * Checks feature gate for WebP and HD exports.
 * @param {'jpeg'|'png'|'webp'} format
 */
export function exportImage(format = 'jpeg') {
  const canvas = document.getElementById('main-canvas');
  if (!canvas) return;

  // Feature gate
  if (format === 'webp' && !canUse('export_webp')) {
    document.dispatchEvent(new CustomEvent('nv:openPricing', { detail: { feature: 'export_webp' } }));
    return;
  }

  const ts  = new Date().toISOString().slice(0,10);
  const filename = `neurovision_${ts}`;
  log.info(`Exporting as ${format}`);
  ImageService.export(canvas, format, filename);
}

export default { applyDIPOp, exportImage, DIP_OPS };
