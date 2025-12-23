/**
 * OSQR Design System - Color Tokens
 *
 * All color values for the OSQR design system.
 * Based on a slate palette with blue/purple accents.
 */

import { ColorTokens } from '../types';

export const colors: ColorTokens = {
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

  // Accent (primary brand color - blue)
  accent: {
    primary: '#3b82f6',      // blue-500
    hover: '#2563eb',        // blue-600
    light: '#60a5fa',        // blue-400
    subtle: '#1e3a5f',       // blue-900
  },

  // Secondary accent (purple)
  secondary: {
    primary: '#8b5cf6',      // purple-500
    light: '#a78bfa',        // purple-400
    subtle: 'rgba(139, 92, 246, 0.2)',
  },

  // Presence states (mood colors)
  presence: {
    idle: 'rgba(59, 130, 246, 0.3)',         // blue - default resting
    thinking: 'rgba(139, 92, 246, 0.5)',     // brighter purple - processing
    waiting: 'rgba(139, 92, 246, 0.2)',      // subtle purple - listening
    connected: 'rgba(139, 92, 246, 0.4)',    // medium purple - active
    holding: 'rgba(245, 158, 11, 0.4)',      // amber - has insight
    holdingPeak: 'rgba(245, 158, 11, 0.7)',  // brighter amber - pulse peak
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
};

export default colors;
