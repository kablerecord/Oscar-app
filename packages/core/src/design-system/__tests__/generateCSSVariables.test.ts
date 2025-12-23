/**
 * CSS Variable Generator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateCSSVariables,
  generateCategoryVariables,
  getVariableName,
  getVariableRef,
  generateDarkThemeVariables,
  generateHighContrastVariables,
} from '../utils/generateCSSVariables';

describe('generateCSSVariables', () => {
  it('should generate a valid CSS string', () => {
    const css = generateCSSVariables();
    expect(css).toContain(':root {');
    expect(css).toContain('}');
  });

  it('should include color variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-color-background-primary');
    expect(css).toContain('--osqr-color-text-primary');
    expect(css).toContain('--osqr-color-accent-primary');
    expect(css).toContain('#0f172a');
    expect(css).toContain('#f1f5f9');
  });

  it('should include typography variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-font-font-family-primary');
    expect(css).toContain('--osqr-font-font-size-base');
    expect(css).toContain('--osqr-font-font-weight-normal');
  });

  it('should include spacing variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-spacing-0');
    expect(css).toContain('--osqr-spacing-4');
    expect(css).toContain('--osqr-spacing-16');
    expect(css).toContain('16px');
  });

  it('should include shadow variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-shadow-sm');
    expect(css).toContain('--osqr-shadow-lg');
    expect(css).toContain('--osqr-glow-idle');
    expect(css).toContain('--osqr-glow-holding');
  });

  it('should include radii variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-radius-none');
    expect(css).toContain('--osqr-radius-md');
    expect(css).toContain('--osqr-radius-full');
    expect(css).toContain('9999px');
  });

  it('should include animation variables', () => {
    const css = generateCSSVariables();
    expect(css).toContain('--osqr-duration-fast');
    expect(css).toContain('--osqr-easing-default');
    expect(css).toContain('--osqr-pulse-idle');
    expect(css).toContain('150ms');
  });
});

describe('generateCategoryVariables', () => {
  it('should generate only color variables', () => {
    const css = generateCategoryVariables('colors');
    expect(css).toContain('--osqr-color-background-primary');
    expect(css).not.toContain('--osqr-spacing');
    expect(css).not.toContain('--osqr-radius');
  });

  it('should generate only spacing variables', () => {
    const css = generateCategoryVariables('spacing');
    expect(css).toContain('--osqr-spacing');
    expect(css).not.toContain('--osqr-color');
  });
});

describe('getVariableName', () => {
  it('should convert dot notation to CSS variable name', () => {
    expect(getVariableName('colors.background.primary')).toBe('--osqr-colors-background-primary');
    expect(getVariableName('spacing.4')).toBe('--osqr-spacing-4');
    expect(getVariableName('radii.full')).toBe('--osqr-radii-full');
  });

  it('should convert camelCase to kebab-case', () => {
    expect(getVariableName('colors.backgroundColor')).toBe('--osqr-colors-background-color');
    expect(getVariableName('typography.fontSize')).toBe('--osqr-typography-font-size');
  });
});

describe('getVariableRef', () => {
  it('should return var() reference', () => {
    expect(getVariableRef('colors.accent.primary')).toBe('var(--osqr-colors-accent-primary)');
    expect(getVariableRef('spacing.4')).toBe('var(--osqr-spacing-4)');
  });

  it('should include fallback value when provided', () => {
    expect(getVariableRef('colors.accent.primary', '#3b82f6')).toBe('var(--osqr-colors-accent-primary, #3b82f6)');
    expect(getVariableRef('spacing.4', '16px')).toBe('var(--osqr-spacing-4, 16px)');
  });
});

describe('generateDarkThemeVariables', () => {
  it('should generate dark theme CSS', () => {
    const css = generateDarkThemeVariables();
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain('/* Dark theme is default');
  });
});

describe('generateHighContrastVariables', () => {
  it('should generate high contrast CSS', () => {
    const css = generateHighContrastVariables();
    expect(css).toContain(':root[data-high-contrast="true"]');
    expect(css).toContain('#ffffff'); // white text
  });
});
