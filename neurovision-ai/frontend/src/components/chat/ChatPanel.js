/**
 * NeuroVision — Chat Panel Component
 * Manages the full chat UI: FAB, window, messages, typing indicator,
 * action buttons, and conversion nudge.
 *
 * Usage:
 *   import { ChatPanel } from '@/components/chat/ChatPanel.js';
 *   ChatPanel.init();
 */

import { useChat } from '../../hooks/useChat.js';
import { subscribe, getState } from '../../core/state.js';
import { ActionEngine } from '../../system/actionEngine.js';
import { Logger } from '../../core/logger.js';

const log = Logger.create('ChatPanel');
const chat = useChat();

export const ChatPanel = {
  _typing: false,

  init() {
    this._bindFAB();
    this._bindInput();
    this._bindNudge();
    this._subscribeHistory();
    subscribe('chatOpen', (open) => this._toggleWindow(open));
    log.info('ChatPanel ready');
  },

  // ── FAB ───────────────────────────────────────────────────
  _bindFAB() {
    document.getElementById('chat-fab')?.addEventListener('click', () => chat.toggle());
    document.getElementById('chat-close')?.addEventListener('click', () => chat.close());
  },

  // ── Input / send ──────────────────────────────────────────
  _bindInput() {
    const input  = document.getElementById('chat-in');
    const sendBtn= document.getElementById('chat-send');
    if (!input || !sendBtn) return;

    const send = async () => {
      const msg = input.value.trim();
      if (!msg || this._typing) return;
      input.value = '';
      this._typing = true;
      sendBtn.disabled = true;
      this._showTyping();
      await chat.send(msg);
      this._typing = false;
      sendBtn.disabled = false;
      this._hideTyping();
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  },

  // ── Window toggle ─────────────────────────────────────────
  _toggleWindow(open) {
    const win = document.getElementById('chat-window');
    const fab = document.getElementById('chat-fab');
    if (win) win.classList.toggle('open', open);
    if (fab) fab.innerHTML = open ? '✕' : '💬';

    if (open && chat.history.length === 0) {
      // First open: greet
      chat.greet();
    }
    if (open) {
      setTimeout(() => document.getElementById('chat-in')?.focus(), 150);
    }
  },

  // ── Messages ──────────────────────────────────────────────
  _subscribeHistory() {
    chat.onChange(() => this._renderMessages());
  },

  _renderMessages() {
    const container = document.getElementById('chat-msgs');
    if (!container) return;
    const history = chat.history;

    container.innerHTML = history.map(msg => {
      const bubble = `<div class="chat-bubble">${msg.text}</div>`;
      const actionBtn = msg.action
        ? `<button class="chat-action-btn" data-action="${msg.action.key}">${msg.action.label}</button>`
        : '';
      return `<div class="chat-msg ${msg.role}">${bubble}${actionBtn}</div>`;
    }).join('');

    // Bind action buttons
    container.querySelectorAll('.chat-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ran = ActionEngine.run(btn.dataset.action);
        if (ran) { btn.disabled = true; btn.textContent = '✓ Applied'; }
      });
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  },

  // ── Typing indicator ──────────────────────────────────────
  _showTyping() {
    const container = document.getElementById('chat-msgs');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = 'chat-typing-indicator';
    div.innerHTML = `<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _hideTyping() {
    document.getElementById('chat-typing-indicator')?.remove();
  },

  // ── Conversion nudge ─────────────────────────────────────
  _bindNudge() {
    document.addEventListener('nv:showNudge', e => {
      const { title, desc } = e.detail;
      const nudge = document.getElementById('conv-nudge');
      if (!nudge) return;
      nudge.querySelector('.cn-title').textContent = title;
      nudge.querySelector('.cn-desc').textContent  = desc;
      nudge.classList.add('show');
    });

    document.getElementById('cn-close')?.addEventListener('click', () => {
      document.getElementById('conv-nudge')?.classList.remove('show');
    });

    document.getElementById('cn-cta')?.addEventListener('click', () => {
      document.getElementById('conv-nudge')?.classList.remove('show');
      document.dispatchEvent(new CustomEvent('nv:openPricing'));
    });
  },
};

export default ChatPanel;
