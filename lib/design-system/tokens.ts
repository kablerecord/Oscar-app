/**
 * OSQR Design System - Design Tokens
 *
 * Centralized design tokens for consistent styling across oscar-app.
 * Based on Design System Specification v1.0
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export const colors = {
  // Backgrounds (slate palette)
  background: {
    primary: '#0f172a',      // slate-950
    secondary: '#1e293b',    // slate-900
    tertiary: '#334155',     // slate-800
    overlay: 'rgba(15, 23, 42, 0.95)',
  },

  // Text
  text: {
    primary: '#f1f5f9',      // slate-100
    secondary: '#cbd5e1',    // slate-300
    muted: '#94a3b8',        // slate-400
    subtle: '#64748b',       // slate-500
  },

  // Accent (primary brand color)
  accent: {
    primary: '#3b82f6',      // blue-500
    hover: '#2563eb',        // blue-600
    light: '#60a5fa',        // blue-400
    subtle: '#1e3a5f',       // blue-900
  },

  // Secondary accent
  secondary: {
    primary: '#8b5cf6',      // purple-500
    light: '#a78bfa',        // purple-400
    subtle: 'rgba(139, 92, 246, 0.2)',
  },

  // Presence states (mood colors) - core to OSQR identity
  presence: {
    idle: 'rgba(59, 130, 246, 0.3)',         // Blue
    thinking: 'rgba(139, 92, 246, 0.5)',     // Brighter purple
    waiting: 'rgba(139, 92, 246, 0.2)',      // Subtle purple
    connected: 'rgba(139, 92, 246, 0.4)',    // Medium purple
    holding: 'rgba(245, 158, 11, 0.4)',      // Amber
    holdingPeak: 'rgba(245, 158, 11, 0.7)',  // Brighter amber
  },

  // Insight categories
  category: {
    contradiction: '#fbbf24',  // amber-400
    clarify: '#60a5fa',        // blue-400
    nextStep: '#4ade80',       // green-400
    recall: '#c084fc',         // purple-400
  },

  // Borders
  border: {
    default: '#334155',        // slate-700
    subtle: 'rgba(51, 65, 85, 0.5)',
    focus: '#3b82f6',          // blue-500
  },

  // Semantic
  semantic: {
    success: '#4ade80',        // green-400
    warning: '#fbbf24',        // amber-400
    error: '#f87171',          // red-400
    info: '#60a5fa',           // blue-400
  },
} as const

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export const animations = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },

  easing: {
    default: 'ease-out',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Only for errors
  },

  // Presence state pulse durations
  pulse: {
    idle: '2000ms',
    holding: '1500ms',
    thinking: '2000ms',
    connected: '4000ms',
  },
} as const

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const shadows = {
  // Elevation levels
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Glow effects (for Bubble presence)
  glow: {
    idle: '0 0 20px rgba(59, 130, 246, 0.3)',
    idlePeak: '0 10px 35px -3px rgba(59, 130, 246, 0.45), 0 4px 8px -4px rgba(139, 92, 246, 0.35)',
    thinking: '0 0 20px rgba(139, 92, 246, 0.3)',
    thinkingPeak: '0 0 30px rgba(139, 92, 246, 0.5)',
    holding: '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)',
    holdingPeak: '0 0 35px rgba(245, 158, 11, 0.7), 0 0 60px rgba(249, 115, 22, 0.4)',
  },
} as const

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const spacing = {
  '0': '0px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

export const radii = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '28px',  // Bubble main
  full: '9999px', // Pills
} as const

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

export const typography = {
  fontFamily: {
    primary: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  fontSize: {
    xs: '10px',    // timestamps
    sm: '12px',    // quick actions
    base: '14px',  // body text
    md: '16px',    // greeting
    lg: '18px',    // bubble title
    xl: '20px',    // section headers
    '2xl': '24px', // hero title
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
} as const

// =============================================================================
// UNIFIED TOKEN EXPORT
// =============================================================================

export const tokens = {
  colors,
  animations,
  shadows,
  spacing,
  radii,
  typography,
} as const

export type DesignTokens = typeof tokens
