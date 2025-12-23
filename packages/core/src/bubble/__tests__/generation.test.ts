/**
 * Bubble Message Generation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateMessage,
  mapToCategory,
  transformToBubble,
  transformBatch,
  formatRelativeTime,
  truncateMessage,
} from '../generation';
import type { TemporalItem } from '../types';

// Test fixtures
const createTemporalItem = (overrides: Partial<TemporalItem> = {}): TemporalItem => ({
  id: 'test-item-1',
  type: 'deadline',
  content: 'Finish the report',
  source: 'test',
  priority: 50,
  ...overrides,
});

describe('Format Relative Time', () => {
  it('formats overdue times', () => {
    const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000);
    expect(formatRelativeTime(halfHourAgo)).toBe('overdue');
  });

  it('formats hours overdue', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours overdue');
  });

  it('formats days overdue', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 days overdue');
  });

  it('formats minutes in future', () => {
    const thirtyMins = new Date(Date.now() + 30 * 60 * 1000);
    expect(formatRelativeTime(thirtyMins)).toBe('30 minutes');
  });

  it('formats hours in future', () => {
    const threeHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHours)).toBe('3 hours');
  });

  it('formats tomorrow', () => {
    const tomorrow = new Date(Date.now() + 30 * 60 * 60 * 1000);
    expect(formatRelativeTime(tomorrow)).toBe('tomorrow');
  });

  it('formats days in future', () => {
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDays)).toBe('3 days');
  });

  it('formats weeks in future', () => {
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoWeeks)).toBe('2 weeks');
  });
});

describe('Message Generation for Deadlines', () => {
  it('generates overdue message', () => {
    const overdue = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Submit proposal',
      deadline: overdue,
    });

    const { message, subtext, primaryAction } = generateMessage(item);

    expect(message).toContain('overdue');
    expect(subtext).toContain('reschedule');
    expect(primaryAction?.label).toBe('Handle Now');
  });

  it('generates critical deadline message (< 2 hours)', () => {
    const soon = new Date(Date.now() + 1 * 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Call client',
      deadline: soon,
    });

    const { message, primaryAction } = generateMessage(item);

    expect(message).toContain('minutes');
    expect(primaryAction?.label).toBe('Focus Now');
  });

  it('generates today deadline message', () => {
    const today = new Date(Date.now() + 10 * 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Review code',
      deadline: today,
      project: 'Project X',
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('hours');
    expect(subtext).toContain('Project X');
  });

  it('generates soon deadline message (< 3 days)', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Prepare presentation',
      deadline: soon,
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('Heads up');
    expect(subtext).toContain('started');
  });

  it('generates this week deadline message', () => {
    const thisWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Write documentation',
      deadline: thisWeek,
    });

    const { message } = generateMessage(item);

    expect(message).toContain('coming up');
  });
});

describe('Message Generation for Commitments', () => {
  it('generates person-related commitment message', () => {
    const item = createTemporalItem({
      type: 'commitment',
      content: 'send the budget',
      entities: ['Sarah'],
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('Sarah');
    expect(message.toLowerCase()).toContain('send the budget');
    expect(subtext).toContain('follow through');
  });

  it('generates general commitment message', () => {
    const item = createTemporalItem({
      type: 'commitment',
      content: 'Update the wiki',
      source: 'meeting-notes',
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('committed');
    expect(subtext).toContain('meeting-notes');
  });
});

describe('Message Generation for Reminders', () => {
  it('generates meeting reminder message', () => {
    const item = createTemporalItem({
      type: 'reminder',
      content: 'Prepare for meeting with team',
      optimalWindow: {
        start: new Date(),
        end: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('Reminder');
    expect(message).toContain('meeting');
    expect(subtext).toContain('Best time');
  });

  it('generates generic reminder message', () => {
    const item = createTemporalItem({
      type: 'reminder',
      content: 'Take medicine',
    });

    const { message } = generateMessage(item);

    expect(message).toContain('Remember');
    expect(message).toContain('Take medicine');
  });
});

describe('Message Generation for Connections', () => {
  it('generates topic-based connection message', () => {
    const item = createTemporalItem({
      type: 'connection',
      content: 'New blog post about testing',
      topics: ['testing'],
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('testing');
    expect(subtext).toContain('useful');
  });

  it('generates entity-based connection message', () => {
    const item = createTemporalItem({
      type: 'connection',
      content: 'Email about project update',
      entities: ['ACME Corp'],
    });

    const { message } = generateMessage(item);

    expect(message).toContain('ACME Corp');
  });

  it('generates generic connection message', () => {
    const item = createTemporalItem({
      type: 'connection',
      content: 'Related information found',
    });

    const { message } = generateMessage(item);

    expect(message).toContain('Connected');
  });
});

describe('Message Generation for Patterns', () => {
  it('generates pattern message', () => {
    const item = createTemporalItem({
      type: 'pattern',
      content: 'You usually review PRs on Monday mornings',
    });

    const { message, subtext } = generateMessage(item);

    expect(message).toContain('review PRs');
    expect(subtext).toContain('patterns');
  });
});

describe('Category Mapping', () => {
  it('maps temporal types to bubble categories', () => {
    expect(mapToCategory('deadline')).toBe('deadline');
    expect(mapToCategory('commitment')).toBe('commitment');
    expect(mapToCategory('reminder')).toBe('reminder');
    expect(mapToCategory('connection')).toBe('connection');
    expect(mapToCategory('pattern')).toBe('pattern');
    expect(mapToCategory('unknown')).toBe('general');
  });
});

describe('Transform to Bubble', () => {
  it('transforms temporal item to bubble item', () => {
    const item = createTemporalItem({
      id: 'temp-1',
      type: 'deadline',
      content: 'Test task',
      priority: 70,
    });

    const bubble = transformToBubble(item, 85);

    expect(bubble.id).toBe('bubble-temp-1');
    expect(bubble.temporalItemId).toBe('temp-1');
    expect(bubble.confidenceScore).toBe(85);
    expect(bubble.basePriority).toBe(70);
    expect(bubble.category).toBe('deadline');
    expect(bubble.state).toBe('pending');
    expect(bubble.temporalItem).toEqual(item);
  });

  it('includes generated message and subtext', () => {
    const overdue = new Date(Date.now() - 60 * 60 * 1000);
    const item = createTemporalItem({
      type: 'deadline',
      content: 'Submit report',
      deadline: overdue,
    });

    const bubble = transformToBubble(item, 95);

    expect(bubble.message).toContain('overdue');
    expect(bubble.subtext).toBeDefined();
    expect(bubble.primaryAction).toBeDefined();
  });
});

describe('Transform Batch', () => {
  it('transforms multiple items', () => {
    const items = [
      { item: createTemporalItem({ id: '1' }), score: 80 },
      { item: createTemporalItem({ id: '2' }), score: 60 },
      { item: createTemporalItem({ id: '3' }), score: 90 },
    ];

    const bubbles = transformBatch(items);

    expect(bubbles).toHaveLength(3);
    expect(bubbles[0].temporalItemId).toBe('1');
    expect(bubbles[0].confidenceScore).toBe(80);
    expect(bubbles[2].confidenceScore).toBe(90);
  });
});

describe('Truncate Message', () => {
  it('keeps short messages unchanged', () => {
    const short = 'Hello world';
    expect(truncateMessage(short)).toBe(short);
  });

  it('truncates long messages', () => {
    const long = 'A'.repeat(150);
    const truncated = truncateMessage(long, 100);

    expect(truncated.length).toBe(100);
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('uses custom max length', () => {
    const message = 'This is a test message';
    const truncated = truncateMessage(message, 10);

    expect(truncated.length).toBe(10);
  });
});
