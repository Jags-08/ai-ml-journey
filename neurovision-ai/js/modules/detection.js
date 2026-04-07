/**
 * detection.js — Object detection logic.
 * Rule: No DOM queries, no state mutations, no UI.
 * Returns structured detection data only.
 */

import { seededRng, hashStr, pickN, colorForLabel } from '../utils.js';

// ── Object vocabulary ───────────────────────────────────
const SCENE_TYPES = [
  {
    name: 'street',
    objects: [
      { label: 'person',   weight: 0.9 },
      { label: 'car',      weight: 0.85 },
      { label: 'truck',    weight: 0.5 },
      { label: 'bicycle',  weight: 0.4 },
      { label: 'bus',      weight: 0.3 },
      { label: 'traffic light', weight: 0.6 },
      { label: 'fire hydrant',  weight: 0.25 },
    ],
  },
  {
    name: 'indoor',
    objects: [
      { label: 'chair',    weight: 0.7 },
      { label: 'laptop',   weight: 0.65 },
      { label: 'cup',      weight: 0.6 },
      { label: 'book',     weight: 0.5 },
      { label: 'phone',    weight: 0.55 },
      { label: 'bottle',   weight: 0.4 },
      { label: 'person',   weight: 0.5 },
    ],
  },
  {
    name: 'nature',
    objects: [
      { label: 'tree',     weight: 0.9 },
      { label: 'bird',     weight: 0.55 },
      { label: 'dog',      weight: 0.4 },
      { label: 'cat',      weight: 0.3 },
      { label: 'person',   weight: 0.5 },
    ],
  },
  {
    name: 'portrait',
    objects: [
      { label: 'person',   weight: 0.99 },
      { label: 'chair',    weight: 0.2 },
    ],
  },
  {
    name: 'mixed',
    objects: [
      { label: 'person',   weight: 0.7 },
      { label: 'car',      weight: 0.45 },
      { label: 'chair',    weight: 0.35 },
      { label: 'laptop',   weight: 0.3 },
      { label: 'dog',      weight: 0.25 },
      { label: 'bottle',   weight: 0.4 },
      { label: 'cup',      weight: 0.35 },
    ],
  },
];

/**
 * Simulate object detection on an image.
 * Uses image dimensions + filename as seed for consistent results.
 *
 * @param {HTMLImageElement} image
 * @param {string}           imageName
 * @returns {Array<Detection>}
 */
export function runDetection(image, imageName = '') {
  const seed  = hashStr(imageName + image.naturalWidth + image.naturalHeight);
  const rng   = seededRng(seed);

  // Choose scene type based on seed
  const sceneIdx  = Math.floor(rng() * SCENE_TYPES.length);
  const scene     = SCENE_TYPES[sceneIdx];

  // Decide how many objects to detect (2-7)
  const count = 2 + Math.floor(rng() * 6);

  // Filter objects by their weights (higher weight = more likely)
  const pool = scene.objects.filter(() => rng() < 0.8);
  const chosen = pickN(pool, Math.min(count, pool.length), rng);

  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const detections = [];

  chosen.forEach((obj, idx) => {
    // Sometimes spawn multiple instances of the same label
    const instances = obj.label === 'person' ? 1 + Math.floor(rng() * 3)
                    : obj.label === 'car'    ? 1 + Math.floor(rng() * 2)
                    : 1;

    for (let i = 0; i < instances; i++) {
      const det = generateBbox(obj.label, w, h, rng, idx + i);
      det.color = colorForLabel(obj.label);
      detections.push(det);
    }
  });

  return detections;
}

/**
 * Generate a realistic bounding box for a label within image dims.
 */
function generateBbox(label, w, h, rng, idx) {
  // Box size ratios depend on label
  const sizeMap = {
    person:        [0.06, 0.12, 0.18, 0.55],  // [minW, maxW, minH, maxH] as fraction
    car:           [0.15, 0.40, 0.10, 0.30],
    truck:         [0.20, 0.50, 0.15, 0.40],
    bicycle:       [0.05, 0.15, 0.10, 0.30],
    bus:           [0.25, 0.55, 0.20, 0.45],
    'traffic light':[0.02, 0.05, 0.06, 0.14],
    chair:         [0.08, 0.20, 0.10, 0.30],
    laptop:        [0.08, 0.20, 0.05, 0.16],
    cup:           [0.03, 0.08, 0.05, 0.12],
    book:          [0.04, 0.12, 0.06, 0.14],
    phone:         [0.02, 0.06, 0.04, 0.10],
    bottle:        [0.02, 0.06, 0.06, 0.18],
    tree:          [0.08, 0.35, 0.20, 0.70],
    bird:          [0.02, 0.06, 0.02, 0.08],
    dog:           [0.05, 0.18, 0.06, 0.22],
    cat:           [0.04, 0.14, 0.05, 0.18],
    'fire hydrant':[0.02, 0.06, 0.04, 0.10],
  };

  const [minW, maxW, minH, maxH] = sizeMap[label] || [0.05, 0.20, 0.05, 0.25];

  const bw = (minW + rng() * (maxW - minW)) * w;
  const bh = (minH + rng() * (maxH - minH)) * h;
  const bx = rng() * (w - bw);
  const by = rng() * (h - bh);

  const confidence = 0.7 + rng() * 0.29;  // 0.70 – 0.99

  return {
    id:         `det_${label}_${idx}`,
    label,
    confidence,
    bbox: [
      Math.round(bx),
      Math.round(by),
      Math.round(bx + bw),
      Math.round(by + bh),
    ],
  };
}

/**
 * Group detections by label with counts.
 * @param {Array} detections
 * @returns {Array<{label, count, maxConf, color}>}
 */
export function groupDetections(detections) {
  const map = {};
  detections.forEach(d => {
    if (!map[d.label]) map[d.label] = { label: d.label, count: 0, maxConf: 0, color: d.color };
    map[d.label].count++;
    map[d.label].maxConf = Math.max(map[d.label].maxConf, d.confidence);
  });
  return Object.values(map).sort((a, b) => b.count - a.count || b.maxConf - a.maxConf);
}

/**
 * Convert detections to a human-readable natural language description.
 * @param {Array} detections
 * @returns {{ summary: string, groups: Array, keyFinding: string }}
 */
export function humanizeDetections(detections) {
  if (!detections.length) {
    return {
      summary:    'No objects were confidently detected in this image.',
      groups:     [],
      keyFinding: null,
    };
  }

  const groups  = groupDetections(detections);
  const parts   = [];
  const people  = groups.find(g => g.label === 'person');
  const vehicles= groups.filter(g => ['car','truck','bus','bicycle','motorcycle'].includes(g.label));
  const animals = groups.filter(g => ['dog','cat','bird'].includes(g.label));
  const objects = groups.filter(g => !['person','car','truck','bus','bicycle','motorcycle','dog','cat','bird'].includes(g.label));

  if (people)    parts.push(people.count === 1 ? '1 person' : `${people.count} people`);
  if (vehicles.length) {
    const total = vehicles.reduce((s, g) => s + g.count, 0);
    const names = vehicles.map(g => g.count > 1 ? `${g.count} ${g.label}s` : `a ${g.label}`);
    parts.push(names.join(' and '));
  }
  if (animals.length)  parts.push(animals.map(g => g.count > 1 ? `${g.count} ${g.label}s` : `a ${g.label}`).join(' and '));
  if (objects.length)  parts.push(objects.map(g => g.count > 1 ? `${g.count} ${g.label}s` : `a ${g.label}`).join(', '));

  const listStr = parts.length > 1
    ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1)
    : parts[0] || 'several objects';

  const summary = `This scene contains ${listStr}.`;

  // Key finding — most notable detection
  const topGroup = groups[0];
  let keyFinding;
  if (topGroup.count > 2 && topGroup.label === 'person') {
    keyFinding = `${topGroup.count} people detected — this may be a crowded or social scene.`;
  } else if (vehicles.length > 1) {
    keyFinding = `Multiple vehicles suggest an urban or traffic environment.`;
  } else if (animals.length) {
    keyFinding = `Animal presence detected — ${animals.map(g => g.label).join(', ')}.`;
  } else {
    keyFinding = `${topGroup.count > 1 ? topGroup.count + ' ' + topGroup.label + 's' : 'A ' + topGroup.label} identified with ${Math.round(topGroup.maxConf * 100)}% confidence.`;
  }

  return { summary, groups, keyFinding };
}
