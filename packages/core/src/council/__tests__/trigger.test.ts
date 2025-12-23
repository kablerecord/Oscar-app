/**
 * Council Mode Trigger Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isUserInvokedCouncil,
  stripCouncilInvocation,
  extractDollarAmount,
  detectFinancialThreshold,
  detectLegalImplications,
  detectHealthDecisions,
  detectDomains,
  detectMultiDomain,
  detectResearchDepthRequired,
  detectStrategicPlanning,
  detectConflictingSources,
  detectNovelSituation,
  evaluateAutoTriggerConditions,
  shouldAutoTrigger,
  getAutoTriggerReason,
  canUseCouncil,
  isAutoTriggerEnabled,
  getAvailableModels,
  evaluateCouncilTrigger,
} from '../trigger';
import type { ConversationContext, UserTier } from '../types';

describe('User Invocation Detection', () => {
  it('detects /council command', () => {
    expect(isUserInvokedCouncil('/council What is the best investment?')).toBe(true);
    expect(isUserInvokedCouncil('/COUNCIL help me decide')).toBe(true);
  });

  it('detects [council] inline flag', () => {
    expect(isUserInvokedCouncil('What is the best approach [council]?')).toBe(true);
    expect(isUserInvokedCouncil('[Council] explain this concept')).toBe(true);
  });

  it('detects natural language patterns', () => {
    expect(isUserInvokedCouncil('I want multiple AI perspectives on this')).toBe(true);
    expect(isUserInvokedCouncil('What would other AIs say about this?')).toBe(true);
    expect(isUserInvokedCouncil('Can you compare model responses?')).toBe(true);
    expect(isUserInvokedCouncil('Show me different model opinions')).toBe(true);
    expect(isUserInvokedCouncil('Use council mode for this')).toBe(true);
  });

  it('does not trigger on normal queries', () => {
    expect(isUserInvokedCouncil('What is the weather today?')).toBe(false);
    expect(isUserInvokedCouncil('Help me write a function')).toBe(false);
    expect(isUserInvokedCouncil('Council of Nicea')).toBe(false);
  });
});

describe('Strip Council Invocation', () => {
  it('removes /council prefix', () => {
    expect(stripCouncilInvocation('/council What is the best investment?')).toBe('What is the best investment?');
  });

  it('removes [council] flags', () => {
    expect(stripCouncilInvocation('What is the best approach [council]?')).toBe('What is the best approach ?');
    expect(stripCouncilInvocation('[council] explain this')).toBe('explain this');
  });

  it('handles queries without invocation', () => {
    expect(stripCouncilInvocation('Normal query here')).toBe('Normal query here');
  });
});

describe('Financial Threshold Detection', () => {
  it('extracts dollar amounts', () => {
    expect(extractDollarAmount('I have $50,000 to invest')).toBe(50000);
    expect(extractDollarAmount('The cost is $1,234.56')).toBe(1234.56);
    expect(extractDollarAmount('About 500k in savings')).toBe(500000);
    expect(extractDollarAmount('A 2 million dollar house')).toBe(2000000);
  });

  it('detects amounts above threshold', () => {
    expect(detectFinancialThreshold('I have $50,000 to invest')).toBe(true);
    expect(detectFinancialThreshold('Should I refinance my $500k mortgage?')).toBe(true);
  });

  it('does not trigger below threshold', () => {
    expect(detectFinancialThreshold('I have $500 in my account')).toBe(false);
    expect(detectFinancialThreshold('The product costs $99')).toBe(false);
  });
});

describe('Legal Implications Detection', () => {
  it('detects legal keywords', () => {
    expect(detectLegalImplications('Should I hire a lawyer?')).toBe(true);
    expect(detectLegalImplications('What are my legal options?')).toBe(true);
    expect(detectLegalImplications('Can I sue for damages?')).toBe(true);
    expect(detectLegalImplications('Review this contract')).toBe(true);
    expect(detectLegalImplications('Copyright my work')).toBe(true);
    expect(detectLegalImplications('Filing for divorce')).toBe(true);
  });

  it('does not trigger on non-legal queries', () => {
    expect(detectLegalImplications('How do I cook pasta?')).toBe(false);
    expect(detectLegalImplications('What is the weather?')).toBe(false);
  });
});

describe('Health Decision Detection', () => {
  it('detects health keywords', () => {
    expect(detectHealthDecisions('Should I see a doctor about this?')).toBe(true);
    expect(detectHealthDecisions('What are the symptoms of the disease?')).toBe(true);
    expect(detectHealthDecisions('Tell me about this medication dosage')).toBe(true);
    expect(detectHealthDecisions('Treatment options for cancer')).toBe(true);
  });

  it('does not trigger on non-health queries', () => {
    expect(detectHealthDecisions('How to fix my code?')).toBe(false);
    expect(detectHealthDecisions('Best practices for React')).toBe(false);
  });
});

describe('Domain Detection', () => {
  it('detects technology domain', () => {
    expect(detectDomains('How do I write better code?')).toContain('technology');
    expect(detectDomains('Help with my software project')).toContain('technology');
  });

  it('detects business domain', () => {
    expect(detectDomains('Help with my business plan')).toContain('business');
    expect(detectDomains('What is the company revenue strategy?')).toContain('business');
  });

  it('detects science domain', () => {
    expect(detectDomains('What does the research show?')).toContain('science');
    expect(detectDomains('Analyze the experimental data')).toContain('science');
  });

  it('detects multi-domain queries', () => {
    // Query that spans tech and business
    expect(detectMultiDomain('Should my software company expand its business?')).toBe(true);
    // Query with tech and health
    expect(detectMultiDomain('Health data software for medical records')).toBe(true);
  });

  it('single domain does not trigger multi-domain', () => {
    expect(detectMultiDomain('How do I write a for loop?')).toBe(false);
    expect(detectMultiDomain('What is 2+2?')).toBe(false);
  });
});

describe('Complexity Detection', () => {
  it('detects research depth requirements', () => {
    expect(detectResearchDepthRequired('What does the research say about this?')).toBe(true);
    expect(detectResearchDepthRequired('Cite sources for this claim')).toBe(true);
    expect(detectResearchDepthRequired('According to recent studies...')).toBe(true);
  });

  it('detects strategic planning', () => {
    expect(detectStrategicPlanning('Help me with my 5-year plan')).toBe(true);
    expect(detectStrategicPlanning('Long-term roadmap for the project')).toBe(true);
    expect(detectStrategicPlanning('Strategic planning for Q1')).toBe(true);
  });
});

describe('Uncertainty Detection', () => {
  it('detects conflicting sources', () => {
    expect(detectConflictingSources('Some say X, others say Y')).toBe(true);
    expect(detectConflictingSources('Conflicting advice about this')).toBe(true);
    expect(detectConflictingSources('On one hand... on the other hand')).toBe(true);
  });

  it('detects novel situations', () => {
    expect(detectNovelSituation('This is a novel situation')).toBe(true);
    expect(detectNovelSituation('Never happened before')).toBe(true);
    expect(detectNovelSituation('Unprecedented circumstances')).toBe(true);
  });
});

describe('Auto-Trigger Evaluation', () => {
  it('evaluates financial conditions', () => {
    const conditions = evaluateAutoTriggerConditions('Should I invest my $50,000?');
    expect(conditions.financialThreshold).toBe(true);
  });

  it('evaluates legal conditions', () => {
    const conditions = evaluateAutoTriggerConditions('Should I hire a lawyer?');
    expect(conditions.legalImplications).toBe(true);
  });

  it('triggers on high-stakes conditions', () => {
    const financial = { financialThreshold: true } as any;
    const legal = { legalImplications: true } as any;
    const health = { healthDecisions: true } as any;

    expect(shouldAutoTrigger(financial)).toBe(true);
    expect(shouldAutoTrigger(legal)).toBe(true);
    expect(shouldAutoTrigger(health)).toBe(true);
  });

  it('triggers on complexity conditions', () => {
    const complex = { multiDomain: true, researchDepthRequired: true } as any;
    expect(shouldAutoTrigger(complex)).toBe(true);

    const partialComplex = { multiDomain: true } as any;
    expect(shouldAutoTrigger(partialComplex)).toBe(false);
  });

  it('triggers on uncertainty conditions', () => {
    const conflicting = { conflictingSourcesDetected: true } as any;
    const novel = { novelSituation: true } as any;

    expect(shouldAutoTrigger(conflicting)).toBe(true);
    expect(shouldAutoTrigger(novel)).toBe(true);
  });

  it('triggers on user preference', () => {
    const aggressive = { userPreferenceAggressive: true } as any;
    expect(shouldAutoTrigger(aggressive)).toBe(true);
  });

  it('returns correct reasons', () => {
    expect(getAutoTriggerReason({ financialThreshold: true } as any)).toBe('financial_threshold');
    expect(getAutoTriggerReason({ legalImplications: true } as any)).toBe('legal_implications');
    expect(getAutoTriggerReason({ healthDecisions: true } as any)).toBe('health_decisions');
    expect(getAutoTriggerReason({ multiDomain: true, researchDepthRequired: true } as any)).toBe('complex_multi_domain');
    expect(getAutoTriggerReason({ conflictingSourcesDetected: true } as any)).toBe('conflicting_sources');
    expect(getAutoTriggerReason({ novelSituation: true } as any)).toBe('novel_situation');
    expect(getAutoTriggerReason({} as any)).toBe('none');
  });
});

describe('Tier Limits', () => {
  it('allows council within limits', () => {
    expect(canUseCouncil('free', 0).allowed).toBe(true);
    expect(canUseCouncil('free', 2).allowed).toBe(true);
    expect(canUseCouncil('pro', 20).allowed).toBe(true);
    expect(canUseCouncil('enterprise', 1000).allowed).toBe(true);
  });

  it('blocks council at limit', () => {
    expect(canUseCouncil('free', 3).allowed).toBe(false);
    expect(canUseCouncil('pro', 25).allowed).toBe(false);
  });

  it('reports auto-trigger enabled status', () => {
    expect(isAutoTriggerEnabled('free')).toBe(false);
    expect(isAutoTriggerEnabled('pro')).toBe(true);
    expect(isAutoTriggerEnabled('enterprise')).toBe(true);
  });

  it('reports available models', () => {
    expect(getAvailableModels('free')).toBe(2);
    expect(getAvailableModels('pro')).toBe(3);
    expect(getAvailableModels('enterprise')).toBe(4);
  });
});

describe('Main Trigger Evaluation', () => {
  const createContext = (tier: UserTier, usesToday: number = 0): ConversationContext => ({
    currentQuery: '',
    detectedIntent: 'general',
    constraints: [],
    history: [],
    user: {
      id: 'test-user',
      tier,
      councilUsesToday: usesToday,
      preferences: {
        councilModeAggressive: false,
      },
    },
  });

  it('triggers on user invocation', () => {
    const result = evaluateCouncilTrigger('/council explain this');
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('user_invoked');
  });

  it('requires context for auto-trigger', () => {
    const result = evaluateCouncilTrigger('What should I invest my $50k in?');
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('no_context');
  });

  it('respects tier limits', () => {
    const context = createContext('free', 3);
    const result = evaluateCouncilTrigger('What is the meaning of life?', context);
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toContain('limit');
  });

  it('respects auto-trigger disabled for tier', () => {
    const context = createContext('free', 0);
    const result = evaluateCouncilTrigger('What should I invest my $50k in?', context);
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('auto_trigger_disabled');
  });

  it('triggers on high-stakes for pro tier', () => {
    const context = createContext('pro', 0);
    const result = evaluateCouncilTrigger('Should I invest my $50,000?', context);
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toBe('financial_threshold');
  });

  it('does not trigger without matching conditions', () => {
    const context = createContext('pro', 0);
    const result = evaluateCouncilTrigger('How do I make a sandwich?', context);
    expect(result.shouldTrigger).toBe(false);
    expect(result.reason).toBe('no_trigger_conditions_met');
  });
});
