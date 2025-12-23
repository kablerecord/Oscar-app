/**
 * OSQR Design System - Color Utilities
 *
 * Color manipulation and validation functions.
 */

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex color to RGBA string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Parse rgba string to components
 */
export function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const result = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgba);
  return result
    ? {
        r: parseInt(result[1], 10),
        g: parseInt(result[2], 10),
        b: parseInt(result[3], 10),
        a: result[4] ? parseFloat(result[4]) : 1,
      }
    : null;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.round(255 * (percent / 100));
  return rgbToHex(
    rgb.r + amount,
    rgb.g + amount,
    rgb.b + amount
  );
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.round(255 * (percent / 100));
  return rgbToHex(
    rgb.r - amount,
    rgb.g - amount,
    rgb.b - amount
  );
}

/**
 * Calculate relative luminance for WCAG contrast
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirement (4.5:1 for normal text)
 */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA requirement (7:1 for normal text)
 */
export function meetsWcagAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

/**
 * Determine if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Get appropriate text color for a background
 */
export function getTextColorForBackground(background: string): '#ffffff' | '#000000' {
  return isLightColor(background) ? '#000000' : '#ffffff';
}

/**
 * Validate hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#([a-f\d]{3}|[a-f\d]{6})$/i.test(hex);
}

/**
 * Validate rgba format
 */
export function isValidRgba(rgba: string): boolean {
  return /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(rgba);
}

/**
 * Blend two colors together
 */
export function blendColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  return rgbToHex(
    Math.round(rgb1.r * (1 - weight) + rgb2.r * weight),
    Math.round(rgb1.g * (1 - weight) + rgb2.g * weight),
    Math.round(rgb1.b * (1 - weight) + rgb2.b * weight)
  );
}
