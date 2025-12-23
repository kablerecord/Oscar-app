/**
 * OSQR Design System - Utilities Index
 *
 * Export all utility functions.
 */

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
} from './resolveToken';

export {
  resolvePresenceVisuals,
  getPresenceAnimationClass,
  getBubbleStateClass,
  getShadowIntensityStyle,
  shouldAnimateTransition,
  getStateTransitionDuration,
} from './presenceVisuals';

export {
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
} from './colorUtils';

export {
  generateCSSVariables,
  generateCategoryVariables,
  getVariableName,
  getVariableRef,
  generateDarkThemeVariables,
  generateHighContrastVariables,
} from './generateCSSVariables';
