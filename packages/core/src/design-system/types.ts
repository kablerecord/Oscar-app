/**
 * OSQR Design System Types
 *
 * Core type definitions for the design token system.
 */

// ============================================
// DESIGN TOKENS
// ============================================

export interface OSQRDesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
  radii: RadiiTokens;
  animations: AnimationTokens;
}

// --------------------------------------------
// COLOR SYSTEM
// --------------------------------------------

export interface ColorTokens {
  // Backgrounds (slate palette)
  background: {
    primary: string;      // #0f172a (slate-950)
    secondary: string;    // #1e293b (slate-900)
    tertiary: string;     // #334155 (slate-800)
    overlay: string;      // rgba(15, 23, 42, 0.95)
  };

  // Text
  text: {
    primary: string;      // #f1f5f9 (slate-100)
    secondary: string;    // #cbd5e1 (slate-300)
    muted: string;        // #94a3b8 (slate-400)
    subtle: string;       // #64748b (slate-500)
  };

  // Accent (primary brand color)
  accent: {
    primary: string;      // #3b82f6 (blue-500)
    hover: string;        // #2563eb (blue-600)
    light: string;        // #60a5fa (blue-400)
    subtle: string;       // #1e3a5f (blue-900)
  };

  // Secondary accent
  secondary: {
    primary: string;      // #8b5cf6 (purple-500)
    light: string;        // #a78bfa (purple-400)
    subtle: string;       // rgba(139, 92, 246, 0.2)
  };

  // Presence states (mood colors)
  presence: {
    idle: string;         // rgba(59, 130, 246, 0.3) - blue
    thinking: string;     // rgba(139, 92, 246, 0.5) - brighter purple
    waiting: string;      // rgba(139, 92, 246, 0.2) - subtle purple
    connected: string;    // rgba(139, 92, 246, 0.4) - medium purple
    holding: string;      // rgba(245, 158, 11, 0.4) - amber
    holdingPeak: string;  // rgba(245, 158, 11, 0.7) - brighter amber
  };

  // Insight categories
  category: {
    contradiction: string;  // #fbbf24 (amber-400)
    clarify: string;        // #60a5fa (blue-400)
    nextStep: string;       // #4ade80 (green-400)
    recall: string;         // #c084fc (purple-400)
  };

  // Borders
  border: {
    default: string;      // #334155 (slate-700)
    subtle: string;       // rgba(51, 65, 85, 0.5)
    focus: string;        // #3b82f6 (blue-500)
  };

  // Semantic
  semantic: {
    success: string;      // #4ade80 (green-400)
    warning: string;      // #fbbf24 (amber-400)
    error: string;        // #f87171 (red-400)
    info: string;         // #60a5fa (blue-400)
  };
}

// --------------------------------------------
// TYPOGRAPHY
// --------------------------------------------

export interface TypographyTokens {
  fontFamily: {
    primary: string;      // System font stack
    mono: string;         // Monospace for code
  };

  fontSize: {
    xs: string;           // 10px - timestamps
    sm: string;           // 12px - quick actions
    base: string;         // 14px - body text
    md: string;           // 16px - greeting
    lg: string;           // 18px - bubble title
    xl: string;           // 20px - section headers
    '2xl': string;        // 24px - hero title
  };

  fontWeight: {
    normal: number;       // 400
    medium: number;       // 500
    semibold: number;     // 600
    bold: number;         // 700
  };

  lineHeight: {
    tight: string;        // 1.25
    normal: string;       // 1.5
    relaxed: string;      // 1.75
  };
}

// --------------------------------------------
// SPACING
// --------------------------------------------

export interface SpacingTokens {
  '0': string;            // 0px
  '1': string;            // 4px
  '1.5': string;          // 6px
  '2': string;            // 8px
  '2.5': string;          // 10px
  '3': string;            // 12px
  '4': string;            // 16px
  '5': string;            // 20px
  '6': string;            // 24px
  '8': string;            // 32px
  '10': string;           // 40px
  '12': string;           // 48px
  '16': string;           // 64px
}

// --------------------------------------------
// SHADOWS
// --------------------------------------------

export interface GlowTokens {
  idle: string;           // Blue idle glow
  idlePeak: string;       // Blue pulse peak
  thinking: string;       // Purple thinking
  thinkingPeak: string;   // Purple pulse peak
  holding: string;        // Amber holding
  holdingPeak: string;    // Amber pulse peak
}

export interface ShadowTokens {
  // Elevation levels
  sm: string;             // Subtle lift
  md: string;             // Cards, buttons
  lg: string;             // Modals, dropdowns
  xl: string;             // Floating elements
  '2xl': string;          // Prominent elements

  // Glow effects (for Bubble presence)
  glow: GlowTokens;
}

// --------------------------------------------
// BORDER RADIUS
// --------------------------------------------

export interface RadiiTokens {
  none: string;           // 0px
  sm: string;             // 4px
  md: string;             // 8px
  lg: string;             // 12px
  xl: string;             // 16px
  '2xl': string;          // 24px
  '3xl': string;          // 28px - Bubble main
  full: string;           // 9999px - Pills
}

// --------------------------------------------
// ANIMATIONS
// --------------------------------------------

export interface AnimationDurationTokens {
  instant: string;        // 0ms
  fast: string;           // 150ms
  normal: string;         // 300ms
  slow: string;           // 500ms
  slower: string;         // 700ms
}

export interface AnimationEasingTokens {
  default: string;        // ease-out
  smooth: string;         // cubic-bezier(0.4, 0, 0.2, 1)
  bounce: string;         // cubic-bezier(0.68, -0.55, 0.265, 1.55) - ONLY for errors
}

export interface AnimationPulseTokens {
  idle: string;           // 2000ms
  holding: string;        // 1500ms
  thinking: string;       // 2000ms
  connected: string;      // 4000ms
}

export interface AnimationTokens {
  duration: AnimationDurationTokens;
  easing: AnimationEasingTokens;
  pulse: AnimationPulseTokens;
}

// --------------------------------------------
// PRESENCE & BUBBLE
// --------------------------------------------

export type BubbleState = 'hidden' | 'idle' | 'holding' | 'expanded' | 'connected';
export type PresenceState = 'idle' | 'thinking' | 'waiting' | 'connected' | 'holding';

export interface PresenceVisuals {
  glowColor: string;
  animation: string;
  shadowIntensity: 'low' | 'medium' | 'high';
}

export interface PresenceContext {
  isProcessing: boolean;
  hasResponse: boolean;
  hasPendingInsight: boolean;
}

// --------------------------------------------
// RESPONSIVE
// --------------------------------------------

export interface Breakpoints {
  sm: string;   // 640px - Mobile landscape
  md: string;   // 768px - Tablet
  lg: string;   // 1024px - Desktop
  xl: string;   // 1280px - Large desktop
  '2xl': string; // 1536px - Extra large
}

export interface ResponsiveValue<T> {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

// --------------------------------------------
// COMPONENT STANDARDS
// --------------------------------------------

export type ComponentVariant = 'primary' | 'secondary' | 'ghost';
export type ComponentSize = 'sm' | 'md' | 'lg';
export type ComponentState = 'default' | 'hover' | 'active' | 'disabled';

export interface OSQRComponentProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  state?: ComponentState;
}
