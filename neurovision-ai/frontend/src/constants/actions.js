/**
 * NeuroVision — Action Constants
 * Single source of truth for all dispatchable actions.
 * Prevents typos and magic strings across the codebase.
 */

// ── Upload Actions ──────────────────────────────────────
export const UPLOAD_START      = 'UPLOAD_START';
export const UPLOAD_SUCCESS    = 'UPLOAD_SUCCESS';
export const UPLOAD_ERROR      = 'UPLOAD_ERROR';
export const UPLOAD_RESET      = 'UPLOAD_RESET';

// ── Analysis Actions ────────────────────────────────────
export const ANALYSIS_START    = 'ANALYSIS_START';
export const ANALYSIS_SUCCESS  = 'ANALYSIS_SUCCESS';
export const ANALYSIS_ERROR    = 'ANALYSIS_ERROR';
export const ANALYSIS_RESET    = 'ANALYSIS_RESET';

// ── Filter / Edit Actions ───────────────────────────────
export const FILTER_APPLY      = 'FILTER_APPLY';
export const DIP_OP_APPLY      = 'DIP_OP_APPLY';
export const AUTOFIX_START     = 'AUTOFIX_START';
export const AUTOFIX_DONE      = 'AUTOFIX_DONE';
export const UNDO_LAST         = 'UNDO_LAST';
export const RESET_TO_ORIGINAL = 'RESET_TO_ORIGINAL';

// ── Chat Actions ─────────────────────────────────────────
export const CHAT_OPEN         = 'CHAT_OPEN';
export const CHAT_CLOSE        = 'CHAT_CLOSE';
export const CHAT_MSG_SEND     = 'CHAT_MSG_SEND';
export const CHAT_MSG_RECEIVE  = 'CHAT_MSG_RECEIVE';
export const CHAT_CLEAR        = 'CHAT_CLEAR';

// ── UI / Navigation ──────────────────────────────────────
export const SET_GOAL          = 'SET_GOAL';
export const SET_ZOOM          = 'SET_ZOOM';
export const TOGGLE_OVERLAY    = 'TOGGLE_OVERLAY';
export const TOGGLE_COMPARE    = 'TOGGLE_COMPARE';
export const TOGGLE_EXPLAIN    = 'TOGGLE_EXPLAIN';
export const OPEN_PRICING      = 'OPEN_PRICING';
export const CLOSE_PRICING     = 'CLOSE_PRICING';
export const OPEN_PAYMENT      = 'OPEN_PAYMENT';
export const CLOSE_PAYMENT     = 'CLOSE_PAYMENT';

// ── Session / Plan ───────────────────────────────────────
export const SET_PLAN          = 'SET_PLAN';
export const INCREMENT_USAGE   = 'INCREMENT_USAGE';
export const RESET_USAGE       = 'RESET_USAGE';

// ── Batch ────────────────────────────────────────────────
export const BATCH_ADD         = 'BATCH_ADD';
export const BATCH_REMOVE      = 'BATCH_REMOVE';
export const BATCH_START       = 'BATCH_START';
export const BATCH_ITEM_UPDATE = 'BATCH_ITEM_UPDATE';
export const BATCH_DONE        = 'BATCH_DONE';

// ── Network ──────────────────────────────────────────────
export const NET_ONLINE        = 'NET_ONLINE';
export const NET_OFFLINE       = 'NET_OFFLINE';
export const NET_SLOW          = 'NET_SLOW';

// ── Export ───────────────────────────────────────────────
export const EXPORT_IMAGE      = 'EXPORT_IMAGE';

// ── Chat Command Keys ────────────────────────────────────
export const CHAT_CMD = {
  IMPROVE_BRIGHTNESS: 'improve brightness',
  MAKE_BRIGHTER:      'make brighter',
  FIX_LIGHTING:       'fix lighting',
  ADD_WARMTH:         'add warmth',
  MAKE_WARM:          'make warm',
  MAKE_COOL:          'make cool',
  BLACK_AND_WHITE:    'black and white',
  GRAYSCALE:          'grayscale',
  SHARPEN:            'sharpen',
  FIX_EVERYTHING:     'fix everything',
  AUTO_FIX:           'auto fix',
  ENHANCE:            'enhance',
  VIVID:              'vivid',
  CINEMATIC:          'cinematic',
  COMPARE:            'compare',
  EXPORT:             'export',
  SAVE:               'save',
  UNDO:               'undo',
  RESET:              'reset',
};
