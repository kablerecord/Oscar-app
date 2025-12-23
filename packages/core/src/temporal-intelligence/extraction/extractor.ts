/**
 * Commitment Extractor
 *
 * Extracts commitments from text content.
 */

import type {
  Commitment,
  CommitmentExtraction,
  CommitmentSource,
  TemporalReference,
  UrgencyCategory,
} from '../types';

/**
 * Generate a unique commitment ID
 */
function generateCommitmentId(): string {
  return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Temporal patterns for extraction
 */
const TEMPORAL_PATTERNS = {
  today: /\b(today|tonight|this evening)\b/i,
  tomorrow: /\b(tomorrow)\b/i,
  thisWeek: /\b(this week|next few days|by friday|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
  thisMonth: /\b(this month|next week|by the end of the month|within the month)\b/i,
  specific: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
  relativeDate: /\b(in \d+ (days?|weeks?|months?))\b/i,
};

/**
 * Commitment language patterns
 */
const COMMITMENT_PATTERNS = {
  willDo: /\b(I('ll| will)|we('ll| will)|I'm going to|we're going to)\s+(.+?)(?:\.|,|$)/gi,
  byDate: /\b(.+?)\s+by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|the end of|[a-z]+ \d{1,2})/gi,
  needTo: /\b(I |we )?(need to|have to|must|should)\s+(.+?)(?:\.|,|$)/gi,
  scheduled: /\b(meeting|call|appointment)\s+(on|at)\s+(.+?)(?:\.|,|$)/gi,
  reminder: /\b(remind me to|don't forget to|remember to)\s+(.+?)(?:\.|,|$)/gi,
  letsDo: /\b(let's|let us)\s+(.+?)(?:\.|,|$)/gi,
};

/**
 * Determine urgency category from text
 */
export function determineUrgencyCategory(text: string): UrgencyCategory {
  const lowerText = text.toLowerCase();

  if (TEMPORAL_PATTERNS.today.test(lowerText)) {
    return 'TODAY';
  }

  if (TEMPORAL_PATTERNS.tomorrow.test(lowerText)) {
    return 'TOMORROW';
  }

  if (TEMPORAL_PATTERNS.thisWeek.test(lowerText)) {
    return 'THIS_WEEK';
  }

  if (TEMPORAL_PATTERNS.thisMonth.test(lowerText)) {
    return 'THIS_MONTH';
  }

  return 'LATER';
}

/**
 * Check if temporal reference is vague
 */
export function isVagueReference(text: string): boolean {
  const vaguePatterns = [
    /\bsoon\b/i,
    /\blater\b/i,
    /\bsometime\b/i,
    /\beventually\b/i,
    /\bnext week\b/i,
    /\bnext month\b/i,
    /\bwhen I get a chance\b/i,
    /\bwhen possible\b/i,
  ];

  return vaguePatterns.some((p) => p.test(text));
}

/**
 * Try to parse a date from text
 */
export function parseDate(text: string): Date | undefined {
  // Try specific date pattern (e.g., "June 15")
  const monthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i
  );

  if (monthMatch) {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const month = months.indexOf(monthMatch[1].toLowerCase());
    const day = parseInt(monthMatch[2], 10);
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : new Date().getFullYear();

    return new Date(year, month, day);
  }

  // Try day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = text.match(
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
  );

  if (dayMatch) {
    const targetDay = days.indexOf(dayMatch[2].toLowerCase());
    const now = new Date();
    const currentDay = now.getDay();

    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0 || dayMatch[1]) {
      daysAhead += 7;
    }

    const date = new Date(now);
    date.setDate(date.getDate() + daysAhead);
    return date;
  }

  // Try tomorrow
  if (/\btomorrow\b/i.test(text)) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }

  // Try relative (in X days/weeks)
  const relativeMatch = text.match(/\bin\s+(\d+)\s+(days?|weeks?|months?)\b/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();

    if (unit.startsWith('day')) {
      date.setDate(date.getDate() + amount);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() + amount * 7);
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() + amount);
    }

    return date;
  }

  return undefined;
}

/**
 * Extract temporal reference from text
 */
export function extractTemporalReference(text: string): TemporalReference {
  const parsedDate = parseDate(text);

  return {
    rawText: text,
    parsedDate,
    isVague: isVagueReference(text),
    urgencyCategory: determineUrgencyCategory(text),
  };
}

/**
 * Extract who is responsible from commitment text
 */
export function extractWho(text: string): string {
  const lowerText = text.toLowerCase();

  // Check for "I" commitments
  if (/\b(I('ll| will|'m going)|my)\b/.test(text)) {
    return 'user';
  }

  // Check for "we" commitments
  if (/\b(we('ll| will|'re going)|our)\b/.test(text)) {
    return 'user + others';
  }

  // Check for named person
  const nameMatch = text.match(/\b([A-Z][a-z]+)\s+(will|is going to|'ll)\b/);
  if (nameMatch) {
    return nameMatch[1];
  }

  return 'user';
}

/**
 * Extract the action from commitment text
 */
export function extractWhat(text: string): string {
  // Remove common prefixes
  let action = text
    .replace(/\b(I('ll| will)|we('ll| will)|I'm going to|we're going to)\s*/i, '')
    .replace(/\b(need to|have to|must|should)\s*/i, '')
    .replace(/\b(remind me to|don't forget to|remember to)\s*/i, '')
    .replace(/\b(let's|let us)\s*/i, '')
    .trim();

  // Clean up trailing punctuation and temporal references
  action = action
    .replace(/\s+by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|the end of|[a-z]+ \d{1,2}).*$/i, '')
    .replace(/[\.,!?]+$/, '')
    .trim();

  return action;
}

/**
 * Calculate extraction confidence
 */
export function calculateExtractionConfidence(
  text: string,
  who: string,
  what: string,
  when: TemporalReference
): number {
  let confidence = 0;

  // Base confidence for having all components
  if (who) confidence += 0.2;
  if (what && what.length > 5) confidence += 0.3;
  if (when.rawText) confidence += 0.2;

  // Bonus for specific date
  if (!when.isVague && when.parsedDate) {
    confidence += 0.15;
  }

  // Bonus for clear commitment language
  if (/\b(I'll|will|must|need to|have to)\b/i.test(text)) {
    confidence += 0.15;
  }

  return Math.min(1, confidence);
}

/**
 * Extract commitments from content
 */
export function extractCommitments(
  content: string,
  source: CommitmentSource
): Commitment[] {
  const commitments: Commitment[] = [];
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  for (const sentence of sentences) {
    // Check for commitment patterns
    let hasCommitment = false;
    let matchedPattern = '';

    for (const [name, pattern] of Object.entries(COMMITMENT_PATTERNS)) {
      if (pattern.test(sentence)) {
        hasCommitment = true;
        matchedPattern = name;
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        break;
      }
    }

    if (!hasCommitment) continue;

    const who = extractWho(sentence);
    const what = extractWhat(sentence);
    const when = extractTemporalReference(sentence);
    const confidence = calculateExtractionConfidence(sentence, who, what, when);

    // Only include if we have meaningful content
    if (what.length < 5 || confidence < 0.3) continue;

    const commitment: Commitment = {
      id: generateCommitmentId(),
      commitmentText: sentence.trim(),
      who,
      what,
      when,
      source,
      confidence,
      reasoning: `Matched ${matchedPattern} pattern. Who: ${who}, What: ${what.substring(0, 30)}..., When: ${when.rawText || 'unspecified'}`,
      createdAt: new Date(),
      validated: false,
    };

    commitments.push(commitment);
  }

  return commitments;
}

/**
 * Merge similar commitments
 */
export function mergeCommitments(commitments: Commitment[]): Commitment[] {
  const merged: Commitment[] = [];
  const seen = new Set<string>();

  for (const commitment of commitments) {
    // Create a simple fingerprint
    const fingerprint = `${commitment.who}:${commitment.what.toLowerCase().substring(0, 20)}`;

    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      merged.push(commitment);
    } else {
      // Find existing and keep higher confidence one
      const existingIndex = merged.findIndex(
        (c) => `${c.who}:${c.what.toLowerCase().substring(0, 20)}` === fingerprint
      );
      if (existingIndex >= 0 && commitment.confidence > merged[existingIndex].confidence) {
        merged[existingIndex] = commitment;
      }
    }
  }

  return merged;
}
