-- Depth-Aware Intelligence System (V1.6)
-- @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
--
-- Creates:
-- - DocumentInventory: Lightweight awareness of vault contents
-- - TopicCluster: Groups related documents for fast relevance detection
-- - AnswerCache: Semantic Q&A cache (exact + similar match)
-- - CacheInvalidationEvent: Audit trail for cache invalidations

-- CreateEnum
CREATE TYPE "AnswerCacheScope" AS ENUM ('GLOBAL', 'USER');

-- CreateEnum
CREATE TYPE "InvalidationTrigger" AS ENUM (
  'TIME_DECAY',
  'DOCUMENT_CHANGE',
  'DOCUMENT_ADDED',
  'USER_CORRECTION',
  'SEMANTIC_CONFLICT',
  'LRU_EVICTION',
  'MANUAL'
);

-- CreateTable: TopicCluster (must be created before DocumentInventory due to FK)
CREATE TABLE "TopicCluster" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "centroid" vector(1536),  -- OpenAI embedding dimension
  "documentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastRebalancedAt" TIMESTAMP(3),
  "documentsSinceRebalance" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "TopicCluster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TopicCluster
CREATE INDEX "TopicCluster_userId_idx" ON "TopicCluster"("userId");

-- CreateTable: DocumentInventory
CREATE TABLE "DocumentInventory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "autoSummary" TEXT NOT NULL,
  "topicTags" TEXT[],
  "topicClusterId" TEXT,
  "clusterCentroid" vector(1536),  -- OpenAI embedding dimension

  CONSTRAINT "DocumentInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: DocumentInventory
CREATE UNIQUE INDEX "DocumentInventory_documentId_key" ON "DocumentInventory"("documentId");
CREATE INDEX "DocumentInventory_userId_idx" ON "DocumentInventory"("userId");
CREATE INDEX "DocumentInventory_topicClusterId_idx" ON "DocumentInventory"("topicClusterId");

-- AddForeignKey: DocumentInventory -> TopicCluster
ALTER TABLE "DocumentInventory" ADD CONSTRAINT "DocumentInventory_topicClusterId_fkey"
  FOREIGN KEY ("topicClusterId") REFERENCES "TopicCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AnswerCache
CREATE TABLE "AnswerCache" (
  "id" TEXT NOT NULL,
  "scope" "AnswerCacheScope" NOT NULL,
  "userId" TEXT,
  "questionHash" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "questionEmbedding" vector(1536),  -- OpenAI embedding dimension
  "answerText" TEXT NOT NULL,
  "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastValidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isValid" BOOLEAN NOT NULL DEFAULT true,
  "invalidatedAt" TIMESTAMP(3),
  "invalidationReason" TEXT,
  "sourceDocumentIds" TEXT[],
  "sourceConversationId" TEXT,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "acceptanceRate" DOUBLE PRECISION,
  "lastHitAt" TIMESTAMP(3),

  CONSTRAINT "AnswerCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: AnswerCache
-- Unique constraint for exact match lookup
CREATE UNIQUE INDEX "AnswerCache_scope_questionHash_key" ON "AnswerCache"("scope", "questionHash");

-- Standard indexes
CREATE INDEX "AnswerCache_userId_idx" ON "AnswerCache"("userId");
CREATE INDEX "AnswerCache_scope_idx" ON "AnswerCache"("scope");
CREATE INDEX "AnswerCache_isValid_idx" ON "AnswerCache"("isValid");

-- LRU eviction index (for finding oldest entries per user)
CREATE INDEX "AnswerCache_userId_lastUsedAt_idx" ON "AnswerCache"("userId", "lastUsedAt");

-- Stale entry detection
CREATE INDEX "AnswerCache_lastHitAt_idx" ON "AnswerCache"("lastHitAt");

-- Hash index for O(1) exact match lookups (Phase 1 optimization)
-- Note: Postgres hash indexes are good for equality comparisons
CREATE INDEX "AnswerCache_questionHash_hash_idx" ON "AnswerCache" USING HASH ("questionHash");

-- Vector index for similar match lookups
-- Using IVFFlat for balance of speed and accuracy at scale
-- Lists = sqrt(expected_rows) is a good starting point; 16 for ~500 entries
CREATE INDEX "AnswerCache_questionEmbedding_idx" ON "AnswerCache"
  USING ivfflat ("questionEmbedding" vector_cosine_ops) WITH (lists = 16);

-- CreateTable: CacheInvalidationEvent
CREATE TABLE "CacheInvalidationEvent" (
  "id" TEXT NOT NULL,
  "cacheEntryId" TEXT NOT NULL,
  "triggerType" "InvalidationTrigger" NOT NULL,
  "triggerSource" TEXT,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CacheInvalidationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: CacheInvalidationEvent
CREATE INDEX "CacheInvalidationEvent_cacheEntryId_idx" ON "CacheInvalidationEvent"("cacheEntryId");
CREATE INDEX "CacheInvalidationEvent_triggerType_idx" ON "CacheInvalidationEvent"("triggerType");
CREATE INDEX "CacheInvalidationEvent_createdAt_idx" ON "CacheInvalidationEvent"("createdAt");

-- AddForeignKey: CacheInvalidationEvent -> AnswerCache
ALTER TABLE "CacheInvalidationEvent" ADD CONSTRAINT "CacheInvalidationEvent_cacheEntryId_fkey"
  FOREIGN KEY ("cacheEntryId") REFERENCES "AnswerCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector index for DocumentInventory cluster centroids
-- Using IVFFlat for relevance scoring
CREATE INDEX "DocumentInventory_clusterCentroid_idx" ON "DocumentInventory"
  USING ivfflat ("clusterCentroid" vector_cosine_ops) WITH (lists = 16);

-- Vector index for TopicCluster centroids
CREATE INDEX "TopicCluster_centroid_idx" ON "TopicCluster"
  USING ivfflat ("centroid" vector_cosine_ops) WITH (lists = 8);
