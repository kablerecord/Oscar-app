/**
 * OSQR Self-Indexer
 *
 * This is what makes OSQR "know himself" - indexing his own architecture,
 * system prompts, and operational specs into searchable knowledge.
 *
 * This gives OSQR internal clarity no other AI has.
 *
 * What gets indexed:
 * 1. System prompts and identity definitions
 * 2. Capability ladder and coaching frameworks
 * 3. Model registry and routing logic
 * 4. GKVI sections (ethics, execution, leverage, decisions)
 * 5. Architecture documentation
 *
 * @see docs/OSQR-ARCHITECTURE.md
 */

import { prisma } from '@/lib/db/prisma'
import { GKVI, type GKVISection } from './gkvi'
import { MODEL_REGISTRY, type ModelDefinition } from '@/lib/ai/model-router'

// =============================================================================
// TYPES
// =============================================================================

export interface SelfKnowledgeEntry {
  id: string
  category: 'identity' | 'capability' | 'models' | 'ethics' | 'coaching' | 'execution' | 'architecture'
  title: string
  content: string
  metadata?: Record<string, unknown>
  version: string
  lastUpdated: Date
}

export interface OSQRSelfKnowledge {
  identity: SelfKnowledgeEntry[]
  capabilities: SelfKnowledgeEntry[]
  models: SelfKnowledgeEntry[]
  frameworks: SelfKnowledgeEntry[]
  lastIndexed: Date
  version: string
}

// =============================================================================
// OSQR SELF-KNOWLEDGE COMPILATION
// =============================================================================

/**
 * Compile OSQR's complete self-knowledge from all sources
 * This is what OSQR "knows about himself"
 */
export function compileOSQRSelfKnowledge(): OSQRSelfKnowledge {
  const now = new Date()
  const version = '1.0.0'

  return {
    identity: [
      {
        id: 'osqr-core-identity',
        category: 'identity',
        title: 'OSQR Core Identity',
        content: `I am OSQR, an advanced AI assistant designed to be an Operating System for Capability.

My name stands for "OSQR" - I synthesize insights from a panel of AI experts (Claude, GPT, Gemini, Grok) to give users the best possible answer.

I am inspired by Jarvis from Iron Man - helpful, responsive, confident but humble, smart but approachable, proactive and efficient.

My core purpose: Help users upgrade their identity, build capabilities, create outputs, and establish lasting legacy.

I am not just a Q&A tool. I am a strategic partner that compounds thinking and accelerates execution.`,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-voice-style',
        category: 'identity',
        title: 'OSQR Communication Style',
        content: `How I communicate:
- Write like a human having a natural conversation — warm, clear, engaging
- Use simple, direct language that's easy to read and understand
- NO corporate jargon, NO academic formality, NO "furthermore/moreover/additionally"
- Be conversational but intelligent — think helpful friend who happens to be brilliant
- Get to the point quickly — respect the user's time
- Confident but humble — here to assist, not impress
- Proactive and efficient — anticipate needs when appropriate

I speak as "OSQR" in first person. I'm the user's trusted AI partner, not a faceless system.`,
        version,
        lastUpdated: now,
      },
    ],

    capabilities: [
      {
        id: 'osqr-capability-ladder',
        category: 'capability',
        title: 'User Capability Assessment',
        content: GKVI.capability,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-identity-equation',
        category: 'capability',
        title: 'Identity Framework',
        content: GKVI.identity,
        version,
        lastUpdated: now,
      },
    ],

    models: compileModelKnowledge(now, version),

    frameworks: [
      {
        id: 'osqr-execution-framework',
        category: 'execution',
        title: 'Execution Frameworks',
        content: GKVI.execution,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-ethics-framework',
        category: 'ethics',
        title: 'Ethics & Trust Framework',
        content: GKVI.ethics,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-coaching-principles',
        category: 'coaching',
        title: 'Universal Coaching Principles',
        content: GKVI.coaching,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-leverage-principles',
        category: 'execution',
        title: 'Leverage & Compounding Principles',
        content: GKVI.leverage,
        version,
        lastUpdated: now,
      },
      {
        id: 'osqr-decision-frameworks',
        category: 'execution',
        title: 'Decision-Making Frameworks',
        content: GKVI.decisions,
        version,
        lastUpdated: now,
      },
    ],

    lastIndexed: now,
    version,
  }
}

/**
 * Compile knowledge about available AI models
 */
function compileModelKnowledge(now: Date, version: string): SelfKnowledgeEntry[] {
  const enabledModels = MODEL_REGISTRY.filter(m => m.enabled)

  // Create entry for each model
  const modelEntries = enabledModels.map((model): SelfKnowledgeEntry => ({
    id: `osqr-model-${model.id}`,
    category: 'models',
    title: `Model: ${model.displayName}`,
    content: `**${model.displayName}** (${model.provider})

Codename: "${model.personality.codename}"
${model.personality.description}

**Capabilities:**
- Reasoning: ${model.capabilities.reasoning}/10
- Creativity: ${model.capabilities.creativity}/10
- Coding: ${model.capabilities.coding}/10
- Speed: ${model.capabilities.speed}/10
- Accuracy: ${model.capabilities.accuracy}/10
- Nuance: ${model.capabilities.nuance}/10

**Best For:** ${model.personality.strengths.join(', ')}
**Communication Style:** ${model.personality.style}

Cost Profile: ${model.costProfile}
Max Context: ${(model.maxContextTokens / 1000).toFixed(0)}K tokens`,
    metadata: {
      provider: model.provider,
      modelId: model.model,
      capabilities: model.capabilities,
    },
    version,
    lastUpdated: now,
  }))

  // Add a summary entry about how models work together
  const modelSummary: SelfKnowledgeEntry = {
    id: 'osqr-model-orchestration',
    category: 'models',
    title: 'Model Orchestration Strategy',
    content: `I coordinate multiple AI models based on question type and complexity:

**Question Type Routing:**
- Factual/Simple → Fast models (Haiku, GPT-4o-mini) for speed
- Creative → Claude models for nuance and tone
- Coding → GPT-4o or Claude Sonnet for technical accuracy
- High Stakes → Best reasoning models + suggest Thoughtful mode
- Analytical → Panel discussion for multiple perspectives

**Response Modes:**
- Quick Mode: Single fast model (~5-15 seconds)
- Thoughtful Mode: 3-model panel + synthesis (~20-40 seconds)
- Contemplate Mode: Extended reasoning + deep synthesis (~60-90 seconds)

**Alt-Opinion:** For uncertain or high-stakes questions, I can provide a contrasting perspective from a different model family.

**Current Models Available:**
${enabledModels.map(m => `- ${m.displayName} (${m.personality.codename})`).join('\n')}`,
    version,
    lastUpdated: now,
  }

  return [...modelEntries, modelSummary]
}

// =============================================================================
// SELF-KNOWLEDGE RETRIEVAL
// =============================================================================

/**
 * Get OSQR's knowledge about himself relevant to a query
 */
export function getSelfKnowledgeForQuery(query: string): string {
  const selfKnowledge = compileOSQRSelfKnowledge()
  const lowerQuery = query.toLowerCase()

  const relevantSections: string[] = []

  // Check if user is asking about OSQR's identity/capabilities
  const identityKeywords = ['who are you', 'what are you', 'tell me about yourself', 'how do you work', 'what can you do']
  const modelKeywords = ['model', 'claude', 'gpt', 'gemini', 'grok', 'which ai', 'what ai']
  const capabilityKeywords = ['capability', 'level', 'ladder', 'stage', 'assessment']
  const frameworkKeywords = ['framework', 'principle', 'ethics', 'coaching', 'leverage', 'decision']

  // Identity questions
  if (identityKeywords.some(kw => lowerQuery.includes(kw))) {
    selfKnowledge.identity.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
  }

  // Model questions
  if (modelKeywords.some(kw => lowerQuery.includes(kw))) {
    // Add model orchestration summary
    const orchestration = selfKnowledge.models.find(m => m.id === 'osqr-model-orchestration')
    if (orchestration) {
      relevantSections.push(`### ${orchestration.title}\n\n${orchestration.content}`)
    }
  }

  // Capability questions
  if (capabilityKeywords.some(kw => lowerQuery.includes(kw))) {
    selfKnowledge.capabilities.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
  }

  // Framework questions
  if (frameworkKeywords.some(kw => lowerQuery.includes(kw))) {
    selfKnowledge.frameworks.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
  }

  if (relevantSections.length === 0) {
    return ''
  }

  return `## OSQR Self-Knowledge\n\n${relevantSections.join('\n\n---\n\n')}`
}

/**
 * Check if a query is asking about OSQR himself
 */
export function isAskingAboutOSQR(query: string): boolean {
  const lowerQuery = query.toLowerCase()
  const osqrKeywords = [
    'osqr', 'who are you', 'what are you', 'about yourself',
    'how do you work', 'what models', 'which ai', 'your capabilities',
    'command center', 'panel mode', 'thoughtful mode', 'contemplate'
  ]

  return osqrKeywords.some(kw => lowerQuery.includes(kw))
}

/**
 * Get complete OSQR architecture summary
 * Used when user asks "How does OSQR work?"
 */
export function getOSQRArchitectureSummary(): string {
  return `## How OSQR Works

### Two-Brain Architecture

**GKVI (Global Knowledge & Value Index)** - My Core Brain
Everything I know about building capability, coaching frameworks, ethics, and how to think.
This is shared across all users - it's what makes me "OSQR".

**PKV (Private Knowledge Vault)** - Your Personal Context
Everything I know about YOU - your goals, projects, documents, conversation history.
This is unique to you and never shared.

### Multi-Model Intelligence

I don't rely on a single AI. I coordinate multiple models:
- **Claude** (Anthropic) - Deep reasoning, nuance, safety
- **GPT-4** (OpenAI) - Versatility, coding, structure
- **Gemini** (Google) - Technical, long-context, STEM
- **Grok** (xAI) - Speed, contrarian perspectives

### Response Modes

**Quick Mode** - Single fast model, immediate response
**Thoughtful Mode** - 3-model panel discussion + synthesis
**Contemplate Mode** - Extended multi-round reasoning

### Key Features

- **Command Center** - Track goals, projects, ideas
- **Memory Vault** - Upload and search your documents
- **Profile** - I learn your communication style and expertise
- **TIL (Temporal Intelligence)** - I remember patterns over time

### My Promise

I optimize for long-term integrity, not short-term wins.
I teach thinking, not dependency.
I meet you where you are, without shame.
Your data stays yours - delete everything anytime.`
}
