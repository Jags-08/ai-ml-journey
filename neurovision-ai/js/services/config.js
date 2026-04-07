/**
 * config.js — Centralised configuration values.
 * Change endpoints and models here only.
 */

export const Config = {
  // LM Studio local server (user can change port)
  lmStudioUrl: 'http://localhost:1234',
  lmModel:     'local-model',

  // Timeouts
  chatTimeoutMs: 30_000,

  // Chat
  maxChatTokens: 700,
  maxChatHistory: 20, // pairs kept before truncation

  // Analysis simulation timing (ms) — tweak for demo feel
  analysisDetectMs:  900,
  analysisEmotionMs: 700,
  analysisInsightMs: 400,
};
