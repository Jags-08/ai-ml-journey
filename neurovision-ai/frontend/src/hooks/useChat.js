/**
 * NeuroVision — useChat Hook
 * Encapsulates chat state, message sending, and action execution.
 *
 * Usage:
 *   import { useChat } from '@/hooks/useChat.js';
 *   const chat = useChat();
 *   await chat.send('make it warm');
 *   chat.addMessage('Hello!', 'user');
 */

import { getState, setState, subscribe } from '../core/state.js';
import { AIService } from '../services/aiService.js';
import { ActionEngine } from '../system/actionEngine.js';
import { ContextEngine } from '../system/contextEngine.js';
import { DecisionEngine } from '../system/decisionEngine.js';
import { Logger } from '../core/logger.js';
import { CHAT_HISTORY_MAX } from '../constants/limits.js';

const log = Logger.create('useChat');

export function useChat() {
  function open()  { setState({ chatOpen: true  }); }
  function close() { setState({ chatOpen: false }); }
  function toggle(){ setState({ chatOpen: !getState().chatOpen }); }

  function addMessage(text, role, action = null) {
    const history = getState().chatHistory;
    const entry = { id: Date.now(), text, role, action, ts: Date.now() };
    const trimmed = history.length >= CHAT_HISTORY_MAX
      ? [...history.slice(-CHAT_HISTORY_MAX + 1), entry]
      : [...history, entry];
    setState({ chatHistory: trimmed });
    return entry;
  }

  function clearHistory() {
    setState({ chatHistory: [] });
  }

  async function send(userMessage) {
    if (!userMessage.trim()) return;
    log.debug('Chat send:', userMessage);

    addMessage(userMessage, 'user');

    // Get AI reply
    const context = ContextEngine.compact();
    const reply = await AIService.chat(userMessage, context);

    addMessage(reply.text, 'ai', reply.action || null);

    // Auto-execute action if returned and high confidence
    if (reply.action?.key) {
      log.debug('Auto-execute from chat:', reply.action.key);
      // Don't auto-run — let user click the action button
    }

    return reply;
  }

  function greet() {
    const msg = DecisionEngine.chatGreeting();
    addMessage(msg, 'ai');
  }

  function runAction(key) {
    return ActionEngine.run(key);
  }

  function onChange(cb) {
    return subscribe('chatHistory', cb);
  }

  return {
    open, close, toggle, send, greet, addMessage, clearHistory, runAction, onChange,

    get isOpen()   { return getState().chatOpen; },
    get history()  { return getState().chatHistory; },
    get msgCount() { return getState().chatHistory.length; },
  };
}

export default useChat;
