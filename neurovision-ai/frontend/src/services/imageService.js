/**
 * NeuroVision — Image Service
 * All canvas-based image processing: filters, DIP ops, pixel metrics.
 * Modules call this service — they never touch canvas APIs directly.
 *
 * Usage:
 *   import { ImageService } from '@/services/imageService.js';
 *   const metrics = await ImageService.measure(canvas);
 *   const dataURL = await ImageService.applyFilter('warm', origURL);
 */

import { Logger } from '../core/logger.js';
import { CANVAS_SAMPLE_STEP } from '../constants/limits.js';

const log = Logger.create('ImageService');

// ── Filter definitions ────────────────────────────────────
const FILTERS = {
  enhance(d) {
    for (let i = 0; i < d.length; i += 4) {
      let r = Math.min(255, d[i] + 25),
          g = Math.min(255, d[i+1] + 25),
          b = Math.min(255, d[i+2] + 25);
      const cf = (259 * (45 + 255)) / (255 * (259 - 45));
      r = Math.min(255, Math.max(0, cf*(r-128)+128));
      g = Math.min(255, Math.max(0, cf*(g-128)+128));
      b = Math.min(255, Math.max(0, cf*(b-128)+128));
      const gray = 0.299*r + 0.587*g + 0.114*b;
      const sf = 1.18;
      d[i]   = Math.min(255, Math.max(0, gray + sf*(r-gray)));
      d[i+1] = Math.min(255, Math.max(0, gray + sf*(g-gray)));
      d[i+2] = Math.min(255, Math.max(0, gray + sf*(b-gray)));
    }
  },
  vivid(d) {
    for (let i = 0; i < d.length; i += 4) {
      let r = Math.min(255, d[i]*1.18),
          g = Math.min(255, d[i+1]*1.18),
          b = Math.min(255, d[i+2]*1.18);
      const gray = 0.299*r + 0.587*g + 0.114*b;
      const sf = 1.25;
      d[i]   = Math.min(255, Math.max(0, gray + sf*(r-gray)));
      d[i+1] = Math.min(255, Math.max(0, gray + sf*(g-gray)));
      d[i+2] = Math.min(255, Math.max(0, gray + sf*(b-gray)));
    }
  },
  warm(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i] + 22);
      d[i+2] = Math.max(0,   d[i+2] - 16);
    }
  },
  cool(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.max(0,   d[i] - 14);
      d[i+2] = Math.min(255, d[i+2] + 20);
    }
  },
  cinematic(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i]*1.08 + 12);
      d[i+2] = Math.max(0,   d[i+2]*0.88);
      const cf = (259 * (35 + 255)) / (255 * (259 - 35));
      d[i]   = Math.min(255, Math.max(0, cf*(d[i]-128)+128));
      d[i+1] = Math.min(255, Math.max(0, cf*(d[i+1]-128)+128));
      d[i+2] = Math.min(255, Math.max(0, cf*(d[i+2]-128)+128));
    }
  },
  bw(d) {
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      d[i] = d[i+1] = d[i+2] = g;
    }
  },
  matte(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = d[i]*0.85 + 32;
      d[i+1] = d[i+1]*0.85 + 28;
      d[i+2] = d[i+2]*0.85 + 26;
    }
  },
};

export const ImageService = {
  /**
   * Measure pixel-level metrics from a canvas.
   * @param {HTMLCanvasElement} canvas
   * @returns {import('../types/analysis.types').ImageMetrics}
   */
  measure(canvas) {
    log.time('measure');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    const n = d.length / 4;

    let tb = 0, rS = 0, gS = 0, bS = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      tb += l; rS += d[i]; gS += d[i+1]; bS += d[i+2];
    }
    const avgBright = tb/n, avgR = rS/n, avgG = gS/n, avgB = bS/n;

    let vs = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
      vs += (l - avgBright) ** 2;
    }
    const stdDev = Math.sqrt(vs / n);
    const colorfulness = (Math.abs(avgR-avgG) + Math.abs(avgG-avgB) + Math.abs(avgR-avgB)) / 3;

    let lapSum = 0, lapCount = 0;
    const step = Math.max(1, Math.floor(w / CANVAS_SAMPLE_STEP));
    for (let y = 1; y < h - 1; y += step) {
      for (let x = 1; x < w - 1; x += step) {
        const idx = (y*w + x) * 4;
        const lap = Math.abs(4*d[idx] - d[idx-4] - d[idx+4] - d[(y-1)*w*4+x*4] - d[(y+1)*w*4+x*4]);
        lapSum += lap; lapCount++;
      }
    }
    const sharpness = lapCount > 0 ? lapSum / lapCount : 30;

    log.timeEnd('measure');
    return { avgBright, stdDev, colorfulness, sharpness, avgR, avgG, avgB, w, h };
  },

  /**
   * Apply a named filter to a source image and return the result dataURL.
   * Does not mutate the main canvas — uses an offscreen canvas.
   * @param {string} filterName
   * @param {string} sourceDataURL
   * @param {HTMLCanvasElement} [targetCanvas] - If provided, also draws there
   * @returns {Promise<string>} dataURL of filtered image
   */
  async applyFilter(filterName, sourceDataURL, targetCanvas = null) {
    const fn = FILTERS[filterName];
    if (!fn) { log.warn(`Unknown filter: ${filterName}`); return sourceDataURL; }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = targetCanvas || document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        fn(id.data);
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.src = sourceDataURL;
    });
  },

  /**
   * Apply a DIP kernel operation (sharpen, edge detect, etc.)
   * @param {'sharpen'} op
   * @param {HTMLCanvasElement} canvas
   */
  applyDIPOp(op, canvas) {
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const id  = ctx.getImageData(0, 0, w, h);
    const d   = id.data;
    const tmp = new Uint8ClampedArray(d);

    if (op === 'sharpen') {
      const k = [0,-1,0,-1,5,-1,0,-1,0];
      for (let y = 1; y < h-1; y++) {
        for (let x = 1; x < w-1; x++) {
          for (let c = 0; c < 3; c++) {
            let s = 0;
            for (let ky = -1; ky <= 1; ky++)
              for (let kx = -1; kx <= 1; kx++)
                s += tmp[((y+ky)*w+(x+kx))*4+c] * k[(ky+1)*3+(kx+1)];
            d[(y*w+x)*4+c] = Math.min(255, Math.max(0, s));
          }
        }
      }
    }

    ctx.putImageData(id, 0, 0);
    return canvas.toDataURL();
  },

  /**
   * Draw detection bounding boxes onto the overlay canvas.
   * @param {import('../types/analysis.types').Detection[]} detections
   * @param {HTMLCanvasElement} mainCanvas
   * @param {HTMLCanvasElement} overlayCanvas
   * @param {boolean} [explainMode]
   */
  drawOverlays(detections, mainCanvas, overlayCanvas, explainMode = false) {
    overlayCanvas.width  = mainCanvas.width;
    overlayCanvas.height = mainCanvas.height;
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    detections.forEach(d => {
      const x = d.x * overlayCanvas.width,  y = d.y * overlayCanvas.height;
      const w = d.w * overlayCanvas.width,  h = d.h * overlayCanvas.height;
      ctx.strokeStyle = d.color; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const label = explainMode ? `${d.label} ${(d.conf*100).toFixed(0)}%` : `${d.label} ${d.conf.toFixed(2)}`;
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = d.color; ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y-20, Math.min(tw, 120), 20);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Bricolage Grotesque",system-ui,sans-serif';
      ctx.fillText(label.slice(0, 16), x+5, y-6);
    });
  },

  /**
   * Export canvas content as a downloadable file.
   * @param {HTMLCanvasElement} canvas
   * @param {'jpeg'|'png'|'webp'} format
   * @param {string} [filename]
   */
  export(canvas, format = 'jpeg', filename = 'neurovision') {
    const a = document.createElement('a');
    a.download = `${filename}.${format}`;
    a.href = canvas.toDataURL(`image/${format}`, 0.92);
    a.click();
  },
};

export default ImageService;
