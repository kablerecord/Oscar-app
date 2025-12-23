/**
 * OSQR Design System
 *
 * A unified design token system for visual identity, interaction patterns,
 * and component standards across all OSQR platforms.
 *
 * @module design-system
 */

// Export types
export * from './types';

// Export tokens
export {
  DEFAULT_TOKENS,
  colors,
  typography,
  spacing,
  getSpacing,
  spacingToNumber,
  shadows,
  glowTokens,
  radii,
  getRadius,
  animations,
  duration,
  easing,
  pulse,
  getDuration,
  getEasing,
  getPulseDuration,
  breakpoints,
  getBreakpoint,
  getBreakpointValue,
  resolveResponsive,
  getCurrentBreakpoint,
  bubbleDimensions,
  isBreakpointOrAbove,
} from './tokens';

// Export utilities
export {
  resolveToken,
  getColorToken,
  getTypographyToken,
  getSpacingToken,
  getShadowToken,
  getRadiusToken,
  getAnimationToken,
  tokenExists,
  getTokenPaths,
  resolvePresenceVisuals,
  getPresenceAnimationClass,
  getBubbleStateClass,
  getShadowIntensityStyle,
  shouldAnimateTransition,
  getStateTransitionDuration,
  hexToRgb,
  rgbToHex,
  hexToRgba,
  parseRgba,
  lighten,
  darken,
  getLuminance,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  isLightColor,
  getTextColorForBackground,
  isValidHex,
  isValidRgba,
  blendColors,
  generateCSSVariables,
  generateCategoryVariables,
  getVariableName,
  getVariableRef,
  generateDarkThemeVariables,
  generateHighContrastVariables,
} from './utils';

// Export hooks
export {
  getBreakpointFromWidth,
  matchesBreakpoint,
  getResponsiveValue,
  createMediaQuery,
  getAllMediaQueries,
  breakpointUtils,
  useBreakpointValue,
  createResponsiveStyles,
  shouldReduceMotion,
  getMotionSafeDuration,
  getMotionSafeAnimation,
  createMotionSafeStyles,
  getReducedMotionClass,
  getReducedMotionMediaQuery,
  getMotionSafePresenceAnimation,
  animationConfigToCSS,
  DEFAULT_REDUCED_MOTION,
} from './hooks';

// Export component types and helpers
export {
  type OSQRBaseProps,
  type ButtonProps,
  type InputProps,
  type CardProps,
  type BadgeProps,
  type IconContainerProps,
  type StyleObject,
  getButtonVariantStyles,
  getSizeStyles,
  getBadgeVariantStyles,
  getIconContainerStateStyles,
} from './components';

// Version and metadata
export const DESIGN_SYSTEM_VERSION = '1.0.0';
export const DESIGN_SYSTEM_NAME = 'OSQR Design System';

/**
 * Design System Constants
 */
export const DESIGN_SYSTEM = {
  version: DESIGN_SYSTEM_VERSION,
  name: DESIGN_SYSTEM_NAME,

  // Bubble identification
  bubble: {
    minWidth: 280,
    maxWidth: 400,
    defaultWidth: 380,
    mobileMargin: 16,
    desktopMargin: 24,
    touchTargetMin: 44, // px - WCAG requirement
  },

  // Animation naming conventions
  animationNames: {
    subtlePulse: 'subtle-pulse',
    thinkingPulse: 'thinking-pulse',
    connectedBreathing: 'connected-breathing',
    pulseGlowAmber: 'pulse-glow-amber',
    shimmer: 'shimmer',
    float: 'float',
    ping: 'ping',
  },

  // CSS class prefixes
  classPrefix: 'osqr',
  cssVarPrefix: '--osqr',

  // State CSS classes
  stateClasses: {
    idle: 'bubble--idle',
    thinking: 'bubble--thinking',
    waiting: 'bubble--waiting',
    connected: 'bubble--connected',
    holding: 'bubble--holding',
    hidden: 'bubble--hidden',
  },
} as const;
