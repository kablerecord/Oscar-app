/**
 * Memory Vault Wrapper - Full Integration with @osqr/core (with Error Recovery)
 *
 * This wrapper provides the bridge between app-web and @osqr/core MemoryVault.
 * It enables persistent conversations with memory across sessions.
 *
 * ERROR RECOVERY: On any error, returns empty context (fail safe).
 *
 * IMPLEMENTATION STATUS (Dec 2024):
 * ✅ IMPLEMENTED:
 *   - Core memory retrieval (retrieveContextForUser, searchUserMemories)
 *   - Message storage (storeMessage)
 *   - Conversation history (getConversationHistory)
 *   - Vault initialization and management
 *
 * ⏳ ENTERPRISE FEATURES (build when needed):
 *   - Cross-project queries (search memories across different projects)
 *   - Cross-project contradiction detection
 *   - Multi-project context synthesis
 */

import { MemoryVault } from '@osqr/core';
import { featureFlags } from './config';
import { getPrismaKeyAdapter, type KeyPersistenceAdapter } from '@/lib/adapters/prisma-key-adapter';
import {
  loadPrivacySettings,
  deletePrivacySettings,
} from '@/lib/adapters/prisma-privacy-adapter';
import { generateVaultDEK, deriveMasterKey, generateSalt } from '@/lib/encryption/user-encryption';

// Type aliases for cleaner code - inferred from @osqr/core MemoryVault functions
type MemoryCategory = NonNullable<NonNullable<Parameters<typeof MemoryVault.searchUserMemories>[2]>['categories']>[0];
type RetrievedMemory = Awaited<ReturnType<typeof MemoryVault.retrieveContextForUser>>[0];
type SemanticMemory = Awaited<ReturnType<typeof MemoryVault.searchUserMemories>>[0];
type Message = ReturnType<typeof MemoryVault.getConversationHistory>[0];

export interface MemorySearchResult {
  content: string;
  relevanceScore: number;
  category: string;
  createdAt: Date;
  source: string;
}

export interface ContextBundle {
  memories: MemorySearchResult[];
  episodicContext: string[];
  retrievalTimeMs: number;
}

export interface CrossProjectResult {
  memories: Array<{
    memory: MemorySearchResult;
    relevance: number;
    project: string | null;
  }>;
  commonThemes: string[];
  contradictions: Array<{
    memoryId: string;
    contradictingMemoryId: string;
    topic: string;
    claimA: string;
    claimB: string;
    confidence: number;
  }>;
  projectSummaries: Map<string, string>;
}

export interface SourceContext {
  projectId: string | null;
  conversationId: string | null;
  documentId: string | null;
  interface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
  timestamp: Date;
}

// Key adapter singleton - initialized on first use
let keyAdapter: KeyPersistenceAdapter | null = null;

// In-memory cache of MEKs (Master Encryption Keys) per user
// In production, these would be session-based and cleared on logout
const mekCache = new Map<string, Buffer>();

/**
 * Get or derive MEK for a user
 * Note: In production, this would be derived from user's password during login
 * For now, we generate a deterministic key per user (NOT SECURE - for dev only)
 */
async function getMasterKeyForUser(userId: string): Promise<Buffer> {
  if (mekCache.has(userId)) {
    return mekCache.get(userId)!;
  }

  // TODO: In production, derive from user's password during login
  // For development, we use a deterministic derivation
  const salt = Buffer.from(`osqr-dev-salt-${userId}`.slice(0, 32).padEnd(32, '0'));
  const mek = deriveMasterKey(`dev-password-${userId}`, salt);
  mekCache.set(userId, mek);
  return mek;
}

/**
 * Initialize a memory vault for a user/workspace
 * Now async to support encryption initialization
 */
export async function initializeVault(workspaceId: string): Promise<void> {
  if (!featureFlags.enableMemoryVault) {
    return;
  }

  // Set up key adapter if not already done
  if (!keyAdapter) {
    keyAdapter = getPrismaKeyAdapter(getMasterKeyForUser);
  }

  // Check if encryption is enabled
  if (featureFlags.enableVaultEncryption) {
    // Try to load existing DEK
    let dek = await keyAdapter.loadKey(workspaceId, `vault_dek_${workspaceId}`);

    if (!dek) {
      // Generate new DEK for new users
      dek = new Uint8Array(generateVaultDEK());
      await keyAdapter.persistKey(workspaceId, `vault_dek_${workspaceId}`, dek);
      console.log('[Memory] Generated new vault DEK for workspace');
    }

    // Initialize vault with encryption
    await MemoryVault.initializeVault(workspaceId, {}, {
      encryptionEnabled: true,
      encryptionKey: dek,
      keyPersistence: {
        onLoad: (keyId) => keyAdapter!.loadKey(workspaceId, keyId),
        onPersist: (keyId, key) => keyAdapter!.persistKey(workspaceId, keyId, key),
      },
    });

    // Load privacy settings from DB
    const privacySettings = await loadPrivacySettings(workspaceId);
    if (privacySettings) {
      MemoryVault.updatePrivacySettings(workspaceId, privacySettings);
    }

    console.log('[Memory] Vault initialized with encryption for workspace');
  } else {
    // Initialize without encryption (legacy mode)
    await MemoryVault.initializeVault(workspaceId);
  }
}

/**
 * Cryptographic deletion - "Burn It" button
 * Destroys all encryption keys, making vault data permanently inaccessible
 */
export async function cryptoDeleteUserData(userId: string): Promise<{
  success: boolean;
  keysDestroyed: number;
  dataCleared: boolean;
}> {
  if (!keyAdapter) {
    return { success: false, keysDestroyed: 0, dataCleared: false };
  }

  try {
    // 1. Get vault and trigger crypto deletion
    const vault = MemoryVault.getVault(userId);
    let keysDestroyed = 0;

    if (vault) {
      const result = await vault.cryptoDelete();
      keysDestroyed = result.keysDestroyed;
    }

    // 2. Delete all keys from database
    await keyAdapter.deleteAllKeys(userId);

    // 3. Delete privacy settings
    await deletePrivacySettings(userId);

    // 4. Clear MEK from cache
    mekCache.delete(userId);

    console.log('[Memory] Crypto deletion complete:', { userId: userId.slice(0, 8), keysDestroyed });

    return { success: true, keysDestroyed, dataCleared: true };
  } catch (error) {
    console.error('[Memory] Crypto deletion failed:', error);
    return { success: false, keysDestroyed: 0, dataCleared: false };
  }
}

/**
 * Retrieve relevant context for a query
 */
export async function getContextForQuery(
  query: string,
  workspaceId: string,
  options?: {
    maxMemories?: number;
    categories?: string[];
    minRelevance?: number;
  }
): Promise<ContextBundle> {
  if (!featureFlags.enableMemoryVault) {
    return {
      memories: [],
      episodicContext: [],
      retrievalTimeMs: 0,
    };
  }

  const startTime = Date.now();

  try {
    // Retrieve memories using @osqr/core
    const retrievedMemories = await MemoryVault.retrieveContextForUser(workspaceId, query, {
      maxTokens: (options?.maxMemories || 10) * 500, // Estimate tokens per memory
      minRelevance: options?.minRelevance || 0.5,
      categories: options?.categories as MemoryCategory[] | undefined,
    });

    // Convert to our interface format
    const memories: MemorySearchResult[] = retrievedMemories.map((mem: RetrievedMemory) => {
      // RetrievedMemory.memory can be SemanticMemory or EpisodicSummary
      const memory = mem.memory;
      if ('content' in memory) {
        // It's a SemanticMemory
        return {
          content: memory.content,
          relevanceScore: mem.relevanceScore,
          category: memory.category,
          createdAt: new Date(memory.createdAt),
          source: memory.source?.sourceId || 'unknown',
        };
      } else {
        // It's an EpisodicSummary
        return {
          content: memory.summary,
          relevanceScore: mem.relevanceScore,
          category: 'episodic',
          createdAt: new Date(memory.timestamp),
          source: memory.conversationId || 'unknown',
        };
      }
    });

    return {
      memories,
      episodicContext: [],
      retrievalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[OSQR] Memory retrieval failed:', error);
    return {
      memories: [],
      episodicContext: [],
      retrievalTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Store a message in the conversation history
 */
export function storeMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  if (!featureFlags.enableMemoryVault) {
    return;
  }

  try {
    MemoryVault.storeMessage(conversationId, {
      role,
      content,
      timestamp: new Date(),
      tokens: Math.ceil(content.length / 4), // Rough estimate
      toolCalls: null,
      utilityScore: null,
    });
  } catch (error) {
    console.error('[OSQR] Message storage failed:', error);
  }
}

/**
 * Search memories with optional filters
 */
export async function searchMemories(
  workspaceId: string,
  query: string,
  filters?: Record<string, unknown>
): Promise<MemorySearchResult[]> {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }

  try {
    const memories = await MemoryVault.searchUserMemories(workspaceId, query, {
      categories: filters?.categories as MemoryCategory[] | undefined,
      minConfidence: filters?.minConfidence as number | undefined,
      minUtility: filters?.minUtility as number | undefined,
      createdAfter: filters?.createdAfter as Date | undefined,
      createdBefore: filters?.createdBefore as Date | undefined,
    });

    return memories.map((mem: SemanticMemory) => ({
      content: mem.content,
      relevanceScore: 1.0, // Search doesn't return relevance by default
      category: mem.category,
      createdAt: new Date(mem.createdAt),
      source: mem.source?.sourceId || 'unknown',
    }));
  } catch (error) {
    console.error('[OSQR] Memory search failed:', error);
    return [];
  }
}

/**
 * Format memories for inclusion in a prompt
 */
export function formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
  if (memories.length === 0) {
    return '';
  }

  const formatted = memories
    .map((mem, i) => {
      const date = mem.createdAt.toLocaleDateString();
      return `[${i + 1}] (${mem.category}, ${date}, relevance: ${(mem.relevanceScore * 100).toFixed(0)}%)\n${mem.content}`;
    })
    .join('\n\n');

  return `## Relevant Memories\n\n${formatted}`;
}

/**
 * Format episodic context (conversation turns) for a prompt
 */
export function formatEpisodicForPrompt(episodic: string[]): string {
  if (episodic.length === 0) {
    return '';
  }

  return `## Recent Context\n\n${episodic.join('\n\n')}`;
}

/**
 * Get formatted context string ready for prompt injection
 */
export async function getFormattedContext(
  query: string,
  workspaceId: string
): Promise<string> {
  if (!featureFlags.enableMemoryVault) {
    return '';
  }

  const context = await getContextForQuery(query, workspaceId);

  const parts: string[] = [];

  if (context.memories.length > 0) {
    parts.push(formatMemoriesForPrompt(context.memories));
  }

  if (context.episodicContext.length > 0) {
    parts.push(formatEpisodicForPrompt(context.episodicContext));
  }

  return parts.join('\n\n');
}

/**
 * Store message with additional source context
 */
export function storeMessageWithContext(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  context: SourceContext
): void {
  if (!featureFlags.enableMemoryVault) {
    return;
  }

  try {
    // First store the message
    MemoryVault.storeMessage(conversationId, {
      role,
      content,
      timestamp: context.timestamp,
      tokens: Math.ceil(content.length / 4), // Rough estimate
      toolCalls: null,
      utilityScore: null,
    });

    // Add source context for cross-project features
    if (context.projectId) {
      MemoryVault.addSourceContext(conversationId, {
        projectId: context.projectId,
        conversationId: context.conversationId,
        documentId: context.documentId,
        interface: context.interface,
        timestamp: context.timestamp,
      });
    }
  } catch (error) {
    console.error('[OSQR] Message storage with context failed:', error);
  }
}

/**
 * Get conversation history
 */
export function getConversationHistory(
  conversationId: string,
  limit?: number
): Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }

  try {
    const messages = MemoryVault.getConversationHistory(conversationId, limit);
    return messages
      .filter((msg: Message) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: Message) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
  } catch (error) {
    console.error('[OSQR] Conversation history retrieval failed:', error);
    return [];
  }
}

// ============================================================================
// Cross-Project Features (Enterprise)
// ============================================================================

/**
 * Query memories across multiple projects
 * Note: This is an Enterprise feature
 */
export async function queryCrossProject(
  workspaceId: string,
  query: string,
  options?: {
    projectIds?: string[];
    includeConversations?: boolean;
    includeDocuments?: boolean;
    timeRange?: { start: Date; end: Date };
    limit?: number;
    detectContradictions?: boolean;
  }
): Promise<CrossProjectResult> {
  if (!featureFlags.enableCrossProjectMemory) {
    return {
      memories: [],
      commonThemes: [],
      contradictions: [],
      projectSummaries: new Map(),
    };
  }

  try {
    const result = await MemoryVault.queryCrossProject({
      query,
      userId: workspaceId,
      projectIds: options?.projectIds,
      includeConversations: options?.includeConversations,
      includeDocuments: options?.includeDocuments,
      timeRange: options?.timeRange,
      limit: options?.limit,
      detectContradictions: options?.detectContradictions,
    });

    // Convert to our interface format
    type CrossProjectMemory = typeof result.memories[0];
    const memories = result.memories.map((r: CrossProjectMemory) => {
      const mem = r.memory;
      return {
        memory: {
          content: mem.content,
          relevanceScore: r.relevance,
          category: mem.category,
          createdAt: new Date(mem.createdAt),
          source: mem.source?.sourceId || 'unknown',
        },
        relevance: r.relevance,
        project: r.project,
      };
    });

    // Convert contradictions
    type Contradiction = typeof result.contradictions[0];
    const contradictions = result.contradictions.map((c: Contradiction) => ({
      memoryId: c.memoryId,
      contradictingMemoryId: c.contradictingMemoryId,
      topic: c.topic,
      claimA: c.claimA,
      claimB: c.claimB,
      confidence: c.confidence,
    }));

    return {
      memories,
      commonThemes: result.commonThemes,
      contradictions,
      projectSummaries: result.projectSummaries,
    };
  } catch (error) {
    console.error('[OSQR] Cross-project query failed:', error);
    return {
      memories: [],
      commonThemes: [],
      contradictions: [],
      projectSummaries: new Map(),
    };
  }
}

/**
 * Find related memories from other projects
 */
export async function findRelatedFromOtherProjects(
  currentProjectId: string,
  query: string,
  limit?: number
): Promise<MemorySearchResult[]> {
  if (!featureFlags.enableCrossProjectMemory) {
    return [];
  }

  try {
    const related = await MemoryVault.findRelatedFromOtherProjects(currentProjectId, query, limit);

    // findRelatedFromOtherProjects returns SemanticMemoryWithContext[] directly
    type RelatedMemory = typeof related[0];
    return related.map((mem: RelatedMemory) => ({
      content: mem.content,
      relevanceScore: mem.utilityScore || 0.5, // Use utility score as proxy for relevance
      category: mem.category,
      createdAt: new Date(mem.createdAt),
      source: mem.sourceContext?.projectId || 'unknown',
    }));
  } catch (error) {
    console.error('[OSQR] Find related from other projects failed:', error);
    return [];
  }
}

/**
 * Format cross-project results for prompt inclusion
 */
export function formatCrossProjectForPrompt(
  results: CrossProjectResult,
  currentProjectId?: string
): string {
  if (results.memories.length === 0) {
    return '';
  }

  const parts: string[] = ['## Cross-Project Context'];

  // Group memories by project
  const byProject = new Map<string, typeof results.memories>();
  for (const item of results.memories) {
    const projectId = item.project || 'unknown';
    if (!byProject.has(projectId)) {
      byProject.set(projectId, []);
    }
    byProject.get(projectId)!.push(item);
  }

  for (const [projectId, memories] of byProject) {
    if (projectId === currentProjectId) continue;

    parts.push(`\n### From Project: ${projectId}`);
    for (const { memory, relevance } of memories) {
      parts.push(`- (${(relevance * 100).toFixed(0)}% relevant) ${memory.content}`);
    }
  }

  // Add common themes
  if (results.commonThemes.length > 0) {
    parts.push('\n### Common Themes');
    parts.push(results.commonThemes.map((t) => `- ${t}`).join('\n'));
  }

  // Add contradictions warning
  if (results.contradictions.length > 0) {
    parts.push('\n### Potential Contradictions');
    for (const c of results.contradictions) {
      parts.push(`- Topic: ${c.topic}`);
      parts.push(`  - Claim A: ${c.claimA}`);
      parts.push(`  - Claim B: ${c.claimB}`);
    }
  }

  return parts.join('\n');
}

/**
 * Get context with optional cross-project enrichment
 */
export async function getContextWithCrossProject(
  query: string,
  workspaceId: string,
  options?: {
    currentProjectId?: string;
    maxMemories?: number;
    categories?: string[];
    minRelevance?: number;
    includeCrossProject?: boolean;
  }
): Promise<ContextBundle & { crossProjectContext?: string }> {
  // Get standard context first
  const baseContext = await getContextForQuery(query, workspaceId, {
    maxMemories: options?.maxMemories,
    categories: options?.categories,
    minRelevance: options?.minRelevance,
  });

  // Optionally enrich with cross-project
  if (options?.includeCrossProject && featureFlags.enableCrossProjectMemory) {
    const crossProject = await queryCrossProject(workspaceId, query, {
      projectIds: options.currentProjectId ? undefined : undefined,
      detectContradictions: true,
    });

    const crossProjectContext = formatCrossProjectForPrompt(
      crossProject,
      options.currentProjectId
    );

    return {
      ...baseContext,
      crossProjectContext,
    };
  }

  return baseContext;
}

/**
 * Get statistics about cross-project memory usage
 */
export function getCrossProjectStats(): {
  memoriesWithContext: number;
  totalCrossReferences: number;
  unresolvedContradictions: number;
} {
  if (!featureFlags.enableCrossProjectMemory) {
    return {
      memoriesWithContext: 0,
      totalCrossReferences: 0,
      unresolvedContradictions: 0,
    };
  }

  try {
    const stats = MemoryVault.getCrossProjectStats();
    return {
      memoriesWithContext: stats.memoriesWithContext,
      totalCrossReferences: stats.totalCrossReferences,
      unresolvedContradictions: stats.unresolvedContradictions,
    };
  } catch (error) {
    console.error('[OSQR] Cross-project stats failed:', error);
    return {
      memoriesWithContext: 0,
      totalCrossReferences: 0,
      unresolvedContradictions: 0,
    };
  }
}
