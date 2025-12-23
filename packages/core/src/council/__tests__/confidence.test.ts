/**
 * Council Mode Confidence Normalization Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHedgingScore,
  assessReasoningDepth,
  countSourceCitations,
  assessResponseCompleteness,
  assessInternalConsistency,
  analyzeConfidenceFactors,
  normalizeConfidence,
  buildModelConfidence,
  formatConfidenceBreakdown,
} from '../synthesis/confidence';

describe('Hedging Language Detection', () => {
  it('detects high hedging', () => {
    const hedgingText = "I'm not sure, but perhaps maybe it might possibly be true. " +
      "It seems like it could potentially work, though I'm uncertain about the details.";
    const score = calculateHedgingScore(hedgingText);
    expect(score).toBeLessThan(50);
  });

  it('detects low hedging (confident)', () => {
    const confidentText = "The answer is definitely X. This is well-established and proven. " +
      "The data clearly shows Y. There is no doubt that Z is correct.";
    const score = calculateHedgingScore(confidentText);
    expect(score).toBeGreaterThan(70);
  });

  it('handles empty text', () => {
    const score = calculateHedgingScore('');
    expect(score).toBe(100);
  });

  it('handles text without hedging words', () => {
    const neutralText = "The function returns a number. It takes two parameters.";
    const score = calculateHedgingScore(neutralText);
    expect(score).toBe(100);
  });
});

describe('Reasoning Depth Assessment', () => {
  it('assesses deep reasoning', () => {
    const deepReasoning = `First, let's consider the underlying principles.
      Because of this fundamental constraint, we can therefore conclude that X follows.
      For example, consider case A.
      However, on the other hand we should also consider B.`;
    const depth = assessReasoningDepth(deepReasoning);
    expect(depth).toBeGreaterThanOrEqual(2);
    expect(depth).toBeLessThanOrEqual(5);
  });

  it('assesses shallow reasoning', () => {
    const shallow = "Yes. It works.";
    const depth = assessReasoningDepth(shallow);
    expect(depth).toBeLessThanOrEqual(2);
  });

  it('returns a score between 1 and 5', () => {
    const response = "First do this. Because of that, therefore the result is X.";
    const depth = assessReasoningDepth(response);
    expect(depth).toBeGreaterThanOrEqual(1);
    expect(depth).toBeLessThanOrEqual(5);
  });
});

describe('Source Citation Counting', () => {
  it('counts URLs', () => {
    const text = "According to https://example.com and http://test.org, the answer is X.";
    const count = countSourceCitations(text);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('counts citation patterns', () => {
    const text = "According to research, there are multiple studies showing this.";
    const count = countSourceCitations(text);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('counts source mentions', () => {
    const text = "The source shows that research confirms this study.";
    const count = countSourceCitations(text);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('returns count for no explicit citations', () => {
    const text = "This is just my opinion without any references.";
    const count = countSourceCitations(text);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('Response Completeness', () => {
  it('assesses reasonably complete responses', () => {
    const complete = `Here is the overview of the topic. This is an important subject
      that requires careful consideration. In summary, the answer is Z because of
      reasons A, B, and C. I recommend considering these factors carefully.`;
    const score = assessResponseCompleteness(complete);
    expect(score).toBeGreaterThan(50);
  });

  it('penalizes very short responses', () => {
    const incomplete = "Here's the start...";
    const score = assessResponseCompleteness(incomplete);
    expect(score).toBeLessThan(50);
  });

  it('gives reasonable score to medium responses', () => {
    const medium = "The answer is yes. It is correct. The reason is important.";
    const score = assessResponseCompleteness(medium);
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Internal Consistency', () => {
  it('rewards consistent responses', () => {
    const consistent = "The answer is X. This is because of factor A. " +
      "This aligns with our understanding of B. Therefore X is correct.";
    const score = assessInternalConsistency(consistent);
    expect(score).toBeGreaterThan(80);
  });

  it('starts with high consistency for simple responses', () => {
    const simple = "The answer is 42.";
    const score = assessInternalConsistency(simple);
    expect(score).toBe(100);
  });
});

describe('Confidence Factor Analysis', () => {
  it('analyzes all factors', () => {
    const response = "Perhaps the answer is X. See: Smith 2023. " +
      "Because of A, therefore B follows.";
    const factors = analyzeConfidenceFactors(response);

    expect(factors).toHaveProperty('reasoningDepth');
    expect(factors).toHaveProperty('hedgingLanguage');
    expect(factors).toHaveProperty('sourceCitations');
    expect(factors).toHaveProperty('responseCompleteness');
    expect(factors).toHaveProperty('internalConsistency');

    expect(factors.reasoningDepth).toBeGreaterThanOrEqual(1);
    expect(factors.reasoningDepth).toBeLessThanOrEqual(5);
    expect(factors.hedgingLanguage).toBeGreaterThanOrEqual(0);
    expect(factors.hedgingLanguage).toBeLessThanOrEqual(100);
  });
});

describe('Confidence Normalization', () => {
  it('normalizes response to 0-100 score', () => {
    const response = "The answer is X because of Y. According to research, this is proven.";
    const score = normalizeConfidence(response);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('accepts pre-analyzed factors', () => {
    const factors = {
      reasoningDepth: 4,
      hedgingLanguage: 80,
      sourceCitations: 3,
      responseCompleteness: 85,
      internalConsistency: 90,
    };

    const score = normalizeConfidence("test", factors);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles low confidence factors', () => {
    const response = "Maybe? Perhaps? I'm not sure.";
    const score = normalizeConfidence(response);
    expect(score).toBeLessThan(70);
  });
});

describe('Model Confidence Building', () => {
  it('builds complete confidence object', () => {
    const response = "The answer is X because of Y.";
    const confidence = buildModelConfidence(response);

    expect(confidence).toHaveProperty('rawScore', null);
    expect(confidence).toHaveProperty('normalizedScore');
    expect(confidence).toHaveProperty('reasoningDepth');

    expect(confidence.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(confidence.normalizedScore).toBeLessThanOrEqual(100);
    expect(confidence.reasoningDepth).toBeGreaterThanOrEqual(1);
    expect(confidence.reasoningDepth).toBeLessThanOrEqual(5);
  });
});

describe('Confidence Breakdown Formatting', () => {
  it('formats breakdown string', () => {
    const response = "First, do X. Therefore, Y follows. In summary, Z is the answer.";
    const formatted = formatConfidenceBreakdown(response);

    expect(formatted).toContain('Confidence');
    expect(formatted).toContain('Reasoning Depth');
    expect(formatted).toContain('/5');
    expect(formatted).toContain('Hedging');
    expect(formatted).toContain('/100');
    expect(formatted).toContain('Citations');
  });
});
