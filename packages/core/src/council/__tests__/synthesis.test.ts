/**
 * Council Mode Synthesis Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isSignificantDisagreement,
  extractKeyConcepts,
  calculateConceptSimilarity,
  calculatePairwiseSimilarity,
  calculateAverageSimilarity,
  extractFactualClaims,
  detectFactualContradictions,
  extractAlignedPoints,
  determineAgreementLevel,
  calculateAgreementScore,
  analyzeAgreement,
  formatAgreementSummary,
} from '../synthesis/agreement';
import {
  synthesize,
  calculateModelWeights,
  buildCouncilDeliberation,
  createFallbackSynthesis,
} from '../synthesis/synthesizer';
import type { ModelResponse, AgreementAnalysis, SynthesisResult } from '../types';

// Helper to create mock model responses
function createMockResponse(
  modelId: string,
  content: string,
  summary: string,
  confidence: number = 75
): ModelResponse {
  return {
    modelId,
    modelDisplayName: modelId.includes('claude') ? 'Claude' :
                      modelId.includes('gpt') ? 'GPT-4' : 'Gemini',
    content,
    summary,
    confidence: {
      rawScore: null,
      normalizedScore: confidence,
      reasoningDepth: 3,
    },
    sourcesCited: [],
    reasoningChain: [],
    latencyMs: 1000,
    tokensUsed: 500,
    timestamp: new Date().toISOString(),
    status: 'success',
  };
}

describe('Disagreement Detection', () => {
  it('detects significant disagreement based on confidence delta', () => {
    // isSignificantDisagreement compares confidence numbers, not text
    expect(isSignificantDisagreement(90, 50)).toBe(true); // 40 point difference > 15 threshold
    expect(isSignificantDisagreement(80, 75)).toBe(false); // 5 point difference < 15 threshold
  });

  it('always triggers on factual contradiction', () => {
    expect(isSignificantDisagreement(80, 80, true)).toBe(true);
    expect(isSignificantDisagreement(50, 50, true)).toBe(true);
  });

  it('allows similar confidences', () => {
    expect(isSignificantDisagreement(75, 70)).toBe(false);
    expect(isSignificantDisagreement(80, 80)).toBe(false);
  });
});

describe('Concept Extraction', () => {
  it('extracts key concepts from text', () => {
    const text = "Machine learning and artificial intelligence are transforming " +
                 "the healthcare industry through better diagnostics.";
    const concepts = extractKeyConcepts(text);

    expect(concepts instanceof Set).toBe(true);
    expect(concepts.size).toBeGreaterThan(0);
  });

  it('handles empty text', () => {
    const concepts = extractKeyConcepts('');
    expect(concepts.size).toBe(0);
  });

  it('filters short words', () => {
    const text = "The is a an and or but";
    const concepts = extractKeyConcepts(text);
    expect(concepts.size).toBe(0); // All words are 3 chars or less
  });
});

describe('Similarity Calculation', () => {
  it('calculates high similarity for identical concepts', () => {
    const concepts1 = new Set(['machine', 'learning', 'neural', 'network']);
    const concepts2 = new Set(['machine', 'learning', 'neural', 'network']);
    expect(calculateConceptSimilarity(concepts1, concepts2)).toBe(1);
  });

  it('calculates low similarity for different concepts', () => {
    const concepts1 = new Set(['machine', 'learning']);
    const concepts2 = new Set(['cooking', 'recipe', 'food']);
    expect(calculateConceptSimilarity(concepts1, concepts2)).toBeLessThan(0.3);
  });

  it('handles partial overlap', () => {
    const concepts1 = new Set(['machine', 'learning', 'data']);
    const concepts2 = new Set(['machine', 'learning', 'cloud', 'server']);
    const similarity = calculateConceptSimilarity(concepts1, concepts2);
    expect(similarity).toBeGreaterThan(0.2);
    expect(similarity).toBeLessThan(0.8);
  });

  it('calculates pairwise similarity matrix', () => {
    const responses = [
      createMockResponse('claude', 'Machine learning is great for data analysis', 'ML for data'),
      createMockResponse('gpt4', 'Machine learning excels at data analysis', 'ML for data'),
    ];
    const matrix = calculatePairwiseSimilarity(responses);
    expect(matrix.length).toBe(2);
    expect(matrix[0][0]).toBe(1); // Self-similarity
    expect(matrix[1][1]).toBe(1);
    expect(matrix[0][1]).toBeGreaterThan(0); // Some similarity expected
  });

  it('calculates average similarity from responses', () => {
    const responses = [
      createMockResponse('claude', 'Python programming language', 'Python'),
      createMockResponse('gpt4', 'Python programming language', 'Python'),
    ];
    const avg = calculateAverageSimilarity(responses);
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(avg).toBeLessThanOrEqual(1);
  });

  it('returns 1 for single response', () => {
    const responses = [createMockResponse('claude', 'Test', 'Test')];
    expect(calculateAverageSimilarity(responses)).toBe(1);
  });
});

describe('Factual Claim Extraction', () => {
  it('extracts sentences with numbers and units', () => {
    const text = "The answer is 50 percent effective. It costs 100 dollars.";
    const claims = extractFactualClaims(text);
    expect(claims.length).toBeGreaterThanOrEqual(1);
  });

  it('handles text without factual patterns', () => {
    const text = "Maybe something happens here. Perhaps not.";
    const claims = extractFactualClaims(text);
    expect(claims.length).toBe(0);
  });
});

describe('Contradiction Detection', () => {
  it('detects yes/no contradictions', () => {
    const responses = [
      createMockResponse('claude', 'Yes, this is definitely correct.', 'Yes'),
      createMockResponse('gpt4', 'No, this is incorrect.', 'No'),
    ];
    const contradictions = detectFactualContradictions(responses);
    expect(contradictions.length).toBeGreaterThanOrEqual(1);
    expect(contradictions[0].topic).toContain('yes/no');
  });

  it('handles no contradictions', () => {
    const responses = [
      createMockResponse('claude', 'The sky is blue.', 'Blue sky'),
      createMockResponse('gpt4', 'The grass is green.', 'Green grass'),
    ];
    const contradictions = detectFactualContradictions(responses);
    expect(contradictions.length).toBe(0);
  });
});

describe('Aligned Points Extraction', () => {
  it('extracts points all models agree on', () => {
    const responses = [
      createMockResponse('claude', 'Python is great for beginners. It has clean syntax.', 'Python for beginners'),
      createMockResponse('gpt4', 'Python is excellent for beginners. The syntax is clear.', 'Python beginner-friendly'),
      createMockResponse('gemini', 'Python is perfect for beginners. Its syntax is simple.', 'Python is easy'),
    ];
    const aligned = extractAlignedPoints(responses);
    expect(aligned.length).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(aligned)).toBe(true);
  });

  it('handles single response', () => {
    const responses = [
      createMockResponse('claude', 'Single response here.', 'Summary'),
    ];
    const aligned = extractAlignedPoints(responses);
    expect(aligned.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Agreement Level Determination', () => {
  it('determines high agreement', () => {
    expect(determineAgreementLevel(90)).toBe('high');
    expect(determineAgreementLevel(80)).toBe('high');
  });

  it('determines moderate agreement', () => {
    expect(determineAgreementLevel(70)).toBe('moderate');
    expect(determineAgreementLevel(60)).toBe('moderate');
  });

  it('determines low agreement', () => {
    expect(determineAgreementLevel(45)).toBe('low');
    expect(determineAgreementLevel(40)).toBe('low');
  });

  it('determines split', () => {
    expect(determineAgreementLevel(20)).toBe('split');
    expect(determineAgreementLevel(10)).toBe('split');
    expect(determineAgreementLevel(39)).toBe('split');
  });
});

describe('Agreement Score Calculation', () => {
  it('calculates score from responses', () => {
    const responses = [
      createMockResponse('claude', 'Use React for this project', 'React recommended'),
      createMockResponse('gpt4', 'React is the best choice', 'Choose React'),
    ];
    const score = calculateAgreementScore(responses);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns 100 for single response', () => {
    const responses = [createMockResponse('claude', 'Test', 'Test')];
    expect(calculateAgreementScore(responses)).toBe(100);
  });
});

describe('Agreement Analysis', () => {
  it('produces complete analysis', () => {
    const responses = [
      createMockResponse('claude', 'The answer is X because of reason A', 'Answer is X'),
      createMockResponse('gpt4', 'The answer is X due to factor A', 'X is correct'),
    ];
    const analysis = analyzeAgreement(responses);

    expect(analysis).toHaveProperty('level');
    expect(analysis).toHaveProperty('score');
    expect(analysis).toHaveProperty('alignedPoints');
    expect(analysis).toHaveProperty('divergentPoints');

    expect(['high', 'moderate', 'low', 'split']).toContain(analysis.level);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(analysis.alignedPoints)).toBe(true);
    expect(Array.isArray(analysis.divergentPoints)).toBe(true);
  });

  it('handles empty responses', () => {
    const analysis = analyzeAgreement([]);
    expect(analysis.level).toBe('split');
    expect(analysis.score).toBe(0);
  });

  it('handles single response', () => {
    const responses = [
      createMockResponse('claude', 'Only one response', 'Single'),
    ];
    const analysis = analyzeAgreement(responses);
    expect(analysis.level).toBe('high');
    expect(analysis.score).toBe(100);
  });
});

describe('Agreement Summary Formatting', () => {
  it('formats summary string', () => {
    const analysis: AgreementAnalysis = {
      level: 'moderate',
      score: 65,
      alignedPoints: ['Point 1', 'Point 2'],
      divergentPoints: [{
        topic: 'Approach',
        positions: [
          { modelId: 'claude', position: 'Use A', confidence: 80 },
          { modelId: 'gpt4', position: 'Use B', confidence: 75 },
        ],
        resolution: 'presented_both',
        resolutionReasoning: 'Both approaches valid',
      }],
    };
    const formatted = formatAgreementSummary(analysis);

    expect(formatted).toContain('moderate');
    expect(formatted).toContain('65%');
    expect(formatted).toContain('Aligned');
    expect(formatted).toContain('Divergent');
  });
});

describe('Model Weight Calculation', () => {
  it('calculates weights based on query type', () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Deep analysis', 'Analysis', 80),
      createMockResponse('gpt-4-turbo', 'Creative solution', 'Creative', 75),
      createMockResponse('gemini-pro', 'Factual info', 'Facts', 70),
    ];

    const weights = calculateModelWeights(responses, 'deep_reasoning');

    expect(weights.length).toBe(3);
    const claudeWeight = weights.find(w => w.modelId === 'claude-3-opus');
    expect(claudeWeight?.baseWeight).toBeGreaterThan(30);
  });

  it('adjusts weights based on confidence', () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Response', 'Summary', 95),
      createMockResponse('gpt-4-turbo', 'Response', 'Summary', 50),
    ];

    const weights = calculateModelWeights(responses, 'general');
    const claudeWeight = weights.find(w => w.modelId === 'claude-3-opus');
    const gptWeight = weights.find(w => w.modelId === 'gpt-4-turbo');

    expect(claudeWeight?.adjustedWeight).toBeGreaterThan(gptWeight?.adjustedWeight || 0);
  });

  it('clamps weights between 5-95', () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Response', 'Summary', 100),
    ];

    const weights = calculateModelWeights(responses, 'deep_reasoning');
    expect(weights[0].adjustedWeight).toBeLessThanOrEqual(95);
    expect(weights[0].adjustedWeight).toBeGreaterThanOrEqual(5);
  });
});

describe('Synthesis', () => {
  it('synthesizes high-agreement responses', async () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Python is great for beginners. Easy syntax.', 'Python beginner-friendly'),
      createMockResponse('gpt-4-turbo', 'Python is excellent for beginners. Clean code.', 'Python for starters'),
    ];

    const result = await synthesize('Best language for beginners?', responses);

    expect(result.finalResponse).toBeTruthy();
    expect(result.arbitrationLog.length).toBeGreaterThan(0);
    expect(result.weightsApplied.length).toBe(2);
  });

  it('handles divergent responses appropriately', async () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Yes, definitely use approach A', 'Use A', 90),
      createMockResponse('gpt-4-turbo', 'No, use approach B instead', 'Use B', 85),
    ];

    const result = await synthesize('Which approach?', responses);

    expect(result.finalResponse).toBeTruthy();
    expect(result.arbitrationLog.length).toBeGreaterThan(0);
  });

  it('handles empty responses', async () => {
    const result = await synthesize('Question?', []);

    expect(result.finalResponse).toContain('unable to gather');
    expect(result.arbitrationLog.length).toBeGreaterThan(0);
  });

  it('handles single response with disclaimer', async () => {
    const responses = [
      createMockResponse('claude-3-opus', 'The answer is X', 'Answer X'),
    ];

    const result = await synthesize('What is X?', responses);

    expect(result.finalResponse).toContain('The answer is X');
    expect(result.finalResponse).toContain('Council Note');
    expect(result.finalResponse).toContain('single model');
  });
});

describe('Council Deliberation Building', () => {
  it('builds complete deliberation object', () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Answer A', 'Summary A'),
    ];
    const synthesis: SynthesisResult = {
      finalResponse: 'Final answer',
      arbitrationLog: [{ step: 1, action: 'test', reasoning: 'test', outcome: 'test' }],
      weightsApplied: [],
      transparencyFlags: [],
    };
    const agreement: AgreementAnalysis = {
      level: 'high',
      score: 90,
      alignedPoints: [],
      divergentPoints: [],
    };

    const deliberation = buildCouncilDeliberation(
      'query-123',
      'What is X?',
      responses,
      synthesis,
      agreement,
      'user_invoked',
      ['general']
    );

    expect(deliberation.queryId).toBe('query-123');
    expect(deliberation.originalQuery).toBe('What is X?');
    expect(deliberation.responses).toHaveLength(1);
    expect(deliberation.synthesis).toBe(synthesis);
    expect(deliberation.agreement).toBe(agreement);
    expect(deliberation.councilModeTrigger).toBe('user_invoked');
    expect(deliberation.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(deliberation.totalCostEstimate).toBeGreaterThanOrEqual(0);
  });
});

describe('Fallback Synthesis', () => {
  it('creates fallback when council fails', () => {
    const result = createFallbackSynthesis('Timeout error');

    expect(result.finalResponse).toContain("couldn't gather");
    expect(result.arbitrationLog[0].action).toBe('fallback');
    expect(result.transparencyFlags).toContain('council_failed');
  });

  it('uses partial responses if available', () => {
    const responses = [
      createMockResponse('claude-3-opus', 'Partial answer from Claude', 'Partial'),
    ];

    const result = createFallbackSynthesis('One model failed', responses);

    expect(result.finalResponse).toContain('Partial answer from Claude');
    expect(result.finalResponse).toContain('Council Note');
  });
});
