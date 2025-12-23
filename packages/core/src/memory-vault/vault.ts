/**
 * Memory Vault Service
 *
 * Main service class that provides a unified API for all memory operations.
 * Implements the MemoryVaultService interface from the spec.
 */

import type {
  MemoryVault,
  PrivateKnowledgeVault,
  GlobalPublicKnowledgeVault,
  WorkingMemoryBuffer,
  VaultConfig,
  SemanticMemory,
  Message,
  Conversation,
  MentorScript,
  MentorRule,
  BriefingScript,
  RetrievedMemory,
  RetrievalOptions,
  MemoryFilters,
  SynthesisResult,
  ReflectionResult,
  UtilityUpdateResult,
  CompactionResult,
  SanitizedSummary,
  PluginDataRequest,
  PrivacyDefaults,
  VaultStats,
  ExportedVault,
  MemorySource,
} from './types';
import { DEFAULT_VAULT_CONFIG } from './types';

import * as episodicStore from './stores/episodic.store';
import * as semanticStore from './stores/semantic.store';
import * as proceduralStore from './stores/procedural.store';

import { retrieveContext, searchMemories, recordRetrievalOutcome } from './retrieval/retriever';
import { generateEmbedding } from './retrieval/embedding';

import {
  synthesizeFromConversation,
  runProspectiveReflection,
} from './synthesis/prospective';
import { updateUtilityScores } from './synthesis/retrospective';
import {
  compactWorkingMemory,
  isCompactionNeeded,
  calculateTokenUsage,
} from './synthesis/compaction';

import {
  processPluginRequest,
  getUserPrivacySettings,
  updateUserPrivacySettings,
} from './privacy/gate';

/**
 * Memory Vault instance storage
 */
const vaults = new Map<string, MemoryVaultInstance>();

/**
 * Memory Vault instance class
 */
class MemoryVaultInstance {
  public readonly userId: string;
  public config: VaultConfig;
  public workingMemory: WorkingMemoryBuffer;

  constructor(userId: string, config: Partial<VaultConfig> = {}) {
    this.userId = userId;
    this.config = { ...DEFAULT_VAULT_CONFIG, ...config };
    this.workingMemory = {
      sessionId: '',
      currentConversation: null,
      retrievedContext: [],
      pendingCommitments: [],
      tokenBudget: this.config.maxWorkingMemoryTokens,
      tokensUsed: 0,
    };
  }

  /**
   * Start a new session
   */
  startSession(deviceType: 'web' | 'mobile' | 'voice' | 'vscode' = 'web'): string {
    const session = episodicStore.createSession(this.userId, deviceType);
    this.workingMemory.sessionId = session.id;
    return session.id;
  }

  /**
   * Start a new conversation
   */
  startConversation(projectId: string | null = null): string {
    if (!this.workingMemory.sessionId) {
      this.startSession();
    }

    const conversation = episodicStore.createConversation(
      this.workingMemory.sessionId,
      projectId
    );
    this.workingMemory.currentConversation = conversation;
    return conversation.id;
  }

  /**
   * Get PKV (Private Knowledge Vault)
   */
  getPKV(): PrivateKnowledgeVault {
    return {
      episodic: episodicStore.getEpisodicStore(this.userId),
      semantic: semanticStore.getSemanticStore(),
      procedural: proceduralStore.getProceduralStore(),
    };
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize a memory vault for a user
 */
export function initializeVault(
  userId: string,
  config: Partial<VaultConfig> = {}
): MemoryVaultInstance {
  const existing = vaults.get(userId);
  if (existing) {
    return existing;
  }

  const vault = new MemoryVaultInstance(userId, config);
  vaults.set(userId, vault);
  return vault;
}

/**
 * Get a user's vault
 */
export function getVault(userId: string): MemoryVaultInstance | null {
  return vaults.get(userId) || null;
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Retrieve relevant context for a query
 */
export async function retrieveContextForUser(
  userId: string,
  query: string,
  options?: Partial<RetrievalOptions>
): Promise<RetrievedMemory[]> {
  const result = await retrieveContext(query, userId, options);
  return result.memories;
}

/**
 * Get conversation history
 */
export function getConversationHistory(
  conversationId: string,
  limit?: number
): Message[] {
  return episodicStore.getMessages(conversationId, limit);
}

/**
 * Search memories
 */
export async function searchUserMemories(
  userId: string,
  query: string,
  filters?: MemoryFilters
): Promise<SemanticMemory[]> {
  const retrieved = await searchMemories(query, {
    categories: filters?.categories,
    minRelevance: filters?.minConfidence,
  });
  // Filter to only semantic memories (those with 'content' property)
  return retrieved
    .filter((r): r is typeof r & { memory: SemanticMemory } => 'content' in r.memory)
    .map((r) => r.memory);
}

// ============================================================================
// Storage
// ============================================================================

/**
 * Store a message in a conversation
 */
export function storeMessage(
  conversationId: string,
  message: Omit<Message, 'id'>
): Message | null {
  return episodicStore.addMessage(conversationId, message);
}

/**
 * Store a new semantic memory
 */
export async function storeMemory(
  memory: Omit<SemanticMemory, 'id' | 'embedding'>
): Promise<SemanticMemory> {
  const { embedding } = await generateEmbedding(memory.content);

  return semanticStore.createMemory(
    memory.content,
    memory.category,
    memory.source,
    embedding,
    memory.confidence
  );
}

/**
 * Update an existing memory
 */
export function updateMemory(
  memoryId: string,
  updates: Partial<SemanticMemory>
): SemanticMemory | null {
  return semanticStore.updateMemory(memoryId, updates);
}

// ============================================================================
// Synthesis
// ============================================================================

/**
 * Synthesize memories from a conversation
 */
export async function synthesizeFromConversationById(
  conversationId: string
): Promise<SynthesisResult | null> {
  const conversation = episodicStore.getConversation(conversationId);
  if (!conversation) return null;

  return synthesizeFromConversation(conversation);
}

/**
 * Run prospective reflection
 */
export async function runProspectiveReflectionForUser(
  userId: string
): Promise<ReflectionResult> {
  return runProspectiveReflection(userId);
}

/**
 * Run retrospective reflection
 */
export async function runRetrospectiveReflection(): Promise<UtilityUpdateResult> {
  return updateUtilityScores();
}

// ============================================================================
// Compaction
// ============================================================================

/**
 * Check if compaction is needed
 */
export function checkCompactionNeeded(userId: string): boolean {
  const vault = getVault(userId);
  if (!vault) return false;

  return isCompactionNeeded(vault.workingMemory);
}

/**
 * Compact working memory
 */
export async function compactWorkingMemoryForUser(
  userId: string
): Promise<CompactionResult> {
  const vault = getVault(userId);
  if (!vault) {
    return { compacted: false, reason: 'vault_not_found' };
  }

  return compactWorkingMemory(vault.workingMemory);
}

// ============================================================================
// Privacy
// ============================================================================

/**
 * Process a plugin data request
 */
export function processPluginDataRequest(
  userId: string,
  request: PluginDataRequest
): SanitizedSummary {
  const memories = semanticStore.getAllMemories();
  return processPluginRequest(request, userId, memories);
}

/**
 * Get user privacy settings
 */
export function getPrivacySettings(userId: string): PrivacyDefaults {
  return getUserPrivacySettings(userId);
}

/**
 * Update user privacy settings
 */
export function updatePrivacySettings(
  userId: string,
  settings: Partial<PrivacyDefaults>
): void {
  updateUserPrivacySettings(userId, settings);
}

// ============================================================================
// Utility Tracking
// ============================================================================

/**
 * Record retrieval outcome
 */
export function recordOutcome(memoryId: string, wasHelpful: boolean): void {
  recordRetrievalOutcome(memoryId, wasHelpful);
}

// ============================================================================
// Procedural Memory
// ============================================================================

/**
 * Get mentor scripts for a project
 */
export function getMentorScripts(projectId?: string): MentorScript[] {
  if (projectId) {
    const script = proceduralStore.getMentorScriptForProject(projectId);
    return script ? [script] : [];
  }
  return proceduralStore.getAllMentorScripts();
}

/**
 * Store a mentor rule
 */
export function storeMentorRule(
  scriptId: string,
  rule: Omit<MentorRule, 'id' | 'appliedCount' | 'helpfulCount' | 'createdAt'>
): MentorRule | null {
  return proceduralStore.addMentorRule(scriptId, rule);
}

/**
 * Get briefing script for a session
 */
export function getBriefingScript(sessionId: string): BriefingScript | null {
  return proceduralStore.getBriefingScriptForSession(sessionId);
}

// ============================================================================
// Admin / Stats
// ============================================================================

/**
 * Get vault statistics
 */
export function getVaultStats(userId: string): VaultStats | null {
  const vault = getVault(userId);
  if (!vault) return null;

  const episodicStats = episodicStore.getStoreStats(userId);
  const semanticStats = semanticStore.getStoreStats();
  const proceduralStats = proceduralStore.getStoreStats();

  return {
    userId,
    episodicCount: episodicStats.conversationCount,
    semanticCount: semanticStats.memoryCount,
    proceduralCount: proceduralStats.totalRuleCount,
    totalTokensStored: episodicStats.totalTokens,
    lastSynthesis: null, // TODO: track this
    lastRetrieval: null, // TODO: track this
    createdAt: new Date(), // TODO: track actual creation time
  };
}

/**
 * Export user data (GDPR compliance)
 */
export function exportUserData(userId: string): ExportedVault | null {
  const vault = getVault(userId);
  if (!vault) return null;

  return {
    version: '1.0',
    exportedAt: new Date(),
    userId,
    episodic: episodicStore.exportStore(userId),
    semantic: semanticStore.exportStore(),
    procedural: proceduralStore.exportStore(),
    config: vault.config,
  };
}

/**
 * Delete user data (right to be forgotten)
 */
export function deleteUserData(userId: string): void {
  episodicStore.deleteUserData(userId);
  semanticStore.deleteAllMemories();
  proceduralStore.deleteAllData();
  vaults.delete(userId);
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Clear all stores (for testing)
 */
export function clearAllStores(): void {
  episodicStore.clearStore();
  semanticStore.clearStore();
  proceduralStore.clearStore();
  vaults.clear();
}
