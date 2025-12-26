# Document Indexing Consolidation Plan

**Status:** Ready for Implementation
**Date:** December 2024
**Estimated Effort:** 3-4 focused sessions

---

## Problem Statement

OSQR has **two parallel document indexing systems**:

| System | Location | Embeddings | Storage | Status |
|--------|----------|------------|---------|--------|
| **app-web** | `packages/app-web/lib/` | ✅ Real OpenAI | ✅ pgvector | Working |
| **@osqr/core DIS** | `packages/core/src/document-indexing/` | ❌ Mock | ❌ In-memory | Stub |

This creates:
- Duplicate code paths
- Inconsistent behavior
- Wasted engineering effort
- The @osqr/core DIS abstraction layer is unused

---

## Goal

**Consolidate into ONE system** where:

1. **@osqr/core DIS** = The abstraction layer (interfaces, pipeline orchestration)
2. **app-web implementations** = The real implementations (OpenAI, pgvector)
3. **Single entry point** = `indexDocumentToVault()` routes through DIS pipeline
4. **All storage** = Goes through Prisma/pgvector (no in-memory maps)

---

## Architecture After Consolidation

```
┌─────────────────────────────────────────────────────────────┐
│                    API Entry Points                          │
│  /api/vault/upload  │  /api/oscar/ask  │  /api/chat/...     │
└──────────┬──────────┴────────┬─────────┴────────┬───────────┘
           │                   │                  │
           ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              lib/osqr/index.ts (Unified Interface)          │
│  indexDocumentToVault()  │  searchDocuments()  │  ...       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                @osqr/core Document Indexing                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Detection   │→ │  Extraction  │→ │   Chunking   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│          │                                    │              │
│          ▼                                    ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Relationships│← │   Storage    │← │  Embedding   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                           │                                  │
│                           │ ADAPTER INTERFACE                │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          app-web Implementations (Real Services)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EmbeddingAdapter (lib/ai/embeddings.ts)              │   │
│  │  - generateEmbedding() → OpenAI API                   │   │
│  │  - generateEmbeddings() → Batch OpenAI                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  StorageAdapter (lib/osqr/storage-adapter.ts)         │   │
│  │  - storeDocument() → Prisma Document table            │   │
│  │  - storeChunk() → Prisma DocumentChunk + pgvector     │   │
│  │  - storeRelationship() → Prisma DocumentRelation      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SearchAdapter (lib/knowledge/vector-search.ts)       │   │
│  │  - vectorSearch() → pgvector cosine similarity        │   │
│  │  - hybridSearch() → pgvector + keyword                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Adapter Interface in @osqr/core

**Goal:** Define clean interfaces that @osqr/core uses, but app-web implements.

**Files to Create/Modify:**

1. **`packages/core/src/document-indexing/adapters/types.ts`** (NEW)
   ```typescript
   export interface EmbeddingAdapter {
     embed(text: string): Promise<number[]>
     embedBatch(texts: string[]): Promise<number[][]>
   }

   export interface StorageAdapter {
     storeDocument(doc: IndexedDocument): Promise<string>
     storeChunks(chunks: DocumentChunk[]): Promise<void>
     storeRelationships(docId: string, relationships: RelationshipMap): Promise<void>
     getDocument(id: string): Promise<IndexedDocument | null>
     getUserDocuments(userId: string): Promise<IndexedDocument[]>
     deleteDocument(id: string): Promise<void>
     searchByEmbedding(embedding: number[], options: SearchOptions): Promise<SearchResult[]>
   }

   export interface LLMAdapter {
     generateSummary(text: string): Promise<string>
     generateQuestions(text: string): Promise<string[]>
     extractEntities(text: string): Promise<EntityReference[]>
   }
   ```

2. **`packages/core/src/document-indexing/adapters/index.ts`** (NEW)
   ```typescript
   let embeddingAdapter: EmbeddingAdapter | null = null
   let storageAdapter: StorageAdapter | null = null
   let llmAdapter: LLMAdapter | null = null

   export function registerEmbeddingAdapter(adapter: EmbeddingAdapter) {
     embeddingAdapter = adapter
   }

   export function getEmbeddingAdapter(): EmbeddingAdapter {
     if (!embeddingAdapter) throw new Error('No embedding adapter registered')
     return embeddingAdapter
   }
   // ... similar for storage and LLM
   ```

3. **Update `packages/core/src/document-indexing/embedding/multi-vector.ts`**
   - Remove `mockEmbed()` function
   - Use `getEmbeddingAdapter().embed()` instead
   - Keep the multi-vector logic (content, contextual, queryable)

4. **Update `packages/core/src/document-indexing/storage/document-store.ts`**
   - Remove in-memory `Map<>` stores
   - Use `getStorageAdapter()` methods instead
   - Keep the query logic (retrieveByConcept, etc.)

---

### Phase 2: Implement Adapters in app-web

**Goal:** Create concrete implementations that use existing app-web infrastructure.

**Files to Create:**

1. **`packages/app-web/lib/osqr/adapters/embedding-adapter.ts`** (NEW)
   ```typescript
   import { generateEmbedding, generateEmbeddings } from '@/lib/ai/embeddings'
   import type { EmbeddingAdapter } from '@osqr/core'

   export const openAIEmbeddingAdapter: EmbeddingAdapter = {
     async embed(text: string): Promise<number[]> {
       return generateEmbedding(text)
     },
     async embedBatch(texts: string[]): Promise<number[][]> {
       return generateEmbeddings(texts)
     }
   }
   ```

2. **`packages/app-web/lib/osqr/adapters/storage-adapter.ts`** (NEW)
   ```typescript
   import { prisma } from '@/lib/db/prisma'
   import { formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
   import type { StorageAdapter, IndexedDocument, DocumentChunk } from '@osqr/core'

   export const prismaStorageAdapter: StorageAdapter = {
     async storeDocument(doc: IndexedDocument): Promise<string> {
       const record = await prisma.document.create({
         data: {
           id: doc.id,
           workspaceId: doc.userId, // Map userId → workspaceId
           title: doc.filename,
           textContent: doc.content,
           sourceType: doc.sourceInterface,
           metadata: {
             topics: doc.topics,
             entities: doc.entities,
             summary: doc.summary,
             sourceProjectId: doc.sourceProjectId,
             sourceConversationId: doc.sourceConversationId,
           }
         }
       })
       return record.id
     },

     async storeChunks(chunks: DocumentChunk[]): Promise<void> {
       for (const chunk of chunks) {
         const embeddingStr = formatEmbeddingForPostgres(chunk.embedding)
         await prisma.$executeRaw`
           INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
           VALUES (${chunk.id}, ${chunk.documentId}, ${chunk.content}, ${chunk.position.index}, ${embeddingStr}::vector, NOW())
         `
       }
     },

     async searchByEmbedding(embedding: number[], options): Promise<SearchResult[]> {
       // Use existing vectorSearch logic
     }
     // ... other methods
   }
   ```

3. **`packages/app-web/lib/osqr/adapters/llm-adapter.ts`** (NEW)
   ```typescript
   import OpenAI from 'openai'
   import type { LLMAdapter } from '@osqr/core'

   export const openAILLMAdapter: LLMAdapter = {
     async generateSummary(text: string): Promise<string> {
       // Use GPT-4o-mini for cost efficiency
       const response = await openai.chat.completions.create({
         model: 'gpt-4o-mini',
         messages: [
           { role: 'system', content: 'Summarize the following text in 2-3 sentences.' },
           { role: 'user', content: text.slice(0, 5000) }
         ]
       })
       return response.choices[0].message.content || ''
     },

     async generateQuestions(text: string): Promise<string[]> {
       // Generate hypothetical questions for multi-vector embeddings
     },

     async extractEntities(text: string): Promise<EntityReference[]> {
       // NER extraction
     }
   }
   ```

4. **`packages/app-web/lib/osqr/adapters/index.ts`** (NEW)
   ```typescript
   import { registerEmbeddingAdapter, registerStorageAdapter, registerLLMAdapter } from '@osqr/core'
   import { openAIEmbeddingAdapter } from './embedding-adapter'
   import { prismaStorageAdapter } from './storage-adapter'
   import { openAILLMAdapter } from './llm-adapter'

   export function initializeOSQRAdapters() {
     registerEmbeddingAdapter(openAIEmbeddingAdapter)
     registerStorageAdapter(prismaStorageAdapter)
     registerLLMAdapter(openAILLMAdapter)
   }
   ```

---

### Phase 3: Update Upload Flow

**Goal:** Single processing path through @osqr/core DIS.

**Modify `packages/app-web/app/api/vault/upload/route.ts`:**

```typescript
// Remove duplicate chunking/embedding code (lines 296-378)
// Replace with:

import { indexDocument } from '@osqr/core/document-indexing'
import { initializeOSQRAdapters } from '@/lib/osqr/adapters'

// Initialize adapters once at startup
initializeOSQRAdapters()

// In POST handler, replace manual processing with:
const indexedDoc = await indexDocument(
  {
    path: file.name,
    filename: file.name,
    filetype: detectDocumentType(file.name) || 'plaintext',
    content: fileContent,
    size: file.size,
    mtime: new Date(),
    ctime: new Date(),
  },
  session?.user?.email || workspaceId,
  {
    interface: 'web',
    projectId: project.id,
  }
)

// The DIS pipeline now handles:
// - Detection ✓
// - Extraction ✓
// - Chunking (semantic) ✓
// - Embedding (via adapter → OpenAI) ✓
// - Relationships ✓
// - Storage (via adapter → Prisma/pgvector) ✓
```

---

### Phase 4: Add Conversation Indexing

**Goal:** Index chat messages with embeddings for semantic search.

**Create `packages/app-web/lib/knowledge/conversation-indexer.ts`:**

```typescript
import { indexDocument } from '@osqr/core/document-indexing'

export async function indexConversationWithEmbeddings(params: {
  workspaceId: string
  threadId: string
  messages: Array<{ role: string; content: string }>
}) {
  // Format conversation as markdown
  const content = params.messages
    .map(m => `**${m.role}:** ${m.content}`)
    .join('\n\n')

  await indexDocument(
    {
      filename: `conversation-${params.threadId}.md`,
      content,
      filetype: 'markdown',
      // ...
    },
    params.workspaceId,
    {
      interface: 'web',
      conversationId: params.threadId,
    }
  )
}
```

---

### Phase 5: Decision Persistence

**Goal:** Wire temporal intelligence to actually persist decisions.

**Create `packages/app-web/lib/decisions/persister.ts`:**

```typescript
import { prisma } from '@/lib/db/prisma'
import type { ExtractedCommitment } from '@osqr/core'

export async function persistDecisions(
  workspaceId: string,
  userId: string,
  conversationId: string,
  commitments: ExtractedCommitment[]
) {
  for (const commitment of commitments) {
    await prisma.decision.create({
      data: {
        workspaceId,
        userId,
        conversationId,
        text: commitment.what,
        source: 'web',
        context: {
          when: commitment.when,
          confidence: commitment.confidence,
          originalText: commitment.originalText,
        }
      }
    })
  }
}
```

**Update `packages/app-web/app/api/oscar/ask/route.ts` (lines 986-1012):**

```typescript
// Replace console.log with actual persistence:
if (commitments.length > 0) {
  await persistDecisions(workspaceId, userId, thread.id, commitments)
}
```

---

## Schema Changes Required

**Add to `packages/app-web/prisma/schema.prisma`:**

```prisma
// Relationship tracking between documents
model DocumentRelation {
  id              String   @id @default(cuid())
  sourceDocId     String
  targetDocId     String
  relationType    String   // 'similar', 'references', 'supersedes', 'contradicts'
  similarity      Float?   // For 'similar' type
  createdAt       DateTime @default(now())

  sourceDoc       Document @relation("SourceRelations", fields: [sourceDocId], references: [id], onDelete: Cascade)
  targetDoc       Document @relation("TargetRelations", fields: [targetDocId], references: [id], onDelete: Cascade)

  @@index([sourceDocId])
  @@index([targetDocId])
  @@unique([sourceDocId, targetDocId, relationType])
}

// Extend Document model
model Document {
  // ... existing fields ...

  // DIS metadata
  topics          String[]
  entities        Json?
  summary         String?
  utilityScore    Float    @default(0.5)
  retrievalCount  Int      @default(0)

  // Relationships
  sourceRelations DocumentRelation[] @relation("SourceRelations")
  targetRelations DocumentRelation[] @relation("TargetRelations")
}

// Extend DocumentChunk model
model DocumentChunk {
  // ... existing fields ...

  // DIS metadata
  isDecision      Boolean  @default(false)
  isQuestion      Boolean  @default(false)
  isAction        Boolean  @default(false)
  headingContext  String[]
  tokenCount      Int?
}
```

---

## Migration Steps

1. **Run schema migration** after adding new fields
2. **Backfill existing documents** with new metadata (topics, summary, etc.)
3. **Backfill existing chunks** with semantic flags (isDecision, etc.)
4. **Build relationship graph** for existing documents

---

## Configuration Alignment

**Sync `packages/app-web/lib/osqr/config.ts`:**

```typescript
export const documentIndexingConfig = {
  // Align with @osqr/core defaults
  maxChunkSize: 500,        // Was 1000, align with core
  chunkOverlap: 50,         // Was 100, align with core
  embeddingModel: 'text-embedding-ada-002',  // Keep ada-002 (proven)
  embeddingDimensions: 1536,
  generateQuestions: true,   // Enable multi-vector
  extractEntities: true,     // Enable NER
  supportedTypes: ['markdown', 'plaintext', 'code', 'json', 'yaml', 'html', 'pdf', 'docx'],
}
```

---

## Success Criteria

- [ ] `mockEmbed()` completely removed from @osqr/core
- [ ] All in-memory `Map<>` stores removed from @osqr/core
- [ ] Upload flow uses single DIS pipeline (no duplicate processing)
- [ ] Conversations are indexed with real embeddings
- [ ] Decisions are persisted (not just logged)
- [ ] Semantic search works across documents AND conversations
- [ ] Relationship detection creates `DocumentRelation` records
- [ ] All existing tests pass
- [ ] New integration tests for consolidated system

---

## Files to Delete After Consolidation

Once consolidation is complete, these become redundant:

- `packages/app-web/lib/knowledge/chunker.ts` → Use @osqr/core chunking
- `packages/app-web/lib/knowledge/auto-index.ts` → Use @osqr/core pipeline
- Duplicate chunking logic in `api/vault/upload/route.ts` (lines 296-378)

---

## Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Adapter interfaces in @osqr/core | 1-2 hours |
| 2 | Implement adapters in app-web | 2-3 hours |
| 3 | Update upload flow | 1-2 hours |
| 4 | Conversation indexing | 1 hour |
| 5 | Decision persistence | 30 minutes |
| Schema | Migration + backfill | 1 hour |

**Total: ~8-10 hours of focused work**

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (adapter interfaces)
3. Test incrementally after each phase
4. Monitor for regressions in existing functionality
