/**
 * OSQR Memory Vault - Cross-Project Query Engine
 *
 * Enables unified awareness across all projects, treating organizational
 * structures as metadata rather than knowledge boundaries.
 */

import type {
  SemanticMemory,
  SemanticMemoryWithContext,
  SourceContext,
  CrossReference,
  ContradictionDetection,
  CrossProjectQueryOptions,
  CrossProjectQueryResult,
  MemoryCategory,
} from './types';

import * as semanticStore from './stores/semantic.store';
import * as episodicStore from './stores/episodic.store';
import { generateEmbedding, cosineSimilarity } from './retrieval/embedding';

// ============================================================================
// Cross-Reference Store
// ============================================================================

const sourceContexts = new Map<string, SourceContext>();
const crossReferences = new Map<string, CrossReference[]>();
const detectedContradictions: ContradictionDetection[] = [];

// ============================================================================
// Context Management
// ============================================================================

/**
 * Add source context to a memory
 */
export function addSourceContext(
  memoryId: string,
  context: SourceContext
): void {
  sourceContexts.set(memoryId, context);
}

/**
 * Get source context for a memory
 */
export function getSourceContext(memoryId: string): SourceContext | null {
  return sourceContexts.get(memoryId) || null;
}

/**
 * Add a cross-reference between memories
 */
export function addCrossReference(
  memoryId: string,
  reference: CrossReference
): void {
  const existing = crossReferences.get(memoryId) || [];
  existing.push(reference);
  crossReferences.set(memoryId, existing);
}

/**
 * Get cross-references for a memory
 */
export function getCrossReferences(memoryId: string): CrossReference[] {
  return crossReferences.get(memoryId) || [];
}

/**
 * Convert a semantic memory to one with context
 */
export function enrichWithContext(
  memory: SemanticMemory
): SemanticMemoryWithContext {
  return {
    ...memory,
    sourceContext: sourceContexts.get(memory.id) || {
      projectId: null,
      conversationId: null,
      documentId: null,
      interface: 'web',
      timestamp: memory.createdAt,
    },
    crossReferences: crossReferences.get(memory.id) || [],
  };
}

// ============================================================================
// Cross-Project Query
// ============================================================================

/**
 * Query memories across all projects
 */
export async function queryCrossProject(
  options: CrossProjectQueryOptions
): Promise<CrossProjectQueryResult> {
  const {
    query,
    projectIds,
    includeConversations = true,
    includeDocuments = true,
    timeRange,
    limit = 20,
    detectContradictions: shouldDetect = true,
  } = options;

  // Get query embedding
  const { embedding: queryEmbedding } = await generateEmbedding(query);

  // Get all memories
  let memories = semanticStore.getAllMemories();

  // Filter by time range if specified
  if (timeRange) {
    memories = memories.filter(
      (m) => m.createdAt >= timeRange.start && m.createdAt <= timeRange.end
    );
  }

  // Filter by project if specified
  if (projectIds && projectIds.length > 0) {
    memories = memories.filter((m) => {
      const context = sourceContexts.get(m.id);
      return context && projectIds.includes(context.projectId || '');
    });
  }

  // Calculate relevance scores
  const scored = memories.map((memory) => {
    const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
    const context = sourceContexts.get(memory.id);
    return {
      memory: enrichWithContext(memory),
      relevance: similarity,
      project: context?.projectId || null,
    };
  });

  // Sort by relevance and limit
  const topResults = scored
    .filter((s) => s.relevance > 0.5)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  // Extract common themes
  const commonThemes = extractCommonThemes(topResults.map((r) => r.memory));

  // Detect contradictions if requested
  let contradictions: ContradictionDetection[] = [];
  if (shouldDetect) {
    contradictions = await detectContradictions(topResults.map((r) => r.memory));
  }

  // Generate project summaries
  const projectSummaries = generateProjectSummaries(topResults);

  return {
    memories: topResults,
    commonThemes,
    contradictions,
    projectSummaries,
  };
}

/**
 * Find memories from a different project that relate to the current context
 */
export async function findRelatedFromOtherProjects(
  currentProjectId: string,
  query: string,
  limit = 5
): Promise<SemanticMemoryWithContext[]> {
  const { embedding: queryEmbedding } = await generateEmbedding(query);

  const memories = semanticStore.getAllMemories();

  const otherProjectMemories = memories.filter((m) => {
    const context = sourceContexts.get(m.id);
    return context && context.projectId !== currentProjectId;
  });

  const scored = otherProjectMemories.map((memory) => ({
    memory: enrichWithContext(memory),
    similarity: cosineSimilarity(queryEmbedding, memory.embedding),
  }));

  return scored
    .filter((s) => s.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((s) => s.memory);
}

// ============================================================================
// Contradiction Detection
// ============================================================================

/**
 * Detect contradictions between memories
 */
export async function detectContradictions(
  memories: SemanticMemoryWithContext[]
): Promise<ContradictionDetection[]> {
  const contradictions: ContradictionDetection[] = [];

  // Group memories by topic
  const byTopic = new Map<string, SemanticMemoryWithContext[]>();

  for (const memory of memories) {
    for (const topic of memory.metadata.topics) {
      const existing = byTopic.get(topic) || [];
      existing.push(memory);
      byTopic.set(topic, existing);
    }
  }

  // Check for contradictions within each topic
  for (const [topic, topicMemories] of byTopic) {
    if (topicMemories.length < 2) continue;

    for (let i = 0; i < topicMemories.length; i++) {
      for (let j = i + 1; j < topicMemories.length; j++) {
        const memA = topicMemories[i];
        const memB = topicMemories[j];

        // Check if they're from different projects
        const projectA = memA.sourceContext.projectId;
        const projectB = memB.sourceContext.projectId;

        if (projectA !== projectB) {
          // Check for semantic contradiction
          const isContradiction = await checkContradiction(memA, memB);

          if (isContradiction.isContradiction) {
            contradictions.push({
              memoryId: memA.id,
              contradictingMemoryId: memB.id,
              topic,
              claimA: extractClaim(memA.content),
              claimB: extractClaim(memB.content),
              confidence: isContradiction.confidence,
              detectedAt: new Date(),
              resolvedAt: null,
              resolution: null,
            });
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Check if two memories contradict each other
 */
async function checkContradiction(
  memA: SemanticMemory,
  memB: SemanticMemory
): Promise<{ isContradiction: boolean; confidence: number }> {
  // Look for contradiction indicators
  const negationPatterns = [
    /\bnot\b/i,
    /\bnever\b/i,
    /\bdon't\b/i,
    /\bdoesn't\b/i,
    /\bwon't\b/i,
    /\bcan't\b/i,
    /\bshouldn't\b/i,
    /\binstead of\b/i,
    /\brather than\b/i,
  ];

  // Extract key assertions
  const assertionA = memA.content.toLowerCase();
  const assertionB = memB.content.toLowerCase();

  // Check for opposite assertions
  let contradictionSignals = 0;

  // Check if one has negation and the other doesn't for similar content
  const hasNegationA = negationPatterns.some((p) => p.test(assertionA));
  const hasNegationB = negationPatterns.some((p) => p.test(assertionB));

  if (hasNegationA !== hasNegationB) {
    // One is negated, check similarity of subject
    const similarity = cosineSimilarity(memA.embedding, memB.embedding);
    if (similarity > 0.7) {
      contradictionSignals++;
    }
  }

  // Check for mutually exclusive terms
  const exclusivePairs = [
    ['increase', 'decrease'],
    ['before', 'after'],
    ['yes', 'no'],
    ['accept', 'reject'],
    ['approve', 'deny'],
    ['start', 'stop'],
    ['begin', 'end'],
    ['more', 'less'],
  ];

  for (const [termA, termB] of exclusivePairs) {
    if (
      (assertionA.includes(termA) && assertionB.includes(termB)) ||
      (assertionA.includes(termB) && assertionB.includes(termA))
    ) {
      contradictionSignals++;
    }
  }

  const isContradiction = contradictionSignals > 0;
  const confidence = Math.min(1, contradictionSignals * 0.4);

  return { isContradiction, confidence };
}

function extractClaim(content: string): string {
  // Extract the main claim from content (first sentence or first 100 chars)
  const firstSentence = content.split(/[.!?]/)[0];
  return firstSentence.length > 100
    ? firstSentence.slice(0, 100) + '...'
    : firstSentence;
}

// ============================================================================
// Theme Extraction
// ============================================================================

/**
 * Extract common themes from a set of memories
 */
function extractCommonThemes(memories: SemanticMemoryWithContext[]): string[] {
  const topicCounts = new Map<string, number>();

  for (const memory of memories) {
    for (const topic of memory.metadata.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  // Return topics that appear in at least 2 memories
  return Array.from(topicCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
}

/**
 * Generate summaries for each project in results
 */
function generateProjectSummaries(
  results: Array<{ memory: SemanticMemoryWithContext; project: string | null }>
): Map<string, string> {
  const summaries = new Map<string, string>();
  const byProject = new Map<string, SemanticMemoryWithContext[]>();

  // Group by project
  for (const result of results) {
    const projectId = result.project || 'unassigned';
    const existing = byProject.get(projectId) || [];
    existing.push(result.memory);
    byProject.set(projectId, existing);
  }

  // Generate summary for each project
  for (const [projectId, memories] of byProject) {
    const topics = new Set<string>();
    for (const memory of memories) {
      memory.metadata.topics.forEach((t) => topics.add(t));
    }

    const topicList = Array.from(topics).slice(0, 5).join(', ');
    summaries.set(
      projectId,
      `${memories.length} relevant memories. Topics: ${topicList || 'none'}`
    );
  }

  return summaries;
}

// ============================================================================
// Cross-Reference Discovery
// ============================================================================

/**
 * Discover cross-references for a memory
 */
export async function discoverCrossReferences(
  memoryId: string
): Promise<CrossReference[]> {
  const memory = semanticStore.getMemory(memoryId);
  if (!memory) return [];

  const allMemories = semanticStore.getAllMemories();
  const references: CrossReference[] = [];

  for (const other of allMemories) {
    if (other.id === memoryId) continue;

    const similarity = cosineSimilarity(memory.embedding, other.embedding);

    if (similarity > 0.75) {
      const otherContext = sourceContexts.get(other.id);

      // Determine relationship type
      let relationshipType: CrossReference['relationshipType'] = 'related';

      if (memory.metadata.contradicts.includes(other.id)) {
        relationshipType = 'contradicts';
      } else if (memory.metadata.supersedes.includes(other.id)) {
        relationshipType = 'extends';
      } else if (similarity > 0.9) {
        relationshipType = 'supports';
      }

      references.push({
        targetMemoryId: other.id,
        targetProjectId: otherContext?.projectId || null,
        relationshipType,
        strength: similarity,
        discoveredAt: new Date(),
        discoveredBy: 'system',
      });
    }
  }

  // Store the references
  crossReferences.set(memoryId, references);

  return references;
}

/**
 * Resolve a contradiction
 */
export function resolveContradiction(
  memoryId: string,
  contradictingMemoryId: string,
  resolution: ContradictionDetection['resolution']
): boolean {
  const index = detectedContradictions.findIndex(
    (c) =>
      (c.memoryId === memoryId && c.contradictingMemoryId === contradictingMemoryId) ||
      (c.memoryId === contradictingMemoryId && c.contradictingMemoryId === memoryId)
  );

  if (index >= 0) {
    detectedContradictions[index].resolvedAt = new Date();
    detectedContradictions[index].resolution = resolution;

    // If superseded, mark in semantic store
    if (resolution === 'superseded') {
      semanticStore.markSupersession(memoryId, contradictingMemoryId);
    }

    return true;
  }

  return false;
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Clear all cross-project data (for testing)
 */
export function clearCrossProjectData(): void {
  sourceContexts.clear();
  crossReferences.clear();
  detectedContradictions.length = 0;
}

/**
 * Get statistics
 */
export function getCrossProjectStats(): {
  memoriesWithContext: number;
  totalCrossReferences: number;
  unresolvedContradictions: number;
} {
  let totalRefs = 0;
  for (const refs of crossReferences.values()) {
    totalRefs += refs.length;
  }

  return {
    memoriesWithContext: sourceContexts.size,
    totalCrossReferences: totalRefs,
    unresolvedContradictions: detectedContradictions.filter((c) => !c.resolvedAt).length,
  };
}
