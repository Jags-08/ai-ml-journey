/**
 * NeuroVision — Application Limits & Thresholds
 * All numeric limits in one place — no more magic numbers.
 */

// ── File Upload ──────────────────────────────────────────
export const MAX_FILE_MB       = 20;
export const MAX_FILE_BYTES    = MAX_FILE_MB * 1024 * 1024;
export const MIN_FILE_BYTES    = 512;
export const ALLOWED_TYPES     = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

// ── Plan Usage ───────────────────────────────────────────
export const FREE_DAILY_LIMIT  = 5;
export const PRO_DAILY_LIMIT   = Infinity;
export const BATCH_MAX_FREE    = 3;
export const BATCH_MAX_PRO     = 50;

// ── API ──────────────────────────────────────────────────
export const API_TIMEOUT_MS      = 10_000;
export const ANALYZE_TIMEOUT_MS  = 12_000;
export const ENHANCE_TIMEOUT_MS  = 15_000;
export const CHAT_TIMEOUT_MS     = 8_000;
export const HEALTH_TIMEOUT_MS   = 3_000;
export const MAX_RETRIES         = 3;
export const RETRY_BASE_DELAY_MS = 500;

// ── Image Quality Thresholds ─────────────────────────────
export const BRIGHTNESS_LOW   = 60;
export const BRIGHTNESS_HIGH  = 210;
export const BRIGHTNESS_OK_LO = 80;
export const BRIGHTNESS_OK_HI = 200;
export const CONTRAST_LOW     = 30;
export const CONTRAST_IDEAL   = 45;
export const SHARPNESS_LOW    = 8;
export const SHARPNESS_IDEAL  = 12;
export const SHARPNESS_HIGH   = 25;
export const COLORFUL_LOW     = 5;
export const COLORFUL_IDEAL   = 12;
export const COLORFUL_HIGH    = 25;
export const WARM_BIAS_MIN    = 30;

// ── Scoring ──────────────────────────────────────────────
export const QUALITY_BASE     = 55;
export const VIRALITY_BASE    = 40;
export const QUALITY_GOOD     = 70;
export const QUALITY_GREAT    = 85;
export const MAX_SCORE        = 97;

// ── Performance ──────────────────────────────────────────
export const DEBOUNCE_INPUT_MS  = 300;
export const THROTTLE_SCROLL_MS = 50;
export const THROTTLE_RESIZE_MS = 100;
export const LAZY_LOAD_ROOT_MARGIN = '200px';
export const CANVAS_SAMPLE_STEP = 60;

// ── Chat ─────────────────────────────────────────────────
export const CHAT_HISTORY_MAX   = 50;
export const CHAT_REPLY_MIN_MS  = 600;
export const CHAT_REPLY_MAX_MS  = 1000;

// ── Storage Keys ─────────────────────────────────────────
export const STORAGE_KEY_PLAN     = 'nv_plan';
export const STORAGE_KEY_USAGE    = 'nv_usage';
export const STORAGE_KEY_DATE     = 'nv_date';
export const STORAGE_KEY_HISTORY  = 'nv_chat_history';
export const STORAGE_KEY_SETTINGS = 'nv_settings';

// ── Zoom ─────────────────────────────────────────────────
export const ZOOM_MIN  = 0.1;
export const ZOOM_MAX  = 4;
export const ZOOM_STEP = 0.25;
