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
  WindowConfig,
} from './types';
import { DEFAULT_VAULT_CONFIG, DEFAULT_WINDOW_CONFIG } from './types';

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
import { synthesizeWithLLM } from './synthesis/llm-extractor';
import { enqueue as enqueueSynthesis } from './synthesis/queue';
import {
  compactWorkingMemory,
  isCompactionNeeded,
  calculateTokenUsage,
  computeWorkingWindow,
  estimateTokens,
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
      fullHistory: [],
      workingWindow: [],
      windowConfig: { ...DEFAULT_WINDOW_CONFIG },
      currentConversation: null,
      retrievedContext: [],
      pendingCommitments: [],
      tokenBudget: this.config.maxWorkingMemoryTokens,
      tokensUsed: 0,
      fullHistoryTokens: 0,
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
    // Reset history for new conversation
    this.workingMemory.fullHistory = [];
    this.workingMemory.workingWindow = [];
    this.workingMemory.tokensUsed = 0;
    this.workingMemory.fullHistoryTokens = 0;
    return conversation.id;
  }

  /**
   * Add a message to the conversation
   * This is the primary way to add messages - it updates both fullHistory and workingWindow
   */
  addMessage(message: Omit<Message, 'id'>): Message | null {
    if (!this.workingMemory.currentConversation) {
      return null;
    }

    // Add to episodic store (persistent)
    const storedMessage = episodicStore.addMessage(
      this.workingMemory.currentConversation.id,
      message
    );

    if (!storedMessage) {
      return null;
    }

    // Add to fullHistory (permanent, never compacted)
    this.workingMemory.fullHistory.push(storedMessage);
    this.workingMemory.fullHistoryTokens += storedMessage.tokens;

    // Recompute working window
    this.recomputeWorkingWindow();

    return storedMessage;
  }

  /**
   * Recompute the working window from fullHistory
   */
  recomputeWorkingWindow(): void {
    const { window, tokensUsed } = computeWorkingWindow(
      this.workingMemory.fullHistory,
      this.workingMemory.windowConfig
    );
    this.workingMemory.workingWindow = window;
    this.workingMemory.tokensUsed = tokensUsed;
  }

  /**
   * Get the full conversation history (for UI display/scrolling)
   */
  getFullHistory(): Message[] {
    return this.workingMemory.fullHistory;
  }

  /**
   * Get the working window (for model context)
   */
  getWorkingWindow(): Message[] {
    return this.workingMemory.workingWindow;
  }

  /**
   * Update window configuration
   */
  setWindowConfig(config: Partial<WindowConfig>): void {
    this.workingMemory.windowConfig = {
      ...this.workingMemory.windowConfig,
      ...config,
    };
    this.recomputeWorkingWindow();
  }

  /**
   * Load existing conversation into working memory
   */
  loadConversation(conversationId: string): boolean {
    const conversation = episodicStore.getConversation(conversationId);
    if (!conversation) {
      return false;
    }

    this.workingMemory.currentConversation = conversation;
    // Load all messages into fullHistory
    this.workingMemory.fullHistory = [...conversation.messages];
    this.workingMemory.fullHistoryTokens = this.workingMemory.fullHistory.reduce(
      (sum, m) => sum + m.tokens,
      0
    );
    // Compute working window
    this.recomputeWorkingWindow();
    return true;
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

  /**
   * End the current conversation and trigger synthesis
   * LEARNING LAYER: Auto-synthesis on conversation end
   */
  async endConversation(options?: EndConversationOptions): Promise<EndConversationResult> {
    if (!this.workingMemory.currentConversation) {
      return { success: false, reason: 'no_active_conversation' };
    }

    const conversation = this.workingMemory.currentConversation;

    // 1. Mark conversation as ended in episodic store
    episodicStore.endConversation(conversation.id);

    // 2. Synthesize or queue based on options
    if (options?.synthesizeImmediately) {
      try {
        // Use LLM-based extraction if enabled (default), fallback to regex
        const existingMemories = semanticStore.getAllMemories();
        const llmResult = await synthesizeWithLLM(conversation, existingMemories);

        // Create memories from extracted facts
        const newMemories: SemanticMemory[] = [];
        for (const fact of llmResult.facts) {
          const { embedding } = await generateEmbedding(fact.content);
          const source: MemorySource = {
            type: 'conversation',
            sourceId: conversation.id,
            timestamp: new Date(),
            confidence: fact.confidence,
          };

          const memory = semanticStore.createMemory(
            fact.content,
            fact.category,
            source,
            embedding,
            fact.confidence
          );

          // Add topics
          if (fact.topics.length > 0) {
            semanticStore.addTopics(memory.id, fact.topics);
          }

          // Mark supersessions
          if (fact.supersedes) {
            for (const supersededId of fact.supersedes) {
              semanticStore.markSupersession(memory.id, supersededId);
            }
          }

          newMemories.push(memory);
        }

        // Update conversation summary
        if (llmResult.summary) {
          episodicStore.updateConversationSummary(conversation.id, llmResult.summary);
        }

        return {
          success: true,
          synthesisResult: {
            newMemories,
            conversationSummary: llmResult.summary,
            contradictionsResolved: llmResult.contradictions.filter(
              (c) => c.resolution === 'replace_with_new'
            ).length,
          },
        };
      } catch (error) {
        console.error('[Vault] Immediate synthesis failed, queueing instead:', error);
        // Fall through to queue
      }
    }

    // Queue for async synthesis
    const jobId = await enqueueSynthesis(conversation.id, this.userId);
    return { success: true, queued: true, jobId };
  }

  /**
   * Check if conversation should auto-end due to inactivity
   */
  checkConversationTimeout(timeoutMinutes: number = 30): boolean {
    if (!this.workingMemory.currentConversation) return false;

    const lastMessage = this.workingMemory.fullHistory.at(-1);
    if (!lastMessage) return false;

    const inactiveMinutes = (Date.now() - lastMessage.timestamp.getTime()) / 60000;
    return inactiveMinutes > timeoutMinutes;
  }
}

/**
 * Options for ending a conversation
 */
export interface EndConversationOptions {
  /** Synthesize immediately instead of queueing */
  synthesizeImmediately?: boolean;
  /** Use LLM-based extraction (default: true) */
  useLLMExtraction?: boolean;
}

/**
 * Result from ending a conversation
 */
export interface EndConversationResult {
  success: boolean;
  reason?: 'no_active_conversation';
  queued?: boolean;
  jobId?: string;
  synthesisResult?: SynthesisResult;
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
 * Get conversation history (full history from episodic store)
 */
export function getConversationHistory(
  conversationId: string,
  limit?: number
): Message[] {
  return episodicStore.getMessages(conversationId, limit);
}

/**
 * Get full conversation history for a user's current conversation (for UI scrollback)
 */
export function getFullHistoryForUser(userId: string): Message[] {
  const vault = getVault(userId);
  if (!vault) return [];
  return vault.getFullHistory();
}

/**
 * Get working window for a user (for model context)
 */
export function getWorkingWindowForUser(userId: string): Message[] {
  const vault = getVault(userId);
  if (!vault) return [];
  return vault.getWorkingWindow();
}

/**
 * Add a message to a user's current conversation
 */
export function addMessageForUser(
  userId: string,
  message: Omit<Message, 'id'>
): Message | null {
  const vault = getVault(userId);
  if (!vault) return null;
  return vault.addMessage(message);
}

/**
 * Update window configuration for a user
 */
export function setWindowConfigForUser(
  userId: string,
  config: Partial<WindowConfig>
): void {
  const vault = getVault(userId);
  if (!vault) return;
  vault.setWindowConfig(config);
}

/**
 * Load an existing conversation for a user
 */
export function loadConversationForUser(
  userId: string,
  conversationId: string
): boolean {
  const vault = getVault(userId);
  if (!vault) return false;
  return vault.loadConversation(conversationId);
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
// Learning Layer - Conversation Lifecycle
// ============================================================================

/**
 * End a conversation for a user and trigger synthesis
 */
export async function endConversationForUser(
  userId: string,
  options?: EndConversationOptions
): Promise<EndConversationResult> {
  const vault = getVault(userId);
  if (!vault) {
    return { success: false, reason: 'no_active_conversation' };
  }
  return vault.endConversation(options);
}

/**
 * Check if a user's conversation has timed out
 */
export function checkConversationTimeoutForUser(
  userId: string,
  timeoutMinutes: number = 30
): boolean {
  const vault = getVault(userId);
  if (!vault) return false;
  return vault.checkConversationTimeout(timeoutMinutes);
}

/**
 * Get all active vaults (for scheduler)
 */
export function getAllVaults(): MemoryVaultInstance[] {
  return Array.from(vaults.values());
}

/**
 * Get unsynthesized conversations for a user
 */
export function getUnsynthesizedConversations(
  userId: string,
  since?: Date
): Conversation[] {
  const store = episodicStore.getEpisodicStore(userId);
  return store.conversations.filter((c) =>
    c.endedAt !== null &&
    (!c.summary || c.summary === '') &&
    (!since || (c.endedAt && c.endedAt >= since))
  );
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
