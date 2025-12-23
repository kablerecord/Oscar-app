/**
 * OSQR Design System - Token Resolver
 *
 * Utility for resolving design tokens via dot notation path.
 */

import { OSQRDesignTokens } from '../types';
import { DEFAULT_TOKENS } from '../tokens';

/**
 * Resolve design token to actual CSS value
 * Supports dot notation: "colors.accent.primary"
 */
export function resolveToken(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  const parts = path.split('.');
  let current: any = tokens;

  for (const part of parts) {
    if (current[part] === undefined) {
      console.warn(`Design token not found: ${path}`);
      return '';
    }
    current = current[part];
  }

  // Handle non-string values (like numbers)
  if (typeof current === 'number') {
    return String(current);
  }

  return current;
}

/**
 * Get a color token value
 */
export function getColorToken(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`colors.${path}`, tokens);
}

/**
 * Get a typography token value
 */
export function getTypographyToken(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`typography.${path}`, tokens);
}

/**
 * Get a spacing token value
 */
export function getSpacingToken(size: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`spacing.${size}`, tokens);
}

/**
 * Get a shadow token value
 */
export function getShadowToken(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`shadows.${path}`, tokens);
}

/**
 * Get a radius token value
 */
export function getRadiusToken(size: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`radii.${size}`, tokens);
}

/**
 * Get an animation token value
 */
export function getAnimationToken(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  return resolveToken(`animations.${path}`, tokens);
}

/**
 * Check if a token path exists
 */
export function tokenExists(path: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): boolean {
  const parts = path.split('.');
  let current: any = tokens;

  for (const part of parts) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Get all token paths at a given level
 */
export function getTokenPaths(basePath: string, tokens: OSQRDesignTokens = DEFAULT_TOKENS): string[] {
  const parts = basePath.split('.');
  let current: any = tokens;

  for (const part of parts) {
    if (current[part] === undefined) {
      return [];
    }
    current = current[part];
  }

  if (typeof current !== 'object') {
    return [];
  }

  return Object.keys(current).map(key => `${basePath}.${key}`);
}

export default resolveToken;
