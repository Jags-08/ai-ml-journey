/**
 * state.js — Single source of truth for all app data.
 * Rule: Every module reads from and writes to AppState only.
 * No module holds its own state.
 */

export const AppState = {

  // ── Image ──────────────────────────────────────────────
  image:       null,   // HTMLImageElement
  imageName:   '',
  imageWidth:  0,
  imageHeight: 0,

  // ── Analysis results ───────────────────────────────────
  // detections: [{ id, label, confidence, bbox: [x1,y1,x2,y2], color }]
  detections: [],
  // emotions:   [{ faceId, dominant, scores: {Happy,Sad,Angry,Neutral,Surprised,Fearful,Disgusted}, bbox }]
  emotions:   [],

  // ── App phase ──────────────────────────────────────────
  // 'upload' | 'analyzing' | 'ready'
  phase: 'upload',

  // ── UI toggles ─────────────────────────────────────────
  showDetections: true,
  showEmotions:   true,
  activeFilter:   null,

  // ── Filter history (for undo/redo) ─────────────────────
  filterStack: [],   // array of base64 data URLs
  stackIdx:    -1,

  // ── Export ─────────────────────────────────────────────
  exportMode: 0,     // 0=edited, 1=with-detections, 2=original

  // ── Chat ───────────────────────────────────────────────
  chatHistory:   [],
  chatExpanded:  false,

  // ── Event system ───────────────────────────────────────
  _listeners: {},

  /**
   * Subscribe to a state event.
   * @param {string} event
   * @param {Function} fn
   */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn); // returns unsubscribe fn
  },

  /**
   * Unsubscribe from a state event.
   */
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  },

  /**
   * Emit an event to all subscribers.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => {
      try { fn(data); }
      catch (err) { console.error(`[AppState] Error in "${event}" handler:`, err); }
    });
  },

  /**
   * Set one or more state values and emit 'change' + specific change events.
   * @param {string|Object} keyOrObj
   * @param {*} [value]
   */
  set(keyOrObj, value) {
    if (typeof keyOrObj === 'object') {
      Object.entries(keyOrObj).forEach(([k, v]) => {
        this[k] = v;
        this.emit(`change:${k}`, v);
      });
    } else {
      this[keyOrObj] = value;
      this.emit(`change:${keyOrObj}`, value);
    }
    this.emit('change', this);
  },

  /**
   * Reset all state back to initial (new image workflow).
   */
  reset() {
    this.set({
      image:          null,
      imageName:      '',
      imageWidth:     0,
      imageHeight:    0,
      detections:     [],
      emotions:       [],
      phase:          'upload',
      showDetections: true,
      showEmotions:   true,
      activeFilter:   null,
      filterStack:    [],
      stackIdx:       -1,
      exportMode:     0,
      chatHistory:    [],
      chatExpanded:   false,
    });
    this.emit('reset');
  },

  /**
   * Push a canvas snapshot to the undo stack.
   * @param {string} dataUrl
   */
  pushSnapshot(dataUrl) {
    // Truncate redo history when branching
    if (this.stackIdx < this.filterStack.length - 1) {
      this.filterStack = this.filterStack.slice(0, this.stackIdx + 1);
    }
    this.filterStack.push(dataUrl);
    this.stackIdx = this.filterStack.length - 1;
    this.emit('change:stack');
  },

  canUndo() { return this.stackIdx > 0; },
  canRedo() { return this.stackIdx < this.filterStack.length - 1; },

  undoSnapshot() {
    if (!this.canUndo()) return null;
    this.stackIdx--;
    this.emit('change:stack');
    return this.filterStack[this.stackIdx];
  },

  redoSnapshot() {
    if (!this.canRedo()) return null;
    this.stackIdx++;
    this.emit('change:stack');
    return this.filterStack[this.stackIdx];
  },
};
