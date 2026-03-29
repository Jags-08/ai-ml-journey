/**
 * NEUROWELL — emotion.js
 * Real-time Emotion Detection
 * Detects emotions from text using heuristics + optional LLM classification
 */

const EmotionDetector = {

  /* ── Emotion Definitions ── */
  EMOTIONS: {
    anxious:   { emoji: '😰', color: '#ffab00', label: 'Anxious',   tone: 'calming' },
    sad:       { emoji: '😔', color: '#b388ff', label: 'Sad',       tone: 'empathetic' },
    frustrated:{ emoji: '😤', color: '#ff3d6b', label: 'Frustrated',tone: 'validating' },
    happy:     { emoji: '😊', color: '#39ff8f', label: 'Happy',     tone: 'upbeat' },
    tired:     { emoji: '😴', color: '#00e5ff', label: 'Tired',     tone: 'gentle' },
    pain:      { emoji: '🤕', color: '#ff3d6b', label: 'In Pain',   tone: 'concerned' },
    hopeful:   { emoji: '🌟', color: '#39ff8f', label: 'Hopeful',   tone: 'encouraging' },
    scared:    { emoji: '😨', color: '#ffab00', label: 'Scared',    tone: 'reassuring' },
    overwhelmed:{ emoji: '😵', color: '#ff3d6b', label: 'Overwhelmed', tone: 'supportive' },
    neutral:   { emoji: '😐', color: '#8ab4cc', label: 'Neutral',   tone: 'informative' },
  },

  /* ── Keyword maps ── */
  KEYWORDS: {
    anxious:   ['anxious','anxiety','worried','nervous','panic','stress','overwhelmed','scared','fear','dread','uneasy','tense'],
    sad:       ['sad','depressed','unhappy','down','low','miserable','hopeless','crying','tears','alone','lonely'],
    frustrated:['frustrated','angry','annoyed','irritated','upset','mad','fed up','hate','terrible'],
    happy:     ['happy','great','amazing','wonderful','good','better','excellent','fantastic','excited','grateful','proud'],
    tired:     ['tired','exhausted','fatigue','sleepy','drained','weak','no energy','lethargic','burnt out','burnout'],
    pain:      ['pain','hurt','ache','sore','throbbing','burning','sharp pain','chest pain','headache','migraine'],
    hopeful:   ['hope','hoping','better','improve','progress','trying','working on','want to'],
    scared:    ['scared','frightened','terrified','afraid','worried about','not sure','uncertain'],
    overwhelmed:['overwhelmed','too much','can\'t cope','falling apart','breaking down','too stressed'],
  },

  /* ── Detect emotion from text ── */
  detect(text) {
    if (!text || text.trim().length < 3) return this.EMOTIONS.neutral;
    const lower = text.toLowerCase();
    const scores = {};

    Object.entries(this.KEYWORDS).forEach(([emotion, keywords]) => {
      scores[emotion] = 0;
      keywords.forEach(kw => {
        if (lower.includes(kw)) scores[emotion] += 1;
      });
    });

    // Boost score for punctuation signals
    if (text.includes('!!!') || text.includes('???')) {
      scores.frustrated = (scores.frustrated || 0) + 0.5;
    }
    if (text.includes('😢') || text.includes('😭')) scores.sad = (scores.sad || 0) + 2;
    if (text.includes('😊') || text.includes('😄')) scores.happy = (scores.happy || 0) + 2;
    if (text.includes('😰') || text.includes('😱')) scores.anxious = (scores.anxious || 0) + 2;

    const top = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
    if (!top || top[1] === 0) return this.EMOTIONS.neutral;
    return { ...this.EMOTIONS[top[0]], key: top[0] };
  },

  /* ── Intensity (0-1) ── */
  intensity(text) {
    if (!text) return 0;
    const lower = text.toLowerCase();
    let score = 0;
    const allKeywords = Object.values(this.KEYWORDS).flat();
    allKeywords.forEach(kw => { if (lower.includes(kw)) score++; });
    // Normalize
    return Math.min(1, score / 5);
  },

  /* ── Build emotion-aware tone instruction for LLM ── */
  toneInstruction(emotion) {
    const tones = {
      calming:     'Respond in a calm, soothing tone. Acknowledge the anxiety. Offer breathing tips if appropriate.',
      empathetic:  'Respond with deep empathy and compassion. Validate their feelings. Be gentle and supportive.',
      validating:  'Validate their frustration. Be direct but kind. Help them channel the energy constructively.',
      upbeat:      'Match their positive energy. Be encouraging and build on their momentum.',
      gentle:      'Use a soft, gentle tone. Acknowledge their fatigue. Keep suggestions simple and achievable.',
      concerned:   'Show genuine concern. Assess severity carefully. Recommend professional care if needed.',
      encouraging: 'Be encouraging and reinforce their hope. Provide actionable positive steps.',
      reassuring:  'Reassure them with facts. Stay calm and clear. Help them feel safe.',
      supportive:  'Be supportive and validating. Break things into small steps. Reduce overwhelm.',
      informative: 'Be clear, informative, and professional.',
    };
    return tones[emotion?.tone] || tones.informative;
  },

  /* ── Render emotion badge in UI ── */
  renderBadge(emotion) {
    if (!emotion || emotion.key === 'neutral') return '';
    return `<span class="emotion-badge" style="background:${emotion.color}20;color:${emotion.color};border:1px solid ${emotion.color}50;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">
      ${emotion.emoji} ${emotion.label}
    </span>`;
  }
};

window.EmotionDetector = EmotionDetector;
