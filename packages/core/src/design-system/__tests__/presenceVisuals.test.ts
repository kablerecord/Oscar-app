/**
 * Presence Visuals Tests
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePresenceVisuals,
  getPresenceAnimationClass,
  getBubbleStateClass,
  getShadowIntensityStyle,
  shouldAnimateTransition,
  getStateTransitionDuration,
} from '../utils/presenceVisuals';
import { BubbleState, PresenceContext } from '../types';
import { colors } from '../tokens/colors';

describe('resolvePresenceVisuals', () => {
  const defaultContext: PresenceContext = {
    isProcessing: false,
    hasResponse: false,
    hasPendingInsight: false,
  };

  it('should return transparent glow for hidden state', () => {
    const result = resolvePresenceVisuals('hidden', defaultContext);
    expect(result.glowColor).toBe('transparent');
    expect(result.animation).toBe('none');
    expect(result.shadowIntensity).toBe('low');
  });

  it('should return amber glow for holding state', () => {
    const result = resolvePresenceVisuals('holding', defaultContext);
    expect(result.glowColor).toBe(colors.presence.holding);
    expect(result.animation).toBe('pulse-glow-amber');
    expect(result.shadowIntensity).toBe('high');
  });

  it('should return amber glow when hasPendingInsight is true', () => {
    const context = { ...defaultContext, hasPendingInsight: true };
    const result = resolvePresenceVisuals('idle', context);
    expect(result.glowColor).toBe(colors.presence.holding);
    expect(result.animation).toBe('pulse-glow-amber');
    expect(result.shadowIntensity).toBe('high');
  });

  it('should return purple glow when processing', () => {
    const context = { ...defaultContext, isProcessing: true };
    const result = resolvePresenceVisuals('idle', context);
    expect(result.glowColor).toBe(colors.presence.thinking);
    expect(result.animation).toBe('thinking-pulse');
    expect(result.shadowIntensity).toBe('medium');
  });

  it('should return connected glow for connected state', () => {
    const result = resolvePresenceVisuals('connected', defaultContext);
    expect(result.glowColor).toBe(colors.presence.connected);
    expect(result.animation).toBe('connected-breathing');
    expect(result.shadowIntensity).toBe('medium');
  });

  it('should return connected glow for expanded state', () => {
    const result = resolvePresenceVisuals('expanded', defaultContext);
    expect(result.glowColor).toBe(colors.presence.connected);
    expect(result.animation).toBe('connected-breathing');
    expect(result.shadowIntensity).toBe('medium');
  });

  it('should return idle glow for idle state', () => {
    const result = resolvePresenceVisuals('idle', defaultContext);
    expect(result.glowColor).toBe(colors.presence.idle);
    expect(result.animation).toBe('subtle-pulse');
    expect(result.shadowIntensity).toBe('low');
  });

  it('should prioritize holding over processing', () => {
    const context = { ...defaultContext, isProcessing: true, hasPendingInsight: true };
    const result = resolvePresenceVisuals('idle', context);
    expect(result.animation).toBe('pulse-glow-amber');
  });
});

describe('getPresenceAnimationClass', () => {
  it('should return correct animation classes', () => {
    expect(getPresenceAnimationClass('none')).toBe('');
    expect(getPresenceAnimationClass('subtle-pulse')).toBe('animate-subtle-pulse');
    expect(getPresenceAnimationClass('thinking-pulse')).toBe('animate-thinking-pulse');
    expect(getPresenceAnimationClass('connected-breathing')).toBe('animate-connected-breathing');
    expect(getPresenceAnimationClass('pulse-glow-amber')).toBe('animate-pulse-glow-amber');
  });

  it('should return empty string for unknown animation', () => {
    expect(getPresenceAnimationClass('unknown')).toBe('');
  });
});

describe('getBubbleStateClass', () => {
  it('should return correct state classes', () => {
    expect(getBubbleStateClass('hidden')).toBe('bubble--hidden');
    expect(getBubbleStateClass('idle')).toBe('bubble--idle');
    expect(getBubbleStateClass('holding')).toBe('bubble--holding');
    expect(getBubbleStateClass('expanded')).toBe('bubble--expanded');
    expect(getBubbleStateClass('connected')).toBe('bubble--connected');
  });
});

describe('getShadowIntensityStyle', () => {
  it('should return correct CSS variables', () => {
    expect(getShadowIntensityStyle('low')).toBe('var(--osqr-shadow-sm)');
    expect(getShadowIntensityStyle('medium')).toBe('var(--osqr-shadow-md)');
    expect(getShadowIntensityStyle('high')).toBe('var(--osqr-shadow-lg)');
  });
});

describe('shouldAnimateTransition', () => {
  it('should not animate hidden transitions', () => {
    expect(shouldAnimateTransition('hidden', 'idle')).toBe(false);
    expect(shouldAnimateTransition('idle', 'hidden')).toBe(false);
    expect(shouldAnimateTransition('hidden', 'hidden')).toBe(false);
  });

  it('should not animate same-state transitions', () => {
    expect(shouldAnimateTransition('idle', 'idle')).toBe(false);
    expect(shouldAnimateTransition('holding', 'holding')).toBe(false);
  });

  it('should animate different state transitions', () => {
    expect(shouldAnimateTransition('idle', 'holding')).toBe(true);
    expect(shouldAnimateTransition('holding', 'expanded')).toBe(true);
    expect(shouldAnimateTransition('expanded', 'connected')).toBe(true);
  });
});

describe('getStateTransitionDuration', () => {
  it('should return fast duration for expanded transitions', () => {
    expect(getStateTransitionDuration('idle', 'expanded')).toBe('300ms');
    expect(getStateTransitionDuration('expanded', 'idle')).toBe('300ms');
  });

  it('should return slow duration for other transitions', () => {
    expect(getStateTransitionDuration('idle', 'holding')).toBe('500ms');
    expect(getStateTransitionDuration('holding', 'connected')).toBe('500ms');
  });
});
