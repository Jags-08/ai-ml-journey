/**
 * NeuroVision — Command Palette Component
 * Cmd/Ctrl+K command palette with fuzzy search over all registered actions.
 *
 * Usage:
 *   import { CommandPalette } from '@/components/command/CommandPalette.js';
 *   CommandPalette.init();
 */

import { ActionEngine } from '../../system/actionEngine.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('CommandPalette');

export const CommandPalette = {
  _selected: 0,
  _items: [],

  init() {
    this._bindEvents();
    log.info('CommandPalette ready');
  },

  open() {
    const ov = document.getElementById('cmd-overlay');
    if (!ov) return;
    ov.classList.add('open');
    const input = document.getElementById('cmd-input');
    if (input) { input.value = ''; input.focus(); }
    this._renderAll();
  },

  close() {
    document.getElementById('cmd-overlay')?.classList.remove('open');
  },

  // ── Private ───────────────────────────────────────────────
  _bindEvents() {
    document.addEventListener('nv:openCommand', () => this.open());
    document.addEventListener('nv:closeAll',    () => this.close());

    document.getElementById('cmd-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('cmd-overlay')) this.close();
    });

    document.getElementById('cmd-input')?.addEventListener('input', e => {
      this._render(e.target.value);
    });

    document.getElementById('cmd-input')?.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this._moveSel(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); this._moveSel(-1); }
      if (e.key === 'Enter')     { e.preventDefault(); this._runSelected(); }
      if (e.key === 'Escape')    { this.close(); }
    });

    document.getElementById('cmd-esc')?.addEventListener('click', () => this.close());
  },

  _renderAll() {
    this._render('');
  },

  _render(query) {
    const all = ActionEngine.available();
    const q   = query.toLowerCase().trim();
    this._items = q
      ? all.filter(a =>
          a.label.toLowerCase().includes(q) ||
          a.key.toLowerCase().includes(q)
        )
      : all;

    this._selected = 0;
    const container = document.getElementById('cmd-results');
    if (!container) return;

    if (!this._items.length) {
      container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--t3);font-size:13px">No matching actions</div>`;
      return;
    }

    container.innerHTML = `
      <div class="cmd-group-label">Actions</div>
      ${this._items.map((a, i) => `
        <div class="cmd-item${i === 0 ? ' sel' : ''}" data-key="${a.key}" data-idx="${i}">
          <div class="cmd-item-ic">${a.icon}</div>
          <div>
            <div class="cmd-item-name">${a.label.replace(/^[^\s]+\s/, '')}</div>
          </div>
        </div>`
      ).join('')}`;

    container.querySelectorAll('.cmd-item').forEach(el => {
      el.addEventListener('mouseenter', () => this._setSel(parseInt(el.dataset.idx)));
      el.addEventListener('click', () => {
        this._setSel(parseInt(el.dataset.idx));
        this._runSelected();
      });
    });
  },

  _setSel(idx) {
    const items = document.querySelectorAll('.cmd-item');
    items.forEach(el => el.classList.toggle('sel', parseInt(el.dataset.idx) === idx));
    this._selected = idx;
  },

  _moveSel(dir) {
    const next = Math.max(0, Math.min(this._items.length - 1, this._selected + dir));
    this._setSel(next);
    // Scroll into view
    document.querySelectorAll('.cmd-item')[next]?.scrollIntoView({ block: 'nearest' });
  },

  _runSelected() {
    const item = this._items[this._selected];
    if (!item) return;
    this.close();
    log.info(`CommandPalette run: ${item.key}`);
    ActionEngine.run(item.key);
  },
};

export default CommandPalette;
