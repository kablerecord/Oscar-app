/**
 * Rule Proposal Generator
 *
 * Generates rule proposals from user corrections.
 */

import type {
  InferenceResult,
  RuleProposal,
  CorrectionSignals,
  TemporalClassification,
  GuidanceConfig,
} from '../types';
import { DEFAULT_GUIDANCE_CONFIG } from '../types';
import {
  detectCorrectionSignals,
  calculateCorrectionStrength,
  isOneTimeAdjustment,
} from './detector';
import {
  classifyTemporalScope,
  calculateTemporalConfidence,
  shouldConsiderForProposal,
} from './classifier';

/**
 * Message for analysis
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generate a unique proposal ID
 */
function generateProposalId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze a user message for potential rule inference
 */
export function analyzeForInference(
  userMessage: string,
  oscarPreviousResponse: string,
  conversationHistory: Message[],
  config: Partial<GuidanceConfig> = {}
): InferenceResult {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };

  // Step 1: Detect if this is a correction
  const correctionSignals = detectCorrectionSignals(userMessage);

  if (!correctionSignals.isCorrection) {
    return {
      shouldPropose: false,
      confidence: 0,
      reasoning: 'Not a correction',
    };
  }

  // Step 2: Classify temporal scope
  const temporalClassification = classifyTemporalScope(userMessage);

  // Step 3: Check if it's a one-time adjustment
  if (isOneTimeAdjustment(userMessage)) {
    return {
      shouldPropose: false,
      confidence: 0.2,
      reasoning: 'One-time adjustment, not a lasting preference',
    };
  }

  // Step 4: Check for repetition in history
  const repetitionCount = countSimilarCorrections(
    correctionSignals.correctionType,
    conversationHistory
  );

  // Step 5: Calculate confidence
  let confidence = 0.3; // Base confidence for any correction

  // Boost for explicit permanence language
  if (temporalClassification.explicitAlways) {
    confidence += 0.4;
  }

  // Boost for repetition
  if (repetitionCount >= 2) {
    confidence += 0.2;
  } else if (repetitionCount === 1) {
    confidence += 0.1;
  }

  // Boost for generalizability
  if (temporalClassification.isGeneralizable) {
    confidence += 0.1;
  }

  // Boost for correction strength
  const correctionStrength = calculateCorrectionStrength(userMessage);
  confidence += correctionStrength * 0.15;

  // Cap at 1.0
  confidence = Math.min(1, confidence);

  // Step 6: Generate proposal if threshold met
  if (confidence >= cfg.inferenceThreshold) {
    const proposedRule = generateRuleFromCorrection(
      userMessage,
      correctionSignals,
      oscarPreviousResponse
    );

    return {
      shouldPropose: true,
      proposedRule,
      confidence,
      reasoning: `Correction detected with ${
        temporalClassification.explicitAlways ? 'explicit' : 'implicit'
      } permanence signal${repetitionCount > 0 ? `, repeated ${repetitionCount + 1}x` : ''}`,
    };
  }

  return {
    shouldPropose: false,
    confidence,
    reasoning: `Confidence ${confidence.toFixed(2)} below threshold ${cfg.inferenceThreshold}`,
  };
}

/**
 * Count similar corrections in conversation history
 */
export function countSimilarCorrections(
  correctionType: string,
  history: Message[]
): number {
  let count = 0;

  for (const message of history) {
    if (message.role !== 'user') continue;

    const signals = detectCorrectionSignals(message.content);
    if (signals.isCorrection && signals.correctionType === correctionType) {
      count++;
    }
  }

  return count;
}

/**
 * Generate a rule from a correction
 */
export function generateRuleFromCorrection(
  userMessage: string,
  signals: CorrectionSignals,
  previousResponse?: string
): string {
  const { desiredBehavior, originalBehavior, correctionType } = signals;

  // If we have both behaviors, format as a preference
  if (desiredBehavior && originalBehavior) {
    return `${capitalizeFirst(desiredBehavior)} instead of ${originalBehavior}`;
  }

  // If we just have desired behavior
  if (desiredBehavior) {
    return capitalizeFirst(cleanupBehavior(desiredBehavior));
  }

  // If we just have original behavior (don't do X)
  if (originalBehavior) {
    return `Avoid ${originalBehavior}`;
  }

  // Fallback: Try to extract the key instruction
  const instruction = extractInstruction(userMessage);
  if (instruction) {
    return instruction;
  }

  // Last resort: Use the correction type to frame it
  return frameByType(userMessage, correctionType);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Clean up extracted behavior text
 */
function cleanupBehavior(behavior: string): string {
  // Remove trailing punctuation
  let cleaned = behavior.replace(/[.,!?]+$/, '');

  // Remove leading articles
  cleaned = cleaned.replace(/^(a|an|the|to)\s+/i, '');

  return cleaned.trim();
}

/**
 * Extract instruction from message
 */
function extractInstruction(message: string): string | null {
  // Pattern: "I want you to X"
  let match = message.match(/I\s+want\s+(?:you\s+to\s+)?(.+?)(?:\.|,|$)/i);
  if (match) {
    return capitalizeFirst(cleanupBehavior(match[1]));
  }

  // Pattern: "Please X"
  match = message.match(/please\s+(.+?)(?:\.|,|$)/i);
  if (match) {
    return capitalizeFirst(cleanupBehavior(match[1]));
  }

  // Pattern: "Always X"
  match = message.match(/always\s+(.+?)(?:\.|,|$)/i);
  if (match) {
    return `Always ${cleanupBehavior(match[1])}`;
  }

  // Pattern: "Never X"
  match = message.match(/never\s+(.+?)(?:\.|,|$)/i);
  if (match) {
    return `Never ${cleanupBehavior(match[1])}`;
  }

  return null;
}

/**
 * Frame rule by correction type
 */
function frameByType(message: string, correctionType: string): string {
  // Extract core content, removing common prefixes
  let core = message
    .replace(/^(no,?\s*|I\s+(don't|didn't)\s+(want|like|need)\s*)/i, '')
    .replace(/^(please|stop|don't)\s*/i, '')
    .trim();

  switch (correctionType) {
    case 'formatting':
      return `When formatting output: ${core}`;
    case 'interaction_style':
      return `When interacting: ${core}`;
    case 'code_output':
      return `When generating code: ${core}`;
    case 'tone':
      return `Regarding tone: ${core}`;
    default:
      return core.length > 100 ? core.substring(0, 100) + '...' : core;
  }
}

/**
 * Create a full RuleProposal from inference result
 */
export function createProposal(
  inferenceResult: InferenceResult,
  originalMessage: string,
  sessionId: string
): RuleProposal | null {
  if (!inferenceResult.shouldPropose || !inferenceResult.proposedRule) {
    return null;
  }

  return {
    id: generateProposalId(),
    proposedRule: inferenceResult.proposedRule,
    originalCorrection: originalMessage,
    sessionId,
    confidence: inferenceResult.confidence,
    status: 'pending',
    timestamp: new Date(),
  };
}

/**
 * Refine a proposed rule based on user edit
 */
export function refineProposal(
  proposal: RuleProposal,
  editedRule: string
): RuleProposal {
  return {
    ...proposal,
    proposedRule: editedRule,
    status: 'edited',
  };
}

/**
 * Accept a proposal
 */
export function acceptProposal(proposal: RuleProposal): RuleProposal {
  return {
    ...proposal,
    status: 'accepted',
  };
}

/**
 * Dismiss a proposal
 */
export function dismissProposal(proposal: RuleProposal): RuleProposal {
  return {
    ...proposal,
    status: 'dismissed',
  };
}

/**
 * Check if a proposal should be shown (meets confidence threshold)
 */
export function shouldShowProposal(
  proposal: RuleProposal,
  config: Partial<GuidanceConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_GUIDANCE_CONFIG, ...config };
  return proposal.confidence >= cfg.inferenceThreshold;
}

/**
 * Get proposal explanation for UI
 */
export function getProposalExplanation(proposal: RuleProposal): string {
  const confidencePercent = Math.round(proposal.confidence * 100);

  if (proposal.confidence >= 0.9) {
    return `Very confident (${confidencePercent}%) this should be a permanent rule.`;
  }

  if (proposal.confidence >= 0.8) {
    return `Confident (${confidencePercent}%) this is a lasting preference.`;
  }

  return `This seems like a preference you'd like to keep (${confidencePercent}% confidence).`;
}
