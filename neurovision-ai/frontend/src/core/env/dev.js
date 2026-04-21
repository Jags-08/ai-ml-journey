/**
 * NeuroVision — Development Environment Config
 * Used when `vite --mode development` (default).
 */
export default {
  apiBase:          'http://localhost:8000',
  debugMode:        true,
  analyticsEnabled: false,
  sentryDSN:        null,
  logLevel:         'debug',         // 'debug' | 'info' | 'warn' | 'error'
  mockApiDelay:     800,             // ms to simulate latency in dev
  featureOverrides: {
    // force-enable features regardless of plan for local testing
    batch:    true,
    hdExport: true,
    chat:     true,
  },
};
