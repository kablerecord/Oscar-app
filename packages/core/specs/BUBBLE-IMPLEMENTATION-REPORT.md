# OSQR Bubble Interface Implementation Report

**Generated:** December 19, 2024
**Purpose:** Design system documentation for cross-instance sharing
**Source Codebase:** `/Users/kablerecord/Desktop/oscar-app/`

---

## 1. File Locations

### Primary Implementation Files

| File | Purpose |
|------|---------|
| `components/oscar/OSCARBubble.tsx` | Main bubble component (1287 lines) |
| `components/oscar/CompanionBubble.tsx` | Simplified variant for profile/onboarding |
| `app/globals.css` | Global CSS with animations and design tokens |
| `docs/features/BUBBLE-COMPONENT-SPEC.md` | Technical specification document |

### Related Files

| File | Purpose |
|------|---------|
| `lib/onboarding/oscar-onboarding.ts` | Onboarding state machine and messages |
| `lib/til/insight-queue.ts` | Insight category types |
| `components/layout/RightPanelBar.tsx` | Highlight target integration |

---

## 2. Current Visual Implementation

### 2.1 Colors

#### CSS Variables (globals.css)
```css
:root {
  /* Backgrounds */
  --background: #0f172a;           /* slate-950 */
  --background-secondary: #1e293b; /* slate-900 */
  --background-tertiary: #334155;  /* slate-800 */

  /* Text */
  --foreground: #f1f5f9;           /* slate-100 */
  --foreground-muted: #94a3b8;     /* slate-400 */

  /* Accents */
  --accent: #3b82f6;               /* blue-500 */
  --accent-hover: #2563eb;         /* blue-600 */
  --accent-light: #60a5fa;         /* blue-400 */

  /* Borders */
  --border: #334155;               /* slate-700 */

  /* Card surfaces */
  --card: #1e293b;                 /* slate-900 */
}
```

#### Bubble-Specific Colors
| Element | Value | Usage |
|---------|-------|-------|
| Bubble background | `bg-slate-900` | Main container |
| Bubble border | `border-slate-700/50` | Subtle border |
| Blue glow | `rgba(59, 130, 246, 0.3)` | Idle state shadow |
| Purple accent | `#8b5cf6` / `rgba(139, 92, 246, X)` | Gradient secondary |
| Amber glow | `rgba(245, 158, 11, 0.4)` | Insight holding state |
| Orange accent | `rgba(249, 115, 22, X)` | Insight pulse |

#### Presence State Colors (from spec)
| State | Color | Opacity |
|-------|-------|---------|
| Available | `rgba(147, 51, 234, 0.3)` | Purple glow |
| Thinking | `rgba(147, 51, 234, 0.5)` | Brighter purple |
| Waiting | `rgba(147, 51, 234, 0.2)` | Subtle purple |
| Connected | `rgba(147, 51, 234, 0.4)` | Medium purple |

#### Category Colors (Insight Types)
```typescript
const CATEGORY_CONFIG = {
  contradiction: { color: 'text-amber-400' },   // #fbbf24
  clarify: { color: 'text-blue-400' },          // #60a5fa
  next_step: { color: 'text-green-400' },       // #4ade80
  recall: { color: 'text-purple-400' },         // #c084fc
}
```

### 2.2 Dimensions

#### Bubble Container
```css
/* Desktop */
width: 380px (max-width)
position: fixed
bottom: 24px (bottom-6)
right: 24px (right-6)

/* Mobile */
width: calc(100vw - 2rem)
max-width: 380px
bottom: 80px (bottom-20)
right: 16px (right-4)
```

#### Border Radius
```css
/* Main bubble */
border-radius: 28px (rounded-[28px])

/* Onboarding takeover card */
border-radius: 24px (rounded-3xl)

/* Chat messages */
border-radius: 12px (rounded-xl)

/* Brain icon container */
border-radius: 16px (rounded-xl) - small
border-radius: 24px (rounded-2xl) - hero

/* Input fields */
border-radius: 12px (rounded-xl)

/* Buttons */
border-radius: 12px (rounded-xl)
border-radius: 9999px (rounded-full) - pill
```

#### Specific Element Sizes
| Element | Size |
|---------|------|
| Brain icon (hero) | 80×80px container, 40px icon |
| Brain icon (bubble) | 56×56px container, 28px icon |
| Brain icon (header) | 32×32px container, 16px icon |
| Drag handle | 16×16px |
| Header bar | height: 48px |
| Chat area max-height | 280px |
| Minimized pill icon | 16×16px (h-4 w-4) |
| Send button | padding 6px (p-1.5) |

### 2.3 Shadows

#### Blue Glow (Idle State)
```css
box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
```

#### Subtle Pulse Shadow
```css
/* Animation keyframes */
0%, 100% {
  box-shadow: 0 10px 25px -3px rgba(59, 130, 246, 0.3),
              0 4px 6px -4px rgba(139, 92, 246, 0.2);
}
50% {
  box-shadow: 0 10px 35px -3px rgba(59, 130, 246, 0.45),
              0 4px 8px -4px rgba(139, 92, 246, 0.35);
}
```

#### Amber Glow (Insight Holding)
```css
0%, 100% {
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4),
              0 0 40px rgba(249, 115, 22, 0.2);
}
50% {
  box-shadow: 0 0 35px rgba(245, 158, 11, 0.7),
              0 0 60px rgba(249, 115, 22, 0.4);
}
```

#### Tailwind Shadow Classes Used
```
shadow-xl
shadow-2xl
shadow-lg
shadow-blue-500/10
shadow-blue-500/25
shadow-blue-500/40
```

### 2.4 Typography

#### Font Family
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

#### Font Sizes
| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Hero title | 24px | bold | `text-2xl font-bold` |
| Bubble title | 18px | bold | `text-lg font-bold` |
| Greeting | 16px | medium | `text-base font-medium` |
| Body text | 14px | normal | `text-sm` |
| Sub-message | 14px | normal | `text-sm text-slate-400` |
| Chat timestamp | 10px | normal | `text-[10px]` |
| Pill label | 14px | medium | `text-sm font-medium` |
| Quick actions | 12px | medium | `text-xs font-medium` |

### 2.5 Spacing

#### Padding
| Element | Value |
|---------|-------|
| Bubble content | 20px (px-5 py-5) |
| Hero content | 32px horizontal, 40px vertical (px-8 py-10) |
| Chat messages | 12px (p-3) |
| Header | 12px horizontal (px-3) |
| Buttons (standard) | 16px horizontal, 10px vertical (px-4 py-2.5) |
| Buttons (hero) | 24px horizontal, 12px vertical (px-6 py-3) |
| Choice buttons | 20px horizontal, 14px vertical (px-5 py-3.5) |

#### Margins & Gaps
| Element | Value |
|---------|-------|
| Message gap | 12px (space-y-3) |
| Header border bottom | 12px margin (mb-3 pb-3) |
| Brain icon to text | 16px (mb-4) hero, 12px (mb-3) bubble |
| Input area top | 12px (mt-3 pt-3) |

---

## 3. Current States

### 3.1 Bubble State Machine

```typescript
type BubbleState = 'hidden' | 'idle' | 'holding' | 'expanded' | 'connected'
```

| State | Visual | Animation | Trigger |
|-------|--------|-----------|---------|
| **hidden** | Not rendered | none | Focus mode active |
| **idle** | Blue subtle pulse | `animate-subtle-pulse` (2s) | Default, no pending insights |
| **holding** | Amber pulse glow | `animate-pulse-glow-amber` (1.5s) | Insight queued |
| **expanded** | Full bubble open | Slide in from right | User clicks holding pill |
| **connected** | "Opening conversation..." | Brief (500ms) | User clicks "Tell me more" |

### 3.2 Onboarding States

```typescript
type OnboardingStage =
  | 'welcome'           // Hero stage with brain icon
  | 'got_name'          // After name input
  | 'vault_discovery'   // Discovery phase
  | 'vault_highlight'
  | 'mode_discovery'
  | 'first_upload'
  | ...
```

| Phase | Visual Mode | Description |
|-------|------------|-------------|
| Intro (welcome, got_name) | Full-screen takeover | Dark overlay, centered card |
| Discovery | Corner bubble + highlights | Pill with tips, highlights UI elements |
| Post-onboarding | Corner bubble | Chat interface with history |

### 3.3 Visual State Differentiation

**Idle (Blue)**
- Gradient: `from-blue-500 to-purple-500`
- Animation: Subtle scale pulse 1.0→1.02
- Shadow: Blue glow

**Holding (Amber)**
- Gradient: `from-amber-500 to-orange-500`
- Animation: Stronger glow pulse
- Badge: Pinging white dot
- Text: Category-specific message

**Expanded**
- Full bubble visible
- Chat history scrollable
- Input field active
- Insight card with actions if present

---

## 4. Component Structure

### 4.1 Props Interface

```typescript
interface OSCARBubbleProps {
  // Onboarding
  onboardingState: OnboardingState
  onOnboardingProgress: (newState: OnboardingState) => void

  // Profile questions
  profileQuestion?: ProfileQuestion | null
  answeredCount?: number
  totalQuestions?: number
  onProfileAnswer?: (answer: string) => Promise<void>
  onProfileSkip?: () => void

  // Mode callbacks
  onModeChanged?: (mode: 'quick' | 'thoughtful' | 'contemplate') => void
  onQuestionAsked?: () => void

  // UI control
  alwaysVisible?: boolean

  // Proactive insights
  workspaceId?: string

  // Focus mode
  isFocusMode?: boolean

  // Panel integration
  onStartConversation?: (insight: PendingInsight) => void

  // Greeting state
  isGreetingCentered?: boolean

  // Chat callback
  onBubbleChat?: (message: string) => void

  // Highlights
  onHighlightElement?: (target: HighlightTarget) => void
}
```

### 4.2 Exported Types

```typescript
export interface PendingInsight {
  id: string
  category: InsightCategory  // 'contradiction' | 'clarify' | 'next_step' | 'recall'
  title: string
  message: string
  priority: number
  hasExpandedContent: boolean
}

export interface OSCARBubbleHandle {
  addMessage: (message: string, type?: ChatMessageType) => void
  openBubble: () => void
}
```

### 4.3 Internal State

```typescript
// Legacy onboarding state
const [isOpen, setIsOpen] = useState(false)
const [isMinimized, setIsMinimized] = useState(false)
const [answer, setAnswer] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)

// State machine
const [bubbleState, setBubbleState] = useState<BubbleState>('idle')
const [pendingInsight, setPendingInsight] = useState<PendingInsight | null>(null)

// Chat history
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

// Draggable position
const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
const [isDragging, setIsDragging] = useState(false)

// Engagement tracking refs
const lastActivityRef = useRef<number>(Date.now())
const typingVelocityRef = useRef<number[]>([])
```

### 4.4 Key Algorithms

**Engagement Detection**
```typescript
function getEngagementLevel(): 'deep' | 'active' | 'idle' | 'away' {
  // Typing velocity > 2 chars/sec + recent keystroke = 'deep'
  // Keystroke within 10s = 'active'
  // Activity within 60s = 'idle'
  // Otherwise = 'away'
}
```

**Insight Polling**
- Interval: Every 10 seconds
- Conditions: Not onboarding, not focus mode, not holding/expanded, engagement ≠ 'deep'
- API: `GET /api/insights/pending?trigger=idle&...`

---

## 5. Visual Description

### 5.1 Default/Idle State (Corner Bubble)

```
┌─────────────────────────────────────────┐
│ [≡]                              [-] [×] │  ← Drag handle, minimize, close
├─────────────────────────────────────────┤
│  ┌────┐                                 │
│  │ 🧠 │  OSQR                           │  ← Brain icon, name
│  └────┘  Your thinking partner          │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ 👋 • 3:45 PM                        ││  ← Chat history (scrollable)
│  │ Ask me any questions you have...   ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 👤 You • 3:46 PM                    ││
│  │ What's on my calendar?              ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐ 🔵 │  ← Input with send button
│  │ Ask OSQR something...           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

Position: fixed bottom-6 right-6 (desktop)
Width: 380px, border-radius: 28px
Background: slate-900 with blue/purple blurred blobs
Shadow: subtle blue glow
```

### 5.2 Holding State (Minimized Pill)

```
┌──────────────────────────────┐
│ 💡  I noticed something... ● │  ← Amber gradient, pinging dot
└──────────────────────────────┘

Position: fixed bottom-28 right-20
Gradient: from-amber-500 to-orange-500
Animation: pulse-glow-amber (1.5s)
```

### 5.3 Full-Screen Onboarding (Hero)

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   ● ● ● (animated blobs)                      ║
║                                                               ║
║            ┌─────────────────────────────────────┐            ║
║            │                                     │            ║
║            │         ┌──────────┐                │            ║
║            │         │    🧠    │  ← pulse glow  │            ║
║            │         │          │    ✨          │            ║
║            │         └──────────┘                │            ║
║            │                                     │            ║
║            │     I'm OSQR.                       │  ← shimmer │
║            │                                     │            ║
║            │     What should I call you?         │            ║
║            │                                     │            ║
║            │     ┌─────────────────────────┐     │            ║
║            │     │ Your name               │     │            ║
║            │     └─────────────────────────┘     │            ║
║            │                                     │            ║
║            │        [ Continue ]                 │            ║
║            │                                     │            ║
║            │        Skip for now                 │            ║
║            │                                     │            ║
║            └─────────────────────────────────────┘            ║
║                                                               ║
║                         ●━━━○                                 ║  ← Progress dots
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Background: slate-950/95 with backdrop-blur
Card: rounded-3xl with slate-900/90
```

### 5.4 Insight Expanded (in Chat)

```
│  ┌─────────────────────────────────────┐│
│  │ 💡  Quick thought          (amber) ││
│  │                                     ││
│  │ You mentioned X earlier but now...  ││
│  │                                     ││
│  │  ┌──────────────┐ ┌──────────┐      ││
│  │  │ Tell me more →│ │ Got it  │      ││
│  │  └──────────────┘ └──────────┘      ││
│  └─────────────────────────────────────┘│

Background: gradient amber-500/10 to orange-500/10
Border: ring-1 ring-amber-500/30
```

---

## 6. What's Missing

Based on the specification vs. implementation:

### 6.1 Not Yet Implemented

| Feature | Spec Reference | Status |
|---------|---------------|--------|
| Voice input | `VoiceConfig`, wake word detection | Placeholder only |
| Decline-to-act patterns | `checkShouldDecline()` logic | Not implemented |
| Plugin greeting override | `pluginGreeting` in context | Partial |
| Plugin quick actions | `getQuickActions()` from plugins | Not implemented |
| Return greeting detection | `isReturningUser()` logic | Not implemented |
| Context augmentation | Active project, pending tasks | Not implemented |
| Surface transitions | Panel, Deliberation, Executor | Partial (panel only) |
| Presence state: Thinking | Purple pulse animation | Not visually distinct |
| Presence state: Waiting | Static warm glow | Not implemented |
| Presence state: Connected | Breathing animation | Not implemented |

### 6.2 Visual Elements Missing

1. **Purple presence colors** - Spec uses `rgba(147, 51, 234, X)` but implementation uses blue/amber
2. **4-second breathing animation** for connected state
3. **Thinking pulse** (2s cycle) distinct from idle
4. **Quick action buttons** in bubble footer
5. **Plugin prompt injection UI** for third-party content
6. **Minimized bubble icon** when other surfaces active

### 6.3 Animations Not Implemented

```css
/* From spec - not in codebase */
@keyframes thinking-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
  50% { box-shadow: 0 0 30px rgba(147, 51, 234, 0.5); }
}

@keyframes connected-breathing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.bubble--waiting {
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.2);
}
```

---

## 7. Design Token Summary

### Colors
```json
{
  "background": {
    "primary": "#0f172a",
    "secondary": "#1e293b",
    "tertiary": "#334155"
  },
  "text": {
    "primary": "#f1f5f9",
    "muted": "#94a3b8",
    "secondary": "#64748b"
  },
  "accent": {
    "blue": "#3b82f6",
    "blueHover": "#2563eb",
    "blueLight": "#60a5fa",
    "purple": "#8b5cf6",
    "amber": "#f59e0b",
    "orange": "#f97316"
  },
  "glow": {
    "blueIdle": "rgba(59, 130, 246, 0.3)",
    "blueActive": "rgba(59, 130, 246, 0.45)",
    "purpleAccent": "rgba(139, 92, 246, 0.35)",
    "amberHolding": "rgba(245, 158, 11, 0.4)",
    "amberPeak": "rgba(245, 158, 11, 0.7)"
  }
}
```

### Spacing Scale
```json
{
  "1": "4px",
  "1.5": "6px",
  "2": "8px",
  "2.5": "10px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px"
}
```

### Border Radius
```json
{
  "sm": "8px",
  "md": "12px",
  "lg": "16px",
  "xl": "24px",
  "2xl": "28px",
  "full": "9999px"
}
```

### Animation Durations
```json
{
  "fast": "300ms",
  "normal": "500ms",
  "slow": "700ms",
  "pulse": "2000ms",
  "amberPulse": "1500ms",
  "shimmer": "20000ms",
  "float": "3000ms"
}
```

---

*This report documents the current implementation state of the OSQR Bubble interface as of December 19, 2024. Use this as a reference for design system consistency across development sessions.*
