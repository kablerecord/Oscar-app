# OSQR Design System Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2024
- **Status**: Ready for Implementation
- **Dependencies**: None (foundational spec)
- **Blocked By**: None
- **Enables**: Bubble Interface, Panel Interface, Mobile App, Future Robot Interface, All UI Components

## Executive Summary

The OSQR Design System defines the visual identity, interaction patterns, and component standards that make OSQR feel like a unified companion across all platforms. Bubble IS OSQR's presence—the relationship layer users interact with. The Panel is where work happens, but Bubble is the personality. This spec ensures visual and behavioral consistency from desktop to mobile to future embodiments.

## Scope

### In Scope
- Design tokens (colors, typography, spacing, shadows, radii, animations)
- Bubble visual identity and states
- Presence state system (color-as-mood)
- Animation principles and keyframes
- Component styling standards
- Cross-platform consistency rules
- Onboarding visual patterns
- Accessibility foundations

### Out of Scope (Deferred)
- Mobile-specific adaptations beyond responsive (v1.5)
- Voice UI patterns (v1.5)
- Robot/physical embodiment design (v3.0+)
- Dark/light theme switching (v2.0)
- Advanced motion design (micro-interactions) (v1.5)
- Plugin visual customization framework (v2.0)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                      OSQR Design System                             │
│                     (This Specification)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Design Tokens  │  │   Components    │  │  Animation System   │  │
│  │                 │  │                 │  │                     │  │
│  │ • Colors        │  │ • Bubble        │  │ • Presence states   │  │
│  │ • Typography    │  │ • Panel         │  │ • Transitions       │  │
│  │ • Spacing       │  │ • Cards         │  │ • Glow effects      │  │
│  │ • Shadows       │  │ • Inputs        │  │ • Interaction       │  │
│  │ • Radii         │  │ • Buttons       │  │   feedback          │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│           │                    │                      │             │
│           └────────────────────┼──────────────────────┘             │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Implementation Targets                       ││
│  │                                                                 ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐││
│  │  │  Web App │  │  Mobile  │  │ VS Code  │  │ Future Platforms │││
│  │  │ (Current)│  │   App    │  │Extension │  │ (Robot, etc.)    │││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Design Philosophy

**1. Bubble IS OSQR**
- Bubble is not a notification layer—it's OSQR's presence
- Panel is where work happens; Bubble is the relationship
- Users should feel they're interacting with an entity, not a feature

**2. Warm but Purposeful**
- Not cartoonish or silly
- Not cold or "just another wizard"
- Professional with a personal touch
- Right to the point when needed

**3. Movement with Intent**
- All animation is purposeful, never playful
- Reactions are subtle, not exaggerated
- Glow intensity communicates importance
- Nothing bounces, wiggles, or seeks attention frivolously

**4. Consistency Across Contexts**
- Same core identity everywhere
- Variations adapt to platform, not change personality
- One visual element must always say "this is OSQR"

**5. Evolution Over Time**
- OSQR learns and adapts to user
- First week: more helpful, explanatory
- Month 3: assumes competence
- Year 1: references shared history

### Core Data Structures

```typescript
// ============================================
// DESIGN TOKENS
// ============================================

interface OSQRDesignTokens {
  colors: ColorTokens
  typography: TypographyTokens
  spacing: SpacingTokens
  shadows: ShadowTokens
  radii: RadiiTokens
  animations: AnimationTokens
}

// --------------------------------------------
// COLOR SYSTEM
// --------------------------------------------

interface ColorTokens {
  // Backgrounds (slate palette)
  background: {
    primary: string      // #0f172a (slate-950)
    secondary: string    // #1e293b (slate-900)
    tertiary: string     // #334155 (slate-800)
    overlay: string      // rgba(15, 23, 42, 0.95)
  }

  // Text
  text: {
    primary: string      // #f1f5f9 (slate-100)
    secondary: string    // #cbd5e1 (slate-300)
    muted: string        // #94a3b8 (slate-400)
    subtle: string       // #64748b (slate-500)
  }

  // Accent (primary brand color)
  accent: {
    primary: string      // #3b82f6 (blue-500)
    hover: string        // #2563eb (blue-600)
    light: string        // #60a5fa (blue-400)
    subtle: string       // #1e3a5f (blue-900)
  }

  // Secondary accent
  secondary: {
    primary: string      // #8b5cf6 (purple-500)
    light: string        // #a78bfa (purple-400)
    subtle: string       // rgba(139, 92, 246, 0.2)
  }

  // Presence states (mood colors)
  presence: {
    idle: string         // rgba(59, 130, 246, 0.3) - blue
    thinking: string     // rgba(139, 92, 246, 0.5) - brighter purple
    waiting: string      // rgba(139, 92, 246, 0.2) - subtle purple
    connected: string    // rgba(139, 92, 246, 0.4) - medium purple
    holding: string      // rgba(245, 158, 11, 0.4) - amber
    holdingPeak: string  // rgba(245, 158, 11, 0.7) - brighter amber
  }

  // Insight categories
  category: {
    contradiction: string  // #fbbf24 (amber-400)
    clarify: string        // #60a5fa (blue-400)
    nextStep: string       // #4ade80 (green-400)
    recall: string         // #c084fc (purple-400)
  }

  // Borders
  border: {
    default: string      // #334155 (slate-700)
    subtle: string       // rgba(51, 65, 85, 0.5)
    focus: string        // #3b82f6 (blue-500)
  }

  // Semantic
  semantic: {
    success: string      // #4ade80 (green-400)
    warning: string      // #fbbf24 (amber-400)
    error: string        // #f87171 (red-400)
    info: string         // #60a5fa (blue-400)
  }
}

// --------------------------------------------
// TYPOGRAPHY
// --------------------------------------------

interface TypographyTokens {
  fontFamily: {
    primary: string      // System font stack
    mono: string         // Monospace for code
  }

  fontSize: {
    xs: string           // 10px - timestamps
    sm: string           // 12px - quick actions
    base: string         // 14px - body text
    md: string           // 16px - greeting
    lg: string           // 18px - bubble title
    xl: string           // 20px - section headers
    '2xl': string        // 24px - hero title
  }

  fontWeight: {
    normal: number       // 400
    medium: number       // 500
    semibold: number     // 600
    bold: number         // 700
  }

  lineHeight: {
    tight: string        // 1.25
    normal: string       // 1.5
    relaxed: string      // 1.75
  }
}

// --------------------------------------------
// SPACING
// --------------------------------------------

interface SpacingTokens {
  '0': string            // 0px
  '1': string            // 4px
  '1.5': string          // 6px
  '2': string            // 8px
  '2.5': string          // 10px
  '3': string            // 12px
  '4': string            // 16px
  '5': string            // 20px
  '6': string            // 24px
  '8': string            // 32px
  '10': string           // 40px
  '12': string           // 48px
  '16': string           // 64px
}

// --------------------------------------------
// SHADOWS
// --------------------------------------------

interface ShadowTokens {
  // Elevation levels
  sm: string             // Subtle lift
  md: string             // Cards, buttons
  lg: string             // Modals, dropdowns
  xl: string             // Floating elements
  '2xl': string          // Prominent elements

  // Glow effects (for Bubble presence)
  glow: {
    idle: string         // Blue idle glow
    idlePeak: string     // Blue pulse peak
    thinking: string     // Purple thinking
    thinkingPeak: string // Purple pulse peak
    holding: string      // Amber holding
    holdingPeak: string  // Amber pulse peak
  }
}

// --------------------------------------------
// BORDER RADIUS
// --------------------------------------------

interface RadiiTokens {
  none: string           // 0px
  sm: string             // 4px
  md: string             // 8px
  lg: string             // 12px
  xl: string             // 16px
  '2xl': string          // 24px
  '3xl': string          // 28px - Bubble main
  full: string           // 9999px - Pills
}

// --------------------------------------------
// ANIMATIONS
// --------------------------------------------

interface AnimationTokens {
  duration: {
    instant: string      // 0ms
    fast: string         // 150ms
    normal: string       // 300ms
    slow: string         // 500ms
    slower: string       // 700ms
  }

  easing: {
    default: string      // ease-out
    smooth: string       // cubic-bezier(0.4, 0, 0.2, 1)
    bounce: string       // cubic-bezier(0.68, -0.55, 0.265, 1.55) - ONLY for errors
  }

  // Named animation durations
  pulse: {
    idle: string         // 2000ms
    holding: string      // 1500ms
    thinking: string     // 2000ms
    connected: string    // 4000ms
  }
}
```

### Key Algorithms

#### Token Resolution

```typescript
/**
 * Resolve design token to actual CSS value
 * Supports dot notation: "colors.accent.primary"
 */
function resolveToken(path: string, tokens: OSQRDesignTokens): string {
  const parts = path.split('.')
  let current: any = tokens

  for (const part of parts) {
    if (current[part] === undefined) {
      console.warn(`Design token not found: ${path}`)
      return ''
    }
    current = current[part]
  }

  return current
}

// Usage
const accentColor = resolveToken('colors.accent.primary', tokens) // "#3b82f6"
```

#### Presence State Resolver

```typescript
/**
 * Determine visual presence state based on Bubble state and context
 */
type BubbleState = 'hidden' | 'idle' | 'holding' | 'expanded' | 'connected'
type PresenceState = 'idle' | 'thinking' | 'waiting' | 'connected' | 'holding'

interface PresenceVisuals {
  glowColor: string
  animation: string
  shadowIntensity: 'low' | 'medium' | 'high'
}

function resolvePresenceVisuals(
  bubbleState: BubbleState,
  isProcessing: boolean,
  hasResponse: boolean
): PresenceVisuals {
  // Hidden state - no visuals
  if (bubbleState === 'hidden') {
    return {
      glowColor: 'transparent',
      animation: 'none',
      shadowIntensity: 'low'
    }
  }

  // Holding insight - amber glow
  if (bubbleState === 'holding') {
    return {
      glowColor: tokens.colors.presence.holding,
      animation: 'pulse-glow-amber',
      shadowIntensity: 'high'
    }
  }

  // Processing/thinking - purple pulse
  if (isProcessing) {
    return {
      glowColor: tokens.colors.presence.thinking,
      animation: 'thinking-pulse',
      shadowIntensity: 'medium'
    }
  }

  // Connected and active conversation
  if (bubbleState === 'connected' || bubbleState === 'expanded') {
    return {
      glowColor: tokens.colors.presence.connected,
      animation: 'connected-breathing',
      shadowIntensity: 'medium'
    }
  }

  // Default idle
  return {
    glowColor: tokens.colors.presence.idle,
    animation: 'subtle-pulse',
    shadowIntensity: 'low'
  }
}
```

#### Responsive Breakpoints

```typescript
/**
 * Breakpoint system for cross-platform consistency
 */
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
}

interface ResponsiveValue<T> {
  base: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
}

/**
 * Resolve responsive value for current viewport
 */
function resolveResponsive<T>(value: ResponsiveValue<T>, width: number): T {
  if (width >= 1280 && value.xl) return value.xl
  if (width >= 1024 && value.lg) return value.lg
  if (width >= 768 && value.md) return value.md
  if (width >= 640 && value.sm) return value.sm
  return value.base
}

// Bubble dimensions by breakpoint
const bubbleDimensions: ResponsiveValue<{ width: string; bottom: string; right: string }> = {
  base: { width: 'calc(100vw - 2rem)', bottom: '80px', right: '16px' },  // Mobile
  md: { width: '380px', bottom: '24px', right: '24px' }                   // Desktop
}
```

## Implementation Checklist

### Phase 1: Token Foundation
- [ ] Create `/src/design-system/tokens/colors.ts` with all color values
- [ ] Create `/src/design-system/tokens/typography.ts` with font settings
- [ ] Create `/src/design-system/tokens/spacing.ts` with spacing scale
- [ ] Create `/src/design-system/tokens/shadows.ts` with shadow definitions
- [ ] Create `/src/design-system/tokens/radii.ts` with border radius values
- [ ] Create `/src/design-system/tokens/animations.ts` with timing values
- [ ] Create `/src/design-system/tokens/index.ts` to export unified token object
- [ ] Add `resolveToken()` utility function

### Phase 2: CSS Variables
- [ ] Generate CSS custom properties from tokens
- [ ] Update `globals.css` to use generated variables
- [ ] Create dark theme variable set (future-proofing)
- [ ] Add CSS variable fallbacks for older browsers
- [ ] Document variable naming convention

### Phase 3: Animation Keyframes
- [ ] Implement `@keyframes subtle-pulse` (idle state)
- [ ] Implement `@keyframes pulse-glow-amber` (holding state)
- [ ] Implement `@keyframes thinking-pulse` (processing state)
- [ ] Implement `@keyframes connected-breathing` (active conversation)
- [ ] Implement `@keyframes shimmer` (text highlight effect)
- [ ] Implement `@keyframes float` (decorative blobs)
- [ ] Create animation utility classes
- [ ] Add `prefers-reduced-motion` alternatives

### Phase 4: Bubble Component Alignment
- [ ] Audit `OSCARBubble.tsx` against token system
- [ ] Replace hardcoded colors with token references
- [ ] Replace hardcoded spacing with token references
- [ ] Implement missing presence state visuals (thinking, waiting, connected)
- [ ] Add purple presence colors per spec
- [ ] Ensure glow intensity matches importance levels

### Phase 5: Component Library
- [ ] Create `Button` component with token-based variants
- [ ] Create `Input` component with consistent styling
- [ ] Create `Card` component for chat messages and insights
- [ ] Create `Badge` component for notifications
- [ ] Create `IconContainer` component for brain icon states
- [ ] Document component API and variants

### Phase 6: Responsive System
- [ ] Implement breakpoint hooks (`useBreakpoint`)
- [ ] Create responsive wrapper components
- [ ] Test Bubble at all breakpoints
- [ ] Ensure touch targets meet 44px minimum on mobile
- [ ] Verify text remains readable at all sizes

### Phase 7: Documentation
- [ ] Create Storybook stories for all components
- [ ] Document token usage guidelines
- [ ] Create visual reference sheet
- [ ] Add accessibility notes for each component
- [ ] Create "do and don't" examples

## API Contracts

### Inputs

```typescript
// Token access
function getToken(path: string): string
function getColorToken(path: string): string
function getSpacingToken(size: keyof SpacingTokens): string

// Presence resolution
function getPresenceVisuals(state: BubbleState, context: PresenceContext): PresenceVisuals

// Responsive values
function useBreakpoint(): 'base' | 'sm' | 'md' | 'lg' | 'xl'
function useResponsiveValue<T>(values: ResponsiveValue<T>): T
```

### Outputs

```typescript
// Generated CSS
:root {
  /* Colors */
  --osqr-color-bg-primary: #0f172a;
  --osqr-color-bg-secondary: #1e293b;
  --osqr-color-text-primary: #f1f5f9;
  --osqr-color-accent-primary: #3b82f6;
  /* ... all tokens as CSS variables */

  /* Presence glows */
  --osqr-glow-idle: 0 0 20px rgba(59, 130, 246, 0.3);
  --osqr-glow-holding: 0 0 20px rgba(245, 158, 11, 0.4);
  /* ... */
}

// Component props standardization
interface OSQRComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  state?: 'default' | 'hover' | 'active' | 'disabled'
}
```

## Configuration

### Environment Variables

```env
# Design System Configuration
OSQR_DESIGN_THEME=dark
OSQR_DESIGN_REDUCE_MOTION=false
OSQR_DESIGN_HIGH_CONTRAST=false
```

### Default Token Values

```typescript
const DEFAULT_TOKENS: OSQRDesignTokens = {
  colors: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      overlay: 'rgba(15, 23, 42, 0.95)'
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      subtle: '#64748b'
    },
    accent: {
      primary: '#3b82f6',
      hover: '#2563eb',
      light: '#60a5fa',
      subtle: '#1e3a5f'
    },
    secondary: {
      primary: '#8b5cf6',
      light: '#a78bfa',
      subtle: 'rgba(139, 92, 246, 0.2)'
    },
    presence: {
      idle: 'rgba(59, 130, 246, 0.3)',
      thinking: 'rgba(139, 92, 246, 0.5)',
      waiting: 'rgba(139, 92, 246, 0.2)',
      connected: 'rgba(139, 92, 246, 0.4)',
      holding: 'rgba(245, 158, 11, 0.4)',
      holdingPeak: 'rgba(245, 158, 11, 0.7)'
    },
    category: {
      contradiction: '#fbbf24',
      clarify: '#60a5fa',
      nextStep: '#4ade80',
      recall: '#c084fc'
    },
    border: {
      default: '#334155',
      subtle: 'rgba(51, 65, 85, 0.5)',
      focus: '#3b82f6'
    },
    semantic: {
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa'
    }
  },
  typography: {
    fontFamily: {
      primary: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
    },
    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  spacing: {
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
    '16': '64px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: {
      idle: '0 0 20px rgba(59, 130, 246, 0.3)',
      idlePeak: '0 10px 35px -3px rgba(59, 130, 246, 0.45), 0 4px 8px -4px rgba(139, 92, 246, 0.35)',
      thinking: '0 0 20px rgba(139, 92, 246, 0.3)',
      thinkingPeak: '0 0 30px rgba(139, 92, 246, 0.5)',
      holding: '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)',
      holdingPeak: '0 0 35px rgba(245, 158, 11, 0.7), 0 0 60px rgba(249, 115, 22, 0.4)'
    }
  },
  radii: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '28px',
    full: '9999px'
  },
  animations: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms'
    },
    easing: {
      default: 'ease-out',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    pulse: {
      idle: '2000ms',
      holding: '1500ms',
      thinking: '2000ms',
      connected: '4000ms'
    }
  }
}
```

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Token path not found | Console warning | Return empty string |
| Invalid color format | Console error | Use closest valid color |
| Animation not supported | Skip animation | Static state |
| CSS variable not defined | Use hardcoded fallback | Inline value |
| Breakpoint detection fails | Default to 'base' | Mobile-first |
| Reduced motion preference | Disable animations | Static glows |

## Success Criteria

1. [ ] All design tokens exported from single source (`/src/design-system/tokens/index.ts`)
2. [ ] `OSCARBubble.tsx` uses zero hardcoded color values - all from tokens
3. [ ] All four presence states visually distinct (idle=blue, thinking=purple pulse, waiting=subtle purple, connected=purple breathing, holding=amber)
4. [ ] Glow intensity correlates with Bubble state importance
5. [ ] Animation durations match spec (idle=2s, holding=1.5s, thinking=2s, connected=4s)
6. [ ] Bubble renders correctly at all breakpoints (mobile, tablet, desktop)
7. [ ] `prefers-reduced-motion` disables all non-essential animations
8. [ ] CSS variables generated and applied in `globals.css`
9. [ ] Component library has consistent prop interfaces
10. [ ] Visual regression tests pass for all Bubble states

## Open Questions

- [ ] **Brand color refinement**: Current blue (#3b82f6) vs. a more distinctive OSQR blue?
- [ ] **App icon design**: What should Bubble look like as a home screen icon?
- [ ] **Onboarding blob colors**: Should decorative blobs use brand colors or stay neutral?
- [ ] **High contrast mode**: What are the exact color mappings for accessibility?
- [ ] **Sound design**: Should presence state changes have audio cues? (v1.5)
- [ ] **Haptic patterns**: Mobile haptic feedback for state changes? (v1.5)
- [ ] **Loading states**: Skeleton screens vs. spinners vs. Bubble-native loading?
- [ ] **Thinking transparency**: Should OSQR show what it's thinking about during the `thinking` state? (e.g., "Checking your calendar..." or "Looking at Record Homes project...") Research suggests this "scratchpad" pattern builds user trust by making AI reasoning visible. (v1.5)

## Research Foundation

This specification was informed by:

1. **Current Implementation Audit** (December 19, 2024)
   - OSCARBubble.tsx (1287 lines)
   - globals.css design tokens
   - BUBBLE-COMPONENT-SPEC.md

2. **Jarvis Personality Analysis** (prior conversation)
   - British butler sensibility
   - Warm but professional
   - Anticipatory, not reactive

3. **OSQR Bubble Interface Spec v1** (this project)
   - Behavioral requirements informing visual states
   - Confidence scoring → glow intensity mapping

4. **User Requirements** (this conversation)
   - "Warm but purposeful, not cartoonish"
   - "Movement with intent, not playful"
   - "Bubble IS OSQR"

## Appendices

### A: Animation Keyframes (CSS)

```css
/* ============================================
   PRESENCE STATE ANIMATIONS
   ============================================ */

/* Idle State - Subtle blue pulse */
@keyframes subtle-pulse {
  0%, 100% {
    box-shadow: 0 10px 25px -3px rgba(59, 130, 246, 0.3),
                0 4px 6px -4px rgba(139, 92, 246, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 10px 35px -3px rgba(59, 130, 246, 0.45),
                0 4px 8px -4px rgba(139, 92, 246, 0.35);
    transform: scale(1.005);
  }
}

/* Thinking State - Purple pulse */
@keyframes thinking-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
  }
}

/* Connected State - Slow breathing */
@keyframes connected-breathing {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.4);
  }
}

/* Holding State - Amber attention pulse */
@keyframes pulse-glow-amber {
  0%, 100% {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4),
                0 0 40px rgba(249, 115, 22, 0.2);
  }
  50% {
    box-shadow: 0 0 35px rgba(245, 158, 11, 0.7),
                0 0 60px rgba(249, 115, 22, 0.4);
  }
}

/* Waiting State - Static warm glow (no animation) */
.bubble--waiting {
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
}

/* ============================================
   DECORATIVE ANIMATIONS
   ============================================ */

/* Text shimmer effect */
@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

/* Floating blobs */
@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* Ping dot for notifications */
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* ============================================
   REDUCED MOTION ALTERNATIVES
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  .animate-subtle-pulse,
  .animate-thinking-pulse,
  .animate-connected-breathing,
  .animate-pulse-glow-amber {
    animation: none !important;
  }

  /* Static glow fallbacks */
  .bubble--idle { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
  .bubble--thinking { box-shadow: 0 0 25px rgba(139, 92, 246, 0.4); }
  .bubble--connected { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  .bubble--holding { box-shadow: 0 0 25px rgba(245, 158, 11, 0.5); }
}
```

### B: Bubble Visual States Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│  IDLE STATE (Default)                                               │
│  ─────────────────────                                              │
│  Glow: Blue (rgba(59, 130, 246, 0.3))                               │
│  Animation: subtle-pulse (2s)                                       │
│  Trigger: No pending insights, no active conversation               │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  ░░░░░░░░░░░░░░░░░░░░░  │  ← Blue glow                          │
│  │  ░  ┌──────────────┐ ░  │                                        │
│  │  ░  │              │ ░  │                                        │
│  │  ░  │    OSQR      │ ░  │                                        │
│  │  ░  │              │ ░  │                                        │
│  │  ░  └──────────────┘ ░  │                                        │
│  │  ░░░░░░░░░░░░░░░░░░░░░  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  THINKING STATE (Processing)                                        │
│  ──────────────────────────                                         │
│  Glow: Purple (rgba(139, 92, 246, 0.5))                             │
│  Animation: thinking-pulse (2s)                                     │
│  Trigger: Waiting for API response, processing user input           │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← Brighter purple pulse              │
│  │  ▓  ┌──────────────┐ ▓  │                                        │
│  │  ▓  │              │ ▓  │                                        │
│  │  ▓  │    OSQR      │ ▓  │                                        │
│  │  ▓  │   thinking   │ ▓  │                                        │
│  │  ▓  └──────────────┘ ▓  │                                        │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  CONNECTED STATE (Active Conversation)                              │
│  ─────────────────────────────────────                              │
│  Glow: Medium purple (rgba(139, 92, 246, 0.4))                      │
│  Animation: connected-breathing (4s)                                │
│  Trigger: Expanded bubble, active chat session                      │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  ░▒░▒░▒░▒░▒░▒░▒░▒░▒░▒░  │  ← Slow breathing scale               │
│  │  ▒  ┌──────────────┐ ▒  │                                        │
│  │  ░  │  Chat...     │ ░  │                                        │
│  │  ▒  │  ...active   │ ▒  │                                        │
│  │  ░  │              │ ░  │                                        │
│  │  ▒  └──────────────┘ ▒  │                                        │
│  │  ░▒░▒░▒░▒░▒░▒░▒░▒░▒░▒░  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  HOLDING STATE (Has Insight)                                        │
│  ──────────────────────────                                         │
│  Glow: Amber (rgba(245, 158, 11, 0.4-0.7))                          │
│  Animation: pulse-glow-amber (1.5s)                                 │
│  Trigger: Insight queued, waiting for user attention                │
│                                                                     │
│  ┌───────────────────────────────┐                                  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← Amber attention pulse        │
│  │  ▓                         ▓  │                                  │
│  │  ▓  💡 I noticed something ●  ▓  │  ← Pinging white dot           │
│  │  ▓                         ▓  │                                  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │                                  │
│  └───────────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WAITING STATE (Listening)                                          │
│  ─────────────────────────                                          │
│  Glow: Subtle purple (rgba(139, 92, 246, 0.2))                      │
│  Animation: none (static)                                           │
│  Trigger: User typing, waiting for more input                       │
│                                                                     │
│  ┌─────────────────────────┐                                        │
│  │  ░░░░░░░░░░░░░░░░░░░░░  │  ← Soft static glow                   │
│  │  ░  ┌──────────────┐ ░  │                                        │
│  │  ░  │              │ ░  │                                        │
│  │  ░  │    OSQR      │ ░  │                                        │
│  │  ░  │  listening...│ ░  │                                        │
│  │  ░  └──────────────┘ ░  │                                        │
│  │  ░░░░░░░░░░░░░░░░░░░░░  │                                        │
│  └─────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### C: File Structure

```
/src/design-system/
├── index.ts                      # Public exports
├── types.ts                      # All TypeScript interfaces
├── tokens/
│   ├── index.ts                  # Unified token export
│   ├── colors.ts                 # Color tokens
│   ├── typography.ts             # Typography tokens
│   ├── spacing.ts                # Spacing scale
│   ├── shadows.ts                # Shadow definitions
│   ├── radii.ts                  # Border radius values
│   └── animations.ts             # Animation timing
├── css/
│   ├── variables.css             # Generated CSS custom properties
│   ├── animations.css            # Keyframe definitions
│   ├── utilities.css             # Utility classes
│   └── reset.css                 # Minimal reset/normalize
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.styles.ts
│   │   └── Button.stories.tsx
│   ├── Input/
│   ├── Card/
│   ├── Badge/
│   └── IconContainer/
├── hooks/
│   ├── useBreakpoint.ts
│   ├── useResponsiveValue.ts
│   ├── useReducedMotion.ts
│   └── usePresenceVisuals.ts
├── utils/
│   ├── resolveToken.ts
│   ├── generateCSSVariables.ts
│   └── colorUtils.ts
└── __tests__/
    ├── tokens.test.ts
    ├── resolveToken.test.ts
    └── components.test.ts
```

### D: Cross-Platform Consistency Rules

**What MUST Stay Consistent:**
1. Rounded square shape with same proportions
2. Glow-as-mood system (blue=idle, purple=thinking/connected, amber=holding)
3. Shadow presence
4. Jarvis voice/personality in all text
5. Animation timing (idle=2s, holding=1.5s, etc.)

**What CAN Adapt:**
1. Absolute dimensions (mobile smaller than desktop)
2. Position on screen (bottom-right on desktop, bottom-center on mobile possible)
3. Input method (text on desktop, text+voice on mobile)
4. Touch target sizes (44px minimum on mobile)
5. Animation intensity (reduced on mobile for battery)

**The "OSQR Test":**
> If you saw this element out of context (screenshot, video, across the room), would you know it's OSQR?

Checklist:
- [ ] Is it a rounded square?
- [ ] Does it have a glow?
- [ ] Is the glow color from the presence palette?
- [ ] Does it feel warm but purposeful?
- [ ] Does the movement (if any) feel intentional?

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Next Review: Post-v1.0 Launch*
