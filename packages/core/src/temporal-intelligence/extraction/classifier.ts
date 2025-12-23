/**
 * Input Classifier - Classifies input source type
 *
 * Determines the type of input and routes to appropriate extraction.
 */

import type { CommitmentSourceType, ContentIngestionTrigger } from '../types';

/**
 * Classification result
 */
export interface ClassificationResult {
  sourceType: CommitmentSourceType;
  confidence: number;
  reasoning: string;
}

/**
 * Email patterns
 */
const EMAIL_PATTERNS: RegExp[] = [
  /^From:/im,
  /^Subject:/im,
  /^To:/im,
  /^Date:/im,
  /^Reply-To:/im,
  /@[\w.-]+\.\w+/i,
];

/**
 * Calendar patterns
 */
const CALENDAR_PATTERNS: RegExp[] = [
  /BEGIN:VCALENDAR/i,
  /BEGIN:VEVENT/i,
  /DTSTART/i,
  /DTEND/i,
  /calendar invite/i,
  /meeting invite/i,
];

/**
 * Text message patterns
 */
const TEXT_PATTERNS: RegExp[] = [
  /^Message from/i,
  /^SMS from/i,
  /^iMessage from/i,
];

/**
 * Voice transcription patterns
 */
const VOICE_PATTERNS: RegExp[] = [
  /^\[Transcription\]/i,
  /^Voice memo:/i,
  /^\[Voicemail\]/i,
];

/**
 * Classify input content by source type
 */
export function classifyInput(content: string): ClassificationResult {
  // Check for calendar content
  if (CALENDAR_PATTERNS.some((p) => p.test(content))) {
    return {
      sourceType: 'calendar',
      confidence: 0.95,
      reasoning: 'Calendar format markers detected (iCal/VEVENT)',
    };
  }

  // Check for voice content
  if (VOICE_PATTERNS.some((p) => p.test(content))) {
    return {
      sourceType: 'voice',
      confidence: 0.9,
      reasoning: 'Voice transcription markers detected',
    };
  }

  // Check for text message
  if (TEXT_PATTERNS.some((p) => p.test(content))) {
    return {
      sourceType: 'text',
      confidence: 0.85,
      reasoning: 'Text message format detected',
    };
  }

  // Check for email
  const emailMatches = EMAIL_PATTERNS.filter((p) => p.test(content));
  if (emailMatches.length >= 2) {
    return {
      sourceType: 'email',
      confidence: 0.9,
      reasoning: 'Multiple email headers detected',
    };
  }
  if (emailMatches.length === 1) {
    return {
      sourceType: 'email',
      confidence: 0.7,
      reasoning: 'Single email marker detected',
    };
  }

  // Default to document
  return {
    sourceType: 'document',
    confidence: 0.5,
    reasoning: 'No specific source markers detected, treating as document',
  };
}

/**
 * Process content ingestion trigger
 */
export function processIngestionTrigger(
  trigger: ContentIngestionTrigger
): ClassificationResult {
  // If source type is already specified, use it
  if (trigger.sourceType !== 'document') {
    return {
      sourceType: trigger.sourceType,
      confidence: 1.0,
      reasoning: 'Source type provided in trigger',
    };
  }

  // Otherwise, classify
  return classifyInput(trigger.content);
}

/**
 * Check if content is likely to contain commitments
 */
export function containsCommitmentSignals(content: string): boolean {
  const commitmentPatterns = [
    /I('ll| will) /i,
    /by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /by (tomorrow|next week|next month)/i,
    /deadline/i,
    /due (date|by)/i,
    /let's /i,
    /we should /i,
    /don't forget/i,
    /remind me/i,
    /need to /i,
    /have to /i,
    /must /i,
    /scheduled for/i,
    /meeting at/i,
    /appointment/i,
  ];

  return commitmentPatterns.some((p) => p.test(content));
}

/**
 * Get classification confidence threshold
 */
export function getClassificationThreshold(sourceType: CommitmentSourceType): number {
  switch (sourceType) {
    case 'calendar':
      return 0.9;
    case 'email':
      return 0.7;
    case 'text':
      return 0.75;
    case 'voice':
      return 0.8;
    case 'document':
      return 0.6;
    case 'manual':
      return 0.95;
    default:
      return 0.6;
  }
}

/**
 * Check if classification meets threshold
 */
export function meetsClassificationThreshold(result: ClassificationResult): boolean {
  return result.confidence >= getClassificationThreshold(result.sourceType);
}
