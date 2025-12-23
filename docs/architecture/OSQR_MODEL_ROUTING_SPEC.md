# OSQR Model Routing Specification

**Component**: Multi-Model Router  
**Version**: 1.0  
**Status**: Ready for Implementation  
**Dependencies**: Constitutional Framework  
**Priority**: V1.0 Core Requirement

---

## Executive Summary

This specification defines which AI models OSQR uses for which tasks, the routing logic between them, and the cost/quality tradeoffs for each decision. The core principle:

> **Oscar's brain uses the best available models. Cost optimization happens through smart routing, not quality degradation.**

---

## Philosophy

### Premium First, Optimize Later

OSQR launches with premium models for all user-facing interactions. Users experience the best Oscar can be. Cost optimization happens through:

1. **Smart routing** - Use cheaper models only for tasks where quality doesn't suffer
2. **Caching** - Don't re-compute what you've already computed
3. **Batching** - Group operations where latency permits

We do NOT optimize by:
- Giving users worse models than we could
- Degrading quality based on tier (only quantity changes)
- Hiding capability behind paywalls

### The API Equals Consumer Quality

A critical insight: API models are identical to consumer-facing models. `claude-sonnet-4-5-20250929` via API is the same model as Claude Sonnet 4.5 in claude.ai. There is no "downgrade" for using the API.

---

## Model Inventory

### Tier 1: Premium (Oscar's Brain)

These models power all user-facing Oscar interactions.

| Model | Provider | API String | Input/1M | Output/1M | Cost/100 Queries* | Best For |
|-------|----------|------------|----------|-----------|-------------------|----------|
| Claude Opus 4.5 | Anthropic | `claude-opus-4-5-20250514` | $5.00 | $25.00 | $2.25 | Deep reasoning, complex multi-step tasks |
| Claude Sonnet 4.5 | Anthropic | `claude-sonnet-4-5-20250929` | $3.00 | $15.00 | $1.35 | **Primary model** - coding, analysis, sustained focus |
| GPT-4o | OpenAI | `gpt-4o` | $2.50 | $10.00 | $1.00 | Multimodal, vision tasks |
| Gemini 3 Pro | Google | `gemini-3-pro` | $2.00 | $12.00 | $1.00 | Video/visual, agentic tasks, 1M context |

*Assumes 2K input / 500 output tokens per query

### Tier 2: Mid-Range (Backend Quality Tasks)

For tasks users don't directly see but quality still matters.

| Model | Provider | API String | Input/1M | Output/1M | Cost/100 Queries | Best For |
|-------|----------|------------|----------|-----------|------------------|----------|
| Claude Haiku 4.5 | Anthropic | `claude-haiku-4-5-20251001` | $1.00 | $5.00 | $0.45 | Fast quality responses, high volume |
| Gemini 3 Flash | Google | `gemini-3-flash` | $0.50 | $3.00 | $0.25 | Speed + intelligence balance |
| GPT-4o Mini | OpenAI | `gpt-4o-mini` | $0.15 | $0.60 | $0.06 | 90% of 4o capability, fraction of cost |

### Tier 3: Economy (Utility Functions)

For classification, routing, formatting - pure utility.

| Model | Provider | API String | Input/1M | Output/1M | Cost/100 Queries | Best For |
|-------|----------|------------|----------|-----------|------------------|----------|
| Claude Haiku 3 | Anthropic | `claude-3-haiku-20240307` | $0.25 | $1.25 | $0.11 | Cheapest Claude |
| Gemini 2.0 Flash-Lite | Google | `gemini-2.0-flash-lite` | $0.075 | $0.30 | $0.03 | Ultra-cheap, fast |
| Llama 4 Maverick | Groq | `meta-llama/llama-4-maverick-17b-128e-instruct` | $0.20 | $0.60 | $0.07 | Fast open-source (562 t/s) |
| Llama 4 Scout | Groq | `meta-llama/llama-4-scout-17b-16e-instruct` | $0.11 | $0.34 | $0.04 | Fastest open-source (594 t/s) |
| Llama 3.1 8B | Groq | `llama-3.1-8b-instant` | $0.05 | $0.08 | $0.01 | Ultra-fast (840 t/s), dirt cheap |

### Specialty Models

| Model | Provider | Price | Use Case |
|-------|----------|-------|----------|
| Whisper Large v3 Turbo | Groq | $0.04/hour | Voice transcription |
| text-embedding-3-small | OpenAI | $0.02/1M tokens | Document embeddings |
| text-embedding-3-large | OpenAI | $0.13/1M tokens | High-quality embeddings (if needed) |

---

## Routing Rules

### Primary Rule: User-Facing = Premium

If the user will see Oscar's output, it uses a Tier 1 model. No exceptions.

```typescript
function selectModel(task: Task): Model {
  // Rule 1: User-facing always gets premium
  if (task.userFacing) {
    return selectPremiumModel(task);
  }
  
  // Rule 2: Backend tasks use appropriate tier
  return selectBackendModel(task);
}
```

### Task-to-Model Mapping

| Task Category | Model | Tier | Rationale |
|---------------|-------|------|-----------|
| **User Conversations** | Sonnet 4.5 | Premium | This IS Oscar |
| **Contemplate Mode** | Opus 4.5 | Premium | Deep reasoning requires best model |
| **Council Mode** | Opus + Sonnet + GPT-4o | Premium | Multi-perspective debate |
| **Insight Generation** | Sonnet 4.5 | Premium | Core differentiator |
| **Document Analysis** | Sonnet 4.5 | Premium | Cross-doc synthesis needs quality |
| **Proactive Suggestions** | Sonnet 4.5 | Premium | If Oscar interrupts, it better be good |
| **Onboarding** | Sonnet 4.5 | Premium | First impression |
| **Query Classification** | Haiku 4.5 or Gemini Flash | Mid | Fast, accurate enough |
| **Intent Detection** | Haiku 4.5 | Mid | Pattern matching |
| **Memory Summarization** | Haiku 4.5 | Mid | Compression task |
| **Entity Extraction** | Haiku 4.5 | Mid | Structured extraction |
| **Formatting/Reformatting** | Llama 4 Scout or Flash-Lite | Economy | Pure utility |
| **Cache Key Generation** | Llama 3.1 8B | Economy | Simple string ops |
| **Validation** | Llama 3.1 8B | Economy | Binary decisions |

### Council Mode Model Selection

Council Mode uses multiple models to debate a question. Default configuration:

```typescript
const COUNCIL_CONFIG = {
  models: [
    { model: 'claude-opus-4-5-20250514', role: 'lead', weight: 1.0 },
    { model: 'claude-sonnet-4-5-20250929', role: 'challenger', weight: 0.8 },
    { model: 'gpt-4o', role: 'alternate', weight: 0.7 }
  ],
  synthesizer: 'claude-opus-4-5-20250514',
  maxRounds: 3
};
```

---

## Routing Logic Implementation

### Request Classification

```typescript
interface RoutingDecision {
  model: string;
  tier: 'premium' | 'mid' | 'economy';
  reason: string;
  fallback?: string;
}

function classifyAndRoute(request: UserRequest): RoutingDecision {
  // Step 1: Is this user-facing?
  if (request.type === 'conversation' || 
      request.type === 'insight' || 
      request.type === 'analysis') {
    return {
      model: 'claude-sonnet-4-5-20250929',
      tier: 'premium',
      reason: 'user_facing',
      fallback: 'claude-opus-4-5-20250514'
    };
  }
  
  // Step 2: Is this a premium feature?
  if (request.mode === 'contemplate') {
    return {
      model: 'claude-opus-4-5-20250514',
      tier: 'premium',
      reason: 'contemplate_mode'
    };
  }
  
  if (request.mode === 'council') {
    return {
      model: 'council_multi',
      tier: 'premium',
      reason: 'council_mode'
    };
  }
  
  // Step 3: Backend task classification
  if (request.type === 'classification' || 
      request.type === 'routing') {
    return {
      model: 'claude-haiku-4-5-20251001',
      tier: 'mid',
      reason: 'backend_classification'
    };
  }
  
  // Step 4: Utility tasks
  if (request.type === 'formatting' || 
      request.type === 'validation') {
    return {
      model: 'llama-3.1-8b-instant',
      tier: 'economy',
      reason: 'utility_task'
    };
  }
  
  // Default: Premium (when in doubt, use the good stuff)
  return {
    model: 'claude-sonnet-4-5-20250929',
    tier: 'premium',
    reason: 'default_premium'
  };
}
```

### Fallback Chain

If primary model fails (rate limit, timeout, error):

```typescript
const FALLBACK_CHAINS = {
  'claude-opus-4-5-20250514': [
    'claude-sonnet-4-5-20250929',
    'gpt-4o'
  ],
  'claude-sonnet-4-5-20250929': [
    'gpt-4o',
    'claude-haiku-4-5-20251001'
  ],
  'claude-haiku-4-5-20251001': [
    'gemini-3-flash',
    'gpt-4o-mini'
  ],
  'gpt-4o': [
    'claude-sonnet-4-5-20250929',
    'gemini-3-pro'
  ]
};
```

---

## Model-Specific Configurations

### Claude (Anthropic)

```typescript
const CLAUDE_CONFIG = {
  opus: {
    model: 'claude-opus-4-5-20250514',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.95
  },
  sonnet: {
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.95
  },
  haiku: {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4096,
    temperature: 0.5,
    topP: 0.9
  }
};
```

### OpenAI

```typescript
const OPENAI_CONFIG = {
  gpt4o: {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7
  },
  gpt4oMini: {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.5
  }
};
```

### Groq

```typescript
const GROQ_CONFIG = {
  llama4Maverick: {
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    maxTokens: 2048,
    temperature: 0.3
  },
  llama31_8b: {
    model: 'llama-3.1-8b-instant',
    maxTokens: 1024,
    temperature: 0.2
  }
};
```

---

## Embedding Strategy

### Model Selection

Use `text-embedding-3-small` for all embeddings. It's:
- 6.5x cheaper than `text-embedding-3-large`
- Sufficient quality for semantic search
- 1536 dimensions (standard)

Only use `text-embedding-3-large` if retrieval quality is demonstrably insufficient.

### Embedding Operations

| Operation | When | Cost Impact |
|-----------|------|-------------|
| Document indexing | On upload | One-time, ~$0.02/1M tokens |
| Query embedding | On search | Per-query, negligible |
| Re-indexing | On document update | One-time per update |

```typescript
const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 100, // Documents per batch
  chunkSize: 500  // Tokens per chunk
};
```

---

## Voice/Audio Pipeline

### Transcription

Use Groq's Whisper for voice-to-text:

```typescript
const VOICE_CONFIG = {
  transcription: {
    model: 'whisper-large-v3-turbo',
    provider: 'groq',
    costPerHour: 0.04
  }
};
```

### Voice Response (Future)

When Oscar speaks back, use appropriate TTS. Not implemented in v1.0.

---

## Cost Optimization Techniques

### Prompt Caching

Anthropic offers prompt caching at 90% discount for repeated context:

```typescript
// Cache system prompts, Oscar's personality, constitutional framework
const CACHE_CANDIDATES = [
  'system_prompt',      // Oscar's character
  'constitutional',     // Framework constraints
  'user_context',       // Persistent user info
  'project_context'     // Current project docs
];
```

### Batch API

For non-urgent operations, use batch APIs at 50% discount:

- Document re-indexing
- Bulk insight generation
- Memory consolidation

### Request Deduplication

Don't call the model for:
- Exact duplicate queries (within session)
- Queries answerable from cache
- Simple lookups that don't need reasoning

---

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Premium model usage % | >90% of user-facing | <85% |
| Average cost per query | <$0.05 | >$0.10 |
| Model latency p95 | <3s | >5s |
| Fallback rate | <5% | >10% |
| Error rate | <1% | >3% |

### Cost Tracking

```typescript
interface CostEvent {
  timestamp: Date;
  userId: string;
  model: string;
  tier: 'premium' | 'mid' | 'economy';
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskType: string;
}
```

---

## Implementation Phases

### Phase 1: V1.0 Launch
- Sonnet 4.5 for all user-facing
- Opus 4.5 for Contemplate
- Haiku 4.5 for classification
- Basic fallback chain

### Phase 2: V1.5 Optimization
- Implement prompt caching
- Add Council Mode with multi-model
- Batch API for background tasks
- Cost monitoring dashboard

### Phase 3: V2.0 Advanced
- Dynamic model selection based on query complexity
- A/B testing different model configurations
- Fine-tuned routing based on user feedback

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **OSQR Cost Analysis** | Financial implications of routing decisions |
| **Insights System Spec** | How insights generation uses models |
| **Memory Vault Spec** | Embedding and retrieval integration |
| **Constitutional Framework** | Constraints that apply to all models |
| **Free Tier Architecture** | How routing interacts with throttling |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial specification |

---

**End of Specification**

*Document Version: 1.0*  
*Status: Ready for Implementation*
