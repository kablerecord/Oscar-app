/**
 * OSQR Design System - Spacing Tokens
 *
 * Spacing scale based on 4px base unit.
 */

import { SpacingTokens } from '../types';

export const spacing: SpacingTokens = {
  '0': '0px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
};

/**
 * Get spacing value by key
 */
export function getSpacing(key: keyof SpacingTokens): string {
  return spacing[key];
}

/**
 * Convert spacing token to number (in pixels)
 */
export function spacingToNumber(key: keyof SpacingTokens): number {
  return parseInt(spacing[key], 10);
}

export default spacing;
