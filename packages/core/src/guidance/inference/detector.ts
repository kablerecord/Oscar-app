/**
 * Correction Signal Detector
 *
 * Detects when user messages are corrections to Oscar's behavior.
 */

import type { CorrectionSignals, CorrectionType } from '../types';

/**
 * Patterns that indicate a correction
 */
const CORRECTION_PATTERNS: RegExp[] = [
  /no,?\s*(I\s*)?(want|need|prefer)/i,
  /don't\s+(do|say|use|include)/i,
  /instead\s+of/i,
  /not\s+like\s+that/i,
  /that's\s+not\s+(what|how)/i,
  /please\s+(don't|stop|avoid)/i,
  /I\s+said/i,
  /I\s+meant/i,
  /you\s+should\s+(have|always)/i,
  /wrong/i,
  /incorrect/i,
  /that's\s+not\s+right/i,
  /no,\s+I\s+(don't|didn't)/i,
  /stop\s+(doing|using)/i,
  /never\s+(do|use|say)/i,
  /why\s+(did|are)\s+you/i,
];

/**
 * Patterns for formatting corrections
 */
const FORMATTING_PATTERNS: RegExp[] = [
  /format/i,
  /style/i,
  /structure/i,
  /layout/i,
  /indentation/i,
  /spacing/i,
  /bullet/i,
  /list/i,
  /heading/i,
];

/**
 * Patterns for interaction style corrections
 */
const INTERACTION_PATTERNS: RegExp[] = [
  /ask\s+(me|first)/i,
  /question/i,
  /clarif/i,
  /confirm/i,
  /check\s+with/i,
  /before\s+(you|doing)/i,
  /wait\s+for/i,
];

/**
 * Patterns for code output corrections
 */
const CODE_PATTERNS: RegExp[] = [
  /code/i,
  /file/i,
  /snippet/i,
  /function/i,
  /variable/i,
  /import/i,
  /export/i,
  /class/i,
  /component/i,
];

/**
 * Patterns for tone corrections
 */
const TONE_PATTERNS: RegExp[] = [
  /tone/i,
  /voice/i,
  /sound/i,
  /formal/i,
  /casual/i,
  /friendly/i,
  /professional/i,
  /brief/i,
  /verbose/i,
  /concise/i,
];

/**
 * Detect if a message contains correction signals
 */
export function detectCorrectionSignals(message: string): CorrectionSignals {
  const isCorrection = CORRECTION_PATTERNS.some((p) => p.test(message));

  if (!isCorrection) {
    return {
      isCorrection: false,
      correctionType: 'general',
    };
  }

  // Determine correction type
  const correctionType = classifyCorrectionType(message);

  // Try to extract behaviors
  const { originalBehavior, desiredBehavior } = extractBehaviors(message);

  return {
    isCorrection: true,
    correctionType,
    originalBehavior,
    desiredBehavior,
  };
}

/**
 * Classify the type of correction
 */
export function classifyCorrectionType(message: string): CorrectionType {
  if (FORMATTING_PATTERNS.some((p) => p.test(message))) {
    return 'formatting';
  }

  if (INTERACTION_PATTERNS.some((p) => p.test(message))) {
    return 'interaction_style';
  }

  if (CODE_PATTERNS.some((p) => p.test(message))) {
    return 'code_output';
  }

  if (TONE_PATTERNS.some((p) => p.test(message))) {
    return 'tone';
  }

  return 'general';
}

/**
 * Extract original and desired behaviors from correction
 */
export function extractBehaviors(message: string): {
  originalBehavior?: string;
  desiredBehavior?: string;
} {
  let originalBehavior: string | undefined;
  let desiredBehavior: string | undefined;

  // Pattern: "Don't do X, do Y instead"
  const insteadMatch = message.match(
    /don't\s+(.+?),?\s*(do|use|say)\s+(.+?)\s+instead/i
  );
  if (insteadMatch) {
    originalBehavior = insteadMatch[1].trim();
    desiredBehavior = insteadMatch[3].trim();
    return { originalBehavior, desiredBehavior };
  }

  // Pattern: "Instead of X, do Y"
  const insteadOfMatch = message.match(/instead\s+of\s+(.+?),?\s*(.+)/i);
  if (insteadOfMatch) {
    originalBehavior = insteadOfMatch[1].trim();
    desiredBehavior = insteadOfMatch[2].trim();
    return { originalBehavior, desiredBehavior };
  }

  // Pattern: "I wanted X not Y"
  const wantedMatch = message.match(/I\s+(want|wanted)\s+(.+?)\s+not\s+(.+)/i);
  if (wantedMatch) {
    desiredBehavior = wantedMatch[2].trim();
    originalBehavior = wantedMatch[3].trim();
    return { originalBehavior, desiredBehavior };
  }

  // Pattern: "Don't X" (just extract the undesired behavior)
  const dontMatch = message.match(/don't\s+(.+?)(?:\.|,|$)/i);
  if (dontMatch) {
    originalBehavior = dontMatch[1].trim();
    return { originalBehavior };
  }

  // Pattern: "Please X" or "I want X" (just extract desired)
  const pleaseMatch = message.match(
    /(?:please|I\s+want|I\s+need|I\s+prefer)\s+(.+?)(?:\.|,|$)/i
  );
  if (pleaseMatch) {
    desiredBehavior = pleaseMatch[1].trim();
    return { desiredBehavior };
  }

  return { originalBehavior, desiredBehavior };
}

/**
 * Calculate correction strength (0-1)
 * Higher values indicate stronger/clearer corrections
 */
export function calculateCorrectionStrength(message: string): number {
  let strength = 0;

  // Count matching correction patterns
  const matchingPatterns = CORRECTION_PATTERNS.filter((p) => p.test(message));
  strength += Math.min(matchingPatterns.length * 0.15, 0.45);

  // Strong language boosts
  if (/never|always|stop|wrong/i.test(message)) {
    strength += 0.2;
  }

  // Explicit displeasure
  if (/don't like|hate|annoying|frustrat/i.test(message)) {
    strength += 0.15;
  }

  // Repeated emphasis (multiple correction indicators)
  if (matchingPatterns.length >= 3) {
    strength += 0.1;
  }

  // Exclamation points indicate emphasis
  const exclamationCount = (message.match(/!/g) || []).length;
  strength += Math.min(exclamationCount * 0.05, 0.1);

  return Math.min(strength, 1);
}

/**
 * Check if message is likely just a one-time adjustment
 * vs a lasting preference
 */
export function isOneTimeAdjustment(message: string): boolean {
  const oneTimePatterns = [
    /this\s+time/i,
    /for\s+(this|now)/i,
    /just\s+(this|here)/i,
    /right\s+now/i,
    /in\s+this\s+(case|instance)/i,
    /only\s+for/i,
    /temporarily/i,
  ];

  return oneTimePatterns.some((p) => p.test(message));
}

/**
 * Get all correction indicators in message
 */
export function getCorrectionIndicators(message: string): string[] {
  const indicators: string[] = [];

  for (const pattern of CORRECTION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      indicators.push(match[0]);
    }
  }

  return indicators;
}
