/**
 * Bubble Scoring Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateConfidenceScore,
  calculateConfidenceBreakdown,
  calculateTimeSensitivity,
  calculateContextRelevance,
  calculateHistoricalEngagement,
  isWithinWindow,
  hasTopicOverlap,
  hasEntityOverlap,
  getVisualState,
  formatConfidenceBreakdown,
} from '../scoring';
import type {
  TemporalItem,
  UserContext,
  BubbleHistory,
  BubbleUserState,
} from '../types';
import { DEFAULT_USER_STATE, SCORE_THRESHOLDS } from '../constants';

// Test fixtures
const createTemporalItem = (overrides: Partial<TemporalItem> = {}): TemporalItem => ({
  id: 'test-item-1',
  type: 'deadline',
  content: 'Test item',
  source: 'test',
  priority: 50,
  ...overrides,
});

const createContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  activeProject: null,
  recentTopics: [],
  recentEntities: [],
  activeTask: null,
  currentTime: Date.now(),
  ...overrides,
});

const createUserState = (overrides: Partial<BubbleUserState> = {}): BubbleUserState => ({
  ...DEFAULT_USER_STATE,
  ...overrides,
});

describe('Confidence Score Calculation', () => {
  it('calculates score with default weights', () => {
    const item = createTemporalItem({ priority: 70 });
    const context = createContext();
    const userState = createUserState();

    const score = calculateConfidenceScore(item, context, [], userState);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns higher score for high priority items', () => {
    const lowPriority = createTemporalItem({ priority: 20 });
    const highPriority = createTemporalItem({ priority: 90 });
    const context = createContext();
    const userState = createUserState();

    const lowScore = calculateConfidenceScore(lowPriority, context, [], userState);
    const highScore = calculateConfidenceScore(highPriority, context, [], userState);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('applies category weight multiplier', () => {
    const item = createTemporalItem({ type: 'deadline' });
    const context = createContext();
    const userState = createUserState({
      categoryWeights: { deadline: 1.5 },
    });
    const normalState = createUserState();

    const boostedScore = calculateConfidenceScore(item, context, [], userState);
    const normalScore = calculateConfidenceScore(item, context, [], normalState);

    expect(boostedScore).toBeGreaterThan(normalScore);
  });
});

describe('Confidence Breakdown', () => {
  it('returns all component scores', () => {
    const item = createTemporalItem();
    const context = createContext();
    const userState = createUserState();

    const breakdown = calculateConfidenceBreakdown(item, context, [], userState);

    expect(breakdown).toHaveProperty('basePriority');
    expect(breakdown).toHaveProperty('timeSensitivity');
    expect(breakdown).toHaveProperty('contextRelevance');
    expect(breakdown).toHaveProperty('historicalEngagement');
    expect(breakdown).toHaveProperty('categoryWeight');
    expect(breakdown).toHaveProperty('rawScore');
    expect(breakdown).toHaveProperty('finalScore');
  });

  it('clamps final score to 0-100', () => {
    const item = createTemporalItem({ priority: 100 });
    const context = createContext({ activeProject: 'test-project' });
    const userState = createUserState({ categoryWeights: { deadline: 1.5 } });

    // Create high engagement history
    const history: BubbleHistory[] = Array(10).fill(null).map((_, i) => ({
      itemId: `item-${i}`,
      category: 'deadline',
      confidenceScore: 80,
      action: 'engaged',
      timestamp: new Date(),
      timeToAction: 1000,
      wasEngaged: true,
    }));

    const breakdown = calculateConfidenceBreakdown(item, context, history, userState);

    expect(breakdown.finalScore).toBeLessThanOrEqual(100);
    expect(breakdown.finalScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Time Sensitivity', () => {
  it('returns 100 for overdue items', () => {
    const pastDeadline = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const item = createTemporalItem({ deadline: pastDeadline });

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(100);
  });

  it('returns 100 for critical deadlines (< 2 hours)', () => {
    const soonDeadline = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    const item = createTemporalItem({ deadline: soonDeadline });

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(100);
  });

  it('returns 80 for today deadlines', () => {
    const todayDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    const item = createTemporalItem({ deadline: todayDeadline });

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(80);
  });

  it('returns 60 for soon deadlines (< 3 days)', () => {
    const soonDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    const item = createTemporalItem({ deadline: soonDeadline });

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(60);
  });

  it('returns 40 for this week deadlines', () => {
    const weekDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    const item = createTemporalItem({ deadline: weekDeadline });

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(40);
  });

  it('returns 85 for items within optimal window', () => {
    const now = Date.now();
    const item = createTemporalItem({
      optimalWindow: {
        start: new Date(now - 60000),
        end: new Date(now + 60000),
      },
    });

    const sensitivity = calculateTimeSensitivity(item, now);

    expect(sensitivity).toBe(85);
  });

  it('returns 30 for non-time-sensitive items', () => {
    const item = createTemporalItem(); // No deadline or window

    const sensitivity = calculateTimeSensitivity(item, Date.now());

    expect(sensitivity).toBe(30);
  });
});

describe('isWithinWindow', () => {
  it('returns true when current time is within window', () => {
    const now = Date.now();
    const window = {
      start: new Date(now - 1000),
      end: new Date(now + 1000),
    };

    expect(isWithinWindow(now, window)).toBe(true);
  });

  it('returns false when current time is before window', () => {
    const now = Date.now();
    const window = {
      start: new Date(now + 1000),
      end: new Date(now + 2000),
    };

    expect(isWithinWindow(now, window)).toBe(false);
  });

  it('returns false when current time is after window', () => {
    const now = Date.now();
    const window = {
      start: new Date(now - 2000),
      end: new Date(now - 1000),
    };

    expect(isWithinWindow(now, window)).toBe(false);
  });
});

describe('Context Relevance', () => {
  it('adds 40 for same project', () => {
    const item = createTemporalItem({ project: 'project-a' });
    const context = createContext({ activeProject: 'project-a' });

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBeGreaterThanOrEqual(40);
  });

  it('adds 30 for topic overlap', () => {
    const item = createTemporalItem({ topics: ['typescript', 'testing'] });
    const context = createContext({ recentTopics: ['typescript', 'react'] });

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBeGreaterThanOrEqual(30);
  });

  it('adds 20 for entity overlap', () => {
    const item = createTemporalItem({ entities: ['John', 'ACME Corp'] });
    const context = createContext({ recentEntities: ['John', 'Jane'] });

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBeGreaterThanOrEqual(20);
  });

  it('adds 10 for related task', () => {
    const item = createTemporalItem({ relatedTasks: ['task-1', 'task-2'] });
    const context = createContext({ activeTask: 'task-1' });

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBeGreaterThanOrEqual(10);
  });

  it('returns 0 for no context match', () => {
    const item = createTemporalItem();
    const context = createContext();

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBe(0);
  });

  it('caps at 100', () => {
    const item = createTemporalItem({
      project: 'project-a',
      topics: ['topic-a'],
      entities: ['entity-a'],
      relatedTasks: ['task-a'],
    });
    const context = createContext({
      activeProject: 'project-a',
      recentTopics: ['topic-a'],
      recentEntities: ['entity-a'],
      activeTask: 'task-a',
    });

    const relevance = calculateContextRelevance(item, context);

    expect(relevance).toBe(100);
  });
});

describe('Topic Overlap', () => {
  it('detects case-insensitive overlap', () => {
    expect(hasTopicOverlap(['TypeScript', 'React'], ['typescript', 'vue'])).toBe(true);
  });

  it('returns false for no overlap', () => {
    expect(hasTopicOverlap(['TypeScript'], ['Python'])).toBe(false);
  });

  it('returns false for undefined topics', () => {
    expect(hasTopicOverlap(undefined, ['typescript'])).toBe(false);
  });

  it('returns false for empty topics', () => {
    expect(hasTopicOverlap([], ['typescript'])).toBe(false);
  });
});

describe('Entity Overlap', () => {
  it('detects case-insensitive overlap', () => {
    expect(hasEntityOverlap(['John Smith', 'ACME'], ['john smith', 'Widget Co'])).toBe(true);
  });

  it('returns false for no overlap', () => {
    expect(hasEntityOverlap(['John'], ['Jane'])).toBe(false);
  });
});

describe('Historical Engagement', () => {
  it('returns 50 for no history', () => {
    const item = createTemporalItem();

    const engagement = calculateHistoricalEngagement(item, []);

    expect(engagement).toBe(50);
  });

  it('returns 100 for all engaged similar items', () => {
    const item = createTemporalItem({ type: 'deadline' });
    const history: BubbleHistory[] = [
      { itemId: '1', category: 'deadline', confidenceScore: 80, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true },
      { itemId: '2', category: 'deadline', confidenceScore: 70, action: 'engaged', timestamp: new Date(), timeToAction: 2000, wasEngaged: true },
    ];

    const engagement = calculateHistoricalEngagement(item, history);

    expect(engagement).toBe(100);
  });

  it('returns 0 for all dismissed similar items', () => {
    const item = createTemporalItem({ type: 'deadline' });
    const history: BubbleHistory[] = [
      { itemId: '1', category: 'deadline', confidenceScore: 80, action: 'dismissed', timestamp: new Date(), timeToAction: 1000, wasEngaged: false },
      { itemId: '2', category: 'deadline', confidenceScore: 70, action: 'dismissed', timestamp: new Date(), timeToAction: 2000, wasEngaged: false },
    ];

    const engagement = calculateHistoricalEngagement(item, history);

    expect(engagement).toBe(0);
  });

  it('calculates correct ratio', () => {
    const item = createTemporalItem({ type: 'deadline' });
    const history: BubbleHistory[] = [
      { itemId: '1', category: 'deadline', confidenceScore: 80, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true },
      { itemId: '2', category: 'deadline', confidenceScore: 70, action: 'dismissed', timestamp: new Date(), timeToAction: 2000, wasEngaged: false },
      { itemId: '3', category: 'deadline', confidenceScore: 60, action: 'engaged', timestamp: new Date(), timeToAction: 1500, wasEngaged: true },
      { itemId: '4', category: 'deadline', confidenceScore: 50, action: 'dismissed', timestamp: new Date(), timeToAction: 3000, wasEngaged: false },
    ];

    const engagement = calculateHistoricalEngagement(item, history);

    expect(engagement).toBe(50); // 2/4 = 50%
  });

  it('considers source matching', () => {
    const item = createTemporalItem({ type: 'reminder', source: 'calendar' });
    const history: BubbleHistory[] = [
      { itemId: '1', category: 'reminder', confidenceScore: 80, action: 'engaged', timestamp: new Date(), timeToAction: 1000, wasEngaged: true, source: 'calendar' },
      { itemId: '2', category: 'commitment', confidenceScore: 70, action: 'engaged', timestamp: new Date(), timeToAction: 2000, wasEngaged: true, source: 'calendar' },
    ];

    const engagement = calculateHistoricalEngagement(item, history);

    expect(engagement).toBe(100);
  });
});

describe('Visual State', () => {
  it('returns silent for low scores', () => {
    const state = getVisualState(30, SCORE_THRESHOLDS);
    expect(state).toBe('silent');
  });

  it('returns passive for moderate scores', () => {
    const state = getVisualState(50, SCORE_THRESHOLDS);
    expect(state).toBe('passive');
  });

  it('returns ready for ready scores', () => {
    const state = getVisualState(70, SCORE_THRESHOLDS);
    expect(state).toBe('ready');
  });

  it('returns active for high scores', () => {
    const state = getVisualState(85, SCORE_THRESHOLDS);
    expect(state).toBe('active');
  });

  it('returns priority for very high scores', () => {
    const state = getVisualState(98, SCORE_THRESHOLDS);
    expect(state).toBe('priority');
  });
});

describe('Format Confidence Breakdown', () => {
  it('formats breakdown as readable string', () => {
    const breakdown = {
      basePriority: 70,
      timeSensitivity: 80,
      contextRelevance: 40,
      historicalEngagement: 50,
      categoryWeight: 1.0,
      rawScore: 62.5,
      finalScore: 63,
    };

    const formatted = formatConfidenceBreakdown(breakdown);

    expect(formatted).toContain('Confidence Score: 63%');
    expect(formatted).toContain('Base Priority: 70%');
    expect(formatted).toContain('Time Sensitivity: 80%');
    expect(formatted).toContain('Context Relevance: 40%');
    expect(formatted).toContain('Historical Engagement: 50%');
    expect(formatted).toContain('Raw Score: 62.5%');
    expect(formatted).toContain('Category Weight: 1.00x');
  });
});
