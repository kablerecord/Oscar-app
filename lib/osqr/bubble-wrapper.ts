/**
 * Bubble Interface Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags, bubbleConfig } from './config';

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

// In-memory storage (stub)
const userFocusModes = new Map<string, FocusModeType>();
const userBubblesShown = new Map<string, number>();

export function getBubbleState(userId: string): BubbleState {
  return {
    canShow: false,
    currentFocusMode: userFocusModes.get(userId) || 'available',
    bubblesShownToday: userBubblesShown.get(userId) || 0,
    remainingBudget: bubbleConfig.maxBubblesPerSession,
  };
}

export function canShowBubble(_userId: string): boolean {
  return false; // Disabled
}

export function recordBubbleShown(userId: string, _category?: string): void {
  const current = userBubblesShown.get(userId) || 0;
  userBubblesShown.set(userId, current + 1);
}

export function setFocusMode(userId: string, mode: FocusModeType): void {
  userFocusModes.set(userId, mode);
}

export function getFocusMode(userId: string): FocusModeType {
  return userFocusModes.get(userId) || 'available';
}

export function generateBubbleMessage(
  type: 'reminder' | 'insight' | 'suggestion',
  content: string,
  priority: number = 5
): BubbleSuggestion {
  return {
    id: `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

export function createBubbleEngine(_config?: Record<string, unknown>) {
  return { process: () => ({ suggestions: [] }) };
}

export function scoreBubble(suggestion: BubbleSuggestion): number {
  const priorityScore = suggestion.priority / 10;
  const typeScores: Record<string, number> = {
    reminder: 0.8,
    insight: 0.6,
    suggestion: 0.5,
    notification: 0.7,
  };
  const typeScore = typeScores[suggestion.type] || 0.5;
  return (priorityScore * 0.6) + (typeScore * 0.4);
}

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

export function formatBubbleForUI(suggestion: BubbleSuggestion): {
  html: string;
  text: string;
} {
  const priorityClass = suggestion.priority >= 8 ? 'urgent' : suggestion.priority >= 5 ? 'normal' : 'low';
  return {
    html: `<div class="bubble bubble-${suggestion.type} priority-${priorityClass}"><h4>${suggestion.title}</h4><p>${suggestion.message}</p></div>`,
    text: `[${suggestion.title}] ${suggestion.message}`,
  };
}
