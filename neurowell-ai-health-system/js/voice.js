/**
 * NEUROWELL — voice.js
 * Voice Input using Web Speech API
 */

const VoiceInput = {
  recognition: null,
  isListening: false,
  onResult:    null,
  onStart:     null,
  onEnd:       null,
  onError:     null,

  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  init() {
    if (!this.isSupported()) return false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang         = 'en-US';
    this.recognition.interimResults = true;
    this.recognition.continuous    = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onresult = e => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) final   += transcript;
        else                       interim += transcript;
      }
      if (this.onResult) this.onResult(final || interim, !!final);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };

    this.recognition.onerror = e => {
      this.isListening = false;
      if (this.onError) this.onError(e.error);
      if (this.onEnd)   this.onEnd();
    };

    return true;
  },

  start() {
    if (!this.recognition) {
      if (!this.init()) {
        showToast('Voice input not supported in this browser', 'error');
        return false;
      }
    }
    if (this.isListening) return false;
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Voice start error:', e);
      return false;
    }
  },

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  },

  toggle() {
    return this.isListening ? (this.stop(), false) : this.start();
  },

  /**
   * Bind voice input to a specific textarea/input
   * @param {string} inputId      - Target input element ID
   * @param {string} btnId        - Voice button element ID
   * @param {Function} onFinal    - Called with final transcript
   */
  bindToInput(inputId, btnId, onFinal) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (!input || !btn) return;

    if (!this.isSupported()) {
      btn.style.opacity = '0.3';
      btn.title = 'Voice input not supported';
      return;
    }

    let fullTranscript = '';

    this.onStart = () => {
      btn.classList.add('active');
      btn.title = 'Recording... click to stop';
      fullTranscript = input.value;
      showVoiceStatus(true);
    };

    this.onResult = (text, isFinal) => {
      if (isFinal) {
        input.value = (fullTranscript + ' ' + text).trim();
        fullTranscript = input.value;
      } else {
        input.value = (fullTranscript + ' ' + text).trim();
      }
      // Auto-resize textarea
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    };

    this.onEnd = () => {
      btn.classList.remove('active');
      btn.title = 'Voice input';
      showVoiceStatus(false);
      if (onFinal && input.value) onFinal(input.value);
    };

    this.onError = err => {
      showToast(`Voice error: ${err}`, 'error');
    };

    btn.addEventListener('click', () => this.toggle());
  }
};

function showVoiceStatus(show) {
  let el = document.getElementById('voice-status');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'voice-status';
      el.className = 'voice-status';
      el.innerHTML = '🔴 Recording... speak now';
    }
    const inputArea = document.querySelector('.chat-input-area') || document.querySelector('.log-section');
    if (inputArea) inputArea.prepend(el);
  } else {
    if (el) el.remove();
  }
}

window.VoiceInput = VoiceInput;
