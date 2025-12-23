/**
 * Synthesis Module Index
 *
 * Export all synthesis-related functionality.
 */

// Confidence normalization
export {
  calculateHedgingScore,
  assessReasoningDepth,
  countSourceCitations,
  assessResponseCompleteness,
  assessInternalConsistency,
  analyzeConfidenceFactors,
  normalizeConfidence,
  buildModelConfidence,
  formatConfidenceBreakdown,
} from './confidence';

// Agreement analysis
export {
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
} from './agreement';

// Prompts
export {
  OSCAR_SYNTHESIS_PROMPT,
  RESILIENT_SYNTHESIZER_EXTENSION,
  buildContextSection,
  buildSynthesisPrompt,
  buildSummaryPrompt,
  buildReasoningChainPrompt,
} from './prompts';

// Synthesizer
export {
  synthesize,
  calculateModelWeights,
  buildCouncilDeliberation,
  createFallbackSynthesis,
  type SynthesisOptions,
} from './synthesizer';
