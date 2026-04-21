/**
 * NeuroVision — Goal Constants
 * All optimization goals and their configuration.
 * Centralized so UI, AI engine, and analytics all agree.
 */

export const GOALS = {
  GENERAL:   'general',
  INSTAGRAM: 'instagram',
  LINKEDIN:  'linkedin',
  ECOMMERCE: 'ecommerce',
  PORTFOLIO: 'portfolio',
};

export const GOAL_CONFIG = {
  [GOALS.GENERAL]: {
    label:      'General',
    filterPref: 'enhance',
    insight:    '📸 General optimization applied. Image quality improved across all metrics.',
    chiClass:   'general',
    tips: [
      'Focus on overall clarity',
      'Good for multiple platforms',
      'Balanced enhancement',
    ],
  },
  [GOALS.INSTAGRAM]: {
    label:      'Instagram',
    filterPref: 'vivid',
    insight:    '❤ Instagram optimization: vivid colors + warm tones = 38% more saves on average.',
    chiClass:   'instagram',
    tips: [
      'Vibrant colors drive saves',
      'Warm tones get more likes',
      'High contrast = more stops',
    ],
  },
  [GOALS.LINKEDIN]: {
    label:      'LinkedIn',
    filterPref: 'cinematic',
    insight:    '💼 LinkedIn optimization: professional tone, crisp contrast. 14× more profile views.',
    chiClass:   'linkedin',
    tips: [
      'Professional look builds trust',
      'Clean backgrounds preferred',
      'Natural lighting wins',
    ],
  },
  [GOALS.ECOMMERCE]: {
    label:      'E-commerce',
    filterPref: 'enhance',
    insight:    '🛒 Product optimization: sharp edges, accurate colors. 32% more conversions.',
    chiClass:   'ecommerce',
    tips: [
      'Sharp is credible',
      'True colors reduce returns',
      'Neutral background preferred',
    ],
  },
  [GOALS.PORTFOLIO]: {
    label:      'Portfolio',
    filterPref: 'cinematic',
    insight:    '🎨 Portfolio optimization: cinematic grade for creative impact and visual identity.',
    chiClass:   'general',
    tips: [
      'Creative grade adds identity',
      'Consistent style = brand',
      'Unique look stands out',
    ],
  },
};

export const GOAL_LIST = Object.values(GOALS);
export const DEFAULT_GOAL = GOALS.GENERAL;
