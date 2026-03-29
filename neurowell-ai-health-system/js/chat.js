/**
 * NEUROWELL — chat.js  (v2)
 * Full AI Chat: LM Studio local LLM, streaming, memory,
 * emotion detection, TTS, voice input, Claude-like UI
 */

/* ── State ── */
let chatUser       = null;
let messages       = [];      // Full message history (persisted)
let isStreaming    = false;
let streamAbort    = null;    // AbortController for stopping generation
let llmOnline      = false;

const SUGGESTIONS = [
  'Why do I feel tired every day?',
  'How can I improve my sleep?',
  'What does my health score mean?',
  'Tips to reduce stress?',
  'Analyse my symptoms this week',
  'How to build a better water habit?',
  'I\'ve been feeling very anxious lately',
  'Give me a full health summary',
];

const MEMORY_TYPE_ICONS = {
  symptom:'🤒', condition:'🏥', medication:'💊', allergy:'⚠️',
  goal:'🎯', preference:'⚙️', lifestyle:'🌱', emotion:'💭', fact:'📌'
};

/* ════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  chatUser = Auth.guard();
  if (!chatUser) return;

  // Load persisted messages
  messages = DB.getChat(chatUser.email);

  // Render UI
  renderMessages();
  renderSidebar();
  initInputEvents();
  initVoice();
  initTTSControls();
  updateContextPanel();

  // Check LLM status
  await checkLLMStatus();
  setInterval(checkLLMStatus, 15000);
});

/* ════════════════════════════════════════════
   LLM STATUS
   ════════════════════════════════════════════ */
async function checkLLMStatus() {
  setStatusDot('checking');
  llmOnline = await LLMConfig.checkStatus();
  setStatusDot(llmOnline ? 'online' : 'offline');
  updateModelPill();
  toggleOfflineBanner(!llmOnline);
}

function setStatusDot(state) {
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  if (!dot) return;
  dot.className = `status-dot ${state}`;
  if (label) label.textContent =
    state === 'online'   ? `Online · ${LLMConfig.local.model.split('/').pop()}` :
    state === 'checking' ? 'Connecting...' :
                           'Offline — AI disabled';
}

function updateModelPill() {
  const el = document.getElementById('model-pill-text');
  if (el) el.textContent = LLMConfig.local.model.split('/').pop().slice(0, 28);
}

function toggleOfflineBanner(show) {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.style.display = show ? 'flex' : 'none';
}

/* ════════════════════════════════════════════
   SEND MESSAGE
   ════════════════════════════════════════════ */
async function sendMessage(overrideText) {
  if (isStreaming) return;

  const input = document.getElementById('chat-input');
  const text  = (overrideText || input?.value || '').trim();
  if (!text) return;

  if (!llmOnline) {
    showToast('LM Studio is offline. Start the server on port 1234.', 'error', 5000);
    return;
  }

  // Clear input
  if (input) { input.value = ''; input.style.height = 'auto'; }

  // Detect emotion
  const emotion = EmotionDetector.detect(text);

  // Add user message
  const userMsg = { role: 'user', content: text, time: new Date().toISOString(), emotion: emotion?.key };
  messages.push(userMsg);
  appendUserMessage(userMsg);
  hideWelcome();
  hideSuggestions();

  // Persist
  DB.saveChat(chatUser.email, messages);

  // Show thinking
  const thinkingEl = appendThinking();
  setInputState(false, true);
  isStreaming = true;

  try {
    const reply = await streamResponse(text, emotion, thinkingEl);

    // Add AI message
    const aiMsg = { role: 'assistant', content: reply, time: new Date().toISOString() };
    messages.push(aiMsg);
    DB.saveChat(chatUser.email, messages);
    Memory.saveSession(chatUser.email, messages);

    // Extract memories (async)
    Memory.extractFromConversation(chatUser.email, text, reply).then(() => {
      renderMemoryPanel();
    });

    // TTS readback
    if (TTS.enabled) TTS.speak(reply);

  } catch (err) {
    thinkingEl?.remove();
    if (err.message !== 'ABORTED') {
      const errMsg = err.message === 'LOCAL_OFFLINE'
        ? 'LM Studio went offline. Please check the server.'
        : `Error: ${err.message}`;
      appendAIMessage({ content: errMsg, time: new Date().toISOString(), isError: true });
    }
  } finally {
    isStreaming = false;
    streamAbort = null;
    setInputState(true, false);
  }
}
window.sendMessage = sendMessage;

/* ════════════════════════════════════════════
   STREAMING RESPONSE
   ════════════════════════════════════════════ */
async function streamResponse(userText, emotion, thinkingEl) {
  const healthContext   = PatternEngine.buildHealthContext(chatUser.email);
  const memoryContext   = Memory.buildContext(chatUser.email);
  const emotionTone     = EmotionDetector.toneInstruction(emotion);
  const sessionHistory  = Memory.getSession(chatUser.email);

  const systemContent = `${LLMConfig.SYSTEM_PROMPT}

CURRENT USER DATA:
${healthContext}
${memoryContext}

RESPONSE TONE: ${emotionTone}`;

  // Build message array for API
  const apiMessages = [
    { role: 'system', content: systemContent },
    ...sessionHistory.filter(m => m.role !== 'system').slice(-14),
    { role: 'user', content: userText }
  ];

  // Create abort controller
  streamAbort = new AbortController();

  // Remove thinking, insert streaming bubble
  thinkingEl?.remove();
  const { bubbleEl, cursorEl } = insertStreamBubble();

  let fullText = '';

  try {
    for await (const chunk of LLMConfig.stream(apiMessages, { signal: streamAbort.signal })) {
      if (streamAbort.signal.aborted) break;
      fullText += chunk;
      bubbleEl.innerHTML = formatMarkdown(fullText) + '<span class="stream-cursor"></span>';
      scrollToBottom();
    }
  } catch (e) {
    if (e.name === 'AbortError' || streamAbort?.signal?.aborted) {
      throw new Error('ABORTED');
    }
    throw e;
  }

  // Finalise bubble — remove cursor, add metadata row
  cursorEl?.remove();
  bubbleEl.innerHTML = formatMarkdown(fullText);
  appendMsgMetaRow(bubbleEl.closest('.msg-row'), { time: new Date().toISOString() });

  return fullText;
}

/* ════════════════════════════════════════════
   RENDER MESSAGES
   ════════════════════════════════════════════ */
function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';

  if (messages.length === 0) {
    renderWelcome();
    return;
  }

  messages.forEach(m => {
    if (m.role === 'user') appendUserMessage(m, false);
    else                   appendAIMessage(m, false);
  });
  scrollToBottom();
}

function renderWelcome() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="chat-welcome" id="chat-welcome">
      <div class="welcome-orb">🧠</div>
      <div class="welcome-title">Hello, ${chatUser.name.split(' ')[0]}!</div>
      <p class="welcome-sub">I'm NeuroWell AI — your personal health intelligence assistant. I know your health data and I'm here to help.</p>
      <div class="welcome-chips">
        ${SUGGESTIONS.slice(0,5).map(s=>`<button class="suggestion-chip" onclick="sendMessage('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('')}
      </div>
    </div>`;
}

function hideWelcome() {
  document.getElementById('chat-welcome')?.remove();
}

function appendUserMessage(msg, scroll = true) {
  const container = document.getElementById('chat-messages');
  const emotion   = msg.emotion ? EmotionDetector.EMOTIONS[msg.emotion] : null;
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.dataset.id = msg.time;
  row.innerHTML = `
    <div class="msg-avatar user-avatar">${chatUser.name.charAt(0).toUpperCase()}</div>
    <div class="msg-content">
      <div class="msg-bubble user">${escapeHtml(msg.content)}</div>
      <div class="msg-meta">
        ${emotion && emotion.key !== 'neutral' ? EmotionDetector.renderBadge(emotion) : ''}
        <span>${DateUtils.formatTime(msg.time)}</span>
        <div class="msg-actions">
          <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋</button>
        </div>
      </div>
    </div>`;
  container.appendChild(row);
  if (scroll) scrollToBottom();
}

function appendAIMessage(msg, scroll = true) {
  const container = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.dataset.id = msg.time;
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">🧠</div>
    <div class="msg-content">
      <div class="msg-bubble ai ${msg.isError ? 'error-bubble' : ''}">${
        msg.isError ? `<span style="color:var(--red)">⚠️ ${escapeHtml(msg.content)}</span>` : formatMarkdown(msg.content)
      }</div>
      <div class="msg-meta">
        <span>${DateUtils.formatTime(msg.time)}</span>
        <div class="msg-actions">
          <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋</button>
          <button class="msg-action-btn" onclick="speakMsg(this)" title="Read aloud">🔊</button>
        </div>
      </div>
    </div>`;
  container.appendChild(row);
  if (scroll) scrollToBottom();
}

function appendThinking() {
  const container = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'msg-row ai thinking-row';
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">🧠</div>
    <div class="msg-content">
      <div class="msg-bubble ai">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  container.appendChild(row);
  scrollToBottom();
  return row;
}

function insertStreamBubble() {
  const container = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">🧠</div>
    <div class="msg-content">
      <div class="msg-bubble ai" id="stream-bubble"><span class="stream-cursor"></span></div>
    </div>`;
  container.appendChild(row);
  scrollToBottom();
  const bubbleEl  = row.querySelector('#stream-bubble');
  const cursorEl  = bubbleEl.querySelector('.stream-cursor');
  return { bubbleEl, cursorEl, row };
}

function appendMsgMetaRow(row, msg) {
  const content = row?.querySelector('.msg-content');
  if (!content) return;
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `
    <span>${DateUtils.formatTime(msg.time)}</span>
    <div class="msg-actions">
      <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋</button>
      <button class="msg-action-btn" onclick="speakMsg(this)" title="Read aloud">🔊</button>
    </div>`;
  content.appendChild(meta);
}

/* ════════════════════════════════════════════
   SUGGESTIONS
   ════════════════════════════════════════════ */
function hideSuggestions() {
  const el = document.getElementById('suggestions-area');
  if (el) el.style.display = 'none';
}
function showSuggestions() {
  const el = document.getElementById('suggestions-area');
  if (el) el.style.display = '';
}

/* ════════════════════════════════════════════
   INPUT EVENTS
   ════════════════════════════════════════════ */
function initInputEvents() {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const stopBtn = document.getElementById('stop-btn');

  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
      const cc = document.getElementById('char-count');
      if (cc) cc.textContent = input.value.length > 0 ? `${input.value.length} chars` : '';
    });
  }

  sendBtn?.addEventListener('click', () => sendMessage());

  stopBtn?.addEventListener('click', () => {
    if (streamAbort) { streamAbort.abort(); }
    isStreaming = false;
    setInputState(true, false);
    showToast('Generation stopped', 'info', 2000);
  });

  document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all chat history and memory?')) return;
    messages = [];
    DB.clearChat(chatUser.email);
    Memory.clearSession(chatUser.email);
    renderMessages();
    renderSidebar();
    showSuggestions();
    showToast('Chat cleared', 'info');
  });
}

function setInputState(enabled, showStop) {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const stopBtn = document.getElementById('stop-btn');
  if (input)   input.disabled   = !enabled;
  if (sendBtn) { sendBtn.disabled = !enabled; sendBtn.style.display = showStop ? 'none' : 'flex'; }
  if (stopBtn) stopBtn.style.display = showStop ? 'flex' : 'none';
}

/* ════════════════════════════════════════════
   VOICE INPUT
   ════════════════════════════════════════════ */
function initVoice() {
  VoiceInput.bindToInput('chat-input', 'voice-btn', () => { sendMessage(); });
}

/* ════════════════════════════════════════════
   TTS CONTROLS
   ════════════════════════════════════════════ */
function initTTSControls() {
  const ttsBtn = document.getElementById('tts-toggle-btn');
  if (ttsBtn) {
    ttsBtn.innerHTML  = TTS.enabled ? '🔊' : '🔇';
    ttsBtn.className += TTS.enabled ? ' tts-on' : '';
    ttsBtn.addEventListener('click', () => {
      const on = TTS.toggle();
      ttsBtn.innerHTML  = on ? '🔊' : '🔇';
      ttsBtn.title      = on ? 'Voice ON — click to mute' : 'Voice OFF — click to enable';
      ttsBtn.classList.toggle('tts-on', on);
      if (!on) TTS.stop();
      showToast(`Voice readback ${on ? 'enabled' : 'disabled'}`, 'info', 2000);
    });
  }

  // Voice selector
  const voiceSel = document.getElementById('tts-voice-select');
  if (voiceSel) {
    const populate = () => {
      voiceSel.innerHTML = TTS.getVoices().map(v =>
        `<option value="${v.name}" ${v.name === TTS.voiceName ? 'selected' : ''}>${v.name}</option>`
      ).join('');
    };
    populate();
    setTimeout(populate, 1000); // retry after voices load
    voiceSel.addEventListener('change', () => TTS.setVoice(voiceSel.value));
  }

  // Rate/Pitch sliders
  const rateSlider  = document.getElementById('tts-rate');
  const pitchSlider = document.getElementById('tts-pitch');
  if (rateSlider)  { rateSlider.value  = TTS.rate;  rateSlider.addEventListener('input',  () => TTS.setRate(+rateSlider.value)); }
  if (pitchSlider) { pitchSlider.value = TTS.pitch; pitchSlider.addEventListener('input', () => TTS.setPitch(+pitchSlider.value)); }
}

/* ════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════ */
function renderSidebar() {
  renderMemoryPanel();
  updateContextPanel();
}

function renderMemoryPanel() {
  const container = document.getElementById('memory-list');
  if (!container) return;
  const memories = Memory.getAll(chatUser.email).slice(0, 12);

  if (memories.length === 0) {
    container.innerHTML = `<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">No memories yet — start chatting!</p>`;
    return;
  }

  container.innerHTML = memories.map(m => `
    <div class="memory-item">
      <span class="memory-type">${MEMORY_TYPE_ICONS[m.type] || '📌'}</span>
      <span class="memory-text">${escapeHtml(m.content)}</span>
      <span class="memory-del" onclick="deleteMemory(${m.id})" title="Forget this">✕</span>
    </div>`).join('');
}

function updateContextPanel() {
  const avgs  = DB.getWeeklyAverages(chatUser.email);
  const score = DB.computeHealthScore(DB.getLogs(chatUser.email, 7));
  const items = {
    'Score':    `${score}/100`,
    'Sleep':    `${avgs.sleep}h`,
    'Water':    `${avgs.water}gl`,
    'Activity': `${avgs.activity}m`,
    'Mood':     `${avgs.mood}/10`,
    'Stress':   `${avgs.stress}/10`,
  };
  const container = document.getElementById('context-grid');
  if (!container) return;
  container.innerHTML = Object.entries(items).map(([k,v]) => `
    <div class="ctx-item">
      <div class="ctx-val">${v}</div>
      <div class="ctx-key">${k}</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════
   MESSAGE ACTIONS
   ════════════════════════════════════════════ */
window.copyMsg = function(btn) {
  const bubble = btn.closest('.msg-content')?.querySelector('.msg-bubble');
  if (!bubble) return;
  navigator.clipboard.writeText(bubble.innerText).then(() => showToast('Copied!', 'success', 1500));
};

window.speakMsg = function(btn) {
  const bubble = btn.closest('.msg-content')?.querySelector('.msg-bubble');
  if (!bubble) return;
  if (TTS.speaking) { TTS.stop(); return; }
  TTS.enabled = true;
  TTS.speak(bubble.innerText);
};

window.deleteMemory = function(id) {
  Memory.delete(chatUser.email, id);
  renderMemoryPanel();
  showToast('Memory removed', 'info', 2000);
};

/* ════════════════════════════════════════════
   MODEL SWITCHER
   ════════════════════════════════════════════ */
window.openModelSwitcher = async function() {
  const models = await LLMConfig.getModels();
  if (models.length === 0) {
    showToast('No models loaded in LM Studio', 'warning'); return;
  }
  const html = `
    <div class="modal-header">
      <h2 class="modal-title">🤖 Switch Model</h2>
      <button class="btn btn-sm btn-secondary modal-close">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Models currently loaded in LM Studio:</p>
      ${models.map(m => `
        <div class="log-entry" style="cursor:pointer" onclick="selectModel('${m.id}')">
          <span style="font-family:var(--font-mono);font-size:12px;color:${m.id===LLMConfig.local.model?'var(--cyan)':'var(--text-secondary)'}">${m.id}</span>
          ${m.id === LLMConfig.local.model ? '<span class="badge badge-cyan" style="margin-left:auto">Active</span>' : ''}
        </div>`).join('')}
    </div>`;
  openModal(html);
};

window.selectModel = function(id) {
  LLMConfig.setModel(id);
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  updateModelPill();
  showToast(`Switched to ${id.split('/').pop()}`, 'success');
};

/* ════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════ */
function scrollToBottom() {
  const c = document.getElementById('chat-messages');
  if (c) requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatMarkdown(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,  '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,      '<em>$1</em>')
    .replace(/`(.*?)`/g,        '<code>$1</code>')
    .replace(/^### (.+)$/gm,    '<strong style="display:block;margin-top:10px;font-size:13px;color:var(--text-secondary)">$1</strong>')
    .replace(/^## (.+)$/gm,     '<strong style="display:block;margin-top:12px">$1</strong>')
    .replace(/^- (.+)$/gm,      '<li>$1</li>')
    .replace(/(<li>.*?<\/li>(\n|$))+/gs, match => `<ul>${match}</ul>`)
    .replace(/\n\n/g,           '</p><p style="margin-top:8px">')
    .replace(/\n/g,             '<br>')
    .replace(/⚕️ Disclaimer:?(.*?)(<br>|$)/g,
      '<div class="disclaimer-inline">⚕️ <strong>Disclaimer:</strong>$1</div>');
}
