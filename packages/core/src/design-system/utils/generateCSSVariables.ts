/**
 * OSQR Design System - CSS Variable Generator
 *
 * Generates CSS custom properties from design tokens.
 */

import { OSQRDesignTokens } from '../types';
import { DEFAULT_TOKENS } from '../tokens';

const CSS_VAR_PREFIX = '--osqr';

/**
 * Flatten nested object into dot-notation paths
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string | number> {
  const result: Record<string, string | number> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Generate CSS custom properties from tokens
 */
export function generateCSSVariables(tokens: OSQRDesignTokens = DEFAULT_TOKENS): string {
  const lines: string[] = [];

  // Colors
  const colors = flattenObject(tokens.colors, 'color');
  for (const [key, value] of Object.entries(colors)) {
    const varName = `${CSS_VAR_PREFIX}-${toKebabCase(key)}`;
    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('');

  // Typography
  const typography = flattenObject(tokens.typography, 'font');
  for (const [key, value] of Object.entries(typography)) {
    const varName = `${CSS_VAR_PREFIX}-${toKebabCase(key)}`;
    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('');

  // Spacing
  for (const [key, value] of Object.entries(tokens.spacing)) {
    const varName = `${CSS_VAR_PREFIX}-spacing-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('');

  // Shadows
  const { glow, ...elevationShadows } = tokens.shadows;
  for (const [key, value] of Object.entries(elevationShadows)) {
    const varName = `${CSS_VAR_PREFIX}-shadow-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  // Glow shadows
  for (const [key, value] of Object.entries(glow)) {
    const varName = `${CSS_VAR_PREFIX}-glow-${toKebabCase(key)}`;
    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('');

  // Radii
  for (const [key, value] of Object.entries(tokens.radii)) {
    const varName = `${CSS_VAR_PREFIX}-radius-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  lines.push('');

  // Animations - duration
  for (const [key, value] of Object.entries(tokens.animations.duration)) {
    const varName = `${CSS_VAR_PREFIX}-duration-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  // Animations - easing
  for (const [key, value] of Object.entries(tokens.animations.easing)) {
    const varName = `${CSS_VAR_PREFIX}-easing-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  // Animations - pulse
  for (const [key, value] of Object.entries(tokens.animations.pulse)) {
    const varName = `${CSS_VAR_PREFIX}-pulse-${key}`;
    lines.push(`  ${varName}: ${value};`);
  }

  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * Generate CSS variables for a specific token category
 */
export function generateCategoryVariables(
  category: keyof OSQRDesignTokens,
  tokens: OSQRDesignTokens = DEFAULT_TOKENS
): string {
  const lines: string[] = [];
  const categoryTokens = tokens[category];

  if (category === 'shadows') {
    const { glow, ...rest } = categoryTokens as typeof tokens.shadows;
    const flattened = flattenObject({ ...rest, glow }, 'shadow');
    for (const [key, value] of Object.entries(flattened)) {
      lines.push(`  ${CSS_VAR_PREFIX}-${toKebabCase(key)}: ${value};`);
    }
  } else {
    const prefix = getCategoryPrefix(category);
    const flattened = flattenObject(categoryTokens as Record<string, any>, prefix);
    for (const [key, value] of Object.entries(flattened)) {
      lines.push(`  ${CSS_VAR_PREFIX}-${toKebabCase(key)}: ${value};`);
    }
  }

  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * Get the CSS variable prefix for a category
 */
function getCategoryPrefix(category: keyof OSQRDesignTokens): string {
  const prefixes: Record<keyof OSQRDesignTokens, string> = {
    colors: 'color',
    typography: 'font',
    spacing: 'spacing',
    shadows: 'shadow',
    radii: 'radius',
    animations: 'animation',
  };
  return prefixes[category];
}

/**
 * Get the CSS variable name for a token path
 */
export function getVariableName(path: string): string {
  return `${CSS_VAR_PREFIX}-${toKebabCase(path.replace(/\./g, '-'))}`;
}

/**
 * Get the CSS var() reference for a token path
 */
export function getVariableRef(path: string, fallback?: string): string {
  const varName = getVariableName(path);
  return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
}

/**
 * Generate dark theme variables (future-proofing)
 */
export function generateDarkThemeVariables(): string {
  // Placeholder for dark theme - currently OSQR is dark by default
  return `/* Dark theme is default in OSQR */\n:root[data-theme="dark"] {\n  /* No overrides needed */\n}`;
}

/**
 * Generate high contrast variables (accessibility)
 */
export function generateHighContrastVariables(): string {
  return `/* High contrast mode for accessibility */
:root[data-high-contrast="true"] {
  ${CSS_VAR_PREFIX}-color-text-primary: #ffffff;
  ${CSS_VAR_PREFIX}-color-text-secondary: #ffffff;
  ${CSS_VAR_PREFIX}-color-border-default: #ffffff;
  ${CSS_VAR_PREFIX}-color-accent-primary: #60a5fa;
}`;
}

export default generateCSSVariables;
