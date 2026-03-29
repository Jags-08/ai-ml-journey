/**
 * NEUROWELL — llm-config.js
 * Central LLM Configuration
 * Supports: LM Studio (local) → graceful offline fallback
 */

const LLMConfig = {

  /* ── Local LM Studio Settings ── */
  local: {
    baseURL:    'http://localhost:1234/v1',
    apiKey:     'lm-studio',            // LM Studio accepts any non-empty string
    model:      'gpt-4o-mini-2024-07-18', // Change to your loaded model identifier
    maxTokens:  2048,
    temperature: 0.7,
    streaming:  true,
  },

  /* ── Status ── */
  _status: 'unknown',   // 'online' | 'offline' | 'unknown'
  _lastCheck: 0,
  CHECK_INTERVAL: 15000, // re-check every 15s

  /* ── Medical System Prompt ── */
  SYSTEM_PROMPT: `You are NeuroWell AI, a professional medical health assistant integrated into a personal health tracking system.

ROLE: Provide evidence-based health advice, symptom interpretation, and wellness guidance based on the user's tracked health data.

DISCLAIMER (always applicable): You are an AI assistant and NOT a substitute for professional medical consultation. For emergencies, serious symptoms, or medical decisions, always recommend consulting a licensed healthcare provider.

GUIDELINES:
- Be empathetic, clear, and concise (under 250 words unless detail is needed)
- Reference the user's actual health data when available
- Use bullet points for tips (max 5)
- Flag serious symptoms immediately with ⚠️ and recommend professional help
- Include a brief disclaimer at the end of medical advice responses
- Detect and acknowledge emotional state in your response tone
- Never diagnose conditions — provide information and guidance only
- Support languages: respond in the same language the user writes in

PERSONALITY: Warm, professional, knowledgeable — like a caring doctor friend.`,

  /* ── Check if LM Studio is online ── */
  async checkStatus() {
    const now = Date.now();
    if (now - this._lastCheck < this.CHECK_INTERVAL && this._status !== 'unknown') {
      return this._status === 'online';
    }
    this._lastCheck = now;
    try {
      const res = await fetch(`${this.local.baseURL}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.local.apiKey}` },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        // Auto-detect loaded model
        if (data.data && data.data.length > 0) {
          const loadedModel = data.data[0].id;
          if (loadedModel) this.local.model = loadedModel;
        }
        this._status = 'online';
        return true;
      }
      this._status = 'offline';
      return false;
    } catch {
      this._status = 'offline';
      return false;
    }
  },

  /* ── Get loaded models list ── */
  async getModels() {
    try {
      const res = await fetch(`${this.local.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.local.apiKey}` },
        signal: AbortSignal.timeout(3000)
      });
      const data = await res.json();
      return data.data || [];
    } catch { return []; }
  },

  /* ── Non-streaming completion ── */
  async complete(messages, options = {}) {
    const isOnline = await this.checkStatus();
    if (!isOnline) throw new Error('LOCAL_OFFLINE');

    const res = await fetch(`${this.local.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.local.apiKey}`
      },
      body: JSON.stringify({
        model:       options.model       || this.local.model,
        messages,
        max_tokens:  options.maxTokens   || this.local.maxTokens,
        temperature: options.temperature || this.local.temperature,
        stream:      false
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `LLM Error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  /* ── Streaming completion (generator) ── */
  async *stream(messages, options = {}) {
    const isOnline = await this.checkStatus();
    if (!isOnline) throw new Error('LOCAL_OFFLINE');

    const res = await fetch(`${this.local.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.local.apiKey}`
      },
      body: JSON.stringify({
        model:       options.model       || this.local.model,
        messages,
        max_tokens:  options.maxTokens   || this.local.maxTokens,
        temperature: options.temperature || this.local.temperature,
        stream:      true
      }),
      signal: options.signal || AbortSignal.timeout(120000)
    });

    if (!res.ok) throw new Error(`LLM stream error ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') return;
        try {
          const chunk = JSON.parse(jsonStr);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch { /* skip malformed */ }
      }
    }
  },

  /* ── Update model ── */
  setModel(modelId) {
    this.local.model = modelId;
    localStorage.setItem('nw_llm_model', modelId);
  },

  /* ── Load saved model preference ── */
  init() {
    const saved = localStorage.getItem('nw_llm_model');
    if (saved) this.local.model = saved;
  }
};

LLMConfig.init();
window.LLMConfig = LLMConfig;
