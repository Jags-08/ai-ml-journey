/**
 * NEUROWELL — tts.js
 * Text-to-Speech Voice Output
 * Uses Web Speech Synthesis API for AI response readback
 */

const TTS = {
  synth:        window.speechSynthesis,
  voice:        null,
  speaking:     false,
  enabled:      false,
  _voices:      [],
  _queue:       [],

  SETTINGS_KEY: 'nw_tts_settings',

  /* ── Load saved settings ── */
  init() {
    const saved = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
    this.enabled  = saved.enabled  ?? false;
    this.rate     = saved.rate     ?? 1.0;
    this.pitch    = saved.pitch    ?? 1.0;
    this.volume   = saved.volume   ?? 1.0;
    this.voiceName = saved.voiceName ?? null;

    // Load voices (async on some browsers)
    this._loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  },

  _loadVoices() {
    if (!window.speechSynthesis) return;
    this._voices = window.speechSynthesis.getVoices();
    // Prefer English, natural-sounding voices
    const preferred = this._voices.find(v =>
      v.name === this.voiceName ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('natural')) ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      (v.lang.startsWith('en') && !v.name.toLowerCase().includes('male'))
    );
    this.voice = preferred || this._voices.find(v => v.lang.startsWith('en')) || this._voices[0];
  },

  /* ── Get available voices ── */
  getVoices() {
    return this._voices.filter(v => v.lang.startsWith('en'));
  },

  /* ── Speak text ── */
  speak(text) {
    if (!this.enabled || !window.speechSynthesis || !text) return;

    // Strip markdown-ish formatting for speech
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g,     '$1')
      .replace(/#{1,3}\s/g,      '')
      .replace(/`(.*?)`/g,       '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/⚠️|✅|❌|💡|🎯|🔴|🟡|🟢/g, '')
      .replace(/\n+/g,           '. ')
      .trim();

    if (!clean) return;

    // Stop any current speech
    this.stop();

    // Split into sentences for more natural delivery
    const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];

    sentences.forEach(sentence => {
      const utt = new SpeechSynthesisUtterance(sentence.trim());
      if (this.voice) utt.voice = this.voice;
      utt.rate   = this.rate;
      utt.pitch  = this.pitch;
      utt.volume = this.volume;

      utt.onstart = () => {
        this.speaking = true;
        this._updateUI(true);
      };
      utt.onend = () => {
        this.speaking = false;
        this._updateUI(false);
      };
      utt.onerror = () => {
        this.speaking = false;
        this._updateUI(false);
      };

      window.speechSynthesis.speak(utt);
    });
  },

  /* ── Stop speaking ── */
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speaking = false;
      this._updateUI(false);
    }
  },

  /* ── Toggle TTS on/off ── */
  toggle() {
    this.enabled = !this.enabled;
    this._saveSettings();
    if (!this.enabled) this.stop();
    return this.enabled;
  },

  /* ── Save settings ── */
  _saveSettings() {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify({
      enabled:   this.enabled,
      rate:      this.rate,
      pitch:     this.pitch,
      volume:    this.volume,
      voiceName: this.voice?.name || null
    }));
  },

  setVoice(name) {
    this.voice = this._voices.find(v => v.name === name) || this.voice;
    this.voiceName = name;
    this._saveSettings();
  },

  setRate(r)   { this.rate   = r; this._saveSettings(); },
  setPitch(p)  { this.pitch  = p; this._saveSettings(); },
  setVolume(v) { this.volume = v; this._saveSettings(); },

  /* ── Update speak button UI ── */
  _updateUI(isSpeaking) {
    const btn = document.getElementById('tts-toggle-btn');
    if (!btn) return;
    if (isSpeaking) {
      btn.innerHTML = '🔊';
      btn.classList.add('active');
      btn.title = 'Speaking... click to stop';
    } else {
      btn.innerHTML = this.enabled ? '🔊' : '🔇';
      btn.classList.remove('active');
      btn.title = this.enabled ? 'Voice on — click to mute' : 'Voice off — click to enable';
    }
  },

  /* ── Check support ── */
  isSupported() {
    return 'speechSynthesis' in window;
  }
};

TTS.init();
window.TTS = TTS;
