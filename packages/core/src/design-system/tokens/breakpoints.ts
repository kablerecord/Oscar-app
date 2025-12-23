/**
 * OSQR Design System - Breakpoint Tokens
 *
 * Responsive breakpoints for cross-platform consistency.
 */

import { Breakpoints, ResponsiveValue } from '../types';

export const breakpoints: Breakpoints = {
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop
  xl: '1280px',   // Large desktop
  '2xl': '1536px', // Extra large
};

/**
 * Get breakpoint value in pixels
 */
export function getBreakpoint(key: keyof Breakpoints): string {
  return breakpoints[key];
}

/**
 * Get breakpoint value as number
 */
export function getBreakpointValue(key: keyof Breakpoints): number {
  return parseInt(breakpoints[key], 10);
}

/**
 * Resolve responsive value for a given viewport width
 */
export function resolveResponsive<T>(value: ResponsiveValue<T>, width: number): T {
  if (width >= 1536 && value.xl) return value.xl;
  if (width >= 1280 && value.xl) return value.xl;
  if (width >= 1024 && value.lg) return value.lg;
  if (width >= 768 && value.md) return value.md;
  if (width >= 640 && value.sm) return value.sm;
  return value.base;
}

/**
 * Determine current breakpoint from viewport width
 */
export function getCurrentBreakpoint(width: number): keyof Breakpoints | 'base' {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'base';
}

/**
 * Bubble dimensions by breakpoint
 */
export const bubbleDimensions: ResponsiveValue<{ width: string; bottom: string; right: string }> = {
  base: { width: 'calc(100vw - 2rem)', bottom: '80px', right: '16px' },  // Mobile
  md: { width: '380px', bottom: '24px', right: '24px' },                  // Desktop
};

/**
 * Check if viewport is at or above a breakpoint
 */
export function isBreakpointOrAbove(width: number, breakpoint: keyof Breakpoints): boolean {
  return width >= getBreakpointValue(breakpoint);
}

export default breakpoints;
