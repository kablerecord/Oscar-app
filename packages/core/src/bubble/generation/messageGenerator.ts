/**
 * Message Generator
 *
 * Transforms Temporal Intelligence items into human-readable Bubble messages.
 * Crafts natural, contextual language that respects the moment.
 */

import type {
  TemporalItem,
  BubbleItem,
  BubbleCategory,
  BubbleAction,
} from '../types';

/**
 * Message template configuration
 */
interface MessageTemplate {
  pattern: RegExp | ((item: TemporalItem) => boolean);
  message: (item: TemporalItem) => string;
  subtext?: (item: TemporalItem) => string | undefined;
  action?: (item: TemporalItem) => BubbleAction;
}

/**
 * Calculate hours until deadline
 */
function hoursUntilDeadline(deadline: Date | undefined, now: number = Date.now()): number | null {
  if (!deadline) return null;
  return (deadline.getTime() - now) / (1000 * 60 * 60);
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date: Date, now: number = Date.now()): string {
  const hours = hoursUntilDeadline(date, now);
  if (hours === null) return '';

  if (hours < 0) {
    const overdue = Math.abs(hours);
    if (overdue < 1) return 'overdue';
    if (overdue < 24) return `${Math.round(overdue)} hours overdue`;
    return `${Math.round(overdue / 24)} days overdue`;
  }

  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${Math.round(hours)} hours`;
  if (hours < 48) return 'tomorrow';
  if (hours < 168) return `${Math.round(hours / 24)} days`;
  return `${Math.round(hours / 168)} weeks`;
}

/**
 * Deadline message templates
 */
const DEADLINE_TEMPLATES: MessageTemplate[] = [
  // Overdue
  {
    pattern: (item) => {
      const hours = hoursUntilDeadline(item.deadline);
      return hours !== null && hours < 0;
    },
    message: (item) => {
      const hours = Math.abs(hoursUntilDeadline(item.deadline)!);
      if (hours < 24) return `"${item.content}" is now overdue`;
      return `"${item.content}" was due ${formatRelativeTime(item.deadline!)}`;
    },
    subtext: () => 'Would you like to reschedule or mark complete?',
    action: () => ({ label: 'Handle Now' }),
  },
  // Critical (< 2 hours)
  {
    pattern: (item) => {
      const hours = hoursUntilDeadline(item.deadline);
      return hours !== null && hours >= 0 && hours < 2;
    },
    message: (item) => {
      const mins = Math.round(hoursUntilDeadline(item.deadline)! * 60);
      return `"${item.content}" due in ${mins} minutes`;
    },
    subtext: (item) => item.project ? `Project: ${item.project}` : undefined,
    action: () => ({ label: 'Focus Now' }),
  },
  // Today (< 24 hours)
  {
    pattern: (item) => {
      const hours = hoursUntilDeadline(item.deadline);
      return hours !== null && hours >= 2 && hours < 24;
    },
    message: (item) => {
      const hours = Math.round(hoursUntilDeadline(item.deadline)!);
      return `"${item.content}" due in ${hours} hours`;
    },
    subtext: (item) => item.project ? `Part of ${item.project}` : 'Due today',
  },
  // Soon (< 3 days)
  {
    pattern: (item) => {
      const hours = hoursUntilDeadline(item.deadline);
      return hours !== null && hours >= 24 && hours < 72;
    },
    message: (item) => `Heads up: "${item.content}" due ${formatRelativeTime(item.deadline!)}`,
    subtext: () => 'Consider getting started',
  },
  // This week
  {
    pattern: (item) => {
      const hours = hoursUntilDeadline(item.deadline);
      return hours !== null && hours >= 72;
    },
    message: (item) => `"${item.content}" coming up in ${formatRelativeTime(item.deadline!)}`,
  },
];

/**
 * Commitment message templates
 */
const COMMITMENT_TEMPLATES: MessageTemplate[] = [
  // Person mentioned
  {
    pattern: (item) => Boolean(item.entities && item.entities.length > 0),
    message: (item) => {
      const person = item.entities![0];
      return `You mentioned you'd ${item.content.toLowerCase()} to ${person}`;
    },
    subtext: () => 'Ready to follow through?',
  },
  // General commitment
  {
    pattern: () => true,
    message: (item) => `You committed to: "${item.content}"`,
    subtext: (item) => item.source ? `From: ${item.source}` : undefined,
  },
];

/**
 * Reminder message templates
 */
const REMINDER_TEMPLATES: MessageTemplate[] = [
  // Meeting related
  {
    pattern: (item) => item.content.toLowerCase().includes('meeting'),
    message: (item) => `Reminder: ${item.content}`,
    subtext: (item) => item.optimalWindow
      ? `Best time: ${item.optimalWindow.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : undefined,
  },
  // Generic reminder
  {
    pattern: () => true,
    message: (item) => `Remember: ${item.content}`,
  },
];

/**
 * Connection message templates
 */
const CONNECTION_TEMPLATES: MessageTemplate[] = [
  // Topic match
  {
    pattern: (item) => Boolean(item.topics && item.topics.length > 0),
    message: (item) => {
      const topic = item.topics![0];
      return `This relates to ${topic}: ${item.content}`;
    },
    subtext: () => 'Might be useful now',
  },
  // Entity match
  {
    pattern: (item) => Boolean(item.entities && item.entities.length > 0),
    message: (item) => {
      const entity = item.entities![0];
      return `Regarding ${entity}: ${item.content}`;
    },
  },
  // Generic connection
  {
    pattern: () => true,
    message: (item) => `Connected: ${item.content}`,
  },
];

/**
 * Pattern message templates
 */
const PATTERN_TEMPLATES: MessageTemplate[] = [
  {
    pattern: () => true,
    message: (item) => item.content,
    subtext: () => 'Based on your patterns',
  },
];

/**
 * Get templates for item type
 */
function getTemplatesForType(type: string): MessageTemplate[] {
  switch (type) {
    case 'deadline':
      return DEADLINE_TEMPLATES;
    case 'commitment':
      return COMMITMENT_TEMPLATES;
    case 'reminder':
      return REMINDER_TEMPLATES;
    case 'connection':
      return CONNECTION_TEMPLATES;
    case 'pattern':
      return PATTERN_TEMPLATES;
    default:
      return [{ pattern: () => true, message: (item) => item.content }];
  }
}

/**
 * Find matching template for item
 */
function findMatchingTemplate(
  item: TemporalItem,
  templates: MessageTemplate[]
): MessageTemplate | undefined {
  for (const template of templates) {
    const matches =
      typeof template.pattern === 'function'
        ? template.pattern(item)
        : template.pattern.test(item.content);

    if (matches) {
      return template;
    }
  }
  return templates[templates.length - 1]; // Fallback to last (generic) template
}

/**
 * Generate message for a temporal item
 */
export function generateMessage(item: TemporalItem): {
  message: string;
  subtext?: string;
  primaryAction?: BubbleAction;
} {
  const templates = getTemplatesForType(item.type);
  const template = findMatchingTemplate(item, templates);

  if (!template) {
    return { message: item.content };
  }

  return {
    message: template.message(item),
    subtext: template.subtext?.(item),
    primaryAction: template.action?.(item),
  };
}

/**
 * Map temporal item type to bubble category
 */
export function mapToCategory(type: string): BubbleCategory {
  switch (type) {
    case 'deadline':
      return 'deadline';
    case 'commitment':
      return 'commitment';
    case 'reminder':
      return 'reminder';
    case 'connection':
      return 'connection';
    case 'pattern':
      return 'pattern';
    default:
      return 'general';
  }
}

/**
 * Transform a temporal item into a bubble item
 */
export function transformToBubble(
  item: TemporalItem,
  confidenceScore: number
): BubbleItem {
  const { message, subtext, primaryAction } = generateMessage(item);

  return {
    id: `bubble-${item.id}`,
    temporalItemId: item.id,
    message,
    subtext,
    confidenceScore,
    basePriority: item.priority,
    primaryAction,
    category: mapToCategory(item.type),
    state: 'pending',
    temporalItem: item,
  };
}

/**
 * Generate a batch of bubble items
 */
export function transformBatch(
  items: Array<{ item: TemporalItem; score: number }>
): BubbleItem[] {
  return items.map(({ item, score }) => transformToBubble(item, score));
}

/**
 * Truncate message if too long
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength - 3) + '...';
}

export default {
  generateMessage,
  mapToCategory,
  transformToBubble,
  transformBatch,
  formatRelativeTime,
  truncateMessage,
};
