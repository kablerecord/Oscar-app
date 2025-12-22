/**
 * Bubble Interface Wrapper for oscar-app
 *
 * Wraps the @osqr/core Bubble system for proactive UI suggestions.
 * This enables the bubble interface that surfaces relevant items to users.
 */

import { Bubble } from '@osqr/core';
import { bubbleConfig, featureFlags } from './config';

export type FocusModeType = 'available' | 'focused' | 'dnd';

export interface BubbleSuggestion {
  id: string;
  type: 'reminder' | 'insight' | 'suggestion' | 'notification';
  title: string;
  message: string;
  priority: number;
  action?: {
    label: string;
    type: 'dismiss' | 'snooze' | 'act' | 'view';
  };
  metadata?: Record<string, unknown>;
}

export interface BubbleState {
  canShow: boolean;
  currentFocusMode: FocusModeType;
  bubblesShownToday: number;
  remainingBudget: number;
  nextAllowedTime?: Date;
}

// In-memory user state storage (in production, this would be in a database)
const userBudgets = new Map<string, Bubble.InterruptBudget>();
const userFocusModes = new Map<string, Bubble.FocusModeName>();

/**
 * Get or create user budget
 */
function getUserBudget(userId: string): Bubble.InterruptBudget {
  if (!userBudgets.has(userId)) {
    userBudgets.set(userId, Bubble.createInterruptBudget());
  }
  return userBudgets.get(userId)!;
}

/**
 * Get user focus mode
 */
function getUserFocusMode(userId: string): Bubble.FocusModeName {
  return userFocusModes.get(userId) || 'available';
}

/**
 * Create a mock BubbleItem for budget checking
 */
function createMockBubbleItem(category: Bubble.BubbleCategory = 'reminder'): Bubble.BubbleItem {
  return {
    id: 'mock',
    temporalItemId: 'mock',
    message: 'mock',
    category,
    state: 'pending',
    confidenceScore: 50, // 0-100 scale
    basePriority: 50,    // 0-100 scale
  };
}

/**
 * Get current bubble state for a user.
 */
export function getBubbleState(userId: string): BubbleState {
  if (!featureFlags.enableBubbleInterface) {
    return {
      canShow: false,
      currentFocusMode: 'available',
      bubblesShownToday: 0,
      remainingBudget: 0,
    };
  }

  try {
    const budget = getUserBudget(userId);
    const focusMode = getUserFocusMode(userId);

    // Check if we can show a bubble based on budget
    const mockItem = createMockBubbleItem('reminder');
    const canConsume = Bubble.canConsumeBudget(budget, mockItem, focusMode);

    return {
      canShow: canConsume.allowed,
      currentFocusMode: focusMode as FocusModeType,
      bubblesShownToday: budget.daily.used,
      remainingBudget: budget.daily.total - budget.daily.used,
    };
  } catch (error) {
    console.error('[Bubble] Get state error:', error);
    return {
      canShow: false,
      currentFocusMode: 'available',
      bubblesShownToday: 0,
      remainingBudget: bubbleConfig.maxBubblesPerSession,
    };
  }
}

/**
 * Check if a bubble can be shown right now.
 */
export function canShowBubble(userId: string): boolean {
  if (!featureFlags.enableBubbleInterface) return false;

  try {
    const state = getBubbleState(userId);
    return state.canShow;
  } catch (error) {
    console.error('[Bubble] Can show check error:', error);
    return false;
  }
}

/**
 * Record that a bubble was shown.
 */
export function recordBubbleShown(userId: string, category: Bubble.BubbleCategory = 'reminder'): void {
  if (!featureFlags.enableBubbleInterface) return;

  try {
    const budget = getUserBudget(userId);
    const focusMode = getUserFocusMode(userId);
    const mockItem = createMockBubbleItem(category);
    const newBudget = Bubble.consumeBudget(budget, mockItem, focusMode);
    userBudgets.set(userId, newBudget);
  } catch (error) {
    console.error('[Bubble] Record shown error:', error);
  }
}

/**
 * Set focus mode for a user.
 */
export function setFocusMode(userId: string, mode: FocusModeType): void {
  if (!featureFlags.enableBubbleInterface) return;

  try {
    // Validate the mode
    if (!Bubble.isValidFocusMode(mode as Bubble.FocusModeName)) {
      console.error('[Bubble] Invalid focus mode:', mode);
      return;
    }

    userFocusModes.set(userId, mode as Bubble.FocusModeName);
  } catch (error) {
    console.error('[Bubble] Set focus mode error:', error);
  }
}

/**
 * Get current focus mode.
 */
export function getFocusMode(userId: string): FocusModeType {
  if (!featureFlags.enableBubbleInterface) return 'available';

  try {
    return getUserFocusMode(userId) as FocusModeType;
  } catch (error) {
    console.error('[Bubble] Get focus mode error:', error);
    return 'available';
  }
}

/**
 * Generate a bubble message from a suggestion.
 */
export function generateBubbleMessage(
  type: 'reminder' | 'insight' | 'suggestion',
  content: string,
  priority: number = 5
): BubbleSuggestion {
  const id = `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    type,
    title: type.charAt(0).toUpperCase() + type.slice(1),
    message: content,
    priority,
    action: {
      label: type === 'reminder' ? 'Got it' : 'Learn more',
      type: type === 'reminder' ? 'dismiss' : 'view',
    },
  };
}

/**
 * Create a BubbleEngine instance for a session.
 */
export function createBubbleEngine(config?: Partial<Bubble.BubbleEngineConfig>): Bubble.BubbleEngine {
  return Bubble.createBubbleEngine(config);
}

/**
 * Score a potential bubble to determine if it should be shown.
 */
export function scoreBubble(suggestion: BubbleSuggestion): number {
  // Higher priority = higher score
  const priorityScore = suggestion.priority / 10;

  // Type-based scoring
  const typeScores: Record<string, number> = {
    reminder: 0.8,
    insight: 0.6,
    suggestion: 0.5,
    notification: 0.7,
  };
  const typeScore = typeScores[suggestion.type] || 0.5;

  // Combined score
  return (priorityScore * 0.6) + (typeScore * 0.4);
}

/**
 * Filter and rank suggestions by priority.
 */
export function rankSuggestions(
  suggestions: BubbleSuggestion[],
  maxResults: number = 3
): BubbleSuggestion[] {
  return suggestions
    .map((s) => ({ suggestion: s, score: scoreBubble(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.suggestion);
}

/**
 * Format a bubble for display in the UI.
 */
export function formatBubbleForUI(suggestion: BubbleSuggestion): {
  html: string;
  text: string;
} {
  const priorityClass = suggestion.priority >= 8 ? 'urgent' : suggestion.priority >= 5 ? 'normal' : 'low';

  return {
    html: `
      <div class="bubble bubble-${suggestion.type} priority-${priorityClass}">
        <h4>${suggestion.title}</h4>
        <p>${suggestion.message}</p>
        ${suggestion.action ? `<button>${suggestion.action.label}</button>` : ''}
      </div>
    `,
    text: `[${suggestion.title}] ${suggestion.message}`,
  };
}
