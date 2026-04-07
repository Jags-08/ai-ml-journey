/**
 * api.js — All external API calls.
 * Rule: No UI logic, no DOM access, no state mutations.
 * Returns raw data; callers decide what to do with it.
 */

import { Config } from './config.js';

/**
 * Send a chat request to LM Studio.
 *
 * @param {Array<{role:string, content:string}>} messages
 * @param {string} systemPrompt
 * @returns {Promise<string>} The assistant's reply text
 */
export async function chatWithLM(messages, systemPrompt) {
  const res = await fetch(`${Config.lmStudioUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      Config.lmModel,
      max_tokens: Config.maxChatTokens,
      stream:     false,
      messages:   [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
    signal: AbortSignal.timeout(Config.chatTimeoutMs),
  });

  if (!res.ok) {
    throw new Error(`LM Studio responded with ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LM Studio');
  return content;
}
