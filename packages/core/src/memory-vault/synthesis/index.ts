/**
 * Synthesis Module - Public Exports
 */

export * from './prospective';
export * from './retrospective';
export * from './compaction';
// Re-export llm-extractor with renamed ExtractedFact to avoid conflict
export {
  extractFacts,
  generateSummary,
  detectContradictions,
  synthesizeWithLLM,
  type ExtractedFact as LLMExtractedFact,
  type ContradictionResult,
  type LLMExtractorConfig,
} from './llm-extractor';
export * from './queue';
export * from './scheduler';
