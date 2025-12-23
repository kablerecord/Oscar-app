/**
 * Tests for Inference Engine
 */

import { describe, it, expect } from 'vitest';
import {
  detectCorrectionSignals,
  classifyCorrectionType,
  extractBehaviors,
  calculateCorrectionStrength,
  isOneTimeAdjustment,
  getCorrectionIndicators,
} from '../inference/detector';
import {
  classifyTemporalScope,
  calculateTemporalConfidence,
  shouldConsiderForProposal,
  getTemporalIndicators,
  hasConflictingSignals,
  resolveConflictingSignals,
} from '../inference/classifier';
import {
  analyzeForInference,
  countSimilarCorrections,
  generateRuleFromCorrection,
  createProposal,
  refineProposal,
  acceptProposal,
  dismissProposal,
  shouldShowProposal,
  getProposalExplanation,
} from '../inference/proposer';

describe('Correction Detector', () => {
  describe('detectCorrectionSignals', () => {
    it('should detect correction patterns', () => {
      const signals = detectCorrectionSignals("No, I want you to ask first");
      expect(signals.isCorrection).toBe(true);
    });

    it('should not detect non-corrections', () => {
      const signals = detectCorrectionSignals("Can you help me with this?");
      expect(signals.isCorrection).toBe(false);
    });

    it('should detect various correction patterns', () => {
      const patterns = [
        "Don't do that",
        "Instead of snippets, use full files",
        "That's not what I meant",
        "Please stop using bullet points",
        "I said markdown format",
        "You should have asked first",
      ];

      for (const pattern of patterns) {
        expect(detectCorrectionSignals(pattern).isCorrection).toBe(true);
      }
    });
  });

  describe('classifyCorrectionType', () => {
    it('should classify formatting corrections', () => {
      expect(classifyCorrectionType("Use proper formatting")).toBe('formatting');
      expect(classifyCorrectionType("The structure is wrong")).toBe('formatting');
    });

    it('should classify interaction style corrections', () => {
      expect(classifyCorrectionType("Ask me first")).toBe('interaction_style');
      expect(classifyCorrectionType("Clarify before acting")).toBe('interaction_style');
    });

    it('should classify code corrections', () => {
      expect(classifyCorrectionType("The function is wrong")).toBe('code_output');
      expect(classifyCorrectionType("Fix the code snippet")).toBe('code_output');
    });

    it('should classify tone corrections', () => {
      expect(classifyCorrectionType("Be more formal")).toBe('tone');
      expect(classifyCorrectionType("Sound more professional")).toBe('tone');
    });

    it('should default to general', () => {
      expect(classifyCorrectionType("Do it differently")).toBe('general');
    });
  });

  describe('extractBehaviors', () => {
    it('should extract both behaviors from contrast', () => {
      const result = extractBehaviors("Don't use snippets, use full files instead");
      expect(result.originalBehavior).toContain('snippets');
      expect(result.desiredBehavior).toContain('files');
    });

    it('should extract desired behavior from preference', () => {
      const result = extractBehaviors("I want complete file outputs");
      expect(result.desiredBehavior).toBeDefined();
    });

    it('should extract original behavior from prohibition', () => {
      const result = extractBehaviors("Don't use abbreviations");
      expect(result.originalBehavior).toContain('abbreviations');
    });
  });

  describe('calculateCorrectionStrength', () => {
    it('should give higher strength to emphatic corrections', () => {
      const mild = calculateCorrectionStrength("No, do it differently");
      const strong = calculateCorrectionStrength("Never do that! I hate it! Stop!");

      expect(strong).toBeGreaterThan(mild);
    });

    it('should detect strong language', () => {
      // "Never" and "wrong" together boost the strength
      const strength = calculateCorrectionStrength("Never do it wrong like that");
      expect(strength).toBeGreaterThan(0.3);
    });
  });

  describe('isOneTimeAdjustment', () => {
    it('should detect one-time language', () => {
      expect(isOneTimeAdjustment("Just this time")).toBe(true);
      expect(isOneTimeAdjustment("For now, do it this way")).toBe(true);
      expect(isOneTimeAdjustment("Only for this case")).toBe(true);
    });

    it('should not flag permanent language', () => {
      expect(isOneTimeAdjustment("Always do it this way")).toBe(false);
      expect(isOneTimeAdjustment("From now on, use markdown")).toBe(false);
    });
  });

  describe('getCorrectionIndicators', () => {
    it('should return all matching indicators', () => {
      const indicators = getCorrectionIndicators("No, don't do that. I said use markdown.");
      expect(indicators.length).toBeGreaterThan(1);
    });
  });
});

describe('Temporal Classifier', () => {
  describe('classifyTemporalScope', () => {
    it('should detect explicit always patterns', () => {
      const result = classifyTemporalScope("Always format code this way");
      expect(result.explicitAlways).toBe(true);
      expect(result.explicitNow).toBe(false);
    });

    it('should detect explicit now patterns', () => {
      const result = classifyTemporalScope("Just this time, use bullet points");
      expect(result.explicitNow).toBe(true);
      expect(result.explicitAlways).toBe(false);
    });

    it('should detect generalizability', () => {
      const generalizable = classifyTemporalScope("Use full files instead of snippets");
      expect(generalizable.isGeneralizable).toBe(true);

      const specific = classifyTemporalScope("Fix line 42 in this file");
      expect(specific.isGeneralizable).toBe(false);
    });

    it('should detect various always patterns', () => {
      const patterns = [
        "From now on",
        "In this project",
        "Every time",
        "Going forward",
        "Remember to",
      ];

      for (const pattern of patterns) {
        expect(classifyTemporalScope(pattern).explicitAlways).toBe(true);
      }
    });
  });

  describe('calculateTemporalConfidence', () => {
    it('should give high confidence to always patterns', () => {
      const confidence = calculateTemporalConfidence("Always ask before debugging");
      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should give low confidence to now patterns', () => {
      const confidence = calculateTemporalConfidence("Just this time, skip the tests");
      expect(confidence).toBeLessThan(0.3);
    });

    it('should give neutral confidence to ambiguous patterns', () => {
      const confidence = calculateTemporalConfidence("Do it differently");
      expect(confidence).toBeGreaterThanOrEqual(0.3);
      expect(confidence).toBeLessThanOrEqual(0.7);
    });
  });

  describe('shouldConsiderForProposal', () => {
    it('should recommend proposal for explicit always', () => {
      const result = shouldConsiderForProposal("Always use markdown");
      expect(result.should).toBe(true);
    });

    it('should not recommend for explicit now', () => {
      const result = shouldConsiderForProposal("Just this once, use HTML");
      expect(result.should).toBe(false);
    });

    it('should not recommend for specific references', () => {
      const result = shouldConsiderForProposal("Fix this specific function");
      expect(result.should).toBe(false);
    });
  });

  describe('hasConflictingSignals', () => {
    it('should detect conflicts', () => {
      expect(hasConflictingSignals("Always just this time")).toBe(true);
    });

    it('should not detect conflicts when none exist', () => {
      expect(hasConflictingSignals("Always use markdown")).toBe(false);
      expect(hasConflictingSignals("Just this time")).toBe(false);
    });
  });

  describe('resolveConflictingSignals', () => {
    it('should resolve based on indicator count', () => {
      const alwaysHeavy = resolveConflictingSignals(
        "Always, from now on, going forward, just this time"
      );
      expect(alwaysHeavy).toBe('always');

      const nowHeavy = resolveConflictingSignals(
        "Just this time, for now, only now, always"
      );
      expect(nowHeavy).toBe('now');
    });
  });
});

describe('Rule Proposer', () => {
  const createMessage = (content: string) => ({
    role: 'user' as const,
    content,
  });

  describe('analyzeForInference', () => {
    it('should not propose for non-corrections', () => {
      const result = analyzeForInference(
        "Can you help me with this?",
        "Previous response",
        []
      );
      expect(result.shouldPropose).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should propose for explicit always corrections', () => {
      // Use a phrase that triggers correction detection AND always pattern
      const result = analyzeForInference(
        "No, don't do that. From now on, always ask before making changes",
        "I made some changes",
        []
      );
      expect(result.shouldPropose).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should not propose for one-time adjustments', () => {
      const result = analyzeForInference(
        "Just this time, skip the tests",
        "Running tests...",
        []
      );
      expect(result.shouldPropose).toBe(false);
    });

    it('should boost confidence for repeated corrections', () => {
      // History with formatting-type corrections
      const history = [
        createMessage("No, don't use snippets. Format it differently."),
        createMessage("I said no snippets. Fix the format."),
      ];

      // Current message is also a formatting correction
      const result = analyzeForInference(
        "No, don't use snippets. Use full files. Structure it properly.",
        "Here's a snippet...",
        history
      );

      // Should have confidence from correction + repetition boost
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('countSimilarCorrections', () => {
    it('should count corrections of same type', () => {
      // These messages must be detected as corrections AND as formatting type
      // "don't do" triggers correction detection, "format/style/structure" triggers formatting type
      const history = [
        createMessage("No, don't do it that way. Use proper formatting style."),
        createMessage("Wrong! Don't do that. The structure layout is all wrong."),
        createMessage("Can you help with this code?"), // Not a correction
      ];

      // Both formatting messages contain correction patterns + formatting keywords
      const count = countSimilarCorrections('formatting', history);
      expect(count).toBe(2);
    });

    it('should ignore non-corrections', () => {
      const history = [
        createMessage("Can you help?"),
        createMessage("Thanks!"),
      ];

      const count = countSimilarCorrections('formatting', history);
      expect(count).toBe(0);
    });
  });

  describe('generateRuleFromCorrection', () => {
    it('should generate rule from behaviors', () => {
      const signals = {
        isCorrection: true,
        correctionType: 'code_output' as const,
        desiredBehavior: 'full files',
        originalBehavior: 'snippets',
      };

      const rule = generateRuleFromCorrection("", signals);
      // Case-insensitive check since first letter gets capitalized
      expect(rule.toLowerCase()).toContain('full files');
    });

    it('should generate rule from desired behavior only', () => {
      const signals = {
        isCorrection: true,
        correctionType: 'interaction_style' as const,
        desiredBehavior: 'ask before acting',
      };

      const rule = generateRuleFromCorrection("", signals);
      expect(rule.toLowerCase()).toContain('ask');
    });

    it('should generate avoidance rule from original behavior', () => {
      const signals = {
        isCorrection: true,
        correctionType: 'formatting' as const,
        originalBehavior: 'bullet points',
      };

      const rule = generateRuleFromCorrection("", signals);
      expect(rule).toContain('Avoid');
    });
  });

  describe('Proposal Lifecycle', () => {
    it('should create proposal from inference result', () => {
      const inferenceResult = {
        shouldPropose: true,
        proposedRule: 'Ask before making changes',
        confidence: 0.85,
        reasoning: 'Test',
      };

      const proposal = createProposal(
        inferenceResult,
        "Always ask first",
        'session-123'
      );

      expect(proposal).not.toBeNull();
      expect(proposal?.proposedRule).toBe('Ask before making changes');
      expect(proposal?.status).toBe('pending');
    });

    it('should return null for non-proposals', () => {
      const inferenceResult = {
        shouldPropose: false,
        confidence: 0.3,
        reasoning: 'Not a correction',
      };

      const proposal = createProposal(inferenceResult, "test", 'session');
      expect(proposal).toBeNull();
    });

    it('should refine proposal', () => {
      const original = {
        id: 'prop-1',
        proposedRule: 'Original rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.8,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      const refined = refineProposal(original, 'Edited rule');
      expect(refined.proposedRule).toBe('Edited rule');
      expect(refined.status).toBe('edited');
    });

    it('should accept proposal', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.8,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      const accepted = acceptProposal(proposal);
      expect(accepted.status).toBe('accepted');
    });

    it('should dismiss proposal', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.8,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      const dismissed = dismissProposal(proposal);
      expect(dismissed.status).toBe('dismissed');
    });
  });

  describe('shouldShowProposal', () => {
    it('should show high-confidence proposals', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.85,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      expect(shouldShowProposal(proposal)).toBe(true);
    });

    it('should not show low-confidence proposals', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.5,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      expect(shouldShowProposal(proposal)).toBe(false);
    });
  });

  describe('getProposalExplanation', () => {
    it('should explain high confidence', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.95,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      const explanation = getProposalExplanation(proposal);
      expect(explanation).toContain('Very confident');
    });

    it('should explain medium confidence', () => {
      const proposal = {
        id: 'prop-1',
        proposedRule: 'Rule',
        originalCorrection: 'Correction',
        sessionId: 'session-1',
        confidence: 0.75,
        status: 'pending' as const,
        timestamp: new Date(),
      };

      const explanation = getProposalExplanation(proposal);
      expect(explanation).toContain('preference');
    });
  });
});
