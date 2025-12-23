/**
 * OSQR Design System - Unified Token Export
 *
 * Single source of truth for all design tokens.
 */

import { OSQRDesignTokens } from '../types';
import { colors } from './colors';
import { typography } from './typography';
import { spacing, getSpacing, spacingToNumber } from './spacing';
import { shadows, glowTokens } from './shadows';
import { radii, getRadius } from './radii';
import { animations, duration, easing, pulse, getDuration, getEasing, getPulseDuration } from './animations';
import { breakpoints, getBreakpoint, getBreakpointValue, resolveResponsive, getCurrentBreakpoint, bubbleDimensions, isBreakpointOrAbove } from './breakpoints';

/**
 * Default OSQR Design Tokens
 * The complete token object for use throughout the application.
 */
export const DEFAULT_TOKENS: OSQRDesignTokens = {
  colors,
  typography,
  spacing,
  shadows,
  radii,
  animations,
};

// Re-export individual token modules
export { colors } from './colors';
export { typography } from './typography';
export { spacing, getSpacing, spacingToNumber } from './spacing';
export { shadows, glowTokens } from './shadows';
export { radii, getRadius } from './radii';
export { animations, duration, easing, pulse, getDuration, getEasing, getPulseDuration } from './animations';
export {
  breakpoints,
  getBreakpoint,
  getBreakpointValue,
  resolveResponsive,
  getCurrentBreakpoint,
  bubbleDimensions,
  isBreakpointOrAbove,
} from './breakpoints';

// Export the unified token object as default
export default DEFAULT_TOKENS;
