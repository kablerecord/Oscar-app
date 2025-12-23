/**
 * Design System Hooks Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getBreakpointFromWidth,
  matchesBreakpoint,
  getResponsiveValue,
  createMediaQuery,
  getAllMediaQueries,
  breakpointUtils,
  useBreakpointValue,
  createResponsiveStyles,
} from '../hooks/useBreakpoint';
import {
  shouldReduceMotion,
  getMotionSafeDuration,
  getMotionSafeAnimation,
  createMotionSafeStyles,
  getReducedMotionClass,
  getMotionSafePresenceAnimation,
  animationConfigToCSS,
} from '../hooks/useReducedMotion';

describe('useBreakpoint', () => {
  describe('getBreakpointFromWidth', () => {
    it('should return base for mobile widths', () => {
      expect(getBreakpointFromWidth(320)).toBe('base');
      expect(getBreakpointFromWidth(639)).toBe('base');
    });

    it('should return correct breakpoints', () => {
      expect(getBreakpointFromWidth(640)).toBe('sm');
      expect(getBreakpointFromWidth(768)).toBe('md');
      expect(getBreakpointFromWidth(1024)).toBe('lg');
      expect(getBreakpointFromWidth(1280)).toBe('xl');
      expect(getBreakpointFromWidth(1536)).toBe('2xl');
    });
  });

  describe('matchesBreakpoint', () => {
    it('should return true when width matches or exceeds', () => {
      expect(matchesBreakpoint(768, 'md')).toBe(true);
      expect(matchesBreakpoint(800, 'md')).toBe(true);
    });

    it('should return false when width is below', () => {
      expect(matchesBreakpoint(767, 'md')).toBe(false);
    });
  });

  describe('getResponsiveValue', () => {
    const values = { base: 'small', md: 'medium', lg: 'large' };

    it('should return base value for mobile', () => {
      expect(getResponsiveValue(values, 320)).toBe('small');
    });

    it('should return md value for tablet', () => {
      expect(getResponsiveValue(values, 768)).toBe('medium');
    });

    it('should return lg value for desktop', () => {
      expect(getResponsiveValue(values, 1024)).toBe('large');
    });
  });

  describe('createMediaQuery', () => {
    it('should create valid media query strings', () => {
      expect(createMediaQuery('md')).toBe('(min-width: 768px)');
      expect(createMediaQuery('lg')).toBe('(min-width: 1024px)');
    });
  });

  describe('getAllMediaQueries', () => {
    it('should return all media queries', () => {
      const queries = getAllMediaQueries();
      expect(queries.sm).toBe('(min-width: 640px)');
      expect(queries.md).toBe('(min-width: 768px)');
      expect(queries.lg).toBe('(min-width: 1024px)');
      expect(queries.xl).toBe('(min-width: 1280px)');
      expect(queries['2xl']).toBe('(min-width: 1536px)');
    });
  });

  describe('breakpointUtils', () => {
    it('should detect mobile', () => {
      expect(breakpointUtils.isMobile(320)).toBe(true);
      expect(breakpointUtils.isMobile(767)).toBe(true);
      expect(breakpointUtils.isMobile(768)).toBe(false);
    });

    it('should detect tablet', () => {
      expect(breakpointUtils.isTablet(768)).toBe(true);
      expect(breakpointUtils.isTablet(900)).toBe(true);
      expect(breakpointUtils.isTablet(1024)).toBe(false);
    });

    it('should detect desktop', () => {
      expect(breakpointUtils.isDesktop(1024)).toBe(true);
      expect(breakpointUtils.isDesktop(1023)).toBe(false);
    });

    it('should return correct bubble width', () => {
      expect(breakpointUtils.getBubbleWidth(320)).toBe('calc(100vw - 2rem)');
      expect(breakpointUtils.getBubbleWidth(1024)).toBe('380px');
    });

    it('should return correct bubble position', () => {
      const mobile = breakpointUtils.getBubblePosition(320);
      expect(mobile.bottom).toBe('80px');
      expect(mobile.right).toBe('16px');

      const desktop = breakpointUtils.getBubblePosition(1024);
      expect(desktop.bottom).toBe('24px');
      expect(desktop.right).toBe('24px');
    });
  });

  describe('useBreakpointValue', () => {
    it('should return responsive value for default width', () => {
      const value = useBreakpointValue({ base: 'a', md: 'b', lg: 'c' });
      expect(value).toBe('c'); // Default is 1024
    });

    it('should respect custom server width', () => {
      const value = useBreakpointValue({ base: 'a', md: 'b', lg: 'c' }, 500);
      expect(value).toBe('a');
    });
  });

  describe('createResponsiveStyles', () => {
    it('should merge styles for current breakpoint', () => {
      const base = { color: 'red', size: 'small' };
      const responsive = {
        md: { color: 'blue' },
        lg: { size: 'large' },
      };

      const result = createResponsiveStyles(base, responsive, 1024);
      expect(result.color).toBe('blue');
      expect(result.size).toBe('large');
    });

    it('should only apply styles up to current breakpoint', () => {
      const base = { value: 'base' };
      const responsive = {
        md: { value: 'md' },
        lg: { value: 'lg' },
        xl: { value: 'xl' },
      };

      const result = createResponsiveStyles(base, responsive, 800); // md breakpoint
      expect(result.value).toBe('md');
    });
  });
});

describe('useReducedMotion', () => {
  describe('shouldReduceMotion', () => {
    it('should return preference value', () => {
      expect(shouldReduceMotion(true)).toBe(true);
      expect(shouldReduceMotion(false)).toBe(false);
    });

    it('should default to false', () => {
      expect(shouldReduceMotion()).toBe(false);
    });
  });

  describe('getMotionSafeDuration', () => {
    it('should return 0ms when reduced motion is preferred', () => {
      expect(getMotionSafeDuration('300ms', true)).toBe('0ms');
    });

    it('should return original duration when motion is allowed', () => {
      expect(getMotionSafeDuration('300ms', false)).toBe('300ms');
    });
  });

  describe('getMotionSafeAnimation', () => {
    it('should return none when reduced motion is preferred', () => {
      expect(getMotionSafeAnimation('subtle-pulse', true)).toBe('none');
    });

    it('should return original animation when motion is allowed', () => {
      expect(getMotionSafeAnimation('subtle-pulse', false)).toBe('subtle-pulse');
    });
  });

  describe('createMotionSafeStyles', () => {
    it('should remove animations when reduced motion is preferred', () => {
      const styles = {
        animation: 'pulse 2s infinite',
        transition: 'all 0.3s',
        transform: 'scale(1)',
      };

      const result = createMotionSafeStyles(styles, true);
      expect(result.animation).toBe('none');
      expect(result.transition).toBe('none');
      expect(result.transform).toBe('scale(1)'); // Transform preserved
    });

    it('should preserve styles when motion is allowed', () => {
      const styles = { animation: 'pulse 2s infinite' };
      const result = createMotionSafeStyles(styles, false);
      expect(result.animation).toBe('pulse 2s infinite');
    });
  });

  describe('getReducedMotionClass', () => {
    it('should return correct class', () => {
      expect(getReducedMotionClass(true)).toBe('motion-reduce');
      expect(getReducedMotionClass(false)).toBe('motion-allow');
    });
  });

  describe('getMotionSafePresenceAnimation', () => {
    it('should return null when reduced motion is preferred', () => {
      expect(getMotionSafePresenceAnimation('idle', true)).toBeNull();
    });

    it('should return config for idle state', () => {
      const config = getMotionSafePresenceAnimation('idle', false);
      expect(config).not.toBeNull();
      expect(config!.name).toBe('subtle-pulse');
      expect(config!.duration).toBe('2000ms');
    });

    it('should return config for thinking state', () => {
      const config = getMotionSafePresenceAnimation('thinking', false);
      expect(config!.name).toBe('thinking-pulse');
    });

    it('should return config for holding state', () => {
      const config = getMotionSafePresenceAnimation('holding', false);
      expect(config!.name).toBe('pulse-glow-amber');
      expect(config!.duration).toBe('1500ms');
    });

    it('should return config for connected state', () => {
      const config = getMotionSafePresenceAnimation('connected', false);
      expect(config!.name).toBe('connected-breathing');
      expect(config!.duration).toBe('4000ms');
    });
  });

  describe('animationConfigToCSS', () => {
    it('should return none for null config', () => {
      expect(animationConfigToCSS(null)).toBe('none');
    });

    it('should return valid CSS animation string', () => {
      const config = {
        name: 'pulse',
        duration: '2000ms',
        timingFunction: 'ease-in-out',
        iterationCount: 'infinite',
      };
      expect(animationConfigToCSS(config)).toBe('pulse 2000ms ease-in-out infinite');
    });
  });
});
