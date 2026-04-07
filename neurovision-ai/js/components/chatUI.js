/**
 * chatUI.js — Chat interface rendering.
 * Rule: Handles chat DOM. Fires onSend callback. No API calls.
 */

import { $, esc, show, hide } from '../utils.js';

let _onSend = null;
let _historyExpanded = false;

/**
 * Initialise the chat UI.
 * @param {Function} onSend  (message: string) => void
 */
export function initChatUI(onSend) {
  _onSend = onSend;

  const input  = $('#chat-input');
  const sendBtn= $('#chat-send');

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFromInput();
    }
  });

  sendBtn?.addEventListener('click', sendFromInput);

  // Quick prompt buttons
  document.querySelectorAll('[data-prompt]').forEach(btn => {
    btn.addEventListener('click', () => {
      sendMessage(btn.dataset.prompt);
    });
  });

  // Click input area to expand history if there are messages
  input?.addEventListener('focus', () => {
    const hist = $('#chat-history');
    if (hist && hist.querySelectorAll('.chat-msg').length > 0) {
      expandHistory();
    }
  });
}

/**
 * Show the chat bar (called when workspace is visible).
 */
export function showChatBar() {
  show('#chat-bar', 'flex');
}

/**
 * Hide the chat bar.
 */
export function hideChatBar() {
  hide('#chat-bar');
}

/**
 * Enable/disable the emotion quick prompt based on analysis.
 */
export function updateQuickPrompts(hasEmotions) {
  const btn = document.querySelector('.emotion-btn');
  if (btn) btn.style.display = hasEmotions ? '' : 'none';
}

/**
 * Send a message programmatically (e.g. from quick prompts).
 */
export function sendMessage(text) {
  const input = $('#chat-input');
  if (input) input.value = text;
  sendFromInput();
}

/**
 * Append a message bubble to the chat history.
 * @param {'user'|'ai'} role
 * @param {string}      text
 */
export function appendMessage(role, text) {
  const hist = ensureHistoryVisible();
  const div  = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `
    <div class="chat-msg-av">${role === 'user' ? 'U' : 'NV'}</div>
    <div class="chat-msg-bub">${esc(text)}</div>`;
  hist.appendChild(div);
  scrollHistory(hist);
  expandHistory();
}

/**
 * Append a typing indicator. Returns the element's id for removal.
 */
export function appendTyping() {
  const hist = ensureHistoryVisible();
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.id        = id;
  div.className = 'chat-msg ai';
  div.innerHTML = `
    <div class="chat-msg-av">NV</div>
    <div class="chat-msg-bub">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  hist.appendChild(div);
  scrollHistory(hist);
  return id;
}

/**
 * Remove the typing indicator by id.
 */
export function removeTyping(id) {
  document.getElementById(id)?.remove();
}

/**
 * Set the loading state of the send button.
 */
export function setChatLoading(loading) {
  const btn   = $('#chat-send');
  const input = $('#chat-input');
  if (btn)   btn.disabled   = loading;
  if (input) input.disabled = loading;
}

/**
 * Reset chat history (on new image).
 */
export function clearChat() {
  const hist = $('#chat-history');
  if (hist) {
    hist.innerHTML = '';
    hide(hist);
    _historyExpanded = false;
  }
}

// ── Internals ────────────────────────────────────────────

function sendFromInput() {
  const input = $('#chat-input');
  const msg   = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  _onSend?.(msg);
}

function ensureHistoryVisible() {
  const hist = $('#chat-history');
  if (hist) show(hist, 'flex');
  return hist;
}

function expandHistory() {
  _historyExpanded = true;
}

function scrollHistory(hist) {
  requestAnimationFrame(() => {
    if (hist) hist.scrollTop = hist.scrollHeight;
  });
}
