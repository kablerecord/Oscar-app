/**
 * OSQR Design System - Presence Visuals
 *
 * Resolve visual state (glow, animation) based on Bubble state and context.
 */

import { BubbleState, PresenceVisuals, PresenceContext } from '../types';
import { colors } from '../tokens/colors';

/**
 * Determine visual presence state based on Bubble state and context
 */
export function resolvePresenceVisuals(
  bubbleState: BubbleState,
  context: PresenceContext
): PresenceVisuals {
  const { isProcessing, hasResponse, hasPendingInsight } = context;

  // Hidden state - no visuals
  if (bubbleState === 'hidden') {
    return {
      glowColor: 'transparent',
      animation: 'none',
      shadowIntensity: 'low',
    };
  }

  // Holding insight - amber glow (highest priority visual state)
  if (bubbleState === 'holding' || hasPendingInsight) {
    return {
      glowColor: colors.presence.holding,
      animation: 'pulse-glow-amber',
      shadowIntensity: 'high',
    };
  }

  // Processing/thinking - purple pulse
  if (isProcessing) {
    return {
      glowColor: colors.presence.thinking,
      animation: 'thinking-pulse',
      shadowIntensity: 'medium',
    };
  }

  // Connected and active conversation - expanded or connected state
  if (bubbleState === 'connected' || bubbleState === 'expanded') {
    return {
      glowColor: colors.presence.connected,
      animation: 'connected-breathing',
      shadowIntensity: 'medium',
    };
  }

  // Default idle state - blue glow
  return {
    glowColor: colors.presence.idle,
    animation: 'subtle-pulse',
    shadowIntensity: 'low',
  };
}

/**
 * Get the CSS class for a presence animation
 */
export function getPresenceAnimationClass(animation: string): string {
  const animationClasses: Record<string, string> = {
    'none': '',
    'subtle-pulse': 'animate-subtle-pulse',
    'thinking-pulse': 'animate-thinking-pulse',
    'connected-breathing': 'animate-connected-breathing',
    'pulse-glow-amber': 'animate-pulse-glow-amber',
  };

  return animationClasses[animation] || '';
}

/**
 * Get the CSS class for a bubble state
 */
export function getBubbleStateClass(state: BubbleState): string {
  const stateClasses: Record<BubbleState, string> = {
    hidden: 'bubble--hidden',
    idle: 'bubble--idle',
    holding: 'bubble--holding',
    expanded: 'bubble--expanded',
    connected: 'bubble--connected',
  };

  return stateClasses[state];
}

/**
 * Get shadow intensity level CSS
 */
export function getShadowIntensityStyle(intensity: 'low' | 'medium' | 'high'): string {
  const intensityStyles: Record<string, string> = {
    low: 'var(--osqr-shadow-sm)',
    medium: 'var(--osqr-shadow-md)',
    high: 'var(--osqr-shadow-lg)',
  };

  return intensityStyles[intensity];
}

/**
 * Determine if a state transition should animate
 */
export function shouldAnimateTransition(
  fromState: BubbleState,
  toState: BubbleState
): boolean {
  // Don't animate hidden transitions
  if (fromState === 'hidden' || toState === 'hidden') {
    return false;
  }

  // Animate all other transitions
  return fromState !== toState;
}

/**
 * Get transition duration for state change
 */
export function getStateTransitionDuration(
  fromState: BubbleState,
  toState: BubbleState
): string {
  // Quick transitions for interactive states
  if (toState === 'expanded' || fromState === 'expanded') {
    return '300ms';
  }

  // Slower transitions for mood changes
  return '500ms';
}

export default resolvePresenceVisuals;
