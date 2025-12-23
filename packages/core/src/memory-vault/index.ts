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
  recordOutcome,
  getMentorScripts,
  storeMentorRule,
  getBriefingScript,
  getVaultStats,
  exportUserData,
  deleteUserData,
  clearAllStores,
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
