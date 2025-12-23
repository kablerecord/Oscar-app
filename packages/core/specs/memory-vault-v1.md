# OSQR Memory Vault Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2025
- **Status**: Ready for Implementation
- **Dependencies**: Constitutional Framework (for privacy enforcement)
- **Blocked By**: Constitutional Framework must be implemented first
- **Enables**: Temporal Intelligence, Bubble Interface, Council Mode, Project Guidance, Plugin Architecture

## Executive Summary

The Memory Vault is OSQR's persistent knowledge layer - the "institutional memory" that makes Oscar feel like a partner who knows you rather than a stateless chatbot. It implements a three-tier memory architecture (Episodic, Semantic, Procedural) with privacy-preserving access controls, utility-based relevance scoring, and just-in-time retrieval to prevent context rot. All other OSQR components query the Memory Vault as their single source of truth.

## Scope

### In Scope
- Private Knowledge Vault (PKV) - user's personal/business data
- Global Public Knowledge Vault (GPKV) - shared knowledge, plugin frameworks
- Three memory types: Episodic, Semantic, Procedural
- Privacy Gate for plugin access to PKV
- Memory utility tracking (retrospective reflection)
- Memory synthesis on retrieval (prospective reflection)
- Just-in-time retrieval with relevance scoring
- Context compaction to prevent rot
- Chroma vector database integration
- Session-scoped working memory buffer

### Out of Scope (Deferred to v1.5+)
- Component-level caching (single source for v1.0)
- Cross-user memory sharing (collaboration features)
- Memory export/portability
- Federated RAG across multiple users
- Memory marketplace (sharing knowledge packs)
- Automatic PII detection ML model (rule-based for v1.0)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OSQR Components                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   Temporal   │ │    Bubble    │ │   Council    │ │   Project   │ │
│  │ Intelligence │ │  Interface   │ │    Mode      │ │  Guidance   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                                   ▼                                  │
│                    ┌──────────────────────────┐                      │
│                    │     Memory Vault API     │                      │
│                    │    (Single Source of     │                      │
│                    │         Truth)           │                      │
│                    └──────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Episodic    │        │    Semantic     │        │   Procedural    │
│    Store      │        │     Store       │        │     Store       │
│ (Conversations│        │  (PKV / GPKV)   │        │ (MentorScripts, │
│  & Sessions)  │        │                 │        │  BriefingScripts)│
└───────────────┘        └─────────────────┘        └─────────────────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │    Chroma Vector DB      │
                    │   + Metadata Storage     │
                    └──────────────────────────┘
```

### Plugin Access Architecture

```
┌─────────────────┐
│  Creator Plugin │
│   (e.g., FGF)   │
└────────┬────────┘
         │ Request: "What are user's business goals?"
         ▼
┌─────────────────────────────────────────────────────────┐
│                    PRIVACY GATE                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. Check plugin permission tier                 │    │
│  │  2. Identify requested data category            │    │
│  │  3. Apply redaction rules                       │    │
│  │  4. Generate contextual summary (not raw data)  │    │
│  │  5. Log access for audit trail                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Response: "User operates in construction industry,     │
│            has growth-focused financial objectives,     │
│            building multiple business verticals"        │
│                                                         │
│  [Never exposed: specific revenue, family names,        │
│   SSN, addresses, account numbers]                      │
└─────────────────────────────────────────────────────────┘
```

### Core Data Structures

```typescript
// Memory Vault Core Types

interface MemoryVault {
  userId: string;
  pkv: PrivateKnowledgeVault;
  gpkv: GlobalPublicKnowledgeVault;  // Shared reference
  workingMemory: WorkingMemoryBuffer;
  config: VaultConfig;
}

interface PrivateKnowledgeVault {
  episodic: EpisodicStore;
  semantic: SemanticStore;
  procedural: ProceduralStore;
}

interface GlobalPublicKnowledgeVault {
  pluginKnowledge: Map<string, PluginKnowledgeBase>;
  sharedFrameworks: SemanticStore;
  version: string;
}

// ============ EPISODIC MEMORY ============

interface EpisodicStore {
  conversations: Conversation[];
  sessions: Session[];
}

interface Conversation {
  id: string;
  sessionId: string;
  projectId: string | null;
  messages: Message[];
  startedAt: Date;
  endedAt: Date | null;
  summary: string | null;  // Generated via prospective reflection
  metadata: ConversationMetadata;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens: number;
  toolCalls: ToolCall[] | null;
  utilityScore: number | null;  // Updated via retrospective reflection
}

interface Session {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  deviceType: 'web' | 'mobile' | 'voice' | 'vscode';
  conversationIds: string[];
}

interface ConversationMetadata {
  topics: string[];           // Extracted themes
  entities: Entity[];         // People, companies, projects mentioned
  commitments: Commitment[];  // Promises, deadlines detected
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

// ============ SEMANTIC MEMORY ============

interface SemanticStore {
  memories: SemanticMemory[];
  embeddings: EmbeddingIndex;  // Chroma collection reference
}

interface SemanticMemory {
  id: string;
  content: string;
  embedding: number[];        // Vector representation
  category: MemoryCategory;
  source: MemorySource;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  utilityScore: number;       // Retrospective reflection score
  confidence: number;         // How certain we are this is accurate
  metadata: SemanticMetadata;
}

type MemoryCategory =
  | 'personal_info'      // Name, preferences, background
  | 'business_info'      // Companies, roles, goals
  | 'relationships'      // People user knows, their roles
  | 'projects'           // Active work, deadlines
  | 'preferences'        // How user likes to work
  | 'domain_knowledge'   // Industry expertise, skills
  | 'decisions'          // Past choices and rationale
  | 'commitments';       // Promises, obligations

interface MemorySource {
  type: 'conversation' | 'explicit' | 'inferred' | 'plugin' | 'import';
  sourceId: string;          // Conversation ID, plugin ID, etc.
  timestamp: Date;
  confidence: number;
}

interface SemanticMetadata {
  topics: string[];
  relatedMemoryIds: string[];
  contradicts: string[];     // IDs of memories this might contradict
  supersedes: string[];      // IDs of memories this updates
}

// ============ PROCEDURAL MEMORY ============

interface ProceduralStore {
  mentorScripts: MentorScript[];
  briefingScripts: BriefingScript[];
  pluginRules: PluginRule[];
}

interface MentorScript {
  id: string;
  projectId: string | null;  // null = global
  rules: MentorRule[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MentorRule {
  id: string;
  rule: string;
  source: 'user_defined' | 'inferred' | 'plugin';
  priority: number;          // 1-10, higher = more important
  appliedCount: number;
  helpfulCount: number;      // Times user didn't correct after applying
  createdAt: Date;
}

interface BriefingScript {
  id: string;
  sessionId: string;
  instructions: string[];
  expiresAt: Date | null;    // Session-scoped or persistent
}

interface PluginRule {
  pluginId: string;
  rules: string[];
  permissions: PluginPermission[];
  active: boolean;
}

// ============ WORKING MEMORY ============

interface WorkingMemoryBuffer {
  sessionId: string;
  currentConversation: Conversation;
  retrievedContext: RetrievedMemory[];
  pendingCommitments: Commitment[];
  tokenBudget: number;
  tokensUsed: number;
}

interface RetrievedMemory {
  memory: SemanticMemory | EpisodicSummary;
  relevanceScore: number;
  retrievedAt: Date;
  wasHelpful: boolean | null;  // Set after response, for utility tracking
}

// ============ PRIVACY & ACCESS ============

interface PrivacyGate {
  checkAccess(
    requesterId: string,      // Plugin or component ID
    requesterType: 'plugin' | 'component' | 'user',
    dataCategory: MemoryCategory,
    accessType: 'read' | 'write'
  ): AccessDecision;

  generateSummary(
    memories: SemanticMemory[],
    permissionTier: PermissionTier,
    redactionRules: RedactionRule[]
  ): SanitizedSummary;
}

type PermissionTier = 'none' | 'minimal' | 'contextual' | 'full';

interface AccessDecision {
  allowed: boolean;
  tier: PermissionTier;
  redactions: RedactionRule[];
  reason: string;
  logged: boolean;
}

interface RedactionRule {
  category: 'pii' | 'financial' | 'family' | 'medical' | 'location';
  action: 'remove' | 'generalize' | 'hash';
}

interface SanitizedSummary {
  content: string;           // Contextual summary, never raw data
  categories: MemoryCategory[];
  confidence: number;
  redactionsApplied: string[];
}

// ============ UTILITY TRACKING ============

interface UtilityTracker {
  recordRetrieval(memoryId: string, context: string): void;
  recordOutcome(memoryId: string, wasHelpful: boolean): void;
  updateScores(): void;      // Batch update utility scores
  getTopMemories(category: MemoryCategory, limit: number): SemanticMemory[];
}

// ============ VAULT CONFIG ============

interface VaultConfig {
  maxWorkingMemoryTokens: number;    // Default: 8000
  compactionThreshold: number;        // Trigger at 80% capacity
  utilityDecayRate: number;           // How fast unused memories fade
  synthesisFrequency: 'realtime' | 'hourly' | 'daily';
  privacyDefaults: PrivacyDefaults;
}

interface PrivacyDefaults {
  piiRedaction: boolean;              // Default: true
  financialRedaction: boolean;        // Default: true
  familyRedaction: boolean;           // Default: true
  pluginAccessTier: PermissionTier;   // Default: 'contextual'
}
```

### Key Algorithms

#### Algorithm 1: Just-In-Time Retrieval

```typescript
async function retrieveContext(
  query: string,
  vault: MemoryVault,
  config: RetrievalConfig
): Promise<RetrievedMemory[]> {
  const { maxTokens, minRelevance, boostRecent, boostHighUtility } = config;

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Vector similarity search in Chroma
  const candidates = await vault.pkv.semantic.embeddings.query({
    embedding: queryEmbedding,
    limit: 50,  // Over-fetch, then filter
    where: { confidence: { $gte: 0.5 } }
  });

  // 3. Score each candidate
  const scored = candidates.map(memory => {
    let score = memory.similarityScore;  // Base: vector similarity

    // Boost recent memories
    if (boostRecent) {
      const daysSinceAccess = daysBetween(memory.lastAccessedAt, new Date());
      const recencyBoost = Math.exp(-daysSinceAccess / 30);  // Decay over 30 days
      score += recencyBoost * 0.2;
    }

    // Boost high-utility memories
    if (boostHighUtility) {
      score += memory.utilityScore * 0.3;
    }

    // Penalize contradicted memories
    if (memory.metadata.contradicts.length > 0) {
      score *= 0.7;
    }

    return { memory, relevanceScore: score };
  });

  // 4. Filter by minimum relevance
  const relevant = scored.filter(s => s.relevanceScore >= minRelevance);

  // 5. Select within token budget
  const selected: RetrievedMemory[] = [];
  let tokensUsed = 0;

  for (const item of relevant.sort((a, b) => b.relevanceScore - a.relevanceScore)) {
    const memoryTokens = estimateTokens(item.memory.content);
    if (tokensUsed + memoryTokens <= maxTokens) {
      selected.push({
        memory: item.memory,
        relevanceScore: item.relevanceScore,
        retrievedAt: new Date(),
        wasHelpful: null
      });
      tokensUsed += memoryTokens;
    }
  }

  // 6. Log retrievals for utility tracking
  selected.forEach(s => {
    utilityTracker.recordRetrieval(s.memory.id, query);
  });

  return selected;
}
```

#### Algorithm 2: Prospective Reflection (Memory Synthesis)

```typescript
async function synthesizeMemories(
  conversation: Conversation,
  existingMemories: SemanticMemory[],
  model: LLMClient
): Promise<SynthesisResult> {
  // 1. Extract potential new memories from conversation
  const extractionPrompt = `
    Analyze this conversation and extract discrete facts about the user.
    For each fact, indicate:
    - The specific information
    - Confidence level (0-1)
    - Category (personal_info, business_info, relationships, projects, preferences, domain_knowledge, decisions, commitments)
    - Whether it updates/contradicts any existing knowledge

    Existing knowledge:
    ${existingMemories.map(m => `- ${m.content}`).join('\n')}

    Conversation:
    ${conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

  const extraction = await model.complete(extractionPrompt);
  const newFacts = parseExtraction(extraction);

  // 2. Resolve contradictions
  const resolved: SemanticMemory[] = [];

  for (const fact of newFacts) {
    const contradicted = existingMemories.filter(
      m => fact.contradicts?.includes(m.id)
    );

    if (contradicted.length > 0) {
      // More recent + higher confidence wins
      const shouldReplace = fact.confidence > Math.max(...contradicted.map(c => c.confidence));

      if (shouldReplace) {
        // Mark old memories as superseded
        contradicted.forEach(c => {
          c.metadata.supersedes = c.metadata.supersedes || [];
        });

        resolved.push(createMemory(fact, conversation.id));
      }
    } else {
      resolved.push(createMemory(fact, conversation.id));
    }
  }

  // 3. Generate conversation summary for episodic storage
  const summaryPrompt = `
    Summarize this conversation in 2-3 sentences, focusing on:
    - What the user was trying to accomplish
    - Key decisions or outcomes
    - Any commitments made
  `;

  const summary = await model.complete(summaryPrompt);

  return {
    newMemories: resolved,
    conversationSummary: summary,
    contradictionsResolved: newFacts.filter(f => f.contradicts?.length > 0).length
  };
}
```

#### Algorithm 3: Retrospective Reflection (Utility Scoring)

```typescript
async function updateUtilityScores(
  vault: MemoryVault,
  timeWindow: number = 7  // days
): Promise<UtilityUpdateResult> {
  const recentRetrievals = await getRetrievals({
    since: daysAgo(timeWindow),
    userId: vault.userId
  });

  const memoryStats = new Map<string, { retrieved: number; helpful: number }>();

  // 1. Aggregate retrieval outcomes
  for (const retrieval of recentRetrievals) {
    const stats = memoryStats.get(retrieval.memoryId) || { retrieved: 0, helpful: 0 };
    stats.retrieved++;
    if (retrieval.wasHelpful) stats.helpful++;
    memoryStats.set(retrieval.memoryId, stats);
  }

  // 2. Calculate new utility scores
  const updates: UtilityUpdate[] = [];

  for (const [memoryId, stats] of memoryStats) {
    const memory = await vault.pkv.semantic.get(memoryId);
    if (!memory) continue;

    // Utility = helpful rate, with Bayesian smoothing
    const alpha = 1;  // Prior successes
    const beta = 1;   // Prior failures
    const helpfulRate = (stats.helpful + alpha) / (stats.retrieved + alpha + beta);

    // Blend with previous score (momentum)
    const momentum = 0.7;
    const newScore = momentum * memory.utilityScore + (1 - momentum) * helpfulRate;

    updates.push({ memoryId, oldScore: memory.utilityScore, newScore });
  }

  // 3. Apply decay to un-retrieved memories
  const unretrievedMemories = await vault.pkv.semantic.getUnretrieved({
    since: daysAgo(timeWindow)
  });

  for (const memory of unretrievedMemories) {
    const decayedScore = memory.utilityScore * (1 - vault.config.utilityDecayRate);
    updates.push({ memoryId: memory.id, oldScore: memory.utilityScore, newScore: decayedScore });
  }

  // 4. Batch update
  await vault.pkv.semantic.batchUpdateUtility(updates);

  return {
    memoriesUpdated: updates.length,
    averageScoreChange: average(updates.map(u => u.newScore - u.oldScore))
  };
}
```

#### Algorithm 4: Context Compaction

```typescript
async function compactContext(
  workingMemory: WorkingMemoryBuffer,
  model: LLMClient
): Promise<CompactionResult> {
  const { currentConversation, tokenBudget, tokensUsed } = workingMemory;

  // Only compact if over threshold
  if (tokensUsed < tokenBudget * 0.8) {
    return { compacted: false, reason: 'under_threshold' };
  }

  // 1. Identify compactable content (older messages)
  const messages = currentConversation.messages;
  const preserveRecent = 4;  // Always keep last 4 exchanges
  const compactable = messages.slice(0, -preserveRecent);

  if (compactable.length < 4) {
    return { compacted: false, reason: 'insufficient_history' };
  }

  // 2. Generate summary preserving critical info
  const compactionPrompt = `
    Summarize this conversation history, preserving:
    - Key decisions made
    - Unresolved questions or tasks
    - Important context for ongoing work
    - Any commitments or deadlines mentioned

    Be concise but complete. This summary replaces the original messages.

    Messages to summarize:
    ${compactable.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

  const summary = await model.complete(compactionPrompt);

  // 3. Create compacted conversation
  const summaryMessage: Message = {
    id: generateId(),
    role: 'system',
    content: `[Conversation summary: ${summary}]`,
    timestamp: new Date(),
    tokens: estimateTokens(summary),
    toolCalls: null,
    utilityScore: null
  };

  const recentMessages = messages.slice(-preserveRecent);

  // 4. Update working memory
  workingMemory.currentConversation.messages = [summaryMessage, ...recentMessages];
  workingMemory.tokensUsed = estimateTokens(summaryMessage.content) +
    recentMessages.reduce((sum, m) => sum + m.tokens, 0);

  // 5. Store full history in episodic before discarding
  await vault.pkv.episodic.archiveMessages(compactable);

  return {
    compacted: true,
    messagesCompacted: compactable.length,
    tokensSaved: tokensUsed - workingMemory.tokensUsed
  };
}
```

#### Algorithm 5: Privacy Gate

```typescript
function processPluginRequest(
  request: PluginDataRequest,
  vault: MemoryVault,
  pluginManifest: PluginManifest
): SanitizedSummary {
  const { pluginId, requestedCategories, purpose } = request;

  // 1. Check plugin permission tier
  const permissions = pluginManifest.permissions.dataAccess;
  const tier = permissions.tier;  // 'none' | 'minimal' | 'contextual' | 'full'

  if (tier === 'none') {
    return {
      content: 'No user data available for this plugin.',
      categories: [],
      confidence: 1,
      redactionsApplied: ['all']
    };
  }

  // 2. Filter to allowed categories
  const allowedCategories = getAllowedCategories(tier, requestedCategories);

  // 3. Retrieve relevant memories
  const memories = vault.pkv.semantic.memories.filter(
    m => allowedCategories.includes(m.category)
  );

  // 4. Apply redaction rules based on tier
  const redactionRules = getRedactionRules(tier);

  // Always redact regardless of tier:
  const alwaysRedact: RedactionRule[] = [
    { category: 'pii', action: 'remove' },      // SSN, ID numbers
    { category: 'financial', action: 'generalize' },  // "$100M" → "ambitious financial goals"
    { category: 'family', action: 'remove' },   // Spouse/children names
    { category: 'medical', action: 'remove' },  // Health information
  ];

  const allRedactions = [...alwaysRedact, ...redactionRules];

  // 5. Generate contextual summary (never raw data)
  const summaryPrompt = `
    Generate a contextual summary for a ${pluginManifest.name} plugin.
    Purpose: ${purpose}

    Available information (apply redactions):
    ${memories.map(m => m.content).join('\n')}

    Redaction rules:
    ${allRedactions.map(r => `- ${r.category}: ${r.action}`).join('\n')}

    Output a helpful summary that:
    - Provides enough context for the plugin to personalize its response
    - Never includes specific PII, financial figures, or family names
    - Generalizes specifics into categories (e.g., "construction industry" not "Record Homes")
  `;

  const summary = generateSummary(summaryPrompt);

  // 6. Log access for audit
  logAccess({
    pluginId,
    userId: vault.userId,
    categoriesRequested: requestedCategories,
    categoriesProvided: allowedCategories,
    redactionsApplied: allRedactions.map(r => r.category),
    timestamp: new Date()
  });

  return {
    content: summary,
    categories: allowedCategories,
    confidence: 0.8,
    redactionsApplied: allRedactions.map(r => r.category)
  };
}

function getAllowedCategories(
  tier: PermissionTier,
  requested: MemoryCategory[]
): MemoryCategory[] {
  const tierAllowances: Record<PermissionTier, MemoryCategory[]> = {
    'none': [],
    'minimal': ['preferences'],
    'contextual': ['preferences', 'business_info', 'projects', 'domain_knowledge'],
    'full': ['preferences', 'business_info', 'projects', 'domain_knowledge',
             'decisions', 'commitments', 'relationships']
    // Note: 'personal_info' never directly accessible to plugins
  };

  const allowed = tierAllowances[tier];
  return requested.filter(cat => allowed.includes(cat));
}
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up Chroma vector database locally
- [ ] Create database schema for episodic, semantic, procedural stores
- [ ] Implement basic VaultConfig and initialization
- [ ] Create Memory Vault API skeleton with TypeScript interfaces
- [ ] Set up user isolation (each user gets own vault instance)

### Phase 2: Episodic Memory (Week 1-2)
- [ ] Implement Conversation and Message storage
- [ ] Implement Session tracking
- [ ] Build conversation history retrieval
- [ ] Create ConversationMetadata extraction (topics, entities, sentiment)
- [ ] Implement conversation archival

### Phase 3: Semantic Memory (Week 2-3)
- [ ] Integrate Chroma SDK for embedding storage
- [ ] Implement memory creation with embeddings
- [ ] Build vector similarity search
- [ ] Implement memory categories and metadata
- [ ] Create memory update and supersession logic

### Phase 4: Just-In-Time Retrieval (Week 3)
- [ ] Implement retrieveContext algorithm
- [ ] Add relevance scoring with recency and utility boosts
- [ ] Implement token budget management
- [ ] Build retrieval logging for utility tracking
- [ ] Create retrieval API endpoint

### Phase 5: Memory Synthesis (Week 3-4)
- [ ] Implement prospective reflection (fact extraction from conversations)
- [ ] Build contradiction detection and resolution
- [ ] Create conversation summarization
- [ ] Implement batch synthesis job (hourly/daily)
- [ ] Add manual synthesis trigger

### Phase 6: Utility Tracking (Week 4)
- [ ] Implement retrieval outcome recording
- [ ] Build retrospective reflection algorithm
- [ ] Create utility score update job
- [ ] Implement utility decay for unused memories
- [ ] Add utility-based retrieval boosting

### Phase 7: Context Compaction (Week 4)
- [ ] Implement working memory buffer
- [ ] Build compaction trigger detection
- [ ] Create summary generation for compaction
- [ ] Implement message archival before compaction
- [ ] Add compaction metrics

### Phase 8: Privacy Gate (Week 5)
- [ ] Implement permission tier checking
- [ ] Build redaction rules engine
- [ ] Create contextual summary generation
- [ ] Implement access logging
- [ ] Add user privacy settings UI integration points

### Phase 9: Procedural Memory (Week 5)
- [ ] Implement MentorScript storage
- [ ] Build BriefingScript storage
- [ ] Create plugin rule storage
- [ ] Implement procedural memory retrieval
- [ ] Add rule application tracking

### Phase 10: Integration & Testing (Week 6)
- [ ] Create Memory Vault facade for other components
- [ ] Implement component query interfaces
- [ ] Build comprehensive test suite
- [ ] Performance testing with realistic data volumes
- [ ] Document API for other OSQR components

## API Contracts

### Memory Vault Service Interface

```typescript
interface MemoryVaultService {
  // ============ INITIALIZATION ============
  initialize(userId: string, config?: Partial<VaultConfig>): Promise<MemoryVault>;

  // ============ RETRIEVAL ============
  retrieveContext(
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievedMemory[]>;

  getConversationHistory(
    conversationId: string,
    limit?: number
  ): Promise<Message[]>;

  searchMemories(
    query: string,
    filters?: MemoryFilters
  ): Promise<SemanticMemory[]>;

  // ============ STORAGE ============
  storeMessage(
    conversationId: string,
    message: Omit<Message, 'id'>
  ): Promise<Message>;

  storeMemory(
    memory: Omit<SemanticMemory, 'id' | 'embedding'>
  ): Promise<SemanticMemory>;

  updateMemory(
    memoryId: string,
    updates: Partial<SemanticMemory>
  ): Promise<SemanticMemory>;

  // ============ SYNTHESIS ============
  synthesizeFromConversation(
    conversationId: string
  ): Promise<SynthesisResult>;

  runProspectiveReflection(): Promise<ReflectionResult>;
  runRetrospectiveReflection(): Promise<UtilityUpdateResult>;

  // ============ COMPACTION ============
  checkCompactionNeeded(): boolean;
  compactWorkingMemory(): Promise<CompactionResult>;

  // ============ PRIVACY ============
  processPluginRequest(
    request: PluginDataRequest
  ): Promise<SanitizedSummary>;

  getUserPrivacySettings(): PrivacyDefaults;
  updatePrivacySettings(settings: Partial<PrivacyDefaults>): Promise<void>;

  // ============ UTILITY ============
  recordRetrievalOutcome(
    memoryId: string,
    wasHelpful: boolean
  ): Promise<void>;

  // ============ PROCEDURAL ============
  getMentorScripts(projectId?: string): Promise<MentorScript[]>;
  storeMentorRule(rule: Omit<MentorRule, 'id'>): Promise<MentorRule>;
  getBriefingScript(sessionId: string): Promise<BriefingScript | null>;

  // ============ ADMIN ============
  getVaultStats(): Promise<VaultStats>;
  exportUserData(): Promise<ExportedVault>;  // GDPR compliance
  deleteUserData(): Promise<void>;           // Right to be forgotten
}
```

### Request/Response Examples

#### Retrieve Context
```typescript
// Request
const context = await memoryVault.retrieveContext(
  "Help me prepare for my investor pitch",
  {
    maxTokens: 4000,
    minRelevance: 0.6,
    boostRecent: true,
    boostHighUtility: true,
    categories: ['business_info', 'projects', 'decisions']
  }
);

// Response
[
  {
    memory: {
      id: "mem_abc123",
      content: "User is building OSQR, an AI operating system targeting March 2025 v1.0 launch",
      category: "projects",
      utilityScore: 0.89,
      confidence: 0.95
    },
    relevanceScore: 0.92,
    retrievedAt: "2025-12-19T15:30:00Z",
    wasHelpful: null
  },
  {
    memory: {
      id: "mem_def456",
      content: "User's goal is $100M net worth through multiple business verticals",
      category: "business_info",
      utilityScore: 0.76,
      confidence: 0.88
    },
    relevanceScore: 0.85,
    retrievedAt: "2025-12-19T15:30:00Z",
    wasHelpful: null
  }
]
```

#### Plugin Data Request
```typescript
// Request from FGF Plugin
const summary = await memoryVault.processPluginRequest({
  pluginId: "fgf-plugin",
  requestedCategories: ['business_info', 'projects', 'personal_info'],
  purpose: "Personalize Fourth Generation Formula coaching"
});

// Response
{
  content: "User operates multiple businesses in construction and food service industries. Has growth-focused financial objectives and is actively building technology products. Currently focused on a major product launch in Q1 2025.",
  categories: ['business_info', 'projects'],  // personal_info filtered out
  confidence: 0.8,
  redactionsApplied: ['pii', 'financial', 'family']
}
```

## Configuration

### Environment Variables

```env
# Chroma Configuration
OSQR_CHROMA_HOST=localhost
OSQR_CHROMA_PORT=8000
OSQR_CHROMA_COLLECTION_PREFIX=osqr_

# Memory Limits
OSQR_WORKING_MEMORY_TOKENS=8000
OSQR_COMPACTION_THRESHOLD=0.8
OSQR_MAX_RETRIEVAL_CANDIDATES=50

# Synthesis Settings
OSQR_SYNTHESIS_FREQUENCY=hourly  # realtime | hourly | daily
OSQR_UTILITY_DECAY_RATE=0.05     # 5% decay per update cycle

# Privacy Defaults
OSQR_DEFAULT_PLUGIN_ACCESS_TIER=contextual
OSQR_PII_REDACTION=true
OSQR_FINANCIAL_REDACTION=true
OSQR_FAMILY_REDACTION=true

# Performance
OSQR_EMBEDDING_MODEL=text-embedding-3-small
OSQR_EMBEDDING_DIMENSIONS=1536
OSQR_RETRIEVAL_CACHE_TTL=300  # seconds
```

### Default Values

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| maxWorkingMemoryTokens | 8000 | 4000-16000 | Token budget for working memory |
| compactionThreshold | 0.8 | 0.5-0.95 | Trigger compaction at this % of budget |
| utilityDecayRate | 0.05 | 0.01-0.2 | Decay rate for unused memories |
| synthesisFrequency | hourly | realtime/hourly/daily | How often to run prospective reflection |
| minRelevanceScore | 0.6 | 0.3-0.9 | Minimum score for retrieval inclusion |
| maxRetrievalCandidates | 50 | 20-200 | Over-fetch limit for relevance filtering |

## Error Handling

| Scenario | Response | Fallback |
|----------|----------|----------|
| Chroma unavailable | Return cached context if available | Graceful degradation to recent conversation only |
| Embedding generation fails | Retry with exponential backoff (3 attempts) | Store memory without embedding, flag for retry |
| Context compaction fails | Log error, continue with full context | Accept potential performance degradation |
| Privacy gate error | Deny access, log incident | Return empty summary to plugin |
| Synthesis timeout | Abort synthesis, preserve raw conversation | Queue for next synthesis cycle |
| Utility update fails | Log error, skip update | Scores remain static until next successful run |
| Memory contradiction unresolvable | Keep both memories, flag for user review | Surface both in retrieval with lower confidence |

## Success Criteria

1. [ ] Memory retrieval returns relevant context in <500ms for 95% of queries
2. [ ] Utility scoring demonstrably improves retrieval relevance over 7-day period
3. [ ] Context compaction maintains conversation coherence (validated by human review)
4. [ ] Privacy gate blocks all PII from reaching plugins (100% redaction rate)
5. [ ] Prospective reflection extracts facts with >80% accuracy (spot-check validation)
6. [ ] Working memory stays within token budget across all sessions
7. [ ] All other OSQR components can query Memory Vault without custom integration code
8. [ ] User data export produces complete, portable vault (GDPR compliance)
9. [ ] Memory search returns results in <200ms for vaults with 10,000+ memories
10. [ ] Zero data leakage between users in multi-tenant deployment

## Open Questions

- [ ] **Embedding model selection**: text-embedding-3-small vs ada-002 vs local model? Cost vs quality tradeoff.
- [ ] **Synthesis trigger**: Should prospective reflection run after every conversation or batch hourly? Realtime is expensive but more current.
- [ ] **Contradiction UI**: When memories contradict, should we surface this to user for resolution or handle automatically?
- [ ] **Memory limits**: Should there be a cap on total memories per user? Storage is cheap but retrieval degrades.
- [ ] **Cross-project memories**: Should memories from one project be accessible in another? Privacy vs convenience.
- [ ] **Backup strategy**: How often to backup vaults? User-triggered vs automatic?
- [ ] **Memory sharing (v2)**: How would users share memory packs? What consent model?

## Research Foundation

This specification draws from NotebookLM research on:

1. **Context Engineering** - Managing attention budget, preventing context rot, just-in-time retrieval
2. **Google Memory Bank** - Prospective reflection (synthesis) and retrospective reflection (utility scoring)
3. **n8n Memory Integration** - Window buffer, Postgres persistence, Zep integration patterns
4. **MCP Resource Access** - Session-level permissions, OAuth 2.1, gateway patterns for multi-tenant
5. **Aider Repo-Map** - Dependency graphs, PageRank for relevance, AST-based retrieval
6. **SASE Framework** - Version Controlled Resolutions, MentorScripts as procedural memory
7. **Chroma Research** - Semantic interference, context engineering for retrieval quality

## Appendices

### A: Memory Category Definitions

| Category | Description | Examples | Plugin Access |
|----------|-------------|----------|---------------|
| personal_info | User identity, background | Name, age, location | Never |
| business_info | Professional context | Company names, role, industry | Contextual tier+ |
| relationships | People user knows | Colleagues, family, friends | Full tier only (generalized) |
| projects | Active work | OSQR, VoiceQuote, book launch | Contextual tier+ |
| preferences | How user works | Communication style, tools | Minimal tier+ |
| domain_knowledge | Expertise areas | Construction, AI, franchising | Contextual tier+ |
| decisions | Past choices | Architecture decisions, business pivots | Full tier only |
| commitments | Obligations | Deadlines, promises | Contextual tier+ |

### B: File Structure

```
/src/memory-vault/
├── index.ts                      # Public exports
├── types.ts                      # All TypeScript interfaces
├── vault.ts                      # MemoryVault class
├── stores/
│   ├── episodic.store.ts         # Conversation/session storage
│   ├── semantic.store.ts         # Long-term memory storage
│   └── procedural.store.ts       # MentorScript/BriefingScript storage
├── retrieval/
│   ├── retriever.ts              # Just-in-time retrieval
│   ├── scorer.ts                 # Relevance scoring
│   └── embedding.ts              # Embedding generation
├── synthesis/
│   ├── prospective.ts            # Memory synthesis from conversations
│   ├── retrospective.ts          # Utility score updates
│   └── compaction.ts             # Context compaction
├── privacy/
│   ├── gate.ts                   # Privacy gate implementation
│   ├── redaction.ts              # Redaction rules engine
│   └── audit.ts                  # Access logging
├── chroma/
│   ├── client.ts                 # Chroma SDK wrapper
│   └── collections.ts            # Collection management
├── api/
│   ├── routes.ts                 # REST endpoints
│   └── handlers.ts               # Request handlers
└── __tests__/
    ├── retrieval.test.ts
    ├── synthesis.test.ts
    ├── privacy.test.ts
    └── integration.test.ts
```

### C: Chroma Collection Schema

```typescript
// Collection: osqr_semantic_{userId}
{
  name: "osqr_semantic_user123",
  metadata: {
    userId: "user123",
    createdAt: "2025-12-19T00:00:00Z",
    version: "1.0"
  },
  embeddingFunction: "openai_text-embedding-3-small",

  // Document structure
  documents: [
    {
      id: "mem_abc123",
      content: "User is building OSQR...",
      embedding: [0.123, -0.456, ...],  // 1536 dimensions
      metadata: {
        category: "projects",
        source_type: "conversation",
        source_id: "conv_xyz789",
        created_at: "2025-12-19T10:00:00Z",
        utility_score: 0.85,
        confidence: 0.92,
        topics: ["osqr", "ai", "development"],
        related_ids: ["mem_def456"]
      }
    }
  ]
}
```

---

**End of Specification**

*Document Version: 1.0*
*Status: Ready for Implementation*
*Next Review: Post-v1.0 Launch*
