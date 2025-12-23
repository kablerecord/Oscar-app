# OSQR Document Indexing Subsystem Specification

**Component**: Document Indexing Subsystem (DIS)  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Dependencies**: Memory Vault, Constitutional Framework  
**Priority**: V1.0 Core Requirement

---

## Executive Summary

The Document Indexing Subsystem enables Oscar to maintain unified awareness across all documents created in any conversation, project, or interface. Unlike Claude's siloed project model where context is trapped within individual projects, Oscar treats user organizational structures (projects, folders, chats) as presentation preferences - not knowledge boundaries.

**Core Principle**: The user decides how to organize their work. Oscar decides nothing. He simply knows everything.

---

## Problem Statement

### Current Claude Limitation
```
User: "What did we decide about the payment integration?"
Claude: "I don't have access to previous conversations. Could you share that context?"
User: [frustrated] "We literally discussed this for 3 hours yesterday in a different project."
```

### OSQR Solution
```
User: "What did we decide about the payment integration?"
Oscar: "In our December 15th session, you decided to use Stripe Connect with 
        a 2.9% + $0.30 fee structure. The document 'VoiceQuote_Payment_Spec.md' 
        captures the full implementation plan. Want me to pull the relevant sections?"
```

---

## Architecture

### System Position

```
┌─────────────────────────────────────────────────────────────────────┐
│                      User Interfaces                                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │   Web    │ │ VS Code  │ │  Mobile  │ │  Voice   │              │
│   │  (Chat)  │ │(Builder) │ │  (App)   │ │ (Future) │              │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│        │            │            │            │                     │
│        └────────────┴────────────┴────────────┘                     │
│                           │                                          │
│                           ▼                                          │
│              ┌────────────────────────┐                              │
│              │  Document Indexing     │ ◄── NEW SUBSYSTEM            │
│              │     Subsystem (DIS)    │                              │
│              └───────────┬────────────┘                              │
│                          │                                           │
│                          ▼                                           │
│              ┌────────────────────────┐                              │
│              │     Memory Vault       │                              │
│              │   (Semantic Store)     │                              │
│              └───────────┬────────────┘                              │
│                          │                                           │
│                          ▼                                           │
│              ┌────────────────────────┐                              │
│              │   Chroma Vector DB     │                              │
│              └────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Data Flow

```
Document Created (any interface)
         │
         ▼
┌─────────────────────────────────────────┐
│         INDEXING PIPELINE               │
│                                         │
│  1. Document Detection                  │
│     └─ New file created/modified        │
│                                         │
│  2. Content Extraction                  │
│     └─ Text, structure, metadata        │
│                                         │
│  3. Chunking Strategy                   │
│     └─ Semantic boundaries, not fixed   │
│                                         │
│  4. Multi-Vector Embedding              │
│     └─ Content + Context + Temporal     │
│                                         │
│  5. Relationship Mapping                │
│     └─ Links to conversations, docs     │
│                                         │
│  6. Storage                             │
│     └─ Memory Vault semantic store      │
└─────────────────────────────────────────┘
         │
         ▼
Available across ALL interfaces instantly
```

---

## Key Concepts

### 1. Documents vs Conversations

**Documents** = Discrete artifacts (specs, plans, code, notes)  
**Conversations** = The context in which documents were created

Both get indexed. Both inform retrieval. Neither is privileged.

### 2. Organizational Transparency

User-created organizational structures are metadata, not access controls:

| User Structure | Oscar Treats As |
|----------------|-----------------|
| Project A | Tag: `project:A` |
| Project B | Tag: `project:B` |
| Chat from Dec 15 | Tag: `session:2024-12-15` |
| Folder "Archive" | Tag: `folder:archive` |

Oscar can query across all of these or filter by any of them - user's choice.

### 3. The "Jarvis Standard"

Tony Stark never says "JARVIS, switch to the Iron Man project before answering."

Oscar should never require the user to specify which project contains the information they need. If it exists in any indexed location, Oscar knows it.

---

## Document Types & Handling

### Supported Document Types (v1.0)

| Type | Extension | Extraction Method |
|------|-----------|-------------------|
| Markdown | `.md` | Direct text + structure |
| Plain Text | `.txt` | Direct text |
| Code Files | `.ts`, `.js`, `.py`, etc. | Text + AST metadata |
| JSON/YAML | `.json`, `.yaml` | Structured parse |
| HTML | `.html` | Text extraction + structure |
| PDF | `.pdf` | Text extraction (best effort) |
| Word | `.docx` | Pandoc conversion |

### Document Metadata Schema

```typescript
interface IndexedDocument {
  // Identity
  id: string;                          // Unique document ID
  userId: string;                      // Owner
  
  // Content
  filename: string;
  filetype: string;
  content: string;                     // Extracted text
  chunks: DocumentChunk[];             // Semantic segments
  
  // Origin Context
  sourceInterface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
  sourceConversationId: string | null; // If created in chat
  sourceProjectId: string | null;      // If created in project
  
  // Relationships
  relatedDocuments: string[];          // IDs of related docs
  relatedConversations: string[];      // Conversations that reference this
  parentDocument: string | null;       // If this is a version/derivative
  
  // Temporal
  createdAt: Date;
  modifiedAt: Date;
  lastAccessedAt: Date;
  versionHistory: DocumentVersion[];
  
  // Semantic
  topics: string[];                    // Auto-extracted topics
  entities: EntityReference[];         // People, companies, concepts
  summary: string;                     // AI-generated summary
  
  // Utility Tracking
  retrievalCount: number;              // How often retrieved
  utilityScore: number;                // Did retrievals help?
}

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];                 // Vector embedding
  position: {
    startLine: number;
    endLine: number;
    section: string | null;            // If document has sections
  };
  metadata: {
    headingContext: string[];          // Parent headings
    codeLanguage: string | null;       // If code block
    isDecision: boolean;               // Contains decision
    isQuestion: boolean;               // Contains open question
    isAction: boolean;                 // Contains action item
  };
}
```

---

## Indexing Pipeline

### Stage 1: Document Detection

```typescript
interface DocumentEvent {
  type: 'created' | 'modified' | 'deleted';
  documentPath: string;
  interface: InterfaceType;
  conversationId?: string;
  timestamp: Date;
}

// Triggers indexing pipeline
async function onDocumentEvent(event: DocumentEvent): Promise<void> {
  if (event.type === 'deleted') {
    await removeFromIndex(event.documentPath);
    return;
  }
  
  await indexDocument(event);
}
```

### Stage 2: Content Extraction

```typescript
async function extractContent(
  document: RawDocument
): Promise<ExtractedContent> {
  
  const extractor = getExtractor(document.filetype);
  
  return {
    text: await extractor.getText(document),
    structure: await extractor.getStructure(document),
    metadata: await extractor.getMetadata(document),
    codeBlocks: await extractor.getCodeBlocks(document),
  };
}

// Extractor registry
const extractors: Map<string, DocumentExtractor> = new Map([
  ['md', new MarkdownExtractor()],
  ['txt', new PlainTextExtractor()],
  ['ts', new CodeExtractor('typescript')],
  ['js', new CodeExtractor('javascript')],
  ['py', new CodeExtractor('python')],
  ['json', new JsonExtractor()],
  ['yaml', new YamlExtractor()],
  ['html', new HtmlExtractor()],
  ['pdf', new PdfExtractor()],
  ['docx', new DocxExtractor()],
]);
```

### Stage 3: Semantic Chunking

Unlike fixed-size chunking, we chunk at semantic boundaries:

```typescript
async function chunkDocument(
  content: ExtractedContent
): Promise<DocumentChunk[]> {
  
  const chunks: DocumentChunk[] = [];
  
  // Strategy varies by document type
  if (content.structure.hasHeadings) {
    // Chunk by sections
    chunks.push(...chunkBySections(content));
  } else if (content.codeBlocks.length > 0) {
    // Chunk by code blocks + prose
    chunks.push(...chunkByCodeBlocks(content));
  } else {
    // Chunk by paragraphs with overlap
    chunks.push(...chunkByParagraphs(content, {
      targetSize: 500,      // tokens
      overlap: 50,          // tokens
      preserveSentences: true
    }));
  }
  
  return chunks;
}
```

### Stage 4: Multi-Vector Embedding

Each chunk gets multiple embedding vectors for different retrieval patterns:

```typescript
interface ChunkEmbeddings {
  // Primary content embedding
  content: number[];
  
  // Context-enhanced embedding (includes surrounding context)
  contextual: number[];
  
  // Query-optimized embedding (how users might ask about this)
  queryable: number[];
}

async function generateEmbeddings(
  chunk: DocumentChunk,
  document: IndexedDocument
): Promise<ChunkEmbeddings> {
  
  // Content embedding - just the chunk text
  const content = await embed(chunk.content);
  
  // Contextual - includes document summary + section context
  const contextText = `
    Document: ${document.filename}
    Summary: ${document.summary}
    Section: ${chunk.metadata.headingContext.join(' > ')}
    Content: ${chunk.content}
  `;
  const contextual = await embed(contextText);
  
  // Queryable - hypothetical questions this chunk answers
  const questions = await generateQuestions(chunk.content);
  const queryable = await embed(questions.join('\n'));
  
  return { content, contextual, queryable };
}
```

### Stage 5: Relationship Mapping

```typescript
async function mapRelationships(
  document: IndexedDocument
): Promise<RelationshipMap> {
  
  // Find related conversations
  const conversationLinks = await findConversationReferences(document);
  
  // Find related documents (by content similarity)
  const similarDocs = await findSimilarDocuments(document, {
    threshold: 0.8,
    maxResults: 10
  });
  
  // Find entity references
  const entities = await extractEntities(document.content);
  
  // Find explicit links (URLs, file references)
  const explicitLinks = await findExplicitLinks(document.content);
  
  return {
    conversations: conversationLinks,
    documents: similarDocs,
    entities,
    explicitLinks
  };
}
```

### Stage 6: Storage

```typescript
async function storeDocument(
  document: IndexedDocument,
  chunks: DocumentChunk[],
  relationships: RelationshipMap
): Promise<void> {
  
  // Store document metadata
  await memoryVault.semantic.store({
    id: document.id,
    category: 'document',
    content: document.summary,
    metadata: {
      filename: document.filename,
      filetype: document.filetype,
      topics: document.topics,
      sourceInterface: document.sourceInterface,
      sourceConversationId: document.sourceConversationId,
      sourceProjectId: document.sourceProjectId,
      createdAt: document.createdAt,
    }
  });
  
  // Store each chunk with embeddings
  for (const chunk of chunks) {
    await memoryVault.semantic.store({
      id: chunk.id,
      category: 'document_chunk',
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: {
        documentId: document.id,
        position: chunk.position,
        ...chunk.metadata
      }
    });
  }
  
  // Store relationships
  await memoryVault.semantic.storeRelationships(document.id, relationships);
}
```

---

## Retrieval Patterns

### Pattern 1: Direct Document Query

"What's in the VoiceQuote payment spec?"

```typescript
async function retrieveByDocumentName(
  query: string
): Promise<RetrievalResult[]> {
  
  // Extract document reference from query
  const docRef = await extractDocumentReference(query);
  
  // Find matching documents
  const matches = await memoryVault.semantic.query({
    category: 'document',
    filter: {
      filename: { $contains: docRef }
    }
  });
  
  // Return document summaries + key chunks
  return matches.map(doc => ({
    document: doc,
    relevantChunks: await getKeyChunks(doc.id)
  }));
}
```

### Pattern 2: Concept Query

"What decisions have we made about authentication?"

```typescript
async function retrieveByConcept(
  query: string
): Promise<RetrievalResult[]> {
  
  // Embed the query
  const queryEmbedding = await embed(query);
  
  // Search across all document chunks
  const matches = await memoryVault.semantic.vectorSearch({
    category: 'document_chunk',
    embedding: queryEmbedding,
    filter: {
      'metadata.isDecision': true  // Filter for decision chunks
    },
    limit: 20
  });
  
  // Group by document and return
  return groupByDocument(matches);
}
```

### Pattern 3: Temporal Query

"What did we work on last week?"

```typescript
async function retrieveByTime(
  timeRange: TimeRange
): Promise<RetrievalResult[]> {
  
  // Find documents created/modified in range
  const documents = await memoryVault.semantic.query({
    category: 'document',
    filter: {
      $or: [
        { createdAt: { $gte: timeRange.start, $lte: timeRange.end } },
        { modifiedAt: { $gte: timeRange.start, $lte: timeRange.end } }
      ]
    },
    sort: { modifiedAt: 'desc' }
  });
  
  // Also find conversations from that period
  const conversations = await memoryVault.episodic.query({
    timeRange,
    hasDocuments: true
  });
  
  return { documents, conversations };
}
```

### Pattern 4: Cross-Project Query

"Compare the architecture decisions across VoiceQuote and OSQR"

```typescript
async function retrieveAcrossProjects(
  projects: string[],
  topic: string
): Promise<ComparisonResult> {
  
  const results: Map<string, RetrievalResult[]> = new Map();
  
  for (const project of projects) {
    const projectDocs = await memoryVault.semantic.query({
      category: 'document_chunk',
      filter: {
        'metadata.sourceProjectId': project,
        'metadata.isDecision': true
      },
      embedding: await embed(topic),
      limit: 10
    });
    
    results.set(project, projectDocs);
  }
  
  return {
    byProject: results,
    commonThemes: await findCommonThemes(results),
    differences: await findDifferences(results)
  };
}
```

---

## Integration Points

### Memory Vault Integration

The DIS operates as a specialized input channel to the Memory Vault's semantic store:

```typescript
// DIS writes to Memory Vault
class DocumentIndexingSubsystem {
  private memoryVault: MemoryVault;
  
  async indexDocument(doc: RawDocument): Promise<void> {
    const indexed = await this.processDocument(doc);
    
    // Store via Memory Vault API
    await this.memoryVault.semantic.store({
      type: 'document',
      ...indexed
    });
  }
}

// Memory Vault retrieval includes documents automatically
class MemoryVault {
  async retrieve(query: string): Promise<RetrievalResult[]> {
    // Query spans all semantic content including documents
    return this.semantic.query({
      embedding: await embed(query),
      // No category filter = search everything
    });
  }
}
```

### Conversation Integration

When a conversation references or creates documents:

```typescript
// During conversation processing
async function processConversationTurn(turn: ConversationTurn): Promise<void> {
  // Check for document creation
  if (turn.createdDocuments.length > 0) {
    for (const doc of turn.createdDocuments) {
      await documentIndexer.indexDocument(doc, {
        sourceConversationId: turn.conversationId,
        sourceInterface: turn.interface
      });
    }
  }
  
  // Check for document references
  const references = await extractDocumentReferences(turn.content);
  if (references.length > 0) {
    await documentIndexer.addConversationLinks(
      references,
      turn.conversationId
    );
  }
}
```

### Constitutional Integration

Document access respects constitutional constraints:

```typescript
async function retrieveForPlugin(
  pluginId: string,
  query: string
): Promise<RedactedResult[]> {
  
  // Get plugin permission tier
  const tier = await constitutional.getPluginTier(pluginId);
  
  // Retrieve documents
  const results = await documentIndexer.retrieve(query);
  
  // Apply redaction based on tier
  return results.map(result => 
    constitutional.redact(result, tier)
  );
}
```

---

## Performance Considerations

### Indexing Performance

| Operation | Target Latency | Strategy |
|-----------|---------------|----------|
| Small doc (<10KB) | <1s | Synchronous |
| Medium doc (10KB-1MB) | <5s | Background queue |
| Large doc (>1MB) | <30s | Chunked background |
| Batch re-index | <1min/100 docs | Parallel processing |

### Retrieval Performance

| Query Type | Target Latency | Strategy |
|------------|---------------|----------|
| By name | <100ms | Metadata index |
| Semantic search | <500ms | Vector index + filter |
| Cross-project | <2s | Parallel queries |
| Full history | <5s | Paginated with caching |

### Storage Estimates

| Content Type | Storage Per Unit | Notes |
|--------------|-----------------|-------|
| Document metadata | ~2KB | JSON |
| Chunk + embedding | ~8KB | 1536-dim vector |
| Relationship graph | ~500B/edge | Sparse storage |

For a user with 1000 documents averaging 10 chunks each:
- Metadata: ~2MB
- Chunks: ~80MB
- Relationships: ~5MB
- **Total: ~90MB per user**

---

## Implementation Phases

### Phase 1: Core Pipeline (Week 1-2)
- [ ] Document detection hooks in all interfaces
- [ ] Basic content extraction (md, txt, code)
- [ ] Simple chunking (by paragraph)
- [ ] Single-vector embedding
- [ ] Storage to Memory Vault

### Phase 2: Enhanced Extraction (Week 3)
- [ ] PDF extraction
- [ ] DOCX extraction
- [ ] Semantic chunking
- [ ] Multi-vector embeddings

### Phase 3: Relationship Mapping (Week 4)
- [ ] Conversation linking
- [ ] Document similarity
- [ ] Entity extraction
- [ ] Explicit link detection

### Phase 4: Advanced Retrieval (Week 5)
- [ ] Cross-project queries
- [ ] Temporal queries
- [ ] Comparison queries
- [ ] Utility tracking

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Index coverage | 100% of user documents | Count indexed vs created |
| Retrieval accuracy | >90% relevant in top 5 | User feedback sampling |
| Cross-project success | >85% finds correct doc | Test queries across projects |
| Latency (retrieval) | <500ms p95 | Instrumentation |
| User satisfaction | No "I told you about this" complaints | Support tickets |

---

## Open Questions for Implementation

1. **Embedding model selection**: OpenAI ada-002 vs local models for cost/privacy tradeoff?
2. **Chunk size optimization**: Need to tune based on actual document patterns
3. **Relationship graph storage**: Separate graph DB vs embedded in Chroma metadata?
4. **Version handling**: Full re-index on modification vs incremental?
5. **Deletion propagation**: Hard delete vs soft delete with retention?

---

**End of Specification**

*Document Version: 1.0*  
*Status: Ready for Implementation*  
*Next Review: Post-implementation validation*
