/**
 * Dependency Inference - Infer downstream dependencies from commitments
 *
 * Uses goal-based reasoning to identify what needs to happen before the commitment.
 */

import type {
  Commitment,
  Dependency,
  DependencyChain,
  DependencyStatus,
} from '../types';

/**
 * Dependency pattern with typical lead time (days)
 */
interface DependencyPattern {
  keywords: RegExp;
  dependencies: {
    action: string;
    confidence: number;
    leadTimeDays: number;
  }[];
}

/**
 * Known dependency patterns
 */
const DEPENDENCY_PATTERNS: DependencyPattern[] = [
  {
    keywords: /\b(wedding|wedding ceremony)\b/i,
    dependencies: [
      { action: 'Book travel', confidence: 0.95, leadTimeDays: 30 },
      { action: 'Book accommodation', confidence: 0.9, leadTimeDays: 30 },
      { action: 'Buy wedding gift', confidence: 0.85, leadTimeDays: 14 },
      { action: 'Get outfit ready', confidence: 0.8, leadTimeDays: 7 },
      { action: 'RSVP', confidence: 0.95, leadTimeDays: 21 },
    ],
  },
  {
    keywords: /\b(conference|summit|convention)\b/i,
    dependencies: [
      { action: 'Book travel', confidence: 0.9, leadTimeDays: 21 },
      { action: 'Book hotel', confidence: 0.9, leadTimeDays: 21 },
      { action: 'Register for conference', confidence: 0.85, leadTimeDays: 14 },
      { action: 'Prepare presentation', confidence: 0.6, leadTimeDays: 7 },
    ],
  },
  {
    keywords: /\b(vacation|trip|holiday|travel)\b/i,
    dependencies: [
      { action: 'Book flights', confidence: 0.85, leadTimeDays: 30 },
      { action: 'Book accommodation', confidence: 0.85, leadTimeDays: 21 },
      { action: 'Pack bags', confidence: 0.95, leadTimeDays: 1 },
      { action: 'Arrange pet/plant care', confidence: 0.5, leadTimeDays: 7 },
      { action: 'Request time off', confidence: 0.7, leadTimeDays: 14 },
    ],
  },
  {
    keywords: /\b(meeting|presentation|pitch)\b/i,
    dependencies: [
      { action: 'Prepare materials', confidence: 0.9, leadTimeDays: 3 },
      { action: 'Review agenda', confidence: 0.7, leadTimeDays: 1 },
      { action: 'Send calendar invite', confidence: 0.6, leadTimeDays: 7 },
    ],
  },
  {
    keywords: /\b(deadline|deliverable|submission)\b/i,
    dependencies: [
      { action: 'Review requirements', confidence: 0.8, leadTimeDays: 7 },
      { action: 'Complete first draft', confidence: 0.7, leadTimeDays: 3 },
      { action: 'Get feedback', confidence: 0.6, leadTimeDays: 2 },
      { action: 'Final review', confidence: 0.9, leadTimeDays: 1 },
    ],
  },
  {
    keywords: /\b(birthday|anniversary)\b/i,
    dependencies: [
      { action: 'Buy gift', confidence: 0.85, leadTimeDays: 7 },
      { action: 'Make reservation', confidence: 0.6, leadTimeDays: 7 },
      { action: 'Send card', confidence: 0.7, leadTimeDays: 5 },
    ],
  },
  {
    keywords: /\b(doctor|dentist|medical|checkup|appointment)\b/i,
    dependencies: [
      { action: 'Prepare insurance info', confidence: 0.7, leadTimeDays: 1 },
      { action: 'Fast if required', confidence: 0.4, leadTimeDays: 1 },
      { action: 'List symptoms/questions', confidence: 0.6, leadTimeDays: 1 },
    ],
  },
  {
    keywords: /\b(interview|job interview)\b/i,
    dependencies: [
      { action: 'Research company', confidence: 0.9, leadTimeDays: 3 },
      { action: 'Prepare answers', confidence: 0.85, leadTimeDays: 2 },
      { action: 'Prepare outfit', confidence: 0.8, leadTimeDays: 1 },
      { action: 'Print resume copies', confidence: 0.7, leadTimeDays: 1 },
    ],
  },
  {
    keywords: /\b(exam|test|certification)\b/i,
    dependencies: [
      { action: 'Study materials', confidence: 0.95, leadTimeDays: 14 },
      { action: 'Practice tests', confidence: 0.8, leadTimeDays: 7 },
      { action: 'Rest before exam', confidence: 0.7, leadTimeDays: 1 },
    ],
  },
];

/**
 * Calculate suggested deadline from event date and lead time
 */
function calculateDeadline(eventDate: Date | undefined, leadTimeDays: number): Date | undefined {
  if (!eventDate) return undefined;

  const deadline = new Date(eventDate);
  deadline.setDate(deadline.getDate() - leadTimeDays);

  // Don't suggest past deadlines
  if (deadline < new Date()) {
    return undefined;
  }

  return deadline;
}

/**
 * Infer dependencies for a commitment
 */
export function inferDependencies(commitment: Commitment): DependencyChain {
  const dependencies: Dependency[] = [];
  const text = `${commitment.what} ${commitment.commitmentText}`;

  // Find matching patterns
  for (const pattern of DEPENDENCY_PATTERNS) {
    if (pattern.keywords.test(text)) {
      for (const dep of pattern.dependencies) {
        dependencies.push({
          action: dep.action,
          confidence: dep.confidence,
          suggestedDeadline: calculateDeadline(
            commitment.when.parsedDate,
            dep.leadTimeDays
          ),
          status: 'pending',
        });
      }
      break; // Use first matching pattern
    }
  }

  // If no patterns match, infer generic dependencies
  if (dependencies.length === 0) {
    // Generic preparation
    if (commitment.when.parsedDate) {
      dependencies.push({
        action: 'Prepare for this',
        confidence: 0.5,
        suggestedDeadline: calculateDeadline(commitment.when.parsedDate, 1),
        status: 'pending',
      });
    }
  }

  return {
    primaryEvent: commitment.what,
    inferredDependencies: dependencies,
  };
}

/**
 * Get high-confidence dependencies only
 */
export function getHighConfidenceDependencies(
  chain: DependencyChain,
  minConfidence: number = 0.7
): Dependency[] {
  return chain.inferredDependencies.filter((d) => d.confidence >= minConfidence);
}

/**
 * Get dependencies due soon
 */
export function getDependenciesDueSoon(
  chain: DependencyChain,
  withinDays: number = 7
): Dependency[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  return chain.inferredDependencies.filter((d) => {
    if (!d.suggestedDeadline) return false;
    return d.suggestedDeadline <= cutoff;
  });
}

/**
 * Get pending dependencies
 */
export function getPendingDependencies(chain: DependencyChain): Dependency[] {
  return chain.inferredDependencies.filter((d) => d.status === 'pending');
}

/**
 * Mark dependency as completed
 */
export function markDependencyCompleted(
  chain: DependencyChain,
  action: string
): DependencyChain {
  return {
    ...chain,
    inferredDependencies: chain.inferredDependencies.map((d) =>
      d.action === action ? { ...d, status: 'completed' as DependencyStatus } : d
    ),
  };
}

/**
 * Mark dependency as dismissed
 */
export function markDependencyDismissed(
  chain: DependencyChain,
  action: string
): DependencyChain {
  return {
    ...chain,
    inferredDependencies: chain.inferredDependencies.map((d) =>
      d.action === action ? { ...d, status: 'dismissed' as DependencyStatus } : d
    ),
  };
}

/**
 * Format dependency chain as string
 */
export function formatDependencyChain(chain: DependencyChain): string {
  const lines = [`Dependencies for: ${chain.primaryEvent}`];

  for (const dep of chain.inferredDependencies) {
    const deadlineStr = dep.suggestedDeadline
      ? ` (by ${dep.suggestedDeadline.toLocaleDateString()})`
      : '';
    const confidenceStr = `${Math.round(dep.confidence * 100)}%`;
    lines.push(`  - ${dep.action}${deadlineStr} [${confidenceStr}] [${dep.status}]`);
  }

  return lines.join('\n');
}

/**
 * Enrich commitment with dependencies
 */
export function enrichWithDependencies(commitment: Commitment): Commitment {
  const dependencies = inferDependencies(commitment);

  return {
    ...commitment,
    dependencies,
  };
}

/**
 * Enrich multiple commitments with dependencies
 */
export function enrichAllWithDependencies(commitments: Commitment[]): Commitment[] {
  return commitments.map(enrichWithDependencies);
}
