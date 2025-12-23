/**
 * Color Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  hexToRgba,
  parseRgba,
  lighten,
  darken,
  getLuminance,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  isLightColor,
  getTextColorForBackground,
  isValidHex,
  isValidRgba,
  blendColors,
} from '../utils/colorUtils';

describe('hexToRgb', () => {
  it('should convert hex to RGB', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
  });

  it('should handle hex without hash', () => {
    expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('should return null for invalid hex', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#gg0000')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(59, 130, 246)).toBe('#3b82f6');
  });

  it('should clamp values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
  });
});

describe('hexToRgba', () => {
  it('should convert hex to rgba string', () => {
    expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(hexToRgba('#3b82f6', 0.3)).toBe('rgba(59, 130, 246, 0.3)');
  });

  it('should return original hex for invalid input', () => {
    expect(hexToRgba('invalid', 0.5)).toBe('invalid');
  });
});

describe('parseRgba', () => {
  it('should parse rgba string', () => {
    expect(parseRgba('rgba(255, 255, 255, 1)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseRgba('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it('should parse rgb string', () => {
    expect(parseRgba('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('should return null for invalid input', () => {
    expect(parseRgba('invalid')).toBeNull();
  });
});

describe('lighten', () => {
  it('should lighten a color', () => {
    const result = lighten('#000000', 50);
    expect(hexToRgb(result)!.r).toBeGreaterThan(0);
  });

  it('should handle invalid hex', () => {
    expect(lighten('invalid', 50)).toBe('invalid');
  });
});

describe('darken', () => {
  it('should darken a color', () => {
    const result = darken('#ffffff', 50);
    expect(hexToRgb(result)!.r).toBeLessThan(255);
  });

  it('should handle invalid hex', () => {
    expect(darken('invalid', 50)).toBe('invalid');
  });
});

describe('getLuminance', () => {
  it('should calculate luminance', () => {
    expect(getLuminance('#ffffff')).toBeCloseTo(1, 1);
    expect(getLuminance('#000000')).toBeCloseTo(0, 1);
  });

  it('should return 0 for invalid hex', () => {
    expect(getLuminance('invalid')).toBe(0);
  });
});

describe('getContrastRatio', () => {
  it('should calculate contrast ratio', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should be symmetric', () => {
    const ratio1 = getContrastRatio('#ffffff', '#3b82f6');
    const ratio2 = getContrastRatio('#3b82f6', '#ffffff');
    expect(ratio1).toBeCloseTo(ratio2, 5);
  });
});

describe('meetsWcagAA', () => {
  it('should return true for high contrast', () => {
    expect(meetsWcagAA('#ffffff', '#000000')).toBe(true);
  });

  it('should return false for low contrast', () => {
    expect(meetsWcagAA('#ffffff', '#eeeeee')).toBe(false);
  });
});

describe('meetsWcagAAA', () => {
  it('should return true for very high contrast', () => {
    expect(meetsWcagAAA('#ffffff', '#000000')).toBe(true);
  });

  it('should have stricter requirements than AA', () => {
    // A color that passes AA but not AAA
    const lightGray = '#767676'; // Just passes AA (4.54:1 with white)
    expect(meetsWcagAA('#ffffff', lightGray)).toBe(true);
    expect(meetsWcagAAA('#ffffff', lightGray)).toBe(false);
  });
});

describe('isLightColor', () => {
  it('should identify light colors', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#f0f0f0')).toBe(true);
  });

  it('should identify dark colors', () => {
    expect(isLightColor('#000000')).toBe(false);
    expect(isLightColor('#0f172a')).toBe(false);
  });
});

describe('getTextColorForBackground', () => {
  it('should return black for light backgrounds', () => {
    expect(getTextColorForBackground('#ffffff')).toBe('#000000');
    expect(getTextColorForBackground('#f0f0f0')).toBe('#000000');
  });

  it('should return white for dark backgrounds', () => {
    expect(getTextColorForBackground('#000000')).toBe('#ffffff');
    expect(getTextColorForBackground('#0f172a')).toBe('#ffffff');
  });
});

describe('isValidHex', () => {
  it('should validate correct hex colors', () => {
    expect(isValidHex('#fff')).toBe(true);
    expect(isValidHex('#ffffff')).toBe(true);
    expect(isValidHex('#3b82f6')).toBe(true);
  });

  it('should reject invalid hex colors', () => {
    expect(isValidHex('fff')).toBe(false);
    expect(isValidHex('#gggggg')).toBe(false);
    expect(isValidHex('#fffffff')).toBe(false);
  });
});

describe('isValidRgba', () => {
  it('should validate correct rgba strings', () => {
    expect(isValidRgba('rgba(255, 255, 255, 1)')).toBe(true);
    expect(isValidRgba('rgba(0, 0, 0, 0.5)')).toBe(true);
    expect(isValidRgba('rgb(255, 255, 255)')).toBe(true);
  });

  it('should reject invalid rgba strings', () => {
    expect(isValidRgba('invalid')).toBe(false);
    expect(isValidRgba('rgb(a, b, c)')).toBe(false);
  });
});

describe('blendColors', () => {
  it('should blend two colors', () => {
    const result = blendColors('#000000', '#ffffff', 0.5);
    const rgb = hexToRgb(result);
    expect(rgb!.r).toBeCloseTo(128, 0);
    expect(rgb!.g).toBeCloseTo(128, 0);
    expect(rgb!.b).toBeCloseTo(128, 0);
  });

  it('should handle weight of 0', () => {
    expect(blendColors('#ff0000', '#0000ff', 0)).toBe('#ff0000');
  });

  it('should handle weight of 1', () => {
    expect(blendColors('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });

  it('should handle invalid colors', () => {
    expect(blendColors('invalid', '#ffffff', 0.5)).toBe('invalid');
  });
});
