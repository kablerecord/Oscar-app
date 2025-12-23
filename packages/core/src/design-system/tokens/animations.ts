/**
 * OSQR Design System - Animation Tokens
 *
 * Timing, easing, and pulse duration values for animations.
 */

import { AnimationTokens, AnimationDurationTokens, AnimationEasingTokens, AnimationPulseTokens } from '../types';

export const duration: AnimationDurationTokens = {
  instant: '0ms',
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
};

export const easing: AnimationEasingTokens = {
  default: 'ease-out',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // ONLY for errors
};

export const pulse: AnimationPulseTokens = {
  idle: '2000ms',
  holding: '1500ms',
  thinking: '2000ms',
  connected: '4000ms',
};

export const animations: AnimationTokens = {
  duration,
  easing,
  pulse,
};

/**
 * Get animation duration by key
 */
export function getDuration(key: keyof AnimationDurationTokens): string {
  return duration[key];
}

/**
 * Get animation easing by key
 */
export function getEasing(key: keyof AnimationEasingTokens): string {
  return easing[key];
}

/**
 * Get pulse duration by state
 */
export function getPulseDuration(key: keyof AnimationPulseTokens): string {
  return pulse[key];
}

export default animations;
