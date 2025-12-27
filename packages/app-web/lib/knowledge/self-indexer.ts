/**
 * OSQR Self-Indexer
 *
 * This is what makes OSQR "know himself" - indexing his constitution,
 * values, and philosophy into searchable knowledge.
 *
 * What gets indexed (SHAREABLE):
 * 1. Constitution and core commitments
 * 2. Philosophy on growth, guidance, imagination
 * 3. Capability ladder and coaching frameworks
 * 4. Ethics and privacy commitments
 *
 * What is NOT indexed (INTERNAL):
 * - Model names and providers
 * - Routing logic and implementation details
 * - Pricing and infrastructure
 *
 * @see docs/architecture/SELF_DISCLOSURE_SPEC.md
 */

import { prisma } from '@/lib/db/prisma'
import { GKVI, type GKVISection } from './gkvi'

// =============================================================================
// TYPES
// =============================================================================

export interface SelfKnowledgeEntry {
  id: string
  category: 'constitution' | 'identity' | 'capability' | 'ethics' | 'coaching' | 'execution'
  title: string
  content: string
  metadata?: Record<string, unknown>
  version: string
  lastUpdated: Date
}

export interface OSQRSelfKnowledge {
  constitution: SelfKnowledgeEntry[]
  identity: SelfKnowledgeEntry[]
  capabilities: SelfKnowledgeEntry[]
  frameworks: SelfKnowledgeEntry[]
  lastIndexed: Date
  version: string
}

// =============================================================================
// OSQR SELF-KNOWLEDGE COMPILATION
// =============================================================================

/**
 * Compile OSQR's complete self-knowledge from all sources
 * This is what OSQR "knows about himself" — only shareable content
 */
export function compileOSQRSelfKnowledge(): OSQRSelfKnowledge {
  const now = new Date()
  const version = '2.0.0'

  return {
    constitution: [
      {
        id: 'osqr-constitution',
        category: 'constitution',
        title: 'OSQR Constitution',
        content: GKVI.constitution,
        version,
        lastUpdated: now,
      },
    ],

    identity: [
      {
        id: 'osqr-voice-style',
        category: 'identity',
        title: 'OSQR Communication Style',
        content: `How I communicate:
- Write like a human having a natural conversation — warm, clear, engaging
- Use simple, direct language that's easy to read and understand
- NO corporate jargon, NO academic formality
- Be conversational but intelligent
- Get to the point quickly — respect the user's time
- Confident but humble — here to assist, not impress

I speak in first person. I'm your trusted AI partner.`,
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

    frameworks: [
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

  // Keywords for different types of self-referential questions
  const constitutionKeywords = ['values', 'believe', 'never do', 'commitment', 'promise', 'constitution', 'principles']
  const identityKeywords = ['who are you', 'what are you', 'tell me about yourself', 'what can you do']
  const capabilityKeywords = ['capability', 'level', 'ladder', 'stage', 'assessment']
  const frameworkKeywords = ['framework', 'principle', 'ethics', 'coaching', 'leverage', 'decision']
  const philosophyKeywords = ['philosophy', 'growth', 'how do you think', 'approach', 'how do you help']

  // Constitution/values questions - share the constitution
  if (constitutionKeywords.some(kw => lowerQuery.includes(kw)) ||
      philosophyKeywords.some(kw => lowerQuery.includes(kw))) {
    selfKnowledge.constitution.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
  }

  // Identity questions - include constitution + voice
  if (identityKeywords.some(kw => lowerQuery.includes(kw))) {
    selfKnowledge.constitution.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
    selfKnowledge.identity.forEach(entry => {
      relevantSections.push(`### ${entry.title}\n\n${entry.content}`)
    })
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
    'osqr', 'oscar', 'who are you', 'what are you', 'about yourself',
    'how do you work', 'your values', 'your capabilities', 'what do you believe',
    'your philosophy', 'your commitments', 'what will you never'
  ]

  return osqrKeywords.some(kw => lowerQuery.includes(kw))
}

/**
 * Get complete OSQR architecture summary
 * Used when user asks "How does OSQR work?"
 * NOTE: Does not include model details - those are implementation
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

### Response Modes

**Quick Mode** - Direct, efficient response for straightforward questions
**Thoughtful Mode** - Deeper consideration with multiple perspectives
**Contemplate Mode** - Extended reasoning for complex problems

### Key Features

- **Command Center** - Track goals, projects, ideas
- **Memory Vault** - Upload and search your documents
- **Profile** - I learn your communication style and expertise
- **TIL (Temporal Intelligence)** - I remember patterns over time

### My Commitments

I optimize for long-term integrity, not short-term wins.
I teach thinking, not dependency.
I meet you where you are, without shame.
I will never sell your data, deceive you, or remove your agency.
Your data stays yours - delete everything anytime.`
}
