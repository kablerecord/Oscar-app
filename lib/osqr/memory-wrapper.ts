/**
 * Memory Vault Wrapper for oscar-app
 *
 * Wraps the @osqr/core Memory Vault for use in oscar-app.
 * This provides cross-session memory, semantic search, and cross-project awareness.
 *
 * Cross-Project Extension: Queries search across all projects by default,
 * treating organizational structures as metadata rather than knowledge boundaries.
 */

import { MemoryVault } from '@osqr/core';
import { vaultConfig, featureFlags } from './config';

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

// Cross-project types
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

/**
 * Initialize memory vault for a user/workspace.
 */
export function initializeVault(workspaceId: string): void {
  if (!featureFlags.enableMemoryVault) return;

  try {
    MemoryVault.initializeVault(workspaceId);
  } catch (error) {
    console.error('[MemoryVault] Initialization error:', error);
  }
}

/**
 * Retrieve relevant context for a query.
 */
export async function getContextForQuery(
  query: string,
  workspaceId: string,
  options?: {
    maxMemories?: number;
    categories?: MemoryVault.MemoryCategory[];
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
    // retrieveContextForUser returns RetrievedMemory[] directly
    const retrievedMemories = await MemoryVault.retrieveContextForUser(workspaceId, query, {
      maxTokens: (options?.maxMemories || vaultConfig.defaultRetrievalLimit) * 100,
      categories: options?.categories,
      minRelevance: options?.minRelevance || vaultConfig.minUtilityThreshold,
    });

    // Get episodic context (recent messages from conversation history)
    const messages = MemoryVault.getConversationHistory(workspaceId, 5);

    return {
      memories: retrievedMemories.map((m: MemoryVault.RetrievedMemory) => ({
        content: 'content' in m.memory ? (m.memory as MemoryVault.SemanticMemory).content : (m.memory as MemoryVault.EpisodicSummary).summary,
        relevanceScore: m.relevanceScore,
        category: 'category' in m.memory ? (m.memory as MemoryVault.SemanticMemory).category : 'episodic',
        createdAt: 'createdAt' in m.memory ? (m.memory as MemoryVault.SemanticMemory).createdAt : (m.memory as MemoryVault.EpisodicSummary).timestamp,
        source: 'source' in m.memory ? String((m.memory as MemoryVault.SemanticMemory).source) : 'conversation',
      })),
      episodicContext: messages.map((m: MemoryVault.Message) => m.content),
      retrievalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[MemoryVault] Retrieval error:', error);
    return {
      memories: [],
      episodicContext: [],
      retrievalTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Store a conversation message.
 */
export function storeMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  if (!featureFlags.enableMemoryVault) return;

  try {
    // storeMessage expects Omit<Message, 'id'>
    const message: Omit<MemoryVault.Message, 'id'> = {
      role,
      content,
      timestamp: new Date(),
      tokens: Math.ceil(content.length / 4), // Rough estimate
      toolCalls: null,
      utilityScore: null,
    };
    MemoryVault.storeMessage(conversationId, message);
  } catch (error) {
    console.error('[MemoryVault] Store message error:', error);
  }
}

/**
 * Search for specific memories.
 */
export async function searchMemories(
  workspaceId: string,
  query: string,
  filters?: MemoryVault.MemoryFilters
): Promise<MemorySearchResult[]> {
  if (!featureFlags.enableMemoryVault) return [];

  try {
    const results = await MemoryVault.searchUserMemories(workspaceId, query, filters);
    return results.map((m: MemoryVault.SemanticMemory) => ({
      content: m.content,
      relevanceScore: m.utilityScore,
      category: m.category,
      createdAt: m.createdAt,
      source: String(m.source),
    }));
  } catch (error) {
    console.error('[MemoryVault] Search error:', error);
    return [];
  }
}

/**
 * Format memories for inclusion in a prompt.
 */
export function formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
  if (memories.length === 0) return '';

  const lines = memories.map((m, i) => `${i + 1}. ${m.content} (${m.category})`);

  return `## Relevant Past Context\n${lines.join('\n')}`;
}

/**
 * Format episodic context for inclusion in a prompt.
 */
export function formatEpisodicForPrompt(episodic: string[]): string {
  if (episodic.length === 0) return '';

  return `## Recent Conversation Summaries\n${episodic.join('\n---\n')}`;
}

/**
 * Get full formatted context for a prompt.
 */
export async function getFormattedContext(
  query: string,
  workspaceId: string
): Promise<string> {
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

// ============================================================================
// Cross-Project Memory Functions
// ============================================================================

/**
 * Store a message with project context for cross-project awareness.
 */
export function storeMessageWithContext(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  context: SourceContext
): void {
  if (!featureFlags.enableMemoryVault) return;

  try {
    // First store the message normally
    const message: Omit<MemoryVault.Message, 'id'> = {
      role,
      content,
      timestamp: new Date(),
      tokens: Math.ceil(content.length / 4),
      toolCalls: null,
      utilityScore: null,
    };
    const storedMessage = MemoryVault.storeMessage(conversationId, message);

    // Then add source context for cross-project tracking
    if (storedMessage) {
      MemoryVault.addSourceContext(storedMessage.id, {
        projectId: context.projectId,
        conversationId: context.conversationId,
        documentId: context.documentId,
        interface: context.interface,
        timestamp: context.timestamp,
      });
    }
  } catch (error) {
    console.error('[MemoryVault] Store message with context error:', error);
  }
}

/**
 * Query memories across all projects.
 * This is the main cross-project search function.
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
  if (!featureFlags.enableMemoryVault) {
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
      includeConversations: options?.includeConversations ?? true,
      includeDocuments: options?.includeDocuments ?? true,
      timeRange: options?.timeRange,
      limit: options?.limit || 20,
      detectContradictions: options?.detectContradictions ?? true,
    });

    return {
      memories: result.memories.map((m) => ({
        memory: {
          content: m.memory.content,
          relevanceScore: m.relevance,
          category: m.memory.category,
          createdAt: m.memory.createdAt,
          source: String(m.memory.source),
        },
        relevance: m.relevance,
        project: m.project,
      })),
      commonThemes: result.commonThemes,
      contradictions: result.contradictions.map((c) => ({
        memoryId: c.memoryId,
        contradictingMemoryId: c.contradictingMemoryId,
        topic: c.topic,
        claimA: c.claimA,
        claimB: c.claimB,
        confidence: c.confidence,
      })),
      projectSummaries: result.projectSummaries,
    };
  } catch (error) {
    console.error('[MemoryVault] Cross-project query error:', error);
    return {
      memories: [],
      commonThemes: [],
      contradictions: [],
      projectSummaries: new Map(),
    };
  }
}

/**
 * Find related memories from other projects.
 * Useful for surfacing cross-project connections.
 */
export async function findRelatedFromOtherProjects(
  currentProjectId: string,
  query: string,
  limit: number = 5
): Promise<MemorySearchResult[]> {
  if (!featureFlags.enableMemoryVault) {
    return [];
  }

  try {
    const results = await MemoryVault.findRelatedFromOtherProjects(
      currentProjectId,
      query,
      limit
    );

    return results.map((m) => ({
      content: m.content,
      relevanceScore: m.utilityScore,
      category: m.category,
      createdAt: m.createdAt,
      source: String(m.source),
    }));
  } catch (error) {
    console.error('[MemoryVault] Find related error:', error);
    return [];
  }
}

/**
 * Format cross-project results for inclusion in a prompt.
 */
export function formatCrossProjectForPrompt(
  results: CrossProjectResult,
  currentProjectId?: string
): string {
  if (results.memories.length === 0) return '';

  const parts: string[] = [];

  // Group by project
  const byProject = new Map<string, typeof results.memories>();
  for (const mem of results.memories) {
    const projectKey = mem.project || 'General';
    if (!byProject.has(projectKey)) {
      byProject.set(projectKey, []);
    }
    byProject.get(projectKey)!.push(mem);
  }

  // Format each project's memories
  for (const [projectId, memories] of byProject) {
    const isCurrentProject = projectId === currentProjectId;
    const header = isCurrentProject
      ? '### Current Project Context'
      : `### Related from "${projectId}"`;

    const lines = memories.map(
      (m, i) => `${i + 1}. ${m.memory.content} (${m.memory.category})`
    );

    parts.push(`${header}\n${lines.join('\n')}`);
  }

  // Add common themes if any
  if (results.commonThemes.length > 0) {
    parts.push(`\n### Common Themes\n${results.commonThemes.join(', ')}`);
  }

  // Note any contradictions
  if (results.contradictions.length > 0) {
    const contradictionNotes = results.contradictions.map(
      (c) =>
        `- **${c.topic}**: "${c.claimA}" vs "${c.claimB}" (${Math.round(c.confidence * 100)}% confidence)`
    );
    parts.push(`\n### Potential Contradictions\n${contradictionNotes.join('\n')}`);
  }

  return `## Cross-Project Memory Context\n\n${parts.join('\n\n')}`;
}

/**
 * Get context for a query with cross-project awareness.
 * Enhanced version of getContextForQuery that includes cross-project results.
 */
export async function getContextWithCrossProject(
  query: string,
  workspaceId: string,
  options?: {
    currentProjectId?: string;
    maxMemories?: number;
    categories?: MemoryVault.MemoryCategory[];
    minRelevance?: number;
    includeCrossProject?: boolean;
  }
): Promise<ContextBundle & { crossProjectContext?: string }> {
  // Get standard context
  const standardContext = await getContextForQuery(query, workspaceId, {
    maxMemories: options?.maxMemories,
    categories: options?.categories,
    minRelevance: options?.minRelevance,
  });

  // If cross-project is disabled or not requested, return standard
  if (!options?.includeCrossProject || !featureFlags.enableMemoryVault) {
    return standardContext;
  }

  // Get cross-project results
  const crossProjectResults = await queryCrossProject(workspaceId, query, {
    limit: 10,
    detectContradictions: true,
  });

  // Format for prompt
  const crossProjectContext = formatCrossProjectForPrompt(
    crossProjectResults,
    options?.currentProjectId
  );

  return {
    ...standardContext,
    crossProjectContext: crossProjectContext || undefined,
  };
}

/**
 * Get cross-project statistics.
 */
export function getCrossProjectStats(): {
  memoriesWithContext: number;
  totalCrossReferences: number;
  unresolvedContradictions: number;
} {
  if (!featureFlags.enableMemoryVault) {
    return {
      memoriesWithContext: 0,
      totalCrossReferences: 0,
      unresolvedContradictions: 0,
    };
  }

  try {
    return MemoryVault.getCrossProjectStats();
  } catch (error) {
    console.error('[MemoryVault] Cross-project stats error:', error);
    return {
      memoriesWithContext: 0,
      totalCrossReferences: 0,
      unresolvedContradictions: 0,
    };
  }
}
