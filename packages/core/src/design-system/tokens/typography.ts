/**
 * OSQR Design System - Typography Tokens
 *
 * Font families, sizes, weights, and line heights.
 */

import { TypographyTokens } from '../types';

export const typography: TypographyTokens = {
  fontFamily: {
    primary: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  fontSize: {
    xs: '10px',     // timestamps
    sm: '12px',     // quick actions
    base: '14px',   // body text
    md: '16px',     // greeting
    lg: '18px',     // bubble title
    xl: '20px',     // section headers
    '2xl': '24px',  // hero title
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export default typography;
