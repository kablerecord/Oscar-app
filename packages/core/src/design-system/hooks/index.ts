/**
 * OSQR Design System - Hooks Index
 *
 * Export all hooks and utilities.
 */

export {
  getBreakpointFromWidth,
  matchesBreakpoint,
  getResponsiveValue,
  createMediaQuery,
  getAllMediaQueries,
  breakpointUtils,
  useBreakpointValue,
  createResponsiveStyles,
  type BreakpointKey,
} from './useBreakpoint';

export {
  shouldReduceMotion,
  getMotionSafeDuration,
  getMotionSafeAnimation,
  createMotionSafeStyles,
  getReducedMotionClass,
  getReducedMotionMediaQuery,
  getMotionSafePresenceAnimation,
  animationConfigToCSS,
  DEFAULT_REDUCED_MOTION,
  type PresenceAnimationConfig,
} from './useReducedMotion';
