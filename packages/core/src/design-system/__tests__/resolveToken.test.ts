/**
 * Token Resolver Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  resolveToken,
  getColorToken,
  getTypographyToken,
  getSpacingToken,
  getShadowToken,
  getRadiusToken,
  getAnimationToken,
  tokenExists,
  getTokenPaths,
} from '../utils/resolveToken';
import { DEFAULT_TOKENS } from '../tokens';

describe('resolveToken', () => {
  it('should resolve nested color tokens', () => {
    expect(resolveToken('colors.background.primary')).toBe('#0f172a');
    expect(resolveToken('colors.accent.primary')).toBe('#3b82f6');
    expect(resolveToken('colors.text.primary')).toBe('#f1f5f9');
  });

  it('should resolve typography tokens', () => {
    expect(resolveToken('typography.fontSize.base')).toBe('14px');
    expect(resolveToken('typography.fontWeight.bold')).toBe('700');
  });

  it('should resolve spacing tokens', () => {
    expect(resolveToken('spacing.4')).toBe('16px');
    expect(resolveToken('spacing.8')).toBe('32px');
  });

  it('should resolve radii tokens', () => {
    expect(resolveToken('radii.md')).toBe('8px');
    expect(resolveToken('radii.full')).toBe('9999px');
  });

  it('should resolve animation tokens', () => {
    expect(resolveToken('animations.duration.fast')).toBe('150ms');
    expect(resolveToken('animations.easing.default')).toBe('ease-out');
  });

  it('should return empty string and warn for invalid paths', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveToken('invalid.path')).toBe('');
    expect(consoleSpy).toHaveBeenCalledWith('Design token not found: invalid.path');
    consoleSpy.mockRestore();
  });

  it('should work with custom token object', () => {
    const customTokens = {
      ...DEFAULT_TOKENS,
      colors: {
        ...DEFAULT_TOKENS.colors,
        custom: { test: '#ff0000' },
      },
    };
    expect(resolveToken('colors.custom.test', customTokens as any)).toBe('#ff0000');
  });
});

describe('getColorToken', () => {
  it('should get color tokens with shortened path', () => {
    expect(getColorToken('background.primary')).toBe('#0f172a');
    expect(getColorToken('accent.primary')).toBe('#3b82f6');
    expect(getColorToken('semantic.success')).toBe('#4ade80');
  });
});

describe('getTypographyToken', () => {
  it('should get typography tokens with shortened path', () => {
    expect(getTypographyToken('fontSize.base')).toBe('14px');
    expect(getTypographyToken('fontWeight.medium')).toBe('500');
    expect(getTypographyToken('lineHeight.normal')).toBe('1.5');
  });
});

describe('getSpacingToken', () => {
  it('should get spacing tokens', () => {
    expect(getSpacingToken('4')).toBe('16px');
    expect(getSpacingToken('8')).toBe('32px');
    expect(getSpacingToken('0')).toBe('0px');
  });
});

describe('getShadowToken', () => {
  it('should get shadow tokens', () => {
    expect(getShadowToken('sm')).toContain('rgba');
    expect(getShadowToken('glow.idle')).toContain('59, 130, 246');
  });
});

describe('getRadiusToken', () => {
  it('should get radius tokens', () => {
    expect(getRadiusToken('md')).toBe('8px');
    expect(getRadiusToken('full')).toBe('9999px');
  });
});

describe('getAnimationToken', () => {
  it('should get animation tokens', () => {
    expect(getAnimationToken('duration.fast')).toBe('150ms');
    expect(getAnimationToken('easing.smooth')).toContain('cubic-bezier');
    expect(getAnimationToken('pulse.idle')).toBe('2000ms');
  });
});

describe('tokenExists', () => {
  it('should return true for existing tokens', () => {
    expect(tokenExists('colors.background.primary')).toBe(true);
    expect(tokenExists('typography.fontSize.base')).toBe(true);
    expect(tokenExists('spacing.4')).toBe(true);
  });

  it('should return false for non-existing tokens', () => {
    expect(tokenExists('colors.nonexistent')).toBe(false);
    expect(tokenExists('invalid.path')).toBe(false);
    expect(tokenExists('spacing.999')).toBe(false);
  });
});

describe('getTokenPaths', () => {
  it('should return all paths at a given level', () => {
    const backgroundPaths = getTokenPaths('colors.background');
    expect(backgroundPaths).toContain('colors.background.primary');
    expect(backgroundPaths).toContain('colors.background.secondary');
    expect(backgroundPaths).toContain('colors.background.tertiary');
    expect(backgroundPaths).toContain('colors.background.overlay');
  });

  it('should return empty array for non-object paths', () => {
    expect(getTokenPaths('colors.background.primary')).toEqual([]);
  });

  it('should return empty array for invalid paths', () => {
    expect(getTokenPaths('invalid.path')).toEqual([]);
  });
});
