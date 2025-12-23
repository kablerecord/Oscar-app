/**
 * Design System Token Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TOKENS,
  colors,
  typography,
  spacing,
  shadows,
  radii,
  animations,
  breakpoints,
  getSpacing,
  spacingToNumber,
  getRadius,
  getDuration,
  getEasing,
  getPulseDuration,
  getBreakpoint,
  getBreakpointValue,
  resolveResponsive,
  getCurrentBreakpoint,
  isBreakpointOrAbove,
} from '../tokens';

describe('Design System Tokens', () => {
  describe('DEFAULT_TOKENS', () => {
    it('should contain all token categories', () => {
      expect(DEFAULT_TOKENS).toHaveProperty('colors');
      expect(DEFAULT_TOKENS).toHaveProperty('typography');
      expect(DEFAULT_TOKENS).toHaveProperty('spacing');
      expect(DEFAULT_TOKENS).toHaveProperty('shadows');
      expect(DEFAULT_TOKENS).toHaveProperty('radii');
      expect(DEFAULT_TOKENS).toHaveProperty('animations');
    });
  });

  describe('colors', () => {
    it('should have background colors', () => {
      expect(colors.background.primary).toBe('#0f172a');
      expect(colors.background.secondary).toBe('#1e293b');
      expect(colors.background.tertiary).toBe('#334155');
      expect(colors.background.overlay).toBe('rgba(15, 23, 42, 0.95)');
    });

    it('should have text colors', () => {
      expect(colors.text.primary).toBe('#f1f5f9');
      expect(colors.text.secondary).toBe('#cbd5e1');
      expect(colors.text.muted).toBe('#94a3b8');
      expect(colors.text.subtle).toBe('#64748b');
    });

    it('should have accent colors', () => {
      expect(colors.accent.primary).toBe('#3b82f6');
      expect(colors.accent.hover).toBe('#2563eb');
      expect(colors.accent.light).toBe('#60a5fa');
    });

    it('should have presence colors', () => {
      expect(colors.presence.idle).toContain('59, 130, 246');
      expect(colors.presence.thinking).toContain('139, 92, 246');
      expect(colors.presence.holding).toContain('245, 158, 11');
    });

    it('should have category colors', () => {
      expect(colors.category.contradiction).toBe('#fbbf24');
      expect(colors.category.clarify).toBe('#60a5fa');
      expect(colors.category.nextStep).toBe('#4ade80');
      expect(colors.category.recall).toBe('#c084fc');
    });

    it('should have semantic colors', () => {
      expect(colors.semantic.success).toBe('#4ade80');
      expect(colors.semantic.warning).toBe('#fbbf24');
      expect(colors.semantic.error).toBe('#f87171');
      expect(colors.semantic.info).toBe('#60a5fa');
    });
  });

  describe('typography', () => {
    it('should have font families', () => {
      expect(typography.fontFamily.primary).toContain('system-ui');
      expect(typography.fontFamily.mono).toContain('monospace');
    });

    it('should have font sizes', () => {
      expect(typography.fontSize.xs).toBe('10px');
      expect(typography.fontSize.sm).toBe('12px');
      expect(typography.fontSize.base).toBe('14px');
      expect(typography.fontSize.md).toBe('16px');
      expect(typography.fontSize.lg).toBe('18px');
      expect(typography.fontSize.xl).toBe('20px');
      expect(typography.fontSize['2xl']).toBe('24px');
    });

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBe(400);
      expect(typography.fontWeight.medium).toBe(500);
      expect(typography.fontWeight.semibold).toBe(600);
      expect(typography.fontWeight.bold).toBe(700);
    });

    it('should have line heights', () => {
      expect(typography.lineHeight.tight).toBe('1.25');
      expect(typography.lineHeight.normal).toBe('1.5');
      expect(typography.lineHeight.relaxed).toBe('1.75');
    });
  });

  describe('spacing', () => {
    it('should have all spacing values', () => {
      expect(spacing['0']).toBe('0px');
      expect(spacing['1']).toBe('4px');
      expect(spacing['2']).toBe('8px');
      expect(spacing['4']).toBe('16px');
      expect(spacing['8']).toBe('32px');
      expect(spacing['16']).toBe('64px');
    });

    it('getSpacing should return correct values', () => {
      expect(getSpacing('4')).toBe('16px');
      expect(getSpacing('8')).toBe('32px');
    });

    it('spacingToNumber should convert to pixels', () => {
      expect(spacingToNumber('4')).toBe(16);
      expect(spacingToNumber('8')).toBe(32);
    });
  });

  describe('shadows', () => {
    it('should have elevation shadows', () => {
      expect(shadows.sm).toContain('rgba');
      expect(shadows.md).toContain('rgba');
      expect(shadows.lg).toContain('rgba');
      expect(shadows.xl).toContain('rgba');
      expect(shadows['2xl']).toContain('rgba');
    });

    it('should have glow tokens', () => {
      expect(shadows.glow.idle).toContain('59, 130, 246');
      expect(shadows.glow.thinking).toContain('139, 92, 246');
      expect(shadows.glow.holding).toContain('245, 158, 11');
    });
  });

  describe('radii', () => {
    it('should have all radius values', () => {
      expect(radii.none).toBe('0px');
      expect(radii.sm).toBe('4px');
      expect(radii.md).toBe('8px');
      expect(radii.lg).toBe('12px');
      expect(radii.xl).toBe('16px');
      expect(radii['3xl']).toBe('28px');
      expect(radii.full).toBe('9999px');
    });

    it('getRadius should return correct values', () => {
      expect(getRadius('md')).toBe('8px');
      expect(getRadius('full')).toBe('9999px');
    });
  });

  describe('animations', () => {
    it('should have duration values', () => {
      expect(animations.duration.instant).toBe('0ms');
      expect(animations.duration.fast).toBe('150ms');
      expect(animations.duration.normal).toBe('300ms');
      expect(animations.duration.slow).toBe('500ms');
    });

    it('should have easing values', () => {
      expect(animations.easing.default).toBe('ease-out');
      expect(animations.easing.smooth).toContain('cubic-bezier');
      expect(animations.easing.bounce).toContain('cubic-bezier');
    });

    it('should have pulse durations', () => {
      expect(animations.pulse.idle).toBe('2000ms');
      expect(animations.pulse.holding).toBe('1500ms');
      expect(animations.pulse.thinking).toBe('2000ms');
      expect(animations.pulse.connected).toBe('4000ms');
    });

    it('getDuration should return correct values', () => {
      expect(getDuration('fast')).toBe('150ms');
      expect(getDuration('slow')).toBe('500ms');
    });

    it('getEasing should return correct values', () => {
      expect(getEasing('default')).toBe('ease-out');
    });

    it('getPulseDuration should return correct values', () => {
      expect(getPulseDuration('idle')).toBe('2000ms');
      expect(getPulseDuration('holding')).toBe('1500ms');
    });
  });

  describe('breakpoints', () => {
    it('should have all breakpoint values', () => {
      expect(breakpoints.sm).toBe('640px');
      expect(breakpoints.md).toBe('768px');
      expect(breakpoints.lg).toBe('1024px');
      expect(breakpoints.xl).toBe('1280px');
      expect(breakpoints['2xl']).toBe('1536px');
    });

    it('getBreakpoint should return correct values', () => {
      expect(getBreakpoint('md')).toBe('768px');
      expect(getBreakpoint('lg')).toBe('1024px');
    });

    it('getBreakpointValue should return numeric values', () => {
      expect(getBreakpointValue('md')).toBe(768);
      expect(getBreakpointValue('lg')).toBe(1024);
    });

    it('getCurrentBreakpoint should return correct breakpoint', () => {
      expect(getCurrentBreakpoint(320)).toBe('base');
      expect(getCurrentBreakpoint(640)).toBe('sm');
      expect(getCurrentBreakpoint(768)).toBe('md');
      expect(getCurrentBreakpoint(1024)).toBe('lg');
      expect(getCurrentBreakpoint(1280)).toBe('xl');
      expect(getCurrentBreakpoint(1536)).toBe('2xl');
    });

    it('resolveResponsive should resolve correct value', () => {
      const responsiveValue = {
        base: 'mobile',
        md: 'tablet',
        lg: 'desktop',
      };

      expect(resolveResponsive(responsiveValue, 320)).toBe('mobile');
      expect(resolveResponsive(responsiveValue, 768)).toBe('tablet');
      expect(resolveResponsive(responsiveValue, 1024)).toBe('desktop');
    });

    it('isBreakpointOrAbove should check correctly', () => {
      expect(isBreakpointOrAbove(640, 'sm')).toBe(true);
      expect(isBreakpointOrAbove(639, 'sm')).toBe(false);
      expect(isBreakpointOrAbove(1024, 'lg')).toBe(true);
      expect(isBreakpointOrAbove(1023, 'lg')).toBe(false);
    });
  });
});
