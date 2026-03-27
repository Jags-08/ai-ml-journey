/**
 * NEUROWELL — chat.js
 * Mini AI Health Chat Assistant (Anthropic API)
 */

let chatUser    = null;
let messages    = [];   // { role, content, time }
let isStreaming = false;

const SUGGESTIONS = [
  'Why do I feel tired every day?',
  'How can I sleep better?',
  'What does my health score mean?',
  'Tips to reduce stress?',
  'Am I drinking enough water?',
  'How to build an exercise habit?',
  'What causes my headaches?',
  'How to improve my mood score?'
];

document.addEventListener('DOMContentLoaded', () => {
  chatUser = Auth.guard();
  if (!chatUser) return;

  // Load history
  messages = DB.getChat(chatUser.email);
  renderAllMessages();
  renderSuggestions();
  updateContextPanel();

  // Voice input
  VoiceInput.bindToInput('chat-input', 'voice-btn', text => {
    if (text.trim()) sendMessage();
  });

  // Input events
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  // Send button
  document.getElementById('send-btn')?.addEventListener('click', sendMessage);

  // Clear chat
  document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
    if (confirm('Clear all chat history?')) {
      messages = [];
      DB.clearChat(chatUser.email);
      document.getElementById('chat-messages').innerHTML = '';
      renderSuggestions();
      showToast('Chat cleared', 'info');
    }
  });
});

/* ── SEND MESSAGE ── */
async function sendMessage() {
  if (isStreaming) return;
  const input   = document.getElementById('chat-input');
  const text    = input?.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  // Add user message
  const userMsg = { role: 'user', content: text, time: new Date().toISOString() };
  messages.push(userMsg);
  appendMessage(userMsg);
  hideSuggestions();

  // Thinking indicator
  const thinkingId = appendThinking();
  isStreaming = true;
  setInputState(false);

  try {
    const reply = await callAI(text);
    removeThinking(thinkingId);
    const aiMsg = { role: 'assistant', content: reply, time: new Date().toISOString() };
    messages.push(aiMsg);
    appendMessage(aiMsg);
    DB.saveChat(chatUser.email, messages);
  } catch (err) {
    removeThinking(thinkingId);
    const errMsg = { role: 'assistant', content: `I'm sorry, I encountered an error: ${err.message}. Please try again.`, time: new Date().toISOString() };
    messages.push(errMsg);
    appendMessage(errMsg);
  } finally {
    isStreaming = false;
    setInputState(true);
  }
}
window.sendMessage = sendMessage;

/* ── ANTHROPIC API CALL ── */
async function callAI(userText) {
  const healthContext = PatternEngine.buildHealthContext(chatUser.email);
  const systemPrompt  = `You are NeuroWell AI, a personal health intelligence assistant. You are empathetic, knowledgeable, and concise.

IMPORTANT: You ONLY advise on general wellness topics (sleep, hydration, exercise, stress, mood, nutrition). You do NOT diagnose medical conditions. Always recommend seeing a doctor for serious symptoms.

User's current health data:
${healthContext}

Guidelines:
- Keep responses under 200 words unless the question requires detail
- Use bullet points for lists of tips (max 4-5 points)
- Be encouraging but honest
- Reference the user's actual data when relevant
- For serious symptoms, always recommend professional medical consultation
- Use **bold** for important terms`;

  // Build conversation history for API (last 10 turns)
  const history = messages.slice(-10).map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  // Remove last user message (we'll add it fresh)
  if (history.length > 0 && history[history.length-1].role === 'user') {
    history.pop();
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     systemPrompt,
      messages:   [...history, { role: 'user', content: userText }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content.map(b => b.text || '').join('');
}

/* ── RENDER MESSAGES ── */
function renderAllMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:16px">🧠</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-secondary)">Ask NeuroWell AI anything</div>
        <div style="font-size:13px;margin-top:8px">I'm trained on your health data and ready to help</div>
      </div>`;
    return;
  }
  messages.forEach(m => appendMessage(m, false));
  scrollToBottom();
}

function appendMessage(msg, scroll = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  // Remove empty state
  const empty = container.querySelector('[style*="text-align:center"]');
  if (empty) empty.remove();

  const isUser = msg.role === 'user';
  const html   = formatMarkdown(msg.content);
  const time   = DateUtils.formatTime(msg.time);

  const row    = document.createElement('div');
  row.className = `msg-row ${isUser ? 'user' : 'ai'}`;
  row.innerHTML = `
    <div class="msg-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}">
      ${isUser ? chatUser.name.charAt(0).toUpperCase() : '🧠'}
    </div>
    <div>
      <div class="msg-bubble ${isUser ? 'user' : 'ai'}">${html}</div>
      <span class="msg-time">${time}</span>
    </div>
  `;
  container.appendChild(row);
  if (scroll) scrollToBottom();
}

function appendThinking() {
  const container = document.getElementById('chat-messages');
  const id = 'thinking-' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar ai-avatar">🧠</div>
    <div>
      <div class="msg-bubble ai">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  container.appendChild(row);
  scrollToBottom();
  return id;
}

function removeThinking(id) {
  document.getElementById(id)?.remove();
}

function scrollToBottom() {
  const c = document.getElementById('chat-messages');
  if (c) c.scrollTop = c.scrollHeight;
}

/* ── SUGGESTIONS ── */
function renderSuggestions() {
  const container = document.getElementById('suggestions-row');
  if (!container) return;
  const picks = SUGGESTIONS.sort(() => Math.random()-0.5).slice(0,4);
  container.innerHTML = picks.map(s =>
    `<button class="suggestion-chip" onclick="useSuggestion('${s.replace(/'/g,"\\'")}')">
      ${s}
    </button>`
  ).join('');
}

function hideSuggestions() {
  const s = document.getElementById('suggestions-row');
  if (s) s.style.display = 'none';
}

window.useSuggestion = function(text) {
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; sendMessage(); }
};

/* ── FORMAT MARKDOWN-ish ── */
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/^- (.+)$/gm,    '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s,'<ul>$1</ul>')
    .replace(/\n\n/g,          '</p><p>')
    .replace(/\n/g,            '<br>')
    .replace(/^(.+)$/m, '<p>$1</p>');
}

/* ── UI STATE ── */
function setInputState(enabled) {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (input)   input.disabled   = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

/* ── CONTEXT PANEL ── */
function updateContextPanel() {
  const avgs  = DB.getWeeklyAverages(chatUser.email);
  const score = DB.computeHealthScore(DB.getLogs(chatUser.email, 7));
  const items = {
    'Health Score': `${score}/100`,
    'Avg Sleep':    `${avgs.sleep}h`,
    'Avg Water':    `${avgs.water} gl`,
    'Activity':     `${avgs.activity} min`,
    'Mood':         `${avgs.mood}/10`,
    'Stress':       `${avgs.stress}/10`,
  };
  const container = document.getElementById('context-panel-items');
  if (!container) return;
  container.innerHTML = Object.entries(items).map(([k,v]) =>
    `<div class="context-item"><span class="context-key">${k}</span><span class="context-val">${v}</span></div>`
  ).join('');
}
