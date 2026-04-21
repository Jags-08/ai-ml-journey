/**
 * NeuroVision — Scene Panel Component
 * Displays detected scene type with icon + description,
 * and renders the status bar metadata below the canvas.
 */

import { subscribe, getState } from '../../core/state.js';

const SCENE_META = {
  night:    { icon:'🌙', label:'Night Scene',     desc:'Low light environment detected' },
  outdoor:  { icon:'🌿', label:'Outdoor Scene',   desc:'Natural lighting conditions' },
  document: { icon:'📄', label:'Document',        desc:'Text and structured content' },
  vibrant:  { icon:'🌈', label:'Vibrant Scene',   desc:'High saturation, colorful scene' },
  indoor:   { icon:'🏠', label:'Indoor Scene',    desc:'Artificial or mixed lighting' },
  portrait: { icon:'🙂', label:'Portrait',        desc:'Human subject detected' },
  general:  { icon:'🖼', label:'General Image',   desc:'Mixed content image' },
};

export const ScenePanel = {
  init() {
    subscribe('analysis', (a) => { if (a) this.render(a); });
  },

  render(analysis) {
    const meta = SCENE_META[analysis.scene] || SCENE_META.general;

    // Scene badge
    const badge = document.getElementById('scene-badge');
    if (badge) {
      badge.innerHTML = `${meta.icon} <strong>${meta.label}</strong> — ${meta.desc}`;
    }

    // Status bar
    const { metrics } = getState();
    if (metrics) {
      const sb = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      sb('sb-w',    metrics.w ? `${metrics.w}` : '–');
      sb('sb-h',    metrics.h ? `${metrics.h}` : '–');
      sb('sb-br',   Math.round(metrics.avgBright));
      sb('sb-sh',   metrics.sharpness?.toFixed(1));
      sb('sb-scene', meta.label);
    }
  },
};

export default ScenePanel;
