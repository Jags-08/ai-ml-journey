/**
 * NeuroVision — Production Environment Config
 * Used when `vite build --mode production`.
 * Override via VITE_ env vars in your .env.production file.
 */
export default {
  apiBase:          import.meta.env?.VITE_API_BASE   ?? 'https://api.neurovision.ai',
  debugMode:        false,
  analyticsEnabled: true,
  sentryDSN:        import.meta.env?.VITE_SENTRY_DSN ?? null,
  logLevel:         'warn',          // silence debug/info in production
  mockApiDelay:     0,
  featureOverrides: {},              // no overrides — use real plan gating
};
