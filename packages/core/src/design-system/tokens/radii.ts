/**
 * OSQR Design System - Border Radius Tokens
 *
 * Border radius values for rounded corners.
 */

import { RadiiTokens } from '../types';

export const radii: RadiiTokens = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '28px',   // Bubble main
  full: '9999px',  // Pills, circles
};

/**
 * Get radius value by key
 */
export function getRadius(key: keyof RadiiTokens): string {
  return radii[key];
}

export default radii;
