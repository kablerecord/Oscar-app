/**
 * OSQR Synthesis Layer
 *
 * This is what gives OSQR his unified voice - taking multi-model outputs
 * and synthesizing them into a single, coherent response that sounds like OSQR.
 *
 * The Synthesis Layer:
 * 1. Extracts key insights from each model's response
 * 2. Identifies agreement, disagreement, and unique perspectives
 * 3. Merges into unified OSQR voice
 * 4. Applies OSQR communication style
 * 5. Adds confidence indicators
 *
 * @see lib/ai/model-router.ts for model selection
 * @see lib/knowledge/gkvi.ts for OSQR's core knowledge
 */

import { getOSQRIdentity, getGlobalContext } from '@/lib/knowledge/gkvi'
import type { ProviderType } from './types'

// =============================================================================
// TYPES
// =============================================================================

export interface ModelResponse {
  provider: ProviderType
  model: string
  displayName: string
  content: string
  latencyMs: number
  personality?: {
    codename: string
    description: string
  }
}

export interface SynthesisInput {
  question: string
  questionType: string
  complexity: number
  userLevel?: number
  responses: ModelResponse[]
  userContext?: string
}

export interface SynthesisOutput {
  synthesizedResponse: string
  confidence: number
  consensusLevel: 'high' | 'medium' | 'low' | 'divergent'
  keyInsights: string[]
  dissent?: string
  metadata: {
    modelsUsed: string[]
    synthesisTimeMs: number
    totalTokensEstimate: number
  }
}

// =============================================================================
// SYNTHESIS PROMPTS
// =============================================================================

const SYNTHESIS_SYSTEM_PROMPT = `You are OSQR's synthesis engine - the final voice that speaks to users.

Your job: Take insights from multiple AI models and create ONE unified response in OSQR's voice.

## OSQR Voice Guidelines

1. **Natural & Warm** - Write like a brilliant friend, not a corporate assistant
2. **Clear & Direct** - Get to the point. Respect the user's time.
3. **Confident but Humble** - You're here to help, not impress
4. **Practical** - Focus on actionable insights
5. **First Person** - You ARE OSQR. Say "I" not "the models suggest"

## Synthesis Rules

1. **Don't cite models by name** unless the user specifically asked for multiple perspectives
2. **Extract the best insights** from each model and present them naturally
3. **If models agree**: Present the consensus clearly and confidently
4. **If models disagree**: Explain the different viewpoints simply, then give your recommendation
5. **Never just list** what each model said - synthesize into unified insight
6. **Match the question's depth** - simple questions get simple answers

## What NOT to do

- Don't say "Claude suggests X while GPT says Y"
- Don't use "furthermore", "moreover", "additionally"
- Don't be overly formal or academic
- Don't hedge excessively - be helpful even with uncertainty
- Don't repeat the question back

## Format

Start with the key insight or answer. Then provide context if needed. End with any important caveats or next steps.`

/**
 * Build the synthesis prompt for combining model outputs
 */
function buildSynthesisPrompt(input: SynthesisInput): string {
  const { question, questionType, complexity, userLevel, responses, userContext } = input

  // Format each model's response
  const modelResponses = responses.map(r => `
**${r.displayName}** ${r.personality ? `(${r.personality.codename})` : ''}:
${r.content}
`).join('\n---\n')

  return `# Synthesis Task

## User's Question
"${question}"

## Question Analysis
- Type: ${questionType}
- Complexity: ${complexity}/5
${userLevel !== undefined ? `- User Capability Level: ${userLevel}/12` : ''}

${userContext ? `## User Context\n${userContext}\n` : ''}

## Model Responses

${modelResponses}

## Your Task

Synthesize these perspectives into a single, unified OSQR response.

Remember:
- You ARE OSQR speaking directly to the user
- Don't mention the individual models unless specifically asked
- Extract the best insights and present them naturally
- If there's disagreement, explain it simply and give your recommendation
- Match your depth to the question's complexity (${complexity}/5)
${userLevel !== undefined && userLevel <= 3 ? '- User is at foundation level - be patient and encouraging' : ''}
${userLevel !== undefined && userLevel >= 7 ? '- User is advanced - match their sophistication' : ''}

Respond naturally as OSQR:`
}

// =============================================================================
// CORE SYNTHESIS FUNCTIONS
// =============================================================================

/**
 * Analyze consensus among model responses
 */
export function analyzeConsensus(responses: ModelResponse[]): {
  level: 'high' | 'medium' | 'low' | 'divergent'
  agreements: string[]
  disagreements: string[]
} {
  if (responses.length < 2) {
    return { level: 'high', agreements: [], disagreements: [] }
  }

  // Simple heuristic: check for similar key phrases
  // In production, this would use embeddings for semantic similarity
  const keyPhrases = responses.map(r => {
    const content = r.content.toLowerCase()
    // Extract key sentences (first 3 sentences usually contain main point)
    const sentences = content.split(/[.!?]+/).slice(0, 3).filter(s => s.length > 20)
    return sentences
  })

  // Count phrase overlap
  const allPhrases = keyPhrases.flat()
  const uniqueThemes = new Set(allPhrases.map(p => p.slice(0, 50))) // Rough dedup

  // Heuristic: if less than 30% unique themes, high consensus
  const uniquenessRatio = uniqueThemes.size / (allPhrases.length || 1)

  let level: 'high' | 'medium' | 'low' | 'divergent'
  if (uniquenessRatio < 0.3) level = 'high'
  else if (uniquenessRatio < 0.5) level = 'medium'
  else if (uniquenessRatio < 0.7) level = 'low'
  else level = 'divergent'

  return {
    level,
    agreements: [], // Would extract in full implementation
    disagreements: [],
  }
}

/**
 * Extract key insights from model responses
 */
export function extractKeyInsights(responses: ModelResponse[]): string[] {
  const insights: string[] = []

  responses.forEach(response => {
    // Simple extraction: first substantive sentence from each model
    const sentences = response.content.split(/[.!?]+/).filter(s => s.trim().length > 30)
    if (sentences[0]) {
      insights.push(sentences[0].trim())
    }
  })

  return insights.slice(0, 5) // Max 5 key insights
}

/**
 * Create fallback synthesis when AI synthesis isn't available
 * This provides a reasonable response structure without an AI call
 */
export function createFallbackSynthesis(input: SynthesisInput): SynthesisOutput {
  const { responses, question } = input
  const consensus = analyzeConsensus(responses)
  const keyInsights = extractKeyInsights(responses)

  // Pick the most comprehensive response as base
  const bestResponse = responses.reduce((best, current) =>
    current.content.length > best.content.length ? current : best
  , responses[0])

  // Simple synthesis: use best response with light framing
  let synthesized = bestResponse.content

  // If divergent, add note
  if (consensus.level === 'divergent' && responses.length > 1) {
    synthesized = `${bestResponse.content}\n\n*Note: There were varying perspectives on this. ${responses.filter(r => r !== bestResponse).map(r => r.displayName).join(' and ')} offered different viewpoints that may also be worth considering.*`
  }

  return {
    synthesizedResponse: synthesized,
    confidence: consensus.level === 'high' ? 0.9 : consensus.level === 'medium' ? 0.75 : 0.6,
    consensusLevel: consensus.level,
    keyInsights,
    metadata: {
      modelsUsed: responses.map(r => r.displayName),
      synthesisTimeMs: 0,
      totalTokensEstimate: responses.reduce((sum, r) => sum + Math.ceil(r.content.length / 4), 0),
    },
  }
}

/**
 * Main synthesis function - combines multi-model responses into unified OSQR voice
 *
 * In Quick mode (single model), this is a passthrough.
 * In Thoughtful/Contemplate mode, this synthesizes multiple perspectives.
 */
export async function synthesize(
  input: SynthesisInput,
  synthesisModel?: { provider: ProviderType; model: string }
): Promise<SynthesisOutput> {
  const startTime = Date.now()

  // Single response - just pass through with OSQR framing
  if (input.responses.length === 1) {
    return {
      synthesizedResponse: input.responses[0].content,
      confidence: 0.85,
      consensusLevel: 'high',
      keyInsights: extractKeyInsights(input.responses),
      metadata: {
        modelsUsed: [input.responses[0].displayName],
        synthesisTimeMs: Date.now() - startTime,
        totalTokensEstimate: Math.ceil(input.responses[0].content.length / 4),
      },
    }
  }

  // Multiple responses - need actual synthesis
  // If no synthesis model provided, use fallback
  if (!synthesisModel) {
    return createFallbackSynthesis(input)
  }

  // Build synthesis prompt
  const prompt = buildSynthesisPrompt(input)
  const consensus = analyzeConsensus(input.responses)
  const keyInsights = extractKeyInsights(input.responses)

  // Call synthesis model
  // This would be implemented with actual API call
  // For now, return fallback
  const fallback = createFallbackSynthesis(input)

  return {
    ...fallback,
    consensusLevel: consensus.level,
    keyInsights,
    metadata: {
      ...fallback.metadata,
      synthesisTimeMs: Date.now() - startTime,
    },
  }
}

/**
 * Quick synthesis for single-model responses
 * Just applies OSQR voice guidelines without AI call
 */
export function quickSynthesize(response: ModelResponse): SynthesisOutput {
  return {
    synthesizedResponse: response.content,
    confidence: 0.85,
    consensusLevel: 'high',
    keyInsights: [response.content.split('.')[0]].filter(Boolean),
    metadata: {
      modelsUsed: [response.displayName],
      synthesisTimeMs: 0,
      totalTokensEstimate: Math.ceil(response.content.length / 4),
    },
  }
}

// =============================================================================
// SYNTHESIS PROMPT GENERATOR
// =============================================================================

/**
 * Get the synthesis system prompt for a given context
 */
export function getSynthesisSystemPrompt(userLevel?: number): string {
  let prompt = SYNTHESIS_SYSTEM_PROMPT

  // Add level-specific guidance
  if (userLevel !== undefined) {
    if (userLevel <= 3) {
      prompt += `\n\n## User Level Note\nThis user is at foundation level (${userLevel}/12). Be patient, encouraging, and use simpler language. Focus on small, actionable steps.`
    } else if (userLevel >= 7) {
      prompt += `\n\n## User Level Note\nThis user is advanced (${userLevel}/12). Match their sophistication. Think strategically. Challenge them when appropriate.`
    }
  }

  return prompt
}

/**
 * Get OSQR's voice identity for synthesis
 */
export function getOSQRVoiceIdentity(): string {
  return getOSQRIdentity() + '\n\n' + getGlobalContext('coaching')
}
