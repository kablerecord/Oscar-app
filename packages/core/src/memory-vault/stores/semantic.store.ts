/**
 * Semantic Store - Long-term Memory Storage
 *
 * Manages semantic memory: facts, knowledge, and learned information.
 * This is the "what I know" memory type.
 * Supports optional Chroma persistence for data durability.
 */

import type {
  SemanticStore,
  SemanticMemory,
  SemanticMetadata,
  MemoryCategory,
  MemorySource,
  MemoryFilters,
  UtilityUpdate,
} from '../types';

// In-memory storage (always used for fast access)
const memories = new Map<string, SemanticMemory>();
const collectionName = 'osqr_semantic';

// Persistence state
let persistenceEnabled = false;
let chromaCollection: unknown = null;
let userId: string | undefined;

// Encryption state
let encryptionEnabled = false;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Persistence Control
// ============================================================================

/**
 * Enable Chroma persistence
 * Call this after initializing Chroma to enable data durability
 * @param userIdParam - User ID for collection isolation
 * @param enableEncryptionParam - Enable encryption at rest (requires userIdParam)
 */
export async function enablePersistence(
  userIdParam?: string,
  enableEncryptionParam: boolean = false
): Promise<void> {
  const { initializeChroma, getOrCreateCollection } = await import('../chroma');

  await initializeChroma();
  userId = userIdParam;
  chromaCollection = await getOrCreateCollection('semantic', userId);
  persistenceEnabled = true;

  // Enable encryption if requested and user ID is provided
  if (enableEncryptionParam && userIdParam) {
    const { enableEncryption, KEY_PURPOSES } = await import('../encryption');
    await enableEncryption(userIdParam, KEY_PURPOSES.SEMANTIC_CONTENT);
    encryptionEnabled = true;
  }

  // Load existing data from Chroma
  await loadFromChroma();
}

/**
 * Disable persistence (use in-memory only)
 */
export function disablePersistence(): void {
  persistenceEnabled = false;
  chromaCollection = null;

  if (encryptionEnabled) {
    import('../encryption').then(({ disableEncryption }) => {
      disableEncryption();
    });
    encryptionEnabled = false;
  }
}

/**
 * Check if persistence is enabled
 */
export function isPersistenceEnabled(): boolean {
  return persistenceEnabled;
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled;
}

/**
 * Load all data from Chroma into memory
 */
async function loadFromChroma(): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { queryAll, SEMANTIC_METADATA_SCHEMA, deserializeMetadata } = await import('../chroma');

  const results = await queryAll(chromaCollection as any);

  for (const result of results) {
    const metadata = deserializeMetadata(
      result.metadata as Record<string, string | number | boolean>,
      SEMANTIC_METADATA_SCHEMA
    );

    // Decrypt content if it was encrypted
    let content = result.content;
    if (encryptionEnabled && metadata._encrypted === true) {
      try {
        const { decryptContent } = await import('../encryption');
        const keyId = (metadata._keyId as string) || '';
        content = await decryptContent(result.content, keyId);
      } catch (error) {
        console.error(`Failed to decrypt memory ${result.id}:`, error);
        continue; // Skip this memory if decryption fails
      }
    }

    const memory: SemanticMemory = {
      id: result.id,
      content,
      embedding: result.embedding || [],
      category: metadata.category as MemoryCategory,
      source: metadata.source as MemorySource,
      createdAt: new Date(metadata.createdAt as string),
      lastAccessedAt: new Date(metadata.lastAccessedAt as string),
      accessCount: metadata.accessCount as number,
      utilityScore: metadata.utilityScore as number,
      confidence: metadata.confidence as number,
      metadata: {
        topics: (metadata.topics as string[]) || [],
        relatedMemoryIds: (metadata.relatedMemoryIds as string[]) || [],
        contradicts: (metadata.contradicts as string[]) || [],
        supersedes: (metadata.supersedes as string[]) || [],
      },
    };

    memories.set(memory.id, memory);
  }
}

/**
 * Save a memory to Chroma
 */
async function saveToChroma(memory: SemanticMemory): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  // Encrypt content if encryption is enabled
  let contentToStore = memory.content;
  let encryptionMetadata: Record<string, unknown> = {};

  if (encryptionEnabled) {
    try {
      const { encryptContent } = await import('../encryption');
      const { encryptedContent, keyId } = await encryptContent(memory.content);
      contentToStore = encryptedContent;
      encryptionMetadata = {
        _encrypted: true,
        _keyId: keyId,
      };
    } catch (error) {
      console.error(`Failed to encrypt memory ${memory.id}:`, error);
      throw error; // Re-throw to prevent saving unencrypted data
    }
  }

  const metadata = serializeMetadata({
    category: memory.category,
    source: memory.source,
    createdAt: memory.createdAt,
    lastAccessedAt: memory.lastAccessedAt,
    accessCount: memory.accessCount,
    utilityScore: memory.utilityScore,
    confidence: memory.confidence,
    topics: memory.metadata.topics,
    relatedMemoryIds: memory.metadata.relatedMemoryIds,
    contradicts: memory.metadata.contradicts,
    supersedes: memory.metadata.supersedes,
    ...encryptionMetadata,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: memory.id,
    content: contentToStore,
    embedding: memory.embedding,
    metadata,
  }]);
}

/**
 * Delete a memory from Chroma
 */
async function deleteFromChroma(memoryId: string): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { deleteDocuments } = await import('../chroma');
  await deleteDocuments(chromaCollection as any, [memoryId]);
}

/**
 * Sync all in-memory data to Chroma
 */
export async function syncToChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  for (const memory of memories.values()) {
    await saveToChroma(memory);
  }
}

/**
 * Reload all data from Chroma (discards in-memory changes)
 */
export async function syncFromChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  memories.clear();
  await loadFromChroma();
}

// ============================================================================
// Memory CRUD Operations
// ============================================================================

/**
 * Create a new semantic memory
 */
export function createMemory(
  content: string,
  category: MemoryCategory,
  source: MemorySource,
  embedding: number[] = [],
  confidence: number = 0.8
): SemanticMemory {
  const memory: SemanticMemory = {
    id: generateId(),
    content,
    embedding,
    category,
    source,
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 0,
    utilityScore: 0.5, // Start with neutral utility
    confidence,
    metadata: {
      topics: [],
      relatedMemoryIds: [],
      contradicts: [],
      supersedes: [],
    },
  };

  memories.set(memory.id, memory);

  // Async persist (fire and forget for sync API)
  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Get a memory by ID
 */
export function getMemory(memoryId: string): SemanticMemory | null {
  return memories.get(memoryId) || null;
}

/**
 * Get all memories
 */
export function getAllMemories(): SemanticMemory[] {
  return Array.from(memories.values());
}

/**
 * Update a memory
 */
export function updateMemory(
  memoryId: string,
  updates: Partial<Omit<SemanticMemory, 'id' | 'createdAt'>>
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  const updated: SemanticMemory = {
    ...memory,
    ...updates,
    metadata: updates.metadata
      ? { ...memory.metadata, ...updates.metadata }
      : memory.metadata,
  };

  memories.set(memoryId, updated);

  if (persistenceEnabled) {
    saveToChroma(updated).catch(console.error);
  }

  return updated;
}

/**
 * Delete a memory
 */
export function deleteMemory(memoryId: string): boolean {
  const deleted = memories.delete(memoryId);

  if (deleted && persistenceEnabled) {
    deleteFromChroma(memoryId).catch(console.error);
  }

  return deleted;
}

/**
 * Update memory embedding
 */
export function updateEmbedding(
  memoryId: string,
  embedding: number[]
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  memory.embedding = embedding;
  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

// ============================================================================
// Memory Access Tracking
// ============================================================================

/**
 * Record memory access (updates lastAccessedAt and accessCount)
 */
export function recordAccess(memoryId: string): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  memory.lastAccessedAt = new Date();
  memory.accessCount += 1;
  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Get memories that haven't been accessed since a date
 */
export function getUnretrievedSince(date: Date): SemanticMemory[] {
  return Array.from(memories.values()).filter(
    (m) => m.lastAccessedAt < date
  );
}

// ============================================================================
// Memory Filtering & Search
// ============================================================================

/**
 * Filter memories by criteria
 */
export function filterMemories(filters: MemoryFilters): SemanticMemory[] {
  let results = Array.from(memories.values());

  if (filters.categories && filters.categories.length > 0) {
    results = results.filter((m) => filters.categories!.includes(m.category));
  }

  if (filters.minConfidence !== undefined) {
    results = results.filter((m) => m.confidence >= filters.minConfidence!);
  }

  if (filters.minUtility !== undefined) {
    results = results.filter((m) => m.utilityScore >= filters.minUtility!);
  }

  if (filters.createdAfter) {
    results = results.filter((m) => m.createdAt >= filters.createdAfter!);
  }

  if (filters.createdBefore) {
    results = results.filter((m) => m.createdAt <= filters.createdBefore!);
  }

  return results;
}

/**
 * Get memories by category
 */
export function getByCategory(category: MemoryCategory): SemanticMemory[] {
  return Array.from(memories.values()).filter((m) => m.category === category);
}

/**
 * Get memories by topic
 */
export function getByTopic(topic: string): SemanticMemory[] {
  const lowerTopic = topic.toLowerCase();
  return Array.from(memories.values()).filter((m) =>
    m.metadata.topics.some((t) => t.toLowerCase().includes(lowerTopic))
  );
}

/**
 * Get top memories by utility score
 */
export function getTopByUtility(
  category?: MemoryCategory,
  limit: number = 10
): SemanticMemory[] {
  let results = Array.from(memories.values());

  if (category) {
    results = results.filter((m) => m.category === category);
  }

  return results
    .sort((a, b) => b.utilityScore - a.utilityScore)
    .slice(0, limit);
}

/**
 * Get recent memories
 */
export function getRecent(limit: number = 10): SemanticMemory[] {
  return Array.from(memories.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Search memories by content (simple text search)
 */
export function searchByContent(query: string): SemanticMemory[] {
  const lowerQuery = query.toLowerCase();
  return Array.from(memories.values()).filter((m) =>
    m.content.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// Contradiction & Supersession
// ============================================================================

/**
 * Mark a memory as contradicting another
 */
export function markContradiction(
  memoryId: string,
  contradictsId: string
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  if (!memory.metadata.contradicts.includes(contradictsId)) {
    memory.metadata.contradicts.push(contradictsId);
  }

  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Mark a memory as superseding another
 */
export function markSupersession(
  newMemoryId: string,
  supersedesId: string
): SemanticMemory | null {
  const memory = memories.get(newMemoryId);
  if (!memory) return null;

  if (!memory.metadata.supersedes.includes(supersedesId)) {
    memory.metadata.supersedes.push(supersedesId);
  }

  memories.set(newMemoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Get memories that contradict a given memory
 */
export function getContradictions(memoryId: string): SemanticMemory[] {
  return Array.from(memories.values()).filter(
    (m) =>
      m.metadata.contradicts.includes(memoryId) ||
      memories.get(memoryId)?.metadata.contradicts.includes(m.id)
  );
}

/**
 * Get memories that have been superseded
 */
export function getSuperseded(): SemanticMemory[] {
  const supersededIds = new Set<string>();

  for (const memory of memories.values()) {
    memory.metadata.supersedes.forEach((id) => supersededIds.add(id));
  }

  return Array.from(memories.values()).filter((m) => supersededIds.has(m.id));
}

// ============================================================================
// Related Memories
// ============================================================================

/**
 * Link two memories as related
 */
export function linkMemories(
  memoryId1: string,
  memoryId2: string
): boolean {
  const memory1 = memories.get(memoryId1);
  const memory2 = memories.get(memoryId2);

  if (!memory1 || !memory2) return false;

  if (!memory1.metadata.relatedMemoryIds.includes(memoryId2)) {
    memory1.metadata.relatedMemoryIds.push(memoryId2);
  }
  if (!memory2.metadata.relatedMemoryIds.includes(memoryId1)) {
    memory2.metadata.relatedMemoryIds.push(memoryId1);
  }

  memories.set(memoryId1, memory1);
  memories.set(memoryId2, memory2);

  if (persistenceEnabled) {
    saveToChroma(memory1).catch(console.error);
    saveToChroma(memory2).catch(console.error);
  }

  return true;
}

/**
 * Get related memories
 */
export function getRelatedMemories(memoryId: string): SemanticMemory[] {
  const memory = memories.get(memoryId);
  if (!memory) return [];

  return memory.metadata.relatedMemoryIds
    .map((id) => memories.get(id))
    .filter((m): m is SemanticMemory => m !== undefined);
}

// ============================================================================
// Utility Score Management
// ============================================================================

/**
 * Update utility score for a single memory
 */
export function updateUtilityScore(
  memoryId: string,
  newScore: number
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  memory.utilityScore = Math.max(0, Math.min(1, newScore)); // Clamp to [0, 1]
  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Batch update utility scores
 */
export function batchUpdateUtility(updates: UtilityUpdate[]): number {
  let updated = 0;

  for (const update of updates) {
    const memory = memories.get(update.memoryId);
    if (memory) {
      memory.utilityScore = Math.max(0, Math.min(1, update.newScore));
      memories.set(update.memoryId, memory);

      if (persistenceEnabled) {
        saveToChroma(memory).catch(console.error);
      }

      updated++;
    }
  }

  return updated;
}

/**
 * Apply decay to all memories
 */
export function applyUtilityDecay(decayRate: number): number {
  let updated = 0;

  for (const memory of memories.values()) {
    const decayedScore = memory.utilityScore * (1 - decayRate);
    memory.utilityScore = Math.max(0, decayedScore);
    memories.set(memory.id, memory);

    if (persistenceEnabled) {
      saveToChroma(memory).catch(console.error);
    }

    updated++;
  }

  return updated;
}

// ============================================================================
// Metadata Management
// ============================================================================

/**
 * Add topics to a memory
 */
export function addTopics(
  memoryId: string,
  topics: string[]
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  const existingTopics = new Set(memory.metadata.topics);
  topics.forEach((t) => existingTopics.add(t.toLowerCase()));
  memory.metadata.topics = Array.from(existingTopics);

  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

/**
 * Update memory metadata
 */
export function updateMetadata(
  memoryId: string,
  metadata: Partial<SemanticMetadata>
): SemanticMemory | null {
  const memory = memories.get(memoryId);
  if (!memory) return null;

  memory.metadata = { ...memory.metadata, ...metadata };
  memories.set(memoryId, memory);

  if (persistenceEnabled) {
    saveToChroma(memory).catch(console.error);
  }

  return memory;
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Get the semantic store
 */
export function getSemanticStore(): SemanticStore {
  return {
    memories: Array.from(memories.values()),
    collectionName,
  };
}

/**
 * Get store statistics
 */
export function getStoreStats(): {
  memoryCount: number;
  byCategory: Record<MemoryCategory, number>;
  averageUtility: number;
  averageConfidence: number;
} {
  const allMemories = Array.from(memories.values());

  const byCategory: Record<MemoryCategory, number> = {
    personal_info: 0,
    business_info: 0,
    relationships: 0,
    projects: 0,
    preferences: 0,
    domain_knowledge: 0,
    decisions: 0,
    commitments: 0,
  };

  let totalUtility = 0;
  let totalConfidence = 0;

  for (const memory of allMemories) {
    byCategory[memory.category]++;
    totalUtility += memory.utilityScore;
    totalConfidence += memory.confidence;
  }

  return {
    memoryCount: allMemories.length,
    byCategory,
    averageUtility: allMemories.length > 0 ? totalUtility / allMemories.length : 0,
    averageConfidence:
      allMemories.length > 0 ? totalConfidence / allMemories.length : 0,
  };
}

/**
 * Clear all data (for testing)
 */
export function clearStore(): void {
  memories.clear();
  persistenceEnabled = false;
  chromaCollection = null;
  encryptionEnabled = false;
}

/**
 * Export store data (for GDPR compliance)
 */
export function exportStore(): SemanticStore {
  return getSemanticStore();
}

/**
 * Import memories (for data restoration)
 */
export function importMemories(importedMemories: SemanticMemory[]): number {
  let imported = 0;

  for (const memory of importedMemories) {
    if (!memories.has(memory.id)) {
      memories.set(memory.id, memory);

      if (persistenceEnabled) {
        saveToChroma(memory).catch(console.error);
      }

      imported++;
    }
  }

  return imported;
}

/**
 * Delete all memories (right to be forgotten)
 */
export function deleteAllMemories(): void {
  if (persistenceEnabled) {
    for (const id of memories.keys()) {
      deleteFromChroma(id).catch(console.error);
    }
  }
  memories.clear();
}
