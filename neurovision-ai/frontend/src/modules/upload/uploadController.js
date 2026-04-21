/**
 * NeuroVision — Upload Controller
 * Manages the upload UI: drag/drop, file picker, paste, error display.
 * Calls Orchestrator.handleUpload() — does NOT process images itself.
 *
 * Usage:
 *   import { UploadController } from '@/modules/upload/uploadController.js';
 *   UploadController.init();
 */

import { Orchestrator } from '../../system/orchestrator.js';
import { State } from '../../core/state.js';
import { validateFile } from './validation.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('UploadController');

export const UploadController = {
  init() {
    this._bindDropZone();
    this._bindFilePicker();
    this._bindDOMEvents();
    log.info('UploadController ready');
  },

  _bindDropZone() {
    const card = document.getElementById('upload-card');
    if (!card) return;

    card.addEventListener('dragover', e => {
      e.preventDefault();
      card.classList.add('drag');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag');
      const file = e.dataTransfer?.files?.[0];
      if (file) this._handle(file);
    });
    card.addEventListener('click', () => {
      document.getElementById('file-input')?.click();
    });
  },

  _bindFilePicker() {
    const input  = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');

    if (input) {
      input.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) this._handle(file);
        input.value = ''; // reset so same file can be re-uploaded
      });
    }

    if (browseBtn) {
      browseBtn.addEventListener('click', e => {
        if (!State.canAnalyze()) {
          e.stopImmediatePropagation();
          document.dispatchEvent(new CustomEvent('nv:rateLimitHit'));
          return;
        }
        input?.click();
      }, true);
    }
  },

  _bindDOMEvents() {
    // Listen for nv:uploadError dispatched by Orchestrator
    document.addEventListener('nv:uploadError', e => this.showError(e.detail));
  },

  async _handle(file) {
    this.clearError();
    const { ok, msg } = validateFile(file);
    if (!ok) { this.showError(msg); return; }
    log.info(`Uploading: ${file.name} (${(file.size/1024).toFixed(0)} KB)`);
    await Orchestrator.handleUpload(file);
  },

  showError(msg) {
    const el  = document.getElementById('upload-err');
    const txt = document.getElementById('err-msg');
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.add('show');
  },

  clearError() {
    document.getElementById('upload-err')?.classList.remove('show');
  },
};

export default UploadController;
