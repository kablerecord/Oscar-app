/**
 * OSQR Memory Vault
 *
 * Three-tier memory architecture with privacy-preserving access controls.
 * - Episodic: Conversations and sessions
 * - Semantic: Long-term memories with embeddings
 * - Procedural: MentorScripts and BriefingScripts
 *
 * Persistence: Optional Chroma vector database integration for data durability.
 */

// Types
export * from './types';

// Stores
export { episodicStore, semanticStore, proceduralStore } from './stores';

// Chroma Persistence
export * as chroma from './chroma';

// Encryption at Rest
export * as encryption from './encryption';

// Retrieval
export {
  generateEmbedding,
  cosineSimilarity,
  estimateTokens,
  scoreMemory,
  scoreMemories,
  retrieveContext,
  searchMemories,
  recordRetrievalOutcome,
} from './retrieval';

// Synthesis
export {
  synthesizeFromConversation,
  runProspectiveReflection,
  updateUtilityScores,
  compactWorkingMemory,
  isCompactionNeeded,
  computeWorkingWindow,
  getExcludedMessagesSummary,
  type WorkingWindowResult,
} from './synthesis';

// Privacy
export {
  applyRedactionRules,
  containsSensitiveInfo,
  checkAccess,
  processPluginRequest,
  generateSanitizedSummary,
  getUserPrivacySettings,
  updateUserPrivacySettings,
  logAccess,
} from './privacy';

// Main Vault Service
export {
  initializeVault,
  getVault,
  retrieveContextForUser,
  getConversationHistory,
  getFullHistoryForUser,
  getWorkingWindowForUser,
  addMessageForUser,
  setWindowConfigForUser,
  loadConversationForUser,
  searchUserMemories,
  storeMessage,
  storeMemory,
  updateMemory,
  synthesizeFromConversationById,
  runProspectiveReflectionForUser,
  runRetrospectiveReflection,
  checkCompactionNeeded,
  compactWorkingMemoryForUser,
  processPluginDataRequest,
  getPrivacySettings,
  updatePrivacySettings,
  recordOutcome as recordVaultOutcome,
  getMentorScripts,
  storeMentorRule,
  getBriefingScript,
  getVaultStats,
  exportUserData,
  deleteUserData,
  clearAllStores,
  endConversationForUser,
  checkConversationTimeoutForUser,
  getAllVaults,
  getUnsynthesizedConversations,
  type EndConversationOptions,
  type EndConversationResult,
} from './vault';

// Cross-Project Query
export {
  addSourceContext,
  getSourceContext,
  addCrossReference,
  getCrossReferences,
  enrichWithContext,
  queryCrossProject,
  findRelatedFromOtherProjects,
  detectContradictions,
  discoverCrossReferences,
  resolveContradiction,
  clearCrossProjectData,
  getCrossProjectStats,
} from './cross-project';

// Learning Layer - LLM Extraction
export {
  extractFacts,
  generateSummary,
  detectContradictions as detectLLMContradictions,
  synthesizeWithLLM,
  type ExtractedFact,
  type ContradictionResult,
  type LLMExtractorConfig,
} from './synthesis/llm-extractor';

// Learning Layer - Synthesis Queue
export {
  enqueue as enqueueSynthesis,
  dequeue as dequeueSynthesis,
  getJob as getSynthesisJob,
  processNext as processNextSynthesis,
  processAll as processAllSynthesis,
  getPendingCount as getSynthesisPendingCount,
  getQueueStats as getSynthesisQueueStats,
  getFailedJobs as getFailedSynthesisJobs,
  retryFailed as retryFailedSynthesis,
  clearQueue as clearSynthesisQueue,
  on as onSynthesisEvent,
  type SynthesisJob,
  type SynthesisPriority,
} from './synthesis/queue';

// Learning Layer - Scheduler
export {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  updateSchedulerConfig,
  triggerSynthesisProcessing,
  triggerUtilityUpdate,
  triggerOrphanCheck,
  type SchedulerConfig,
  type SchedulerStatus,
} from './synthesis/scheduler';

// Learning Layer - External Ingestion
export {
  ingestConversation,
  ingestBatch,
  checkDuplicate,
  getIngestionStats,
  type IngestRequest,
  type IngestResult,
  type IngestSource,
} from './ingestion';

// Learning Layer - Enhanced Utility
export {
  recordOutcome,
  getOutcomeHistory,
  calculateRecencyBoost,
  applyRecencyBoosts,
  updateUtilityScoresEnhanced,
  getLearningStats,
  clearOutcomeHistory,
  analyzeMemoryPerformance,
  type OutcomeRecord,
} from './synthesis/retrospective';
