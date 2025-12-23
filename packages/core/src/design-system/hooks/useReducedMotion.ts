/**
 * OSQR Design System - useReducedMotion Hook
 *
 * Utilities for respecting user's motion preferences.
 * Note: Pure TypeScript implementation for SSR compatibility.
 */

/**
 * Default preference when server-side or unknown
 */
export const DEFAULT_REDUCED_MOTION = false;

/**
 * Check if reduced motion should be applied
 * (Based on passed preference, e.g., from environment variable)
 */
export function shouldReduceMotion(preference: boolean = DEFAULT_REDUCED_MOTION): boolean {
  return preference;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getMotionSafeDuration(
  duration: string,
  prefersReducedMotion: boolean = false
): string {
  if (prefersReducedMotion) {
    return '0ms';
  }
  return duration;
}

/**
 * Get animation name based on reduced motion preference
 */
export function getMotionSafeAnimation(
  animation: string,
  prefersReducedMotion: boolean = false
): string {
  if (prefersReducedMotion) {
    return 'none';
  }
  return animation;
}

/**
 * Create motion-safe style object
 */
export function createMotionSafeStyles(
  styles: {
    animation?: string;
    transition?: string;
    transform?: string;
  },
  prefersReducedMotion: boolean = false
): typeof styles {
  if (!prefersReducedMotion) {
    return styles;
  }

  return {
    ...styles,
    animation: styles.animation ? 'none' : undefined,
    transition: styles.transition ? 'none' : undefined,
    // Keep transform for positioning, just don't animate it
  };
}

/**
 * CSS class helper for reduced motion
 */
export function getReducedMotionClass(prefersReducedMotion: boolean): string {
  return prefersReducedMotion ? 'motion-reduce' : 'motion-allow';
}

/**
 * Get CSS media query for reduced motion
 */
export function getReducedMotionMediaQuery(): string {
  return '@media (prefers-reduced-motion: reduce)';
}

/**
 * Animation config for presence states
 */
export interface PresenceAnimationConfig {
  name: string;
  duration: string;
  timingFunction: string;
  iterationCount: string;
}

/**
 * Get motion-safe presence animation config
 */
export function getMotionSafePresenceAnimation(
  state: 'idle' | 'thinking' | 'holding' | 'connected',
  prefersReducedMotion: boolean = false
): PresenceAnimationConfig | null {
  if (prefersReducedMotion) {
    return null; // No animation
  }

  const configs: Record<string, PresenceAnimationConfig> = {
    idle: {
      name: 'subtle-pulse',
      duration: '2000ms',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
    },
    thinking: {
      name: 'thinking-pulse',
      duration: '2000ms',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
    },
    holding: {
      name: 'pulse-glow-amber',
      duration: '1500ms',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
    },
    connected: {
      name: 'connected-breathing',
      duration: '4000ms',
      timingFunction: 'ease-in-out',
      iterationCount: 'infinite',
    },
  };

  return configs[state] || null;
}

/**
 * Convert animation config to CSS animation string
 */
export function animationConfigToCSS(config: PresenceAnimationConfig | null): string {
  if (!config) {
    return 'none';
  }
  return `${config.name} ${config.duration} ${config.timingFunction} ${config.iterationCount}`;
}

export default {
  shouldReduceMotion,
  getMotionSafeDuration,
  getMotionSafeAnimation,
  createMotionSafeStyles,
  getReducedMotionClass,
  getReducedMotionMediaQuery,
  getMotionSafePresenceAnimation,
  animationConfigToCSS,
};
