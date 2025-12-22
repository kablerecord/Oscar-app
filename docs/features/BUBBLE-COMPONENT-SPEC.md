# OSQR Bubble Component Specification v1.0

**Status:** Implementation Spec
**Owner:** Kable Record
**Created:** December 2024
**Parent Doc:** [OSQR-IDENTITY-SURFACES.md](../architecture/OSQR-IDENTITY-SURFACES.md)

---

## Overview

The Bubble is OSQR himself—the persistent, always-available entry point for all user interaction. This document specifies the technical implementation of the bubble component.

**Core Principle:** The bubble is not a UI element. It's OSQR's presence in the interface.

---

## Component Architecture

### React Component Structure

```
OsqrBubble/
├── OsqrBubble.tsx          # Main bubble component
├── BubbleGreeting.tsx       # Context-aware greeting display
├── BubbleInput.tsx          # Text/voice input handler
├── BubblePresence.tsx       # Visual presence states
├── BubbleQuickActions.tsx   # Contextual action buttons
├── hooks/
│   ├── useGreeting.ts       # Time/context greeting logic
│   ├── usePresenceState.ts  # Presence state management
│   ├── usePluginPrompts.ts  # Plugin-injected content
│   └── useSurfaceTransition.ts  # Surface switching logic
└── styles/
    └── bubble.css           # Presence animations
```

### State Management

```typescript
interface BubbleState {
  // Presence
  presence: 'available' | 'thinking' | 'waiting' | 'connected';

  // Greeting
  greeting: string;
  greetingType: 'morning' | 'afternoon' | 'evening' | 'return';

  // Plugin injections
  pluginPrompts: PluginPrompt[];
  activePlugin: string | null;

  // Interaction
  isListening: boolean;
  isProcessing: boolean;
  lastInteraction: Date;

  // Surface context
  activeSurface: 'bubble' | 'panel' | 'deliberation' | 'executor';
  previousSurface: string | null;
}

interface PluginPrompt {
  pluginId: string;
  priority: number;
  content: string;
  action?: () => void;
  dismissable: boolean;
}
```

---

## Presence States

### Visual Specifications

| State | Animation | Color | Duration |
|-------|-----------|-------|----------|
| **Available** | Soft outer glow, steady | `rgba(147, 51, 234, 0.3)` | Continuous |
| **Thinking** | Gentle pulse, 2s cycle | `rgba(147, 51, 234, 0.5)` | Until resolved |
| **Waiting** | Static, warm | `rgba(147, 51, 234, 0.2)` | Until interaction |
| **Connected** | Subtle breathing, 4s cycle | `rgba(147, 51, 234, 0.4)` | During active session |

### CSS Animation Examples

```css
/* Available state - soft glow */
.bubble--available {
  box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
}

/* Thinking state - gentle pulse */
@keyframes thinking-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
  50% { box-shadow: 0 0 30px rgba(147, 51, 234, 0.5); }
}

.bubble--thinking {
  animation: thinking-pulse 2s ease-in-out infinite;
}

/* Waiting state - static warmth */
.bubble--waiting {
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.2);
}

/* Connected state - breathing */
@keyframes connected-breathing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.bubble--connected {
  animation: connected-breathing 4s ease-in-out infinite;
}
```

---

## Greeting System

### Time-Based Logic

```typescript
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

function isReturningUser(lastInteraction: Date): boolean {
  const hoursSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
  return hoursSince > 0.5 && hoursSince < 12; // 30 min to 12 hours
}
```

### Greeting Templates

```typescript
const GREETINGS = {
  morning: [
    "Good morning. What's on your mind?",
    "Morning. Anything you want to work through today?",
    "Morning. Ready when you are."
  ],
  afternoon: [
    "How's the day going? Need help with anything?",
    "Afternoon. What would you like to tackle?",
    "Hey. What's next?"
  ],
  evening: [
    "Winding down or ramping up? I'm here either way.",
    "Evening. Anything you want to think through?",
    "Hey. Still working on something?"
  ],
  return: [
    "Back. What's next?",
    "Hey. Ready when you are.",
    "Welcome back. Picking up where we left off?"
  ]
};
```

### Context Augmentation

Greetings can be augmented with context:

```typescript
interface GreetingContext {
  activeProject?: string;
  pendingTasks?: number;
  lastConversationTopic?: string;
  pluginGreeting?: string;
}

function buildGreeting(
  baseGreeting: string,
  context: GreetingContext
): string {
  // Plugin greeting takes precedence
  if (context.pluginGreeting) {
    return context.pluginGreeting;
  }

  // Add project context if relevant
  if (context.activeProject && context.pendingTasks) {
    return `${baseGreeting} You have ${context.pendingTasks} tasks on ${context.activeProject}.`;
  }

  // Continuation context
  if (context.lastConversationTopic) {
    return `${baseGreeting} Want to continue with ${context.lastConversationTopic}?`;
  }

  return baseGreeting;
}
```

---

## Plugin Integration

### Plugin Prompt Injection

```typescript
interface PluginManifest {
  id: string;
  name: string;
  proactivityLevel: 'laid_back' | 'informed' | 'forceful';
  greetingOverride?: (context: UserContext) => string;
  prompts?: PluginPromptConfig[];
}

interface PluginPromptConfig {
  condition: (context: UserContext) => boolean;
  content: string | ((context: UserContext) => string);
  priority: number;  // 1-10, higher = more prominent
  action?: string;   // Action ID to trigger
}
```

### Plugin Prompt Rendering

```tsx
function BubbleGreeting({ plugins, userContext }: Props) {
  const prompts = plugins
    .flatMap(p => p.prompts?.filter(pr => pr.condition(userContext)) ?? [])
    .sort((a, b) => b.priority - a.priority);

  const topPrompt = prompts[0];

  return (
    <div className="bubble-greeting">
      {topPrompt ? (
        <PluginPrompt prompt={topPrompt} />
      ) : (
        <DefaultGreeting context={userContext} />
      )}
    </div>
  );
}
```

### Proactivity Levels

| Level | Behavior | Example |
|-------|----------|---------|
| `laid_back` | Reactive only, no unsolicited prompts | "What would you like to do?" |
| `informed` | Shows context, lets user decide | "Here's what's on your plate. What first?" |
| `forceful` | Coaches actively, suggests actions | "Based on your goals, I think you should start here." |

---

## Surface Transitions

### Transition Types

```typescript
type Surface = 'bubble' | 'panel' | 'deliberation' | 'executor';

interface SurfaceTransition {
  from: Surface;
  to: Surface;
  trigger: 'user_request' | 'osqr_suggestion' | 'automatic';
  context?: Record<string, unknown>;
}
```

### Transition Logic

```typescript
function useSurfaceTransition() {
  const [activeSurface, setActiveSurface] = useState<Surface>('bubble');

  const suggestTransition = useCallback((
    targetSurface: Surface,
    reason: string
  ) => {
    // OSQR suggests, never forces
    return {
      suggestion: `Want me to open the ${targetSurface}? ${reason}`,
      onConfirm: () => setActiveSurface(targetSurface),
      onDecline: () => { /* Stay in bubble */ }
    };
  }, []);

  const executeTransition = useCallback((
    targetSurface: Surface,
    context?: Record<string, unknown>
  ) => {
    // User-initiated or confirmed transition
    setActiveSurface(targetSurface);
    // Pass context to new surface
    surfaceContextStore.set(targetSurface, context);
  }, []);

  return { activeSurface, suggestTransition, executeTransition };
}
```

### Bubble Persistence

When other surfaces are active, bubble minimizes but remains accessible:

```tsx
function BubbleContainer({ activeSurface }: Props) {
  const isMinimized = activeSurface !== 'bubble';

  return (
    <div className={cn(
      'bubble-container',
      isMinimized && 'bubble-container--minimized'
    )}>
      {isMinimized ? (
        <MinimizedBubble
          onClick={() => setActiveSurface('bubble')}
          presence={presenceState}
        />
      ) : (
        <ExpandedBubble />
      )}
    </div>
  );
}
```

---

## Input Handling

### Text Input

```typescript
interface MessageInput {
  content: string;
  timestamp: Date;
  surface: Surface;
  pluginContext?: string;
}

function handleUserInput(input: string): void {
  // 1. Log to memory system
  logInteraction({ type: 'user_message', content: input });

  // 2. Check for surface transition triggers
  const surfaceTrigger = detectSurfaceTrigger(input);
  if (surfaceTrigger) {
    suggestTransition(surfaceTrigger.surface, surfaceTrigger.reason);
    return;
  }

  // 3. Process through active plugin (if any)
  const pluginResponse = activePlugin?.processInput(input);
  if (pluginResponse) {
    displayResponse(pluginResponse);
    return;
  }

  // 4. Default OSQR processing
  processWithOsqr(input);
}
```

### Voice Input (Future)

```typescript
interface VoiceConfig {
  wakeWord: 'hey osqr' | 'osqr';
  continuous: boolean;
  language: string;
}

// Voice always activates bubble, regardless of current surface
function onWakeWordDetected(): void {
  if (activeSurface !== 'bubble') {
    // Store current surface state
    previousSurface = activeSurface;
    // Activate bubble
    setActiveSurface('bubble');
    // Set presence to listening
    setPresence('thinking');
  }
}
```

---

## Decline-to-Act Patterns

### Detection Logic

```typescript
interface DeclineCheck {
  shouldDecline: boolean;
  reason?: string;
  suggestion?: string;
}

function checkShouldDecline(input: string, context: UserContext): DeclineCheck {
  // High-stakes decisions made quickly
  if (isHighStakesDecision(input) && context.sessionDuration < 60) {
    return {
      shouldDecline: true,
      reason: 'high_stakes_quick_decision',
      suggestion: "We can do that. But before we dive in—have you had a chance to think through the implications?"
    };
  }

  // Emotional content
  if (detectEmotionalContent(input) && input.includes('angry')) {
    return {
      shouldDecline: true,
      reason: 'emotional_request',
      suggestion: "I can help with that. Want to draft it now, or would it help to wait and see if you still feel the same way tomorrow?"
    };
  }

  // Large task scoping
  if (detectLargeTaskList(input)) {
    return {
      shouldDecline: true,
      reason: 'scope_reduction',
      suggestion: "All of them? We can do that—but which 3 actually matter today?"
    };
  }

  return { shouldDecline: false };
}
```

### Response Handling

```typescript
function handlePotentialDecline(input: string, context: UserContext): void {
  const declineCheck = checkShouldDecline(input, context);

  if (declineCheck.shouldDecline) {
    // Present suggestion, not refusal
    displayResponse({
      type: 'suggestion',
      content: declineCheck.suggestion,
      options: [
        { label: 'Good point, let me think', action: 'pause' },
        { label: 'I\'ve decided, let\'s go', action: 'proceed' }
      ]
    });
  } else {
    // Proceed normally
    processRequest(input);
  }
}
```

---

## Quick Actions

### Action Types

```typescript
type QuickAction =
  | { type: 'surface'; target: Surface; label: string }
  | { type: 'continue'; task: string; label: string }
  | { type: 'plugin'; pluginId: string; action: string; label: string }
  | { type: 'custom'; handler: () => void; label: string };

function getQuickActions(context: UserContext): QuickAction[] {
  const actions: QuickAction[] = [];

  // Surface shortcuts
  actions.push({ type: 'surface', target: 'panel', label: 'Open Workspace' });

  // Continue last task
  if (context.lastTask) {
    actions.push({
      type: 'continue',
      task: context.lastTask.id,
      label: `Continue: ${context.lastTask.name}`
    });
  }

  // Plugin-specific actions
  if (context.activePlugin) {
    const pluginActions = context.activePlugin.getQuickActions(context);
    actions.push(...pluginActions);
  }

  return actions.slice(0, 3); // Max 3 quick actions
}
```

---

## Accessibility

### ARIA Attributes

```tsx
<div
  role="dialog"
  aria-label="OSQR assistant"
  aria-describedby="bubble-greeting"
>
  <div id="bubble-greeting" aria-live="polite">
    {greeting}
  </div>

  <input
    aria-label="Message OSQR"
    placeholder="Or just tell me what's on your mind..."
  />

  <div role="group" aria-label="Quick actions">
    {quickActions.map(action => (
      <button key={action.label} aria-label={action.label}>
        {action.label}
      </button>
    ))}
  </div>
</div>
```

### Keyboard Navigation

- `Tab`: Navigate between input and quick actions
- `Enter`: Send message or activate focused action
- `Escape`: Minimize bubble (if in surface)
- `Ctrl+Space`: Voice activation (when implemented)

---

## Performance Considerations

### Lazy Loading

```typescript
// Only load heavy components when needed
const Panel = lazy(() => import('./Panel'));
const Deliberation = lazy(() => import('./Deliberation'));

function SurfaceRouter({ activeSurface }: Props) {
  return (
    <Suspense fallback={<BubbleThinking />}>
      {activeSurface === 'panel' && <Panel />}
      {activeSurface === 'deliberation' && <Deliberation />}
    </Suspense>
  );
}
```

### Animation Performance

```css
/* Use transform and opacity for smooth animations */
.bubble-transition {
  will-change: transform, opacity;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .bubble-transition {
    transition: none;
  }

  .bubble--thinking,
  .bubble--connected {
    animation: none;
  }
}
```

---

## Testing Requirements

### Unit Tests

- Greeting selection based on time of day
- Presence state transitions
- Plugin prompt priority sorting
- Decline-to-act detection logic
- Surface transition triggers

### Integration Tests

- Plugin injection flow
- Surface transitions with context preservation
- Voice activation interrupting active surface
- Quick action execution

### Visual Tests

- All presence state animations
- Minimized bubble appearance
- Responsive layout at different screen sizes
- Dark/light mode support

---

## Implementation Checklist

- [ ] Core bubble component with presence states
- [ ] Time-based greeting system
- [ ] Plugin prompt injection system
- [ ] Surface transition handling
- [ ] Minimized bubble state
- [ ] Quick actions system
- [ ] Decline-to-act patterns
- [ ] Voice activation hooks (placeholder)
- [ ] Accessibility compliance
- [ ] Animation system
- [ ] Unit test coverage
- [ ] Integration tests

---

## Context from Architecture

### Related Components
- Memory Vault — Provides last interaction, active project context
- Guidance — Surfaces proactive items for display
- Temporal — Provides commitment-based content
- Plugins — May inject prompts and greeting overrides
- Constitutional — Ensures decline-to-act patterns respect user agency

### Architecture References
- See: `docs/architecture/OSQR-IDENTITY-SURFACES.md` — Identity philosophy
- See: `docs/architecture/PLUGIN_ARCHITECTURE.md` — Plugin prompt injection
- See: `lib/osqr/bubble-wrapper.ts` — Implementation wrapper

### Integration Points
- Receives from: Temporal (commitments), Guidance (project context), Plugins (prompts)
- Sends to: Router (user messages), Surface manager (transitions)

### Tech Stack Constraints
- React component with Framer Motion for animations
- CSS custom properties for theming
- ARIA compliance required
- prefers-reduced-motion respected

---

## Testable Invariants

### Pre-conditions
- User is authenticated
- Bubble component is mounted

### Post-conditions
- Greeting is displayed appropriate to time/context
- Presence state reflects actual OSQR status

### Invariants
- Bubble must always be accessible (even in minimized state)
- Voice activation must override current surface
- Plugin prompts limited to 3 concurrent
- Plugin greeting takes precedence when active
- Animations respect prefers-reduced-motion
- Quick actions limited to 3 visible
- Decline-to-act suggestions always include proceed option

---

*This document specifies the technical implementation of the OSQR bubble. For identity and philosophy, see [OSQR-IDENTITY-SURFACES.md](../architecture/OSQR-IDENTITY-SURFACES.md).*
