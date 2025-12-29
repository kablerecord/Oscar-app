/**
 * Semantic Answer Cache Service (Phase 3)
 *
 * Remembers Q&A pairs to avoid re-computing answers.
 * Supports both exact match (hash-based, O(1)) and similar match (vector-based).
 *
 * Key capabilities:
 * - Exact match lookup via SHA-256 hash
 * - Similar match lookup via vector similarity
 * - Global cache (OSQR-wide) and User cache (per-user)
 * - LRU eviction to enforce size limits
 * - Cache hit tracking for analytics
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { createHash } from 'crypto'
import { prisma } from '../db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '../ai/embeddings'

// =============================================================================
// TYPES
// =============================================================================

export interface CacheHit {
  id: string
  questionText: string
  answerText: string
  scope: 'GLOBAL' | 'USER'
  matchType: 'EXACT' | 'SIMILAR'
  similarityScore: number
  confidenceScore: number
  needsValidation: boolean
  createdAt: Date
  lastValidatedAt: Date
  hitCount: number
  sourceDocumentIds: string[]
}

export interface CacheOptions {
  scope: 'GLOBAL' | 'USER'
  userId?: string
  sourceDocumentIds?: string[]
  conversationId?: string
  confidenceScore?: number
}

export interface CacheStats {
  totalEntries: number
  globalEntries: number
  userEntries: number
  validEntries: number
  invalidEntries: number
  avgConfidence: number
  totalHits: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EXACT_MATCH_WEIGHT = 1.0
const SIMILAR_MATCH_THRESHOLD = 0.85 // Minimum similarity for similar match
const VALIDATION_AGE_DAYS = 7 // Validate if older than this
const CONFIDENCE_VALIDATION_THRESHOLD = 0.7 // Validate if confidence below this
const USER_CACHE_LIMIT = 500 // Max entries per user
const GLOBAL_CACHE_LIMIT = 200 // Max global entries

// Filler words to remove for normalization
const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
  'please', 'thanks', 'thank you', 'hey', 'hi', 'hello', 'ok', 'okay',
  'so', 'well', 'just', 'really', 'very', 'quite', 'pretty',
])

// =============================================================================
// CACHE LOOKUP
// =============================================================================

/**
 * Find a cached answer for a question
 *
 * Flow:
 * 1. Normalize question
 * 2. Compute hash for exact match
 * 3. Check exact match (O(1))
 * 4. If no exact match, compute embedding
 * 5. Vector similarity search
 * 6. Return best match with validation flag
 */
export async function findCachedAnswer(
  question: string,
  userId: string,
  options: {
    includeGlobal?: boolean
    maxAgeDays?: number
    minConfidence?: number
  } = {}
): Promise<CacheHit | null> {
  const {
    includeGlobal = true,
    maxAgeDays = 30,
    minConfidence = 0.5,
  } = options

  // Normalize question
  const normalizedQuestion = normalizeQuestion(question)
  const questionHash = hashQuestion(normalizedQuestion)

  // Build scope conditions
  const scopeConditions = includeGlobal
    ? [{ scope: 'USER' as const, userId }, { scope: 'GLOBAL' as const }]
    : [{ scope: 'USER' as const, userId }]

  // Check for exact match first (fast path)
  const exactMatch = await prisma.answerCache.findFirst({
    where: {
      questionHash,
      isValid: true,
      OR: scopeConditions,
      confidenceScore: { gte: minConfidence },
      createdAt: { gte: new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000) },
    },
  })

  if (exactMatch) {
    // Update hit count and last used
    await prisma.answerCache.update({
      where: { id: exactMatch.id },
      data: {
        hitCount: { increment: 1 },
        lastUsedAt: new Date(),
        lastHitAt: new Date(),
      },
    })

    const needsValidation = shouldValidate(exactMatch)

    return {
      id: exactMatch.id,
      questionText: exactMatch.questionText,
      answerText: exactMatch.answerText,
      scope: exactMatch.scope,
      matchType: 'EXACT',
      similarityScore: EXACT_MATCH_WEIGHT,
      confidenceScore: exactMatch.confidenceScore,
      needsValidation,
      createdAt: exactMatch.createdAt,
      lastValidatedAt: exactMatch.lastValidatedAt,
      hitCount: exactMatch.hitCount,
      sourceDocumentIds: exactMatch.sourceDocumentIds,
    }
  }

  // No exact match - try similar match with embeddings
  const queryEmbedding = await generateEmbedding(normalizedQuestion)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  // Build scope filter for raw query
  const scopeFilter = includeGlobal
    ? `(scope = 'USER' AND "userId" = '${userId}') OR scope = 'GLOBAL'`
    : `scope = 'USER' AND "userId" = '${userId}'`

  const similarMatches = await prisma.$queryRaw<{
    id: string
    questionText: string
    answerText: string
    scope: 'GLOBAL' | 'USER'
    confidenceScore: number
    createdAt: Date
    lastValidatedAt: Date
    hitCount: number
    sourceDocumentIds: string[]
    similarity: number
  }[]>`
    SELECT
      id,
      "questionText",
      "answerText",
      scope::"AnswerCacheScope" as scope,
      "confidenceScore",
      "createdAt",
      "lastValidatedAt",
      "hitCount",
      "sourceDocumentIds",
      1 - ("questionEmbedding" <=> ${embeddingStr}::vector) as similarity
    FROM "AnswerCache"
    WHERE "isValid" = true
    AND "confidenceScore" >= ${minConfidence}
    AND "createdAt" >= ${new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)}
    AND "questionEmbedding" IS NOT NULL
    AND (${scopeFilter})
    ORDER BY "questionEmbedding" <=> ${embeddingStr}::vector
    LIMIT 1
  `

  if (similarMatches.length > 0 && similarMatches[0].similarity >= SIMILAR_MATCH_THRESHOLD) {
    const match = similarMatches[0]

    // Update hit count
    await prisma.answerCache.update({
      where: { id: match.id },
      data: {
        hitCount: { increment: 1 },
        lastUsedAt: new Date(),
        lastHitAt: new Date(),
      },
    })

    // Similar matches always need validation if old
    const needsValidation = true // Always validate similar matches

    return {
      id: match.id,
      questionText: match.questionText,
      answerText: match.answerText,
      scope: match.scope,
      matchType: 'SIMILAR',
      similarityScore: match.similarity,
      confidenceScore: match.confidenceScore,
      needsValidation,
      createdAt: match.createdAt,
      lastValidatedAt: match.lastValidatedAt,
      hitCount: match.hitCount,
      sourceDocumentIds: match.sourceDocumentIds,
    }
  }

  return null
}

/**
 * Check if a cache entry needs validation
 */
function shouldValidate(entry: {
  lastValidatedAt: Date
  confidenceScore: number
}): boolean {
  const daysSinceValidation = (Date.now() - entry.lastValidatedAt.getTime()) / (1000 * 60 * 60 * 24)

  return (
    daysSinceValidation > VALIDATION_AGE_DAYS ||
    entry.confidenceScore < CONFIDENCE_VALIDATION_THRESHOLD
  )
}

// =============================================================================
// CACHE STORAGE
// =============================================================================

/**
 * Store a new answer in the cache
 */
export async function cacheAnswer(
  question: string,
  answer: string,
  options: CacheOptions
): Promise<string> {
  const {
    scope,
    userId,
    sourceDocumentIds = [],
    conversationId,
    confidenceScore = 1.0,
  } = options

  // Validate scope/userId
  if (scope === 'USER' && !userId) {
    throw new Error('userId required for USER scope cache')
  }

  // Normalize and hash
  const normalizedQuestion = normalizeQuestion(question)
  const questionHash = hashQuestion(normalizedQuestion)

  // Generate embedding
  const embedding = await generateEmbedding(normalizedQuestion)
  const embeddingStr = formatEmbeddingForPostgres(embedding)

  // Check if entry already exists
  const existing = await prisma.answerCache.findUnique({
    where: {
      scope_questionHash: {
        scope,
        questionHash,
      },
    },
  })

  if (existing) {
    // Update existing entry
    await prisma.answerCache.update({
      where: { id: existing.id },
      data: {
        answerText: answer,
        confidenceScore,
        lastValidatedAt: new Date(),
        isValid: true,
        invalidatedAt: null,
        invalidationReason: null,
        sourceDocumentIds,
        sourceConversationId: conversationId,
      },
    })

    // Update embedding
    await prisma.$executeRaw`
      UPDATE "AnswerCache"
      SET "questionEmbedding" = ${embeddingStr}::vector
      WHERE id = ${existing.id}
    `

    return existing.id
  }

  // Enforce cache limits before inserting
  if (scope === 'USER' && userId) {
    await enforceCacheLimit(userId, 'USER', USER_CACHE_LIMIT)
  } else if (scope === 'GLOBAL') {
    await enforceCacheLimit(null, 'GLOBAL', GLOBAL_CACHE_LIMIT)
  }

  // Create new entry
  const entry = await prisma.answerCache.create({
    data: {
      scope,
      userId: scope === 'USER' ? userId : null,
      questionHash,
      questionText: normalizedQuestion,
      answerText: answer,
      confidenceScore,
      sourceDocumentIds,
      sourceConversationId: conversationId,
    },
  })

  // Set embedding
  await prisma.$executeRaw`
    UPDATE "AnswerCache"
    SET "questionEmbedding" = ${embeddingStr}::vector
    WHERE id = ${entry.id}
  `

  console.log(`[AnswerCache] Cached ${scope} answer: ${question.slice(0, 50)}...`)

  return entry.id
}

/**
 * Enforce cache size limit using LRU eviction
 */
async function enforceCacheLimit(
  userId: string | null,
  scope: 'GLOBAL' | 'USER',
  limit: number
): Promise<void> {
  const whereClause = scope === 'USER' && userId
    ? { scope, userId }
    : { scope }

  const count = await prisma.answerCache.count({ where: whereClause })

  if (count >= limit) {
    // Find oldest entries to evict (LRU)
    const toEvict = await prisma.answerCache.findMany({
      where: whereClause,
      orderBy: { lastUsedAt: 'asc' },
      take: Math.max(1, count - limit + 10), // Evict 10 extra to avoid frequent evictions
      select: { id: true },
    })

    if (toEvict.length > 0) {
      // Log invalidation events
      await prisma.cacheInvalidationEvent.createMany({
        data: toEvict.map(e => ({
          cacheEntryId: e.id,
          triggerType: 'LRU_EVICTION',
          reason: `Cache limit reached (${limit})`,
        })),
      })

      // Delete entries
      await prisma.answerCache.deleteMany({
        where: { id: { in: toEvict.map(e => e.id) } },
      })

      console.log(`[AnswerCache] Evicted ${toEvict.length} LRU entries for ${scope}`)
    }
  }
}

// =============================================================================
// INVALIDATION
// =============================================================================

/**
 * Invalidate cache entries that cite a specific document
 */
export async function invalidateByDocument(documentId: string): Promise<number> {
  // Find entries that cite this document
  const entries = await prisma.answerCache.findMany({
    where: {
      sourceDocumentIds: { has: documentId },
      isValid: true,
    },
    select: { id: true },
  })

  if (entries.length === 0) return 0

  // Log invalidation events
  await prisma.cacheInvalidationEvent.createMany({
    data: entries.map(e => ({
      cacheEntryId: e.id,
      triggerType: 'DOCUMENT_CHANGE',
      triggerSource: documentId,
      reason: 'Source document was modified',
    })),
  })

  // Invalidate entries
  await prisma.answerCache.updateMany({
    where: { id: { in: entries.map(e => e.id) } },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidationReason: 'Source document modified',
    },
  })

  console.log(`[AnswerCache] Invalidated ${entries.length} entries citing document: ${documentId}`)

  return entries.length
}

/**
 * Invalidate cache entries related to a topic
 */
export async function invalidateByTopic(
  userId: string,
  topic: string
): Promise<number> {
  // Generate topic embedding
  const topicEmbedding = await generateEmbedding(topic)
  const embeddingStr = formatEmbeddingForPostgres(topicEmbedding)

  // Find similar entries
  const similarEntries = await prisma.$queryRaw<{ id: string; similarity: number }[]>`
    SELECT id, 1 - ("questionEmbedding" <=> ${embeddingStr}::vector) as similarity
    FROM "AnswerCache"
    WHERE "isValid" = true
    AND ("userId" = ${userId} OR scope = 'GLOBAL')
    AND "questionEmbedding" IS NOT NULL
    AND 1 - ("questionEmbedding" <=> ${embeddingStr}::vector) > 0.75
  `

  if (similarEntries.length === 0) return 0

  // Log invalidation events
  await prisma.cacheInvalidationEvent.createMany({
    data: similarEntries.map(e => ({
      cacheEntryId: e.id,
      triggerType: 'DOCUMENT_ADDED',
      triggerSource: topic,
      reason: `New information on topic: ${topic}`,
    })),
  })

  // Invalidate entries
  await prisma.answerCache.updateMany({
    where: { id: { in: similarEntries.map(e => e.id) } },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidationReason: `New information on topic: ${topic}`,
    },
  })

  console.log(`[AnswerCache] Invalidated ${similarEntries.length} entries on topic: ${topic}`)

  return similarEntries.length
}

/**
 * Invalidate stale entries (confidence below threshold)
 * Run as a daily cron job
 */
export async function invalidateStale(): Promise<number> {
  const staleThreshold = 0.3 // Invalidate if confidence drops below this

  const staleEntries = await prisma.answerCache.findMany({
    where: {
      isValid: true,
      confidenceScore: { lt: staleThreshold },
    },
    select: { id: true },
  })

  if (staleEntries.length === 0) return 0

  // Log invalidation events
  await prisma.cacheInvalidationEvent.createMany({
    data: staleEntries.map(e => ({
      cacheEntryId: e.id,
      triggerType: 'TIME_DECAY',
      reason: `Confidence decayed below ${staleThreshold}`,
    })),
  })

  // Invalidate
  await prisma.answerCache.updateMany({
    where: { id: { in: staleEntries.map(e => e.id) } },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidationReason: 'Confidence decayed',
    },
  })

  console.log(`[AnswerCache] Invalidated ${staleEntries.length} stale entries`)

  return staleEntries.length
}

/**
 * Manually evict LRU entries for a user
 */
export async function evictLRU(userId: string, count: number = 10): Promise<number> {
  const toEvict = await prisma.answerCache.findMany({
    where: { userId, scope: 'USER' },
    orderBy: { lastUsedAt: 'asc' },
    take: count,
    select: { id: true },
  })

  if (toEvict.length === 0) return 0

  await prisma.cacheInvalidationEvent.createMany({
    data: toEvict.map(e => ({
      cacheEntryId: e.id,
      triggerType: 'LRU_EVICTION',
      reason: 'Manual LRU eviction',
    })),
  })

  await prisma.answerCache.deleteMany({
    where: { id: { in: toEvict.map(e => e.id) } },
  })

  return toEvict.length
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(userId?: string): Promise<CacheStats> {
  const baseWhere = userId ? { userId } : {}

  const [total, global, user, valid, invalid, avgConf, hits] = await Promise.all([
    prisma.answerCache.count({ where: baseWhere }),
    prisma.answerCache.count({ where: { ...baseWhere, scope: 'GLOBAL' } }),
    prisma.answerCache.count({ where: { ...baseWhere, scope: 'USER' } }),
    prisma.answerCache.count({ where: { ...baseWhere, isValid: true } }),
    prisma.answerCache.count({ where: { ...baseWhere, isValid: false } }),
    prisma.answerCache.aggregate({
      where: { ...baseWhere, isValid: true },
      _avg: { confidenceScore: true },
    }),
    prisma.answerCache.aggregate({
      where: baseWhere,
      _sum: { hitCount: true },
    }),
  ])

  return {
    totalEntries: total,
    globalEntries: global,
    userEntries: user,
    validEntries: valid,
    invalidEntries: invalid,
    avgConfidence: avgConf._avg.confidenceScore || 0,
    totalHits: hits._sum.hitCount || 0,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize a question for consistent hashing
 */
function normalizeQuestion(question: string): string {
  let normalized = question
    .toLowerCase()
    .trim()
    // Remove punctuation at end
    .replace(/[?!.]+$/, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')

  // Remove filler words
  for (const filler of FILLER_WORDS) {
    normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'gi'), ' ')
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

/**
 * Generate SHA-256 hash of a question
 */
function hashQuestion(normalizedQuestion: string): string {
  return createHash('sha256').update(normalizedQuestion).digest('hex')
}
