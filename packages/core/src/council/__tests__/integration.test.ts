/**
 * Council Mode Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Display
  determineDisplayState,
  mapToConsensusLevel,
  generateConsensusDescription,
  buildModelCards,
  buildDisagreementSummaries,
  buildCouncilSummary,
  canTransitionTo,
  getAvailableTransitions,
  stateTransitions,

  // Formatters
  formatDefaultView,
  formatExpandedView,
  formatDisagreementView,
  formatFullLog,
  formatForState,
  formatAsJSON,

  // Config
  getSpecialtyWeights,
  mapClassificationToQueryType,
  getModelDisplayName,
  estimateCost,

  // Dispatcher
  distributeContext,
} from '../index';
import type {
  CouncilDeliberation,
  ModelResponse,
  DisplayState,
  ConversationContext,
} from '../types';

// Helper to create a complete mock deliberation
function createMockDeliberation(agreementLevel: 'high' | 'moderate' | 'low' | 'split' = 'high'): CouncilDeliberation {
  const responses: ModelResponse[] = [
    {
      modelId: 'claude-3-opus',
      modelDisplayName: 'Claude',
      content: 'Claude response content here with detailed analysis.',
      summary: 'Claude summary of the response',
      confidence: { rawScore: null, normalizedScore: 85, reasoningDepth: 4 },
      sourcesCited: ['source1.com'],
      reasoningChain: ['Step 1', 'Step 2'],
      latencyMs: 1500,
      tokensUsed: 800,
      timestamp: new Date().toISOString(),
      status: 'success',
    },
    {
      modelId: 'gpt-4-turbo',
      modelDisplayName: 'GPT-4',
      content: 'GPT-4 response with alternative perspective.',
      summary: 'GPT-4 summary of findings',
      confidence: { rawScore: null, normalizedScore: 80, reasoningDepth: 3 },
      sourcesCited: [],
      reasoningChain: ['Analysis A', 'Analysis B'],
      latencyMs: 1200,
      tokensUsed: 600,
      timestamp: new Date().toISOString(),
      status: 'success',
    },
    {
      modelId: 'gemini-pro',
      modelDisplayName: 'Gemini',
      content: 'Gemini response with factual information.',
      summary: 'Gemini factual summary',
      confidence: { rawScore: null, normalizedScore: 75, reasoningDepth: 3 },
      sourcesCited: ['research.org'],
      reasoningChain: ['Fact 1', 'Fact 2'],
      latencyMs: 1000,
      tokensUsed: 500,
      timestamp: new Date().toISOString(),
      status: 'success',
    },
  ];

  const agreementScore = {
    high: 90,
    moderate: 65,
    low: 40,
    split: 20,
  }[agreementLevel];

  return {
    queryId: 'test-query-123',
    originalQuery: 'What is the best approach for this problem?',
    queryClassification: ['general', 'technical'],
    responses,
    agreement: {
      level: agreementLevel,
      score: agreementScore,
      alignedPoints: ['All models agree on point 1', 'Common understanding of point 2'],
      divergentPoints: agreementLevel === 'split' ? [{
        topic: 'Best approach',
        positions: [
          { modelId: 'claude-3-opus', position: 'Use approach A', confidence: 85 },
          { modelId: 'gpt-4-turbo', position: 'Use approach B', confidence: 80 },
        ],
        resolution: 'presented_both',
        resolutionReasoning: 'Both approaches have merit for different scenarios',
      }] : [],
    },
    synthesis: {
      finalResponse: 'Based on council deliberation, the recommended approach is X. This synthesis takes into account all model perspectives.',
      arbitrationLog: [
        { step: 1, action: 'dispatch', reasoning: 'Query classified', outcome: '3 models responded' },
        { step: 2, action: 'weight', reasoning: 'Applied specialty weights', outcome: 'Claude: 45%, GPT-4: 35%, Gemini: 20%' },
        { step: 3, action: 'analyze', reasoning: 'Agreement analysis', outcome: `${agreementLevel} agreement` },
        { step: 4, action: 'synthesize', reasoning: 'Generated response', outcome: 'Complete' },
      ],
      weightsApplied: [
        { modelId: 'claude-3-opus', baseWeight: 40, adjustedWeight: 45, adjustmentReason: 'Higher confidence' },
        { modelId: 'gpt-4-turbo', baseWeight: 35, adjustedWeight: 35 },
        { modelId: 'gemini-pro', baseWeight: 25, adjustedWeight: 20, adjustmentReason: 'Lower confidence' },
      ],
      transparencyFlags: agreementLevel === 'split' ? ['approach_disagreement'] : [],
    },
    totalLatencyMs: 1500,
    totalCostEstimate: 0.05,
    councilModeTrigger: 'user_invoked',
  };
}

describe('Display State Determination', () => {
  it('shows default for high agreement', () => {
    const deliberation = createMockDeliberation('high');
    expect(determineDisplayState(deliberation)).toBe('default');
  });

  it('shows default for moderate agreement', () => {
    const deliberation = createMockDeliberation('moderate');
    expect(determineDisplayState(deliberation)).toBe('default');
  });

  it('shows disagreement for split council', () => {
    const deliberation = createMockDeliberation('split');
    expect(determineDisplayState(deliberation)).toBe('disagreement');
  });
});

describe('Consensus Level Mapping', () => {
  it('maps agreement levels correctly', () => {
    expect(mapToConsensusLevel('high')).toBe('High');
    expect(mapToConsensusLevel('moderate')).toBe('Moderate');
    expect(mapToConsensusLevel('low')).toBe('Split');
    expect(mapToConsensusLevel('split')).toBe('Split');
  });
});

describe('Consensus Description Generation', () => {
  it('generates appropriate descriptions', () => {
    expect(generateConsensusDescription('high', 3)).toBe('3/3 models aligned');
    expect(generateConsensusDescription('moderate', 3)).toContain('moderate agreement');
    expect(generateConsensusDescription('low', 3)).toContain('limited agreement');
    expect(generateConsensusDescription('split', 3)).toContain('disagreed');
  });
});

describe('Model Cards Building', () => {
  it('builds cards from responses', () => {
    const deliberation = createMockDeliberation();
    const cards = buildModelCards(deliberation);

    expect(cards).toHaveLength(3);
    expect(cards[0].modelName).toBe('Claude');
    expect(cards[0].confidencePercent).toBe(85);
    expect(cards[0].summary).toBeTruthy();
    expect(cards[0].fullResponseAvailable).toBe(true);
  });
});

describe('Disagreement Summaries', () => {
  it('builds summaries for split council', () => {
    const deliberation = createMockDeliberation('split');
    const summaries = buildDisagreementSummaries(deliberation);

    expect(summaries).toBeDefined();
    expect(summaries!.length).toBe(1);
    expect(summaries![0].topic).toBe('Best approach');
    expect(summaries![0].modelPositions.length).toBe(2);
  });

  it('returns undefined for high agreement', () => {
    const deliberation = createMockDeliberation('high');
    const summaries = buildDisagreementSummaries(deliberation);
    expect(summaries).toBeUndefined();
  });
});

describe('Council Summary Building', () => {
  it('builds complete summary', () => {
    const deliberation = createMockDeliberation();
    const summary = buildCouncilSummary(deliberation);

    expect(summary.consensusLevel).toBe('High');
    expect(summary.consensusDescription).toContain('3/3');
    expect(summary.modelCards).toHaveLength(3);
    expect(summary.arbitrationVisible).toBe(true);
  });
});

describe('State Transitions', () => {
  it('defines valid transitions', () => {
    expect(stateTransitions.default).toContain('expanded');
    expect(stateTransitions.default).toContain('disagreement');
    expect(stateTransitions.default).toContain('full_log');
  });

  it('validates transition checks', () => {
    expect(canTransitionTo('default', 'expanded')).toBe(true);
    expect(canTransitionTo('expanded', 'default')).toBe(true);
    expect(canTransitionTo('default', 'default')).toBe(false);
  });

  it('returns available transitions', () => {
    const available = getAvailableTransitions('default');
    expect(available).toContain('expanded');
    expect(available).not.toContain('default');
  });
});

describe('View Formatters', () => {
  it('formats default view', () => {
    const deliberation = createMockDeliberation();
    const formatted = formatDefaultView(deliberation);

    expect(formatted).toContain(deliberation.synthesis.finalResponse);
    expect(formatted).toContain('Council Consensus');
  });

  it('formats expanded view', () => {
    const deliberation = createMockDeliberation();
    const formatted = formatExpandedView(deliberation);

    expect(formatted).toContain('COUNCIL DELIBERATION');
    expect(formatted).toContain('Claude');
    expect(formatted).toContain('GPT-4');
    expect(formatted).toContain('Gemini');
    expect(formatted).toContain('ARBITRATION SUMMARY');
  });

  it('formats disagreement view', () => {
    const deliberation = createMockDeliberation('split');
    const formatted = formatDisagreementView(deliberation);

    expect(formatted).toContain('Split Council');
    expect(formatted).toContain('different conclusions');
    expect(formatted).toContain('KEY DISAGREEMENT');
  });

  it('formats full log', () => {
    const deliberation = createMockDeliberation();
    const formatted = formatFullLog(deliberation, {
      includeTimestamps: true,
      includeTokens: true,
      includeCosts: true,
    });

    expect(formatted).toContain('FULL ARBITRATION LOG');
    expect(formatted).toContain('Query ID');
    expect(formatted).toContain('STEP 1');
    expect(formatted).toContain('tokens');
    expect(formatted).toContain('$');
  });

  it('formats for specified state', () => {
    const deliberation = createMockDeliberation();

    const defaultFormat = formatForState(deliberation, 'default');
    expect(defaultFormat).toContain('Council Consensus');

    const expandedFormat = formatForState(deliberation, 'expanded');
    expect(expandedFormat).toContain('COUNCIL DELIBERATION');

    const logFormat = formatForState(deliberation, 'full_log');
    expect(logFormat).toContain('FULL ARBITRATION LOG');
  });

  it('formats as JSON', () => {
    const deliberation = createMockDeliberation();
    const json = formatAsJSON(deliberation);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('synthesis');
    expect(parsed).toHaveProperty('consensus');
    expect(parsed).toHaveProperty('models');
    expect(parsed).toHaveProperty('metadata');
    expect(parsed.consensus.level).toBe('High');
  });
});

describe('Configuration Helpers', () => {
  it('returns specialty weights', () => {
    const deepReasoning = getSpecialtyWeights('deep_reasoning');
    expect(deepReasoning.claude).toBeGreaterThan(deepReasoning.gpt4);
    expect(deepReasoning.claude).toBeGreaterThan(deepReasoning.gemini);

    const currentEvents = getSpecialtyWeights('current_events');
    expect(currentEvents.gemini).toBeGreaterThan(currentEvents.claude);
  });

  it('maps classifications to query types', () => {
    expect(mapClassificationToQueryType(['philosophy', 'ethics'])).toBe('deep_reasoning');
    expect(mapClassificationToQueryType(['news', 'current'])).toBe('current_events');
    expect(mapClassificationToQueryType(['code', 'programming'])).toBe('code_technical');
    expect(mapClassificationToQueryType(['research', 'sources'])).toBe('multi_source');
    expect(mapClassificationToQueryType(['random', 'stuff'])).toBe('general');
  });

  it('returns model display names', () => {
    expect(getModelDisplayName('claude-3-opus')).toBe('Claude');
    expect(getModelDisplayName('gpt-4-turbo')).toBe('GPT-4');
    expect(getModelDisplayName('gemini-pro')).toBe('Gemini');
    expect(getModelDisplayName('unknown-model')).toBe('unknown-model');
  });

  it('estimates costs correctly', () => {
    const claudeCost = estimateCost('claude-3-opus', 1000, 1000);
    const geminiCost = estimateCost('gemini-pro', 1000, 1000);

    expect(claudeCost).toBeGreaterThan(geminiCost);
    expect(claudeCost).toBeGreaterThan(0);
    expect(geminiCost).toBeGreaterThan(0);
  });
});

describe('Context Distribution', () => {
  it('distributes context to models', () => {
    const context: ConversationContext = {
      currentQuery: 'What is the ethical approach to AI?',
      detectedIntent: 'philosophical_inquiry',
      constraints: ['Be thorough', 'Consider multiple viewpoints'],
      history: [
        { role: 'user', content: 'Tell me about AI ethics' },
        { role: 'assistant', content: 'AI ethics involves...' },
      ],
      user: {
        id: 'user-123',
        tier: 'pro',
        councilUsesToday: 5,
        preferences: { councilModeAggressive: false },
      },
    };

    const distribution = distributeContext(context);

    expect(distribution.shared.originalQuery).toBe(context.currentQuery);
    expect(distribution.shared.userIntent).toBe(context.detectedIntent);
    expect(distribution.shared.keyConstraints).toEqual(context.constraints);
    expect(distribution.specialized).toHaveProperty('claude-3-opus');
    expect(distribution.specialized).toHaveProperty('gpt-4-turbo');
    expect(distribution.specialized).toHaveProperty('gemini-pro');
  });
});

describe('End-to-End Flow', () => {
  it('processes a complete council query flow', () => {
    // 1. Create deliberation
    const deliberation = createMockDeliberation();

    // 2. Determine initial display state
    const initialState = determineDisplayState(deliberation);
    expect(initialState).toBe('default');

    // 3. Build summary for display
    const summary = buildCouncilSummary(deliberation);
    expect(summary.consensusLevel).toBe('High');

    // 4. Format for current state
    const formatted = formatForState(deliberation, initialState);
    expect(formatted).toBeTruthy();

    // 5. Check available transitions
    const transitions = getAvailableTransitions(initialState);
    expect(transitions.length).toBeGreaterThan(0);

    // 6. Transition to expanded view
    const canExpand = canTransitionTo(initialState, 'expanded');
    expect(canExpand).toBe(true);

    // 7. Format expanded view
    const expanded = formatForState(deliberation, 'expanded');
    expect(expanded).toContain('COUNCIL DELIBERATION');
  });

  it('handles split council flow', () => {
    // 1. Create split deliberation
    const deliberation = createMockDeliberation('split');

    // 2. Should show disagreement view
    const initialState = determineDisplayState(deliberation);
    expect(initialState).toBe('disagreement');

    // 3. Build summary should show disagreements
    const summary = buildCouncilSummary(deliberation);
    expect(summary.consensusLevel).toBe('Split');
    expect(summary.disagreements).toBeDefined();

    // 4. Disagreement format should highlight conflicts
    const formatted = formatDisagreementView(deliberation);
    expect(formatted).toContain('Split Council');
    expect(formatted).toContain('KEY DISAGREEMENT');
  });
});
