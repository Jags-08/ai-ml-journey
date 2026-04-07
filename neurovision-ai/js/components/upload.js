/**
 * upload.js — Upload zone UI behavior.
 * Rule: Renders upload UI and fires events. No business logic.
 */

import { $, show, hide, cls, uncls } from '../utils.js';

let _onFile = null;

/**
 * Initialise the upload zone.
 * @param {Function} onFile  callback(file: File | {url, name})
 */
export function initUpload(onFile) {
  _onFile = onFile;

  const dz    = $('#dropzone');
  const input = $('#file-input');

  if (!dz || !input) return;

  // Click to open file picker
  dz.addEventListener('click', () => input.click());

  // File input change
  input.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) _onFile(file);
    input.value = ''; // reset so same file can be re-picked
  });

  // Drag & drop
  dz.addEventListener('dragover', e => {
    e.preventDefault();
    cls(dz, 'drag');
  });

  dz.addEventListener('dragleave', () => uncls(dz, 'drag'));

  dz.addEventListener('drop', e => {
    e.preventDefault();
    uncls(dz, 'drag');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      _onFile(file);
    }
  });

  // Sample buttons
  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      loadSample(btn.dataset.sample);
    });
  });
}

/**
 * Show the upload phase (called on reset).
 */
export function showUploadPhase() {
  show('#upload-phase', 'flex');
  hide('#workspace');
  hide('#chat-bar');
}

/**
 * Hide the upload phase (called after file is picked).
 */
export function hideUploadPhase() {
  hide('#upload-phase');
}

/**
 * Load one of the built-in sample images.
 * Generates a deterministic placeholder canvas image.
 */
function loadSample(type) {
  const canvas = document.createElement('canvas');
  canvas.width  = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');

  // Generate a distinct scene per sample type
  const scenes = {
    street:   drawStreetScene,
    portrait: drawPortraitScene,
    nature:   drawNatureScene,
  };

  (scenes[type] || drawStreetScene)(ctx, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `sample-${type}.jpg`, { type: 'image/jpeg' });
    _onFile?.(file);
  }, 'image/jpeg', 0.9);
}

function drawStreetScene(ctx, w, h) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0,0,0,h*0.6);
  sky.addColorStop(0, '#1a1a2e');
  sky.addColorStop(1, '#16213e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h*0.6);

  // Road
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(0, h*0.6, w, h*0.4);

  // Road markings
  ctx.setLineDash([40,30]);
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h*0.8); ctx.lineTo(w, h*0.8);
  ctx.stroke();
  ctx.setLineDash([]);

  // Buildings
  const buildingColors = ['#0f3460','#16213e','#1a1a2e','#0d1b2a'];
  [0.05, 0.2, 0.4, 0.55, 0.72, 0.85].forEach((x, i) => {
    const bw = 80 + i * 15;
    const bh = 150 + i * 30;
    ctx.fillStyle = buildingColors[i % buildingColors.length];
    ctx.fillRect(x*w, h*0.6 - bh, bw, bh);
    // Windows
    ctx.fillStyle = 'rgba(255,220,100,0.6)';
    for (let wy = 20; wy < bh-20; wy += 22) {
      for (let wx = 10; wx < bw-10; wx += 18) {
        if (Math.random() > 0.3) ctx.fillRect(x*w + wx, h*0.6 - bh + wy, 8, 10);
      }
    }
  });

  // People silhouettes
  [[0.2,0.7],[0.5,0.65],[0.75,0.72]].forEach(([px,py]) => {
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.ellipse(px*w, py*h - 30, 8, 8, 0, 0, Math.PI*2); // head
    ctx.fill();
    ctx.fillRect(px*w-6, py*h-22, 12, 28); // body
  });

  // Car
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.roundRect(w*0.35, h*0.75, 120, 45, 6);
  ctx.fill();
  ctx.fillStyle = '#555';
  [w*0.35+15, w*0.35+85].forEach(cx => {
    ctx.beginPath();
    ctx.arc(cx, h*0.75+42, 12, 0, Math.PI*2); ctx.fill();
  });
}

function drawPortraitScene(ctx, w, h) {
  // Background bokeh
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.8);
  bg.addColorStop(0, '#2d1b69');
  bg.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,w,h);

  // Bokeh circles
  for (let i = 0; i < 25; i++) {
    const x = Math.random()*w, y = Math.random()*h;
    const r = 10 + Math.random()*40;
    const c = ctx.createRadialGradient(x,y,0,x,y,r);
    c.addColorStop(0, 'rgba(120,80,255,0.15)');
    c.addColorStop(1, 'transparent');
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  // Face shape (simplified)
  ctx.fillStyle = '#c68642';
  ctx.beginPath();
  ctx.ellipse(w/2, h*0.4, 80, 100, 0, 0, Math.PI*2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#2c1810';
  ctx.beginPath();
  ctx.ellipse(w/2, h*0.28, 90, 60, 0, 0, Math.PI*2);
  ctx.fill();

  // Shoulders
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(w/2, h*0.78, 150, 80, 0, 0, Math.PI);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#222';
  [[w/2-28, h*0.38],[w/2+28, h*0.38]].forEach(([ex,ey]) => {
    ctx.beginPath(); ctx.ellipse(ex,ey,12,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex+4,ey-2,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';
  });

  // Smile
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w/2, h*0.44, 24, 0.1*Math.PI, 0.9*Math.PI);
  ctx.stroke();
}

function drawNatureScene(ctx, w, h) {
  // Sky
  const sky = ctx.createLinearGradient(0,0,0,h*0.55);
  sky.addColorStop(0,'#87ceeb');
  sky.addColorStop(1,'#b8e4f7');
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.55);

  // Ground
  const ground = ctx.createLinearGradient(0,h*0.55,0,h);
  ground.addColorStop(0,'#228b22');
  ground.addColorStop(1,'#145214');
  ctx.fillStyle = ground; ctx.fillRect(0,h*0.55,w,h*0.45);

  // Sun
  ctx.fillStyle = '#fffacd';
  ctx.beginPath(); ctx.arc(w*0.8, h*0.15, 40, 0, Math.PI*2); ctx.fill();

  // Clouds
  [[0.15,0.12],[0.45,0.18],[0.65,0.1]].forEach(([cx,cy]) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[0,0],[20,-8],[40,0],[20,8],[-10,5]].forEach(([ox,oy]) => {
      ctx.beginPath();
      ctx.arc(cx*w+ox, cy*h+oy, 22, 0, Math.PI*2);
      ctx.fill();
    });
  });

  // Trees
  [[0.1,0.55],[0.3,0.52],[0.7,0.54],[0.88,0.5]].forEach(([tx,ty]) => {
    // Trunk
    ctx.fillStyle = '#4a2c0a';
    ctx.fillRect(tx*w-6, ty*h, 12, h*(0.45));
    // Foliage
    ctx.fillStyle = '#1a6b1a';
    [0, 25, -20].forEach(off => {
      ctx.beginPath();
      ctx.arc(tx*w, ty*h - 20 + off*0.5, 38 - Math.abs(off)*0.3, 0, Math.PI*2);
      ctx.fill();
    });
  });

  // Bird silhouette
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#222';
  [[0.4, 0.2],[0.5,0.22],[0.55,0.18]].forEach(([bx,by]) => {
    ctx.beginPath();
    ctx.moveTo(bx*w, by*h);
    ctx.quadraticCurveTo(bx*w+10, by*h-6, bx*w+20, by*h);
    ctx.moveTo(bx*w, by*h);
    ctx.quadraticCurveTo(bx*w-10, by*h-6, bx*w-20, by*h);
    ctx.stroke();
  });
}
