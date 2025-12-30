/**
 * Feedback Detection Patterns
 *
 * Pattern definitions for detecting feedback intent in natural language.
 * Organized by category and sentiment for accurate detection.
 */

import type { FeedbackSentiment, FeedbackCategory } from './types';

/**
 * Pattern definition with metadata
 */
export interface FeedbackPattern {
  pattern: RegExp;
  sentiment: FeedbackSentiment;
  category: FeedbackCategory;
  weight: number; // Higher weight = stronger signal (0-1)
  description: string;
}

/**
 * Explicit feedback intent patterns
 * User directly states they want to give feedback
 */
export const EXPLICIT_FEEDBACK_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\b(i\s+)?want\s+to\s+(give|leave|share|provide)\s+(some\s+)?feedback\b/i,
    sentiment: 'neutral',
    category: 'general',
    weight: 1.0,
    description: 'Direct feedback intent',
  },
  {
    pattern: /\b(i\s+)?have\s+(some\s+)?feedback\b/i,
    sentiment: 'neutral',
    category: 'general',
    weight: 1.0,
    description: 'Has feedback to share',
  },
  {
    pattern: /\b(let\s+me|i('d|\s+would)\s+like\s+to)\s+(give|leave|share)\s+(some\s+)?feedback\b/i,
    sentiment: 'neutral',
    category: 'general',
    weight: 1.0,
    description: 'Polite feedback intent',
  },
  {
    pattern: /\bhere('s|\s+is)\s+(my|some)\s+feedback\b/i,
    sentiment: 'neutral',
    category: 'general',
    weight: 1.0,
    description: 'Presenting feedback',
  },
  {
    pattern: /\bfeedback\s*:/i,
    sentiment: 'neutral',
    category: 'general',
    weight: 0.9,
    description: 'Feedback label',
  },
];

/**
 * Positive sentiment patterns
 */
export const POSITIVE_FEEDBACK_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\bthat\s+(was|is)\s+(really\s+)?(helpful|great|perfect|excellent|awesome|amazing|fantastic)\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.9,
    description: 'Positive response feedback',
  },
  {
    pattern: /\b(this|that)\s+(really\s+)?help(s|ed)\s*(me)?\s*(a\s+lot|so\s+much)?\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.85,
    description: 'Helpful acknowledgment',
  },
  {
    pattern: /\bthank(s|\s+you)\s*(so\s+much|a\s+lot)?\s*[!.]*\s*(that|this)?\s*(was|is)?\s*(great|helpful|perfect)?\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.7,
    description: 'Grateful response',
  },
  {
    pattern: /\b(exactly|precisely)\s+what\s+i\s+(needed|wanted|was\s+looking\s+for)\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.9,
    description: 'Exact match praise',
  },
  {
    pattern: /\b(love|loving)\s+(this|it|the\s+\w+)\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.85,
    description: 'Love expression',
  },
  {
    pattern: /\b(you('re|\s+are)|this\s+is)\s+(so\s+)?(good|helpful|useful|smart)\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.8,
    description: 'Direct praise',
  },
  {
    pattern: /\bnice\s+(job|work|one)\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.85,
    description: 'Compliment',
  },
  {
    pattern: /\bwell\s+done\b/i,
    sentiment: 'positive',
    category: 'praise',
    weight: 0.85,
    description: 'Well done compliment',
  },
];

/**
 * Negative sentiment patterns
 */
export const NEGATIVE_FEEDBACK_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\bthat\s+(was|is)(n't|\s+not)\s+(right|correct|helpful|what\s+i\s+(asked|wanted|meant))\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.9,
    description: 'Incorrect response feedback',
  },
  {
    pattern: /\b(this|that)\s+(isn't|is\s+not|doesn't|does\s+not)\s+(work|help)(ing)?\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.9,
    description: 'Not working feedback',
  },
  {
    pattern: /\b(this|that|it)\s+(is|was)\s+(wrong|incorrect|broken|bad)\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.85,
    description: 'Wrong/broken feedback',
  },
  {
    pattern: /\bi('m|\s+am)\s+(not\s+)?(happy|satisfied|pleased)\s+with\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.85,
    description: 'Dissatisfaction expression',
  },
  {
    pattern: /\b(you\s+)?(got|have)\s+(it|that|this)\s+wrong\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.9,
    description: 'Got it wrong',
  },
  {
    pattern: /\bnot\s+what\s+i\s+(asked|wanted|meant|needed)\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.9,
    description: 'Mismatch feedback',
  },
  {
    pattern: /\b(could|should)\s+(be|have\s+been)\s+better\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.7,
    description: 'Could be better',
  },
  {
    pattern: /\b(disappointed|frustrat(ed|ing)|annoy(ed|ing))\b/i,
    sentiment: 'negative',
    category: 'complaint',
    weight: 0.8,
    description: 'Frustration expression',
  },
];

/**
 * Feature request patterns
 */
export const FEATURE_REQUEST_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\b(it\s+)?would\s+be\s+(nice|great|helpful|cool)\s+(if|to)\b/i,
    sentiment: 'neutral',
    category: 'feature_request',
    weight: 0.8,
    description: 'Feature suggestion',
  },
  {
    pattern: /\b(can|could)\s+you\s+(add|include|support|implement)\b/i,
    sentiment: 'neutral',
    category: 'feature_request',
    weight: 0.8,
    description: 'Feature request',
  },
  {
    pattern: /\bi\s+(wish|hope)\s+(you|it|this)\s+(could|would|had)\b/i,
    sentiment: 'neutral',
    category: 'feature_request',
    weight: 0.75,
    description: 'Wishful feature',
  },
  {
    pattern: /\b(please\s+)?(add|implement|include)\s+(a\s+)?feature\b/i,
    sentiment: 'neutral',
    category: 'feature_request',
    weight: 0.9,
    description: 'Direct feature request',
  },
  {
    pattern: /\bfeature\s+request\s*:/i,
    sentiment: 'neutral',
    category: 'feature_request',
    weight: 1.0,
    description: 'Labeled feature request',
  },
];

/**
 * Bug report patterns
 */
export const BUG_REPORT_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\b(there('s|\s+is)|i\s+found)\s+a\s+bug\b/i,
    sentiment: 'negative',
    category: 'bug_report',
    weight: 1.0,
    description: 'Bug report',
  },
  {
    pattern: /\b(something\s+is|this\s+is)\s+(broken|buggy|glitchy)\b/i,
    sentiment: 'negative',
    category: 'bug_report',
    weight: 0.9,
    description: 'Broken report',
  },
  {
    pattern: /\bbug\s*:/i,
    sentiment: 'negative',
    category: 'bug_report',
    weight: 1.0,
    description: 'Bug label',
  },
  {
    pattern: /\b(keeps?\s+)?(crash(es|ing)|freez(es|ing)|hang(s|ing))\b/i,
    sentiment: 'negative',
    category: 'bug_report',
    weight: 0.85,
    description: 'Crash/freeze report',
  },
  {
    pattern: /\b(error|issue|problem)\s+(when|with|in)\b/i,
    sentiment: 'negative',
    category: 'bug_report',
    weight: 0.7,
    description: 'Error description',
  },
];

/**
 * Response-specific feedback patterns
 * Feedback that references the previous response
 */
export const RESPONSE_SPECIFIC_PATTERNS: FeedbackPattern[] = [
  {
    pattern: /\b(that|this|your)\s+(last\s+)?(response|answer|reply)\s+(was|is)\b/i,
    sentiment: 'neutral',
    category: 'response_quality',
    weight: 0.9,
    description: 'Response reference',
  },
  {
    pattern: /\byou\s+just\s+(said|told\s+me|gave\s+me)\b/i,
    sentiment: 'neutral',
    category: 'response_quality',
    weight: 0.8,
    description: 'Recent response reference',
  },
  {
    pattern: /\b(that|the)\s+(above|previous)\s+(response|answer)?\b/i,
    sentiment: 'neutral',
    category: 'response_quality',
    weight: 0.85,
    description: 'Previous response reference',
  },
];

/**
 * Aspect patterns - specific things being commented on
 */
export const ASPECT_PATTERNS: { pattern: RegExp; aspect: string }[] = [
  { pattern: /\b(response\s+)?time\b/i, aspect: 'response_time' },
  { pattern: /\baccuracy\b/i, aspect: 'accuracy' },
  { pattern: /\b(speed|fast|slow)\b/i, aspect: 'speed' },
  { pattern: /\bquality\b/i, aspect: 'quality' },
  { pattern: /\b(tone|attitude)\b/i, aspect: 'tone' },
  { pattern: /\b(clarity|clear|unclear)\b/i, aspect: 'clarity' },
  { pattern: /\b(helpful(ness)?|useful(ness)?)\b/i, aspect: 'helpfulness' },
  { pattern: /\b(detail(s|ed)?|thorough)\b/i, aspect: 'detail' },
  { pattern: /\b(format(ting)?|structure)\b/i, aspect: 'formatting' },
  { pattern: /\b(length|long|short|brief|verbose)\b/i, aspect: 'length' },
];

/**
 * All feedback patterns combined
 */
export const ALL_FEEDBACK_PATTERNS: FeedbackPattern[] = [
  ...EXPLICIT_FEEDBACK_PATTERNS,
  ...POSITIVE_FEEDBACK_PATTERNS,
  ...NEGATIVE_FEEDBACK_PATTERNS,
  ...FEATURE_REQUEST_PATTERNS,
  ...BUG_REPORT_PATTERNS,
  ...RESPONSE_SPECIFIC_PATTERNS,
];

/**
 * Patterns that should NOT trigger feedback detection
 * (Questions, commands, etc.)
 */
export const EXCLUSION_PATTERNS: RegExp[] = [
  /\b(can|could|would)\s+you\s+(please\s+)?(help|tell|show|explain)\b/i, // Questions
  /\b(what|how|why|when|where|who)\s+(is|are|do|does|did|was|were|would|could|should)\b/i, // Questions
  /\?$/, // Ends with question mark
  /\b(please\s+)?(do|make|create|write|generate|build)\b/i, // Commands
];
