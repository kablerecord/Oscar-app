/**
 * OSQR Memory Vault - Type Definitions
 *
 * Three-tier memory architecture: Episodic, Semantic, Procedural
 * with privacy-preserving access controls and utility tracking.
 */

// ============================================================================
// Core Memory Vault
// ============================================================================

export interface MemoryVault {
  userId: string;
  pkv: PrivateKnowledgeVault;
  gpkv: GlobalPublicKnowledgeVault;
  workingMemory: WorkingMemoryBuffer;
  config: VaultConfig;
}

export interface PrivateKnowledgeVault {
  episodic: EpisodicStore;
  semantic: SemanticStore;
  procedural: ProceduralStore;
}

export interface GlobalPublicKnowledgeVault {
  pluginKnowledge: Map<string, PluginKnowledgeBase>;
  sharedFrameworks: SemanticStore;
  version: string;
}

export interface PluginKnowledgeBase {
  pluginId: string;
  memories: SemanticMemory[];
  version: string;
}

// ============================================================================
// Episodic Memory
// ============================================================================

export interface EpisodicStore {
  conversations: Conversation[];
  sessions: Session[];
}

export interface Conversation {
  id: string;
  sessionId: string;
  projectId: string | null;
  messages: Message[];
  startedAt: Date;
  endedAt: Date | null;
  summary: string | null;
  metadata: ConversationMetadata;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens: number;
  toolCalls: ToolCall[] | null;
  utilityScore: number | null;
}

export interface ToolCall {
  toolId: string;
  input: Record<string, unknown>;
  output?: unknown;
  timestamp: string;
}

export interface Session {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  deviceType: 'web' | 'mobile' | 'voice' | 'vscode';
  conversationIds: string[];
}

export interface ConversationMetadata {
  topics: string[];
  entities: Entity[];
  commitments: Commitment[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

export interface Entity {
  name: string;
  type: 'person' | 'company' | 'project' | 'place' | 'other';
  mentions: number;
}

export interface Commitment {
  id: string;
  description: string;
  dueDate: Date | null;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

// ============================================================================
// Semantic Memory
// ============================================================================

export interface SemanticStore {
  memories: SemanticMemory[];
  collectionName: string;
}

export interface SemanticMemory {
  id: string;
  content: string;
  embedding: number[];
  category: MemoryCategory;
  source: MemorySource;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  utilityScore: number;
  confidence: number;
  metadata: SemanticMetadata;
}

export type MemoryCategory =
  | 'personal_info'
  | 'business_info'
  | 'relationships'
  | 'projects'
  | 'preferences'
  | 'domain_knowledge'
  | 'decisions'
  | 'commitments';

export interface MemorySource {
  type: 'conversation' | 'explicit' | 'inferred' | 'plugin' | 'import';
  sourceId: string;
  timestamp: Date;
  confidence: number;
}

export interface SemanticMetadata {
  topics: string[];
  relatedMemoryIds: string[];
  contradicts: string[];
  supersedes: string[];
}

// ============================================================================
// Cross-Project Context (Document Indexing Addendum)
// ============================================================================

export interface SourceContext {
  projectId: string | null;
  conversationId: string | null;
  documentId: string | null;
  interface: 'web' | 'mobile' | 'voice' | 'vscode' | 'api';
  timestamp: Date;
}

export interface CrossReference {
  targetMemoryId: string;
  targetProjectId: string | null;
  relationshipType: 'supports' | 'contradicts' | 'extends' | 'related';
  strength: number; // 0-1
  discoveredAt: Date;
  discoveredBy: 'user' | 'system';
}

export interface SemanticMemoryWithContext extends SemanticMemory {
  sourceContext: SourceContext;
  crossReferences: CrossReference[];
}

export interface ContradictionDetection {
  memoryId: string;
  contradictingMemoryId: string;
  topic: string;
  claimA: string;
  claimB: string;
  confidence: number;
  detectedAt: Date;
  resolvedAt: Date | null;
  resolution: 'superseded' | 'context_dependent' | 'user_resolved' | null;
}

export interface CrossProjectQueryOptions {
  query: string;
  userId: string;
  projectIds?: string[];       // Empty = all projects
  includeConversations?: boolean;
  includeDocuments?: boolean;
  timeRange?: { start: Date; end: Date };
  limit?: number;
  detectContradictions?: boolean;
}

export interface CrossProjectQueryResult {
  memories: Array<{
    memory: SemanticMemoryWithContext;
    relevance: number;
    project: string | null;
  }>;
  commonThemes: string[];
  contradictions: ContradictionDetection[];
  projectSummaries: Map<string, string>;
}

// ============================================================================
// Procedural Memory
// ============================================================================

export interface ProceduralStore {
  mentorScripts: MentorScript[];
  briefingScripts: BriefingScript[];
  pluginRules: PluginRule[];
}

export interface MentorScript {
  id: string;
  projectId: string | null;
  rules: MentorRule[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorRule {
  id: string;
  rule: string;
  source: 'user_defined' | 'inferred' | 'plugin';
  priority: number;
  appliedCount: number;
  helpfulCount: number;
  createdAt: Date;
}

export interface BriefingScript {
  id: string;
  sessionId: string;
  instructions: string[];
  expiresAt: Date | null;
}

export interface PluginRule {
  pluginId: string;
  rules: string[];
  permissions: PluginPermission[];
  active: boolean;
}

export interface PluginPermission {
  category: MemoryCategory;
  access: 'read' | 'write' | 'none';
}

// ============================================================================
// Working Memory
// ============================================================================

export interface WorkingMemoryBuffer {
  sessionId: string;
  currentConversation: Conversation | null;
  retrievedContext: RetrievedMemory[];
  pendingCommitments: Commitment[];
  tokenBudget: number;
  tokensUsed: number;
}

export interface RetrievedMemory {
  memory: SemanticMemory | EpisodicSummary;
  relevanceScore: number;
  retrievedAt: Date;
  wasHelpful: boolean | null;
}

export interface EpisodicSummary {
  id: string;
  conversationId: string;
  summary: string;
  topics: string[];
  timestamp: Date;
}

// ============================================================================
// Privacy & Access Control
// ============================================================================

export type PermissionTier = 'none' | 'minimal' | 'contextual' | 'full';

export interface AccessDecision {
  allowed: boolean;
  tier: PermissionTier;
  redactions: RedactionRule[];
  reason: string;
  logged: boolean;
}

export interface RedactionRule {
  category: RedactionCategory;
  action: 'remove' | 'generalize' | 'hash';
}

export type RedactionCategory = 'pii' | 'financial' | 'family' | 'medical' | 'location';

export interface SanitizedSummary {
  content: string;
  categories: MemoryCategory[];
  confidence: number;
  redactionsApplied: string[];
}

export interface PluginDataRequest {
  pluginId: string;
  requestedCategories: MemoryCategory[];
  purpose: string;
}

export interface AccessLogEntry {
  id: string;
  requesterId: string;
  requesterType: 'plugin' | 'component' | 'user';
  userId: string;
  categoriesRequested: MemoryCategory[];
  categoriesProvided: MemoryCategory[];
  redactionsApplied: string[];
  timestamp: Date;
}

// ============================================================================
// Utility Tracking
// ============================================================================

export interface UtilityUpdate {
  memoryId: string;
  oldScore: number;
  newScore: number;
}

export interface UtilityUpdateResult {
  memoriesUpdated: number;
  averageScoreChange: number;
}

export interface RetrievalRecord {
  id: string;
  memoryId: string;
  userId: string;
  query: string;
  relevanceScore: number;
  wasHelpful: boolean | null;
  timestamp: Date;
}

// ============================================================================
// Synthesis Results
// ============================================================================

export interface SynthesisResult {
  newMemories: SemanticMemory[];
  conversationSummary: string;
  contradictionsResolved: number;
}

export interface ReflectionResult {
  conversationsProcessed: number;
  memoriesCreated: number;
  contradictionsFound: number;
}

export interface CompactionResult {
  compacted: boolean;
  reason?: string;
  messagesCompacted?: number;
  tokensSaved?: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface VaultConfig {
  maxWorkingMemoryTokens: number;
  compactionThreshold: number;
  utilityDecayRate: number;
  synthesisFrequency: 'realtime' | 'hourly' | 'daily';
  privacyDefaults: PrivacyDefaults;
  embeddingModel: string;
  embeddingDimensions: number;
}

export interface PrivacyDefaults {
  piiRedaction: boolean;
  financialRedaction: boolean;
  familyRedaction: boolean;
  pluginAccessTier: PermissionTier;
}

export const DEFAULT_VAULT_CONFIG: VaultConfig = {
  maxWorkingMemoryTokens: 8000,
  compactionThreshold: 0.8,
  utilityDecayRate: 0.05,
  synthesisFrequency: 'hourly',
  privacyDefaults: {
    piiRedaction: true,
    financialRedaction: true,
    familyRedaction: true,
    pluginAccessTier: 'contextual',
  },
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
};

// ============================================================================
// Retrieval Options
// ============================================================================

export interface RetrievalOptions {
  maxTokens?: number;
  minRelevance?: number;
  boostRecent?: boolean;
  boostHighUtility?: boolean;
  categories?: MemoryCategory[];
  excludeIds?: string[];
}

export interface MemoryFilters {
  categories?: MemoryCategory[];
  minConfidence?: number;
  minUtility?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

// ============================================================================
// Stats & Export
// ============================================================================

export interface VaultStats {
  userId: string;
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  totalTokensStored: number;
  lastSynthesis: Date | null;
  lastRetrieval: Date | null;
  createdAt: Date;
}

export interface ExportedVault {
  version: string;
  exportedAt: Date;
  userId: string;
  episodic: EpisodicStore;
  semantic: SemanticStore;
  procedural: ProceduralStore;
  config: VaultConfig;
}
