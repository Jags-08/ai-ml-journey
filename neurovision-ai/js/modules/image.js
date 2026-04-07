/**
 * image.js — Image loading and canvas manipulation logic.
 * Rule: No DOM queries beyond the canvas passed in. No state access.
 */

/**
 * Load a File object into an HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

/**
 * Load an image from a URL (used for samples).
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image URL'));
    img.src = url;
  });
}

/**
 * Render an HTMLImageElement onto a canvas, scaled to fit.
 * Returns the canvas data URL (for undo stack).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement}  img
 * @param {HTMLCanvasElement} [overlayCanvas] - resized to match
 * @returns {string} dataURL
 */
export function renderImageToCanvas(canvas, img, overlayCanvas) {
  const maxW = canvas.parentElement?.clientWidth  || 800;
  const maxH = canvas.parentElement?.clientHeight || 600;

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const aspect = w / h;

  if (w > maxW) { w = maxW; h = w / aspect; }
  if (h > maxH) { h = maxH; w = h * aspect; }
  w = Math.floor(w);
  h = Math.floor(h);

  canvas.width  = w;
  canvas.height = h;

  if (overlayCanvas) {
    overlayCanvas.width  = w;
    overlayCanvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL('image/png');
}

// ── Filter definitions ──────────────────────────────────
// Each filter is a CSS filter string (applied via ctx.filter)
// plus an optional pixel-level transform function.

const FILTERS = {
  brightness:  { css: 'brightness(1.4)', label: '☀️ Brighter',    desc: 'Lift shadows and highlights' },
  contrast:    { css: 'contrast(1.3)',   label: '⬛ Contrast',     desc: 'Make darks darker, lights lighter' },
  sharpen:     { css: 'contrast(1.1) brightness(1.05)', label: '🔍 Sharpen', desc: 'Clarify edges and details' },
  warm:        { label: '🔥 Warm tone',  desc: 'Push colours towards golden hour', pixel: applyWarm  },
  cool:        { label: '❄️ Cool tone',  desc: 'Push colours towards blue twilight', pixel: applyCool },
  vivid:       { css: 'saturate(1.8)',   label: '🎨 Vivid',        desc: 'Saturate all colours' },
  bw:          { css: 'grayscale(1)',    label: '⚫ B&W',          desc: 'Remove all colour' },
  cinematic:   { label: '🎬 Cinematic',  desc: 'Film-grade colour grade', pixel: applyCinematic },
  blur_faces:  { label: '🙈 Blur faces', desc: 'Anonymise detected people', special: 'blur_faces' },
  enhance:     { css: 'contrast(1.15) saturate(1.2) brightness(1.05)', label: '✨ Auto-enhance', desc: 'Balanced one-click improve' },
};

export function getFilters() { return FILTERS; }

/**
 * Apply a named filter to the canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} filterName
 * @param {Array}  [detections] - needed for blur_faces
 * @returns {string} dataURL after filter
 */
export function applyFilter(canvas, filterName, detections = []) {
  const def = FILTERS[filterName];
  if (!def) return canvas.toDataURL();

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Snapshot current state
  const snapshot = ctx.getImageData(0, 0, w, h);

  if (def.special === 'blur_faces') {
    blurFaces(ctx, w, h, detections);
  } else if (def.pixel) {
    const imgData = ctx.getImageData(0, 0, w, h);
    def.pixel(imgData.data, w, h);
    ctx.putImageData(imgData, 0, 0);
  } else if (def.css) {
    // Re-draw with CSS filter
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tCtx = tmp.getContext('2d');
    tCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.filter = def.css;
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';
  }

  return canvas.toDataURL('image/png');
}

// ── Pixel transforms ────────────────────────────────────

function applyWarm(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.min(255, data[i]   + 20);  // R +
    data[i+2] = Math.max(0,   data[i+2] - 18);  // B -
  }
}

function applyCool(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.max(0,   data[i]   - 16);  // R -
    data[i+2] = Math.min(255, data[i+2] + 22);  // B +
  }
}

function applyCinematic(data) {
  // Lift shadows, crush highlights slightly, slight teal-orange
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    // S-curve approximate
    r = Math.min(255, r * 0.9 + 12);
    g = Math.min(255, g * 0.92 + 8);
    b = Math.min(255, b * 0.85 + 24);
    // Teal shadows
    if (r + g + b < 300) { b = Math.min(255, b + 15); g = Math.min(255, g + 8); }
    // Orange highlights
    if (r + g + b > 500) { r = Math.min(255, r + 10); }
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
}

function blurFaces(ctx, w, h, detections) {
  const people = detections.filter(d => d.label === 'person');
  if (!people.length) return;

  people.forEach(d => {
    const [x1, y1, x2, y2] = d.bbox;
    // Face is roughly top 35% of bounding box
    const fx = x1, fy = y1;
    const fw = x2 - x1;
    const fh = Math.round((y2 - y1) * 0.4);

    // Box blur by downscaling and upscaling
    const tmp = document.createElement('canvas');
    tmp.width = 8; tmp.height = 8;
    const tCtx = tmp.getContext('2d');
    tCtx.drawImage(ctx.canvas, fx, fy, fw, fh, 0, 0, 8, 8);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(tmp, 0, 0, 8, 8, fx, fy, fw, fh);
  });
}

/**
 * Restore canvas from a data URL.
 */
export function restoreFromDataURL(canvas, dataURL) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve();
    };
    img.src = dataURL;
  });
}

/**
 * Export canvas as a PNG download.
 * @param {HTMLCanvasElement} canvas
 * @param {string}            filename
 */
export function exportAsPNG(canvas, filename) {
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}
