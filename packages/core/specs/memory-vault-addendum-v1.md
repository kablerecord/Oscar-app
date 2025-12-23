# Memory Vault Specification Addendum: Cross-Project Document Awareness

**Component**: Memory Vault (Semantic Store Extension)  
**Version**: 1.0.1  
**Status**: Addendum to Memory Vault Spec v1.0  
**Priority**: V1.0 Core Requirement

---

## Purpose

This addendum extends the Memory Vault specification to explicitly address cross-project document awareness. The core principle:

> **User organizational structures (projects, folders, chats) are presentation preferences, not knowledge boundaries.**

Oscar maintains a unified semantic understanding across all user content regardless of where it was created or stored.

---

## The Unified Knowledge Principle

### What This Means

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER'S ORGANIZATIONAL VIEW                       │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │  Project A   │  │  Project B   │  │   General    │             │
│   │  (VoiceQuote)│  │    (OSQR)    │  │    Chats     │             │
│   │              │  │              │  │              │             │
│   │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │             │
│   │  │ Doc 1  │  │  │  │ Doc 4  │  │  │  │ Doc 7  │  │             │
│   │  │ Doc 2  │  │  │  │ Doc 5  │  │  │  │ Doc 8  │  │             │
│   │  │ Doc 3  │  │  │  │ Doc 6  │  │  │  └────────┘  │             │
│   │  └────────┘  │  │  └────────┘  │  │              │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│   User sees: Organized folders and projects                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      OSCAR'S KNOWLEDGE VIEW                          │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   UNIFIED SEMANTIC STORE                     │   │
│   │                                                              │   │
│   │   Doc 1 ←→ Doc 4 ←→ Doc 7                                   │   │
│   │     ↑         ↑         ↑                                    │   │
│   │     ↓         ↓         ↓                                    │   │
│   │   Doc 2 ←→ Doc 5 ←→ Doc 8                                   │   │
│   │     ↑         ↑                                              │   │
│   │     ↓         ↓                                              │   │
│   │   Doc 3 ←→ Doc 6                                            │   │
│   │                                                              │   │
│   │   (All documents interconnected by semantic relationships)   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Oscar sees: One unified knowledge graph with metadata tags        │
└─────────────────────────────────────────────────────────────────────┘
```

### The Contrast with Claude

| Behavior | Claude | Oscar |
|----------|--------|-------|
| Cross-project queries | "I don't have access to other projects" | Queries across all indexed content |
| Context persistence | Resets per conversation | Unified memory across all sessions |
| Organizational respect | Enforces project silos | Treats projects as optional filters |
| User burden | User must re-explain context | Oscar already knows |

---

## Memory Vault Schema Extensions

### Extended Semantic Memory Schema

```typescript
interface SemanticMemoryEntry {
  // Existing fields from Memory Vault spec...
  id: string;
  userId: string;
  content: string;
  embedding: number[];
  category: MemoryCategory;
  
  // NEW: Source context (informational, not restrictive)
  sourceContext: {
    interface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
    projectId: string | null;      // NULL = general chat
    projectName: string | null;    // Human-readable
    conversationId: string | null;
    sessionId: string;
    timestamp: Date;
  };
  
  // NEW: Cross-reference tracking
  crossReferences: {
    relatedProjects: string[];     // Other projects this relates to
    relatedDocuments: string[];    // Document IDs
    relatedConversations: string[];// Conversation IDs
    relatedEntities: EntityRef[];  // People, companies, concepts
  };
  
  // NEW: Retrieval metadata
  retrievalMetadata: {
    lastAccessedFrom: string[];    // Which projects accessed this
    accessCount: number;
    utilityScore: number;
    crossProjectUtility: number;   // Higher if useful across projects
  };
}
```

### Query Interface Extensions

```typescript
interface MemoryQueryOptions {
  // Existing options...
  embedding?: number[];
  category?: MemoryCategory;
  limit?: number;
  
  // NEW: Project filtering (OPTIONAL, not default)
  projectFilter?: {
    include?: string[];    // Only search these projects
    exclude?: string[];    // Exclude these projects
    currentOnly?: boolean; // Only current project (opt-in restriction)
  };
  
  // NEW: Cross-project behavior (default: search everything)
  crossProjectBehavior?: {
    enabled: boolean;              // Default: true
    boostCurrentProject?: number;  // Weight for current project results
    includeRelated?: boolean;      // Include semantically related from other projects
  };
}
```

---

## Default Retrieval Behavior

### The Golden Rule

**When a user asks a question, Oscar searches ALL indexed content by default.**

Project filtering is opt-in, not opt-out.

```typescript
async function retrieve(
  query: string,
  options: MemoryQueryOptions = {}
): Promise<MemoryEntry[]> {
  
  // Default: search everything
  const searchScope = options.crossProjectBehavior?.enabled !== false
    ? 'all'
    : 'current_project';
  
  // Embed query
  const queryEmbedding = await embed(query);
  
  // Search semantic store
  let results = await this.semanticStore.vectorSearch({
    embedding: queryEmbedding,
    limit: options.limit || 20,
    // NO project filter by default
  });
  
  // Optional: boost current project results
  if (options.crossProjectBehavior?.boostCurrentProject) {
    results = this.applyProjectBoost(
      results,
      options.currentProjectId,
      options.crossProjectBehavior.boostCurrentProject
    );
  }
  
  // Apply relevance scoring
  results = this.applyRelevanceScoring(results, query);
  
  return results;
}
```

### Example Queries

**User in VoiceQuote project asks**: "What authentication approach did we decide on?"

```typescript
// Oscar's internal query
const results = await memoryVault.retrieve(
  "authentication approach decision",
  {
    crossProjectBehavior: {
      enabled: true,        // Search everything
      boostCurrentProject: 1.2  // Slight preference for VoiceQuote
    }
  }
);

// Results might include:
// - VoiceQuote auth spec (boosted, same project)
// - OSQR auth decisions (if relevant)
// - General security conversations
```

**Oscar's response**: "In the VoiceQuote project, you decided on JWT with refresh tokens (December 10th spec). Interestingly, for OSQR you chose a different approach - OAuth2 with PKCE for the VS Code extension. Want me to compare the rationale for each?"

---

## Cross-Project Intelligence

### Automatic Relationship Detection

When indexing new content, Oscar automatically detects relationships to content in other projects:

```typescript
async function indexWithCrossReferences(
  entry: SemanticMemoryEntry
): Promise<void> {
  
  // Find semantically similar content across ALL projects
  const similar = await this.findSimilarAcrossProjects(entry, {
    threshold: 0.75,
    excludeCurrentProject: false,
    maxResults: 20
  });
  
  // Categorize relationships
  const relationships = {
    sameProject: similar.filter(s => s.projectId === entry.sourceContext.projectId),
    otherProjects: similar.filter(s => s.projectId !== entry.sourceContext.projectId),
    sharedEntities: await this.findSharedEntities(entry, similar),
    contradictions: await this.detectContradictions(entry, similar)
  };
  
  // Store with cross-references
  entry.crossReferences = {
    relatedProjects: [...new Set(relationships.otherProjects.map(s => s.projectId))],
    relatedDocuments: similar.filter(s => s.category === 'document').map(s => s.id),
    relatedConversations: similar.filter(s => s.category === 'conversation').map(s => s.id),
    relatedEntities: relationships.sharedEntities
  };
  
  // Flag contradictions for potential resolution
  if (relationships.contradictions.length > 0) {
    await this.flagContradictions(entry, relationships.contradictions);
  }
  
  await this.semanticStore.store(entry);
}
```

### Contradiction Detection

Oscar proactively identifies when decisions or information conflict across projects:

```typescript
interface Contradiction {
  entryA: SemanticMemoryEntry;
  entryB: SemanticMemoryEntry;
  topic: string;
  conflictType: 'decision' | 'fact' | 'approach';
  severity: 'info' | 'warning' | 'critical';
  suggestedResolution?: string;
}

async function detectContradictions(
  newEntry: SemanticMemoryEntry,
  relatedEntries: SemanticMemoryEntry[]
): Promise<Contradiction[]> {
  
  const contradictions: Contradiction[] = [];
  
  for (const related of relatedEntries) {
    // Skip same project (internal contradictions handled separately)
    if (related.sourceContext.projectId === newEntry.sourceContext.projectId) {
      continue;
    }
    
    // Check for semantic contradiction
    const contradiction = await this.analyzeForContradiction(newEntry, related);
    
    if (contradiction) {
      contradictions.push({
        entryA: newEntry,
        entryB: related,
        topic: contradiction.topic,
        conflictType: contradiction.type,
        severity: this.assessSeverity(contradiction),
        suggestedResolution: await this.suggestResolution(contradiction)
      });
    }
  }
  
  return contradictions;
}
```

### Proactive Cross-Project Insights

Oscar can surface relevant information from other projects without being asked:

```typescript
async function getProactiveInsights(
  currentContext: ConversationContext
): Promise<ProactiveInsight[]> {
  
  const insights: ProactiveInsight[] = [];
  
  // Extract topics from current conversation
  const currentTopics = await this.extractTopics(currentContext);
  
  // Search for relevant content in OTHER projects
  for (const topic of currentTopics) {
    const otherProjectContent = await this.semanticStore.query({
      embedding: await embed(topic),
      filter: {
        'sourceContext.projectId': { $ne: currentContext.projectId }
      },
      limit: 5
    });
    
    if (otherProjectContent.length > 0) {
      insights.push({
        type: 'related_content',
        topic,
        source: otherProjectContent[0].sourceContext.projectName,
        summary: await this.summarize(otherProjectContent),
        relevance: otherProjectContent[0].score
      });
    }
  }
  
  return insights;
}
```

---

## Implementation Requirements

### Memory Vault Changes

1. **Schema updates**
   - Add `sourceContext` to all semantic entries
   - Add `crossReferences` tracking
   - Add `retrievalMetadata` for utility scoring

2. **Query engine updates**
   - Default to cross-project search
   - Add optional project filtering
   - Implement project boosting

3. **Indexing pipeline updates**
   - Cross-reference detection on index
   - Contradiction detection and flagging
   - Entity extraction across projects

### Integration with Document Indexing Subsystem

The Document Indexing Subsystem (DIS) feeds into this extended Memory Vault:

```typescript
// DIS stores documents with full source context
await memoryVault.semantic.store({
  category: 'document',
  content: documentSummary,
  embedding: documentEmbedding,
  sourceContext: {
    interface: 'web',
    projectId: 'voicequote_project_id',
    projectName: 'VoiceQuote',
    conversationId: 'conv_xyz',
    sessionId: 'session_123',
    timestamp: new Date()
  },
  // DIS provides cross-references
  crossReferences: {
    relatedProjects: ['osqr_project_id'],  // Detected by DIS
    relatedDocuments: ['doc_abc', 'doc_def'],
    relatedConversations: ['conv_123'],
    relatedEntities: [
      { type: 'concept', name: 'payment_integration' },
      { type: 'technology', name: 'stripe' }
    ]
  }
});
```

---

## User Experience Examples

### Example 1: Implicit Cross-Project Reference

**User (in VoiceQuote project)**: "Use the same auth approach we decided on for the other project"

**Oscar's process**:
1. Detects reference to "other project"
2. Searches semantic store for auth decisions in non-VoiceQuote projects
3. Finds OSQR OAuth2 decision
4. Responds with context

**Oscar**: "You decided on OAuth2 with PKCE for OSQR's VS Code authentication (December 12th). For VoiceQuote, this would mean implementing the authorization code flow with... Do you want me to adapt that approach for VoiceQuote's mobile context?"

### Example 2: Proactive Cross-Project Alert

**User (in OSQR project)**: "Let's implement rate limiting"

**Oscar's process**:
1. Indexes "rate limiting" topic
2. Detects related content in VoiceQuote project
3. Surfaces proactive insight

**Oscar**: "Before we design this, you should know you already have a rate limiting spec for VoiceQuote (November 28th) that uses a token bucket algorithm. Want to use the same approach for consistency, or do OSQR's requirements differ?"

### Example 3: Cross-Project Comparison

**User**: "Compare how I've approached error handling across my projects"

**Oscar's process**:
1. Searches for "error handling" across all projects
2. Groups results by project
3. Synthesizes comparison

**Oscar**: "Here's what I found:

**VoiceQuote**: Custom error codes with user-friendly messages, centralized error handler (spec from Oct 15)

**OSQR**: Constitutional error classification with severity tiers, audit logging for all errors (spec from Dec 10)

**Record Homes site**: Basic try-catch with generic messages (no formal spec)

The OSQR approach is most sophisticated. Want me to create a unified error handling standard you could apply across all projects?"

---

## Privacy Considerations

### Cross-Project Privacy

Even with unified knowledge, privacy boundaries are respected:

1. **User isolation**: Users never see other users' content
2. **Plugin access**: Plugins only see content permitted by Privacy Gate
3. **Audit logging**: All cross-project retrievals are logged

```typescript
// Privacy Gate applies to ALL retrievals
async function retrieve(query: string, context: RetrievalContext): Promise<Results> {
  const rawResults = await this.semanticStore.query(query);
  
  // Filter by user ownership
  const userResults = rawResults.filter(r => r.userId === context.userId);
  
  // Apply plugin redaction if applicable
  if (context.pluginId) {
    return this.privacyGate.redact(userResults, context.pluginId);
  }
  
  return userResults;
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cross-project retrieval accuracy | >85% relevant | User feedback |
| "I told you this" complaints | Zero | Support tracking |
| Proactive insight acceptance | >60% useful | User action tracking |
| Contradiction detection accuracy | >90% | Manual review sample |
| Query latency (cross-project) | <1s p95 | Instrumentation |

---

## Migration Path

For existing Memory Vault implementations:

1. **Schema migration**: Add new fields with defaults
2. **Backfill cross-references**: Run relationship detection on existing content
3. **Enable cross-project search**: Update query defaults
4. **Monitor and tune**: Adjust relevance scoring based on feedback

---

**End of Addendum**

*Document Version: 1.0.1*  
*Status: Addendum to Memory Vault Spec v1.0*  
*Effective: Immediate*
