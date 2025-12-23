/**
 * OSQR Design System - useBreakpoint Hook
 *
 * React hook for responsive breakpoint detection.
 * Note: This is a pure TypeScript implementation for SSR compatibility.
 * In a browser environment, you'd use window.matchMedia.
 */

import { Breakpoints, ResponsiveValue } from '../types';
import {
  breakpoints,
  getBreakpointValue,
  getCurrentBreakpoint,
  resolveResponsive,
  isBreakpointOrAbove,
} from '../tokens/breakpoints';

export type BreakpointKey = keyof Breakpoints | 'base';

/**
 * Get the current breakpoint from a width value
 * (Pure function - no React state)
 */
export function getBreakpointFromWidth(width: number): BreakpointKey {
  return getCurrentBreakpoint(width);
}

/**
 * Check if width matches or exceeds a breakpoint
 */
export function matchesBreakpoint(width: number, breakpoint: keyof Breakpoints): boolean {
  return isBreakpointOrAbove(width, breakpoint);
}

/**
 * Get responsive value for a given width
 */
export function getResponsiveValue<T>(value: ResponsiveValue<T>, width: number): T {
  return resolveResponsive(value, width);
}

/**
 * Create a media query string for a breakpoint
 */
export function createMediaQuery(breakpoint: keyof Breakpoints): string {
  return `(min-width: ${breakpoints[breakpoint]})`;
}

/**
 * Create all media query strings
 */
export function getAllMediaQueries(): Record<keyof Breakpoints, string> {
  return {
    sm: createMediaQuery('sm'),
    md: createMediaQuery('md'),
    lg: createMediaQuery('lg'),
    xl: createMediaQuery('xl'),
    '2xl': createMediaQuery('2xl'),
  };
}

/**
 * Breakpoint utilities for components
 */
export const breakpointUtils = {
  /**
   * Check if viewport is mobile (below md breakpoint)
   */
  isMobile: (width: number): boolean => width < getBreakpointValue('md'),

  /**
   * Check if viewport is tablet (md to lg)
   */
  isTablet: (width: number): boolean => {
    return width >= getBreakpointValue('md') && width < getBreakpointValue('lg');
  },

  /**
   * Check if viewport is desktop (lg and above)
   */
  isDesktop: (width: number): boolean => width >= getBreakpointValue('lg'),

  /**
   * Get bubble width for viewport
   */
  getBubbleWidth: (width: number): string => {
    if (width < getBreakpointValue('md')) {
      return 'calc(100vw - 2rem)';
    }
    return '380px';
  },

  /**
   * Get bubble position for viewport
   */
  getBubblePosition: (width: number): { bottom: string; right: string } => {
    if (width < getBreakpointValue('md')) {
      return { bottom: '80px', right: '16px' };
    }
    return { bottom: '24px', right: '24px' };
  },
};

/**
 * Hook-like function for SSR-compatible responsive values
 * Call this with server-detected width or default
 */
export function useBreakpointValue<T>(
  values: ResponsiveValue<T>,
  serverWidth: number = 1024 // Default to desktop
): T {
  return getResponsiveValue(values, serverWidth);
}

/**
 * Create a breakpoint-aware style object
 */
export function createResponsiveStyles<T extends Record<string, any>>(
  baseStyles: T,
  breakpointStyles: Partial<Record<BreakpointKey, Partial<T>>>,
  width: number
): T {
  const currentBreakpoint = getBreakpointFromWidth(width);
  const breakpointOrder: BreakpointKey[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];

  let mergedStyles = { ...baseStyles };

  // Apply styles from base up to current breakpoint
  for (const bp of breakpointOrder) {
    if (breakpointStyles[bp]) {
      mergedStyles = { ...mergedStyles, ...breakpointStyles[bp] };
    }
    if (bp === currentBreakpoint) break;
  }

  return mergedStyles;
}

export default {
  getBreakpointFromWidth,
  matchesBreakpoint,
  getResponsiveValue,
  createMediaQuery,
  getAllMediaQueries,
  breakpointUtils,
  useBreakpointValue,
  createResponsiveStyles,
};
