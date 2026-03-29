/**
 * NEUROWELL — memory.js
 * Long-Term Conversation Memory System
 * Extracts, stores, and injects persistent health facts
 * across sessions so the AI always "remembers" the user
 */

const Memory = {

  /* ── Memory Types ── */
  TYPES: {
    SYMPTOM:     'symptom',
    PREFERENCE:  'preference',
    GOAL:        'goal',
    CONDITION:   'condition',
    MEDICATION:  'medication',
    ALLERGY:     'allergy',
    LIFESTYLE:   'lifestyle',
    EMOTION:     'emotion',
    FACT:        'fact',
  },

  /* ── Save a memory entry ── */
  save(email, type, content, confidence = 1.0) {
    const key  = `nw_memory_${email}`;
    const memories = JSON.parse(localStorage.getItem(key) || '[]');

    // Deduplicate — update existing if same type+content (fuzzy)
    const similar = memories.findIndex(m =>
      m.type === type &&
      m.content.toLowerCase().includes(content.toLowerCase().slice(0, 20))
    );

    const entry = {
      id:          similar >= 0 ? memories[similar].id : Date.now(),
      type,
      content,
      confidence,
      createdAt:   similar >= 0 ? memories[similar].createdAt : new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      accessCount: similar >= 0 ? (memories[similar].accessCount || 0) + 1 : 1,
    };

    if (similar >= 0) memories[similar] = entry;
    else memories.unshift(entry);

    // Keep top 100 memories (prune oldest low-confidence)
    const pruned = memories
      .sort((a, b) => (b.confidence * b.accessCount) - (a.confidence * a.accessCount))
      .slice(0, 100);
    localStorage.setItem(key, JSON.stringify(pruned));
    return entry;
  },

  /* ── Get all memories ── */
  getAll(email) {
    return JSON.parse(localStorage.getItem(`nw_memory_${email}`) || '[]');
  },

  /* ── Get memories by type ── */
  getByType(email, type) {
    return this.getAll(email).filter(m => m.type === type);
  },

  /* ── Delete a memory ── */
  delete(email, id) {
    const key = `nw_memory_${email}`;
    const memories = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(memories.filter(m => m.id !== id)));
  },

  /* ── Clear all memories ── */
  clearAll(email) {
    localStorage.removeItem(`nw_memory_${email}`);
  },

  /* ── Build memory context string for LLM injection ── */
  buildContext(email) {
    const memories = this.getAll(email);
    if (memories.length === 0) return '';

    const grouped = {};
    memories.forEach(m => {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m.content);
    });

    const lines = [];
    const labels = {
      symptom:    '🤒 Known Symptoms',
      condition:  '🏥 Medical Conditions',
      medication: '💊 Medications',
      allergy:    '⚠️ Allergies',
      goal:       '🎯 Health Goals',
      preference: '⚙️ Preferences',
      lifestyle:  '🌱 Lifestyle Facts',
      emotion:    '💭 Emotional Patterns',
      fact:       '📌 Key Facts',
    };

    Object.entries(grouped).forEach(([type, items]) => {
      if (items.length > 0) {
        lines.push(`${labels[type] || type}: ${items.slice(0, 5).join('; ')}`);
      }
    });

    return lines.length > 0
      ? `\n\nLONG-TERM USER MEMORY (from previous sessions):\n${lines.join('\n')}`
      : '';
  },

  /* ── Extract memories from AI conversation using LLM ── */
  async extractFromConversation(email, userMessage, aiResponse) {
    const combined = `User said: "${userMessage}"\nAI responded: "${aiResponse}"`;

    // Heuristic extraction (fast, no LLM call needed for basic facts)
    this._heuristicExtract(email, userMessage);

    // LLM-based extraction for richer facts (async, non-blocking)
    this._llmExtract(email, combined).catch(() => {});
  },

  /* ── Fast heuristic extraction ── */
  _heuristicExtract(email, text) {
    const t = text.toLowerCase();

    // Symptoms
    const symptoms = ['headache','migraine','fatigue','tired','nausea','dizzy','anxiety',
      'depression','insomnia','back pain','chest pain','shortness of breath','joint pain',
      'brain fog','stress','burnout','panic'];
    symptoms.forEach(s => {
      if (t.includes(s)) {
        this.save(email, this.TYPES.SYMPTOM, `Reported: ${s}`, 0.8);
      }
    });

    // Goals
    if (t.includes('want to lose weight') || t.includes('trying to lose'))
      this.save(email, this.TYPES.GOAL, 'Weight loss goal', 0.9);
    if (t.includes('sleep better') || t.includes('improve sleep'))
      this.save(email, this.TYPES.GOAL, 'Improve sleep quality', 0.9);
    if (t.includes('exercise more') || t.includes('be more active'))
      this.save(email, this.TYPES.GOAL, 'Increase physical activity', 0.9);
    if (t.includes('reduce stress') || t.includes('less stressed'))
      this.save(email, this.TYPES.GOAL, 'Stress reduction', 0.9);

    // Conditions
    const conditions = ['diabetes','hypertension','high blood pressure','asthma','thyroid',
      'depression','anxiety disorder','arthritis','heart disease','ibs'];
    conditions.forEach(c => {
      if (t.includes(c)) {
        this.save(email, this.TYPES.CONDITION, `Has: ${c}`, 0.95);
      }
    });

    // Medications
    const medRegex = /(?:take|taking|on|prescribed)\s+([a-zA-Z]+(?:ine|ol|am|in|en|one)\b)/gi;
    let match;
    while ((match = medRegex.exec(text)) !== null) {
      this.save(email, this.TYPES.MEDICATION, `Takes: ${match[1]}`, 0.7);
    }
  },

  /* ── LLM-based deep extraction ── */
  async _llmExtract(email, conversationSnippet) {
    try {
      const isOnline = await LLMConfig.checkStatus();
      if (!isOnline) return;

      const prompt = `Extract health facts from this conversation snippet. Return ONLY a JSON array of objects with fields: type (one of: symptom/condition/medication/allergy/goal/preference/lifestyle/fact), content (brief fact string, max 60 chars). Return [] if nothing notable.

Conversation:
${conversationSnippet.slice(0, 800)}

JSON only, no explanation:`;

      const response = await LLMConfig.complete([
        { role: 'system', content: 'You extract health facts. Return only valid JSON arrays.' },
        { role: 'user',   content: prompt }
      ], { maxTokens: 300, temperature: 0.1 });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const facts = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(facts)) return;

      facts.forEach(f => {
        if (f.type && f.content && Object.values(this.TYPES).includes(f.type)) {
          this.save(email, f.type, f.content, 0.75);
        }
      });
    } catch { /* silent fail */ }
  },

  /* ── Conversation session storage (rolling window) ── */
  saveSession(email, messages) {
    // Keep last 20 turns in session storage for context window
    const session = messages.slice(-20).map(m => ({
      role:    m.role,
      content: m.content.slice(0, 1000) // truncate long messages
    }));
    localStorage.setItem(`nw_session_${email}`, JSON.stringify(session));
  },

  getSession(email) {
    return JSON.parse(localStorage.getItem(`nw_session_${email}`) || '[]');
  },

  clearSession(email) {
    localStorage.removeItem(`nw_session_${email}`);
  }
};

window.Memory = Memory;
