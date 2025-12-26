/**
 * OpenAI LLM Adapter
 *
 * Implements the LLMAdapter interface from @osqr/core using
 * OpenAI's chat completions API for text analysis tasks.
 */

import type { LLMAdapter } from '@osqr/core/src/document-indexing/adapters/types'
import type { EntityReference } from '@osqr/core/src/document-indexing/types'
import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors when API key isn't set
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Use GPT-4o-mini for cost efficiency on simple tasks
const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * OpenAI-based LLM adapter for text analysis tasks
 *
 * Uses GPT-4o-mini for cost efficiency:
 * - Summary generation
 * - Question generation (for multi-vector embeddings)
 * - Entity extraction
 * - Semantic flag detection (decision/question/action)
 */
export const openAILLMAdapter: LLMAdapter = {
  /**
   * Generate a concise summary of text
   */
  async generateSummary(text: string, maxLength = 200): Promise<string> {
    // Truncate input to avoid token limits
    const truncatedText = text.slice(0, 8000)

    try {
      const response = await getOpenAI().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: `Summarize the following text in ${Math.ceil(maxLength / 4)} words or less. Be concise and capture the main points.`,
          },
          {
            role: 'user',
            content: truncatedText,
          },
        ],
        max_tokens: Math.ceil(maxLength / 2),
        temperature: 0.3,
      })

      return response.choices[0]?.message?.content?.trim() || text.slice(0, maxLength)
    } catch (error) {
      console.error('[LLM Adapter] Summary generation failed:', error)
      // Fallback to first paragraph or truncated text
      const firstParagraph = text.split(/\n\s*\n/)[0] || ''
      return firstParagraph.slice(0, maxLength).trim() + (firstParagraph.length > maxLength ? '...' : '')
    }
  },

  /**
   * Generate hypothetical questions that the text might answer
   * Used for multi-vector embeddings to improve retrieval
   */
  async generateQuestions(text: string, count = 3): Promise<string[]> {
    // Truncate input
    const truncatedText = text.slice(0, 4000)

    try {
      const response = await getOpenAI().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: `Generate ${count} questions that someone might ask that this text would answer. Return only the questions, one per line, no numbering or bullets.`,
          },
          {
            role: 'user',
            content: truncatedText,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      })

      const content = response.choices[0]?.message?.content || ''
      const questions = content
        .split('\n')
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && q.endsWith('?'))
        .slice(0, count)

      return questions.length > 0 ? questions : ['What is this about?']
    } catch (error) {
      console.error('[LLM Adapter] Question generation failed:', error)
      // Fallback to basic questions based on patterns
      return generateFallbackQuestions(text, count)
    }
  },

  /**
   * Extract named entities from text
   */
  async extractEntities(text: string): Promise<EntityReference[]> {
    // Truncate input
    const truncatedText = text.slice(0, 6000)

    try {
      const response = await getOpenAI().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: `Extract named entities from the text. Return a JSON array with objects containing:
- "type": one of "person", "company", "concept", "technology", "place"
- "name": the entity name
- "mentions": number of times mentioned (count occurrences)

Only include entities mentioned explicitly. Return valid JSON array only, no other text.`,
          },
          {
            role: 'user',
            content: truncatedText,
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      })

      const content = response.choices[0]?.message?.content || '[]'
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []

      const entities = JSON.parse(jsonMatch[0]) as Array<{
        type: string
        name: string
        mentions: number
      }>

      return entities.map((e) => ({
        type: e.type as EntityReference['type'],
        name: e.name,
        mentions: e.mentions || 1,
        positions: [], // Would need more complex extraction to get positions
      }))
    } catch (error) {
      console.error('[LLM Adapter] Entity extraction failed:', error)
      return []
    }
  },

  /**
   * Detect if text contains a decision, question, or action item
   */
  async detectSemanticFlags(text: string): Promise<{
    isDecision: boolean
    isQuestion: boolean
    isAction: boolean
  }> {
    // For short texts, use fast heuristics
    if (text.length < 500) {
      return detectSemanticFlagsFast(text)
    }

    try {
      const response = await getOpenAI().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: `Analyze this text and determine if it contains:
1. A DECISION: A choice or determination that was made (e.g., "we decided to...", "I chose...", "the decision is...")
2. A QUESTION: A direct question or inquiry (ends with ? or asks something)
3. An ACTION ITEM: A task, commitment, or thing to do (e.g., "I will...", "need to...", "TODO:", "should...")

Return JSON only: {"isDecision": boolean, "isQuestion": boolean, "isAction": boolean}`,
          },
          {
            role: 'user',
            content: text.slice(0, 2000),
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content || '{}'
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return detectSemanticFlagsFast(text)

      const flags = JSON.parse(jsonMatch[0])
      return {
        isDecision: Boolean(flags.isDecision),
        isQuestion: Boolean(flags.isQuestion),
        isAction: Boolean(flags.isAction),
      }
    } catch (error) {
      console.error('[LLM Adapter] Semantic flag detection failed:', error)
      return detectSemanticFlagsFast(text)
    }
  },

  /**
   * Generate a change summary comparing two versions of text
   */
  async generateChangeSummary(oldText: string, newText: string): Promise<string> {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Compare the old and new versions of this text and describe what changed in one sentence.',
          },
          {
            role: 'user',
            content: `OLD VERSION:\n${oldText.slice(0, 3000)}\n\nNEW VERSION:\n${newText.slice(0, 3000)}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      })

      return response.choices[0]?.message?.content?.trim() || 'Content was modified.'
    } catch (error) {
      console.error('[LLM Adapter] Change summary failed:', error)
      return 'Content was modified.'
    }
  },
}

/**
 * Fast heuristic-based semantic flag detection
 * Used as fallback or for short texts
 */
function detectSemanticFlagsFast(text: string): {
  isDecision: boolean
  isQuestion: boolean
  isAction: boolean
} {
  const lowerText = text.toLowerCase()

  // Decision patterns
  const isDecision =
    /\b(decided|decision|chose|chosen|determined|concluded|resolved|agreed|settled on|opted for|going with|we will use|i will use)\b/i.test(
      text
    )

  // Question patterns
  const isQuestion =
    text.includes('?') ||
    /^(what|who|where|when|why|how|is|are|can|could|would|should|do|does|did)\b/i.test(
      text.trim()
    )

  // Action patterns
  const isAction =
    /\b(todo|to-do|action item|need to|needs to|have to|must|should|will|going to|plan to|want to|deadline|by tomorrow|by next|asap)\b/i.test(
      lowerText
    ) || /^[-*]\s*\[[ x]?\]/m.test(text) // Checkbox patterns

  return { isDecision, isQuestion, isAction }
}

/**
 * Generate fallback questions based on text patterns
 */
function generateFallbackQuestions(text: string, count: number): string[] {
  const questions: string[] = []

  if (/decision|decided|chose/i.test(text)) {
    questions.push('What decisions were made?')
  }
  if (/how|process|step/i.test(text)) {
    questions.push('How does this work?')
  }
  if (/why|reason|because/i.test(text)) {
    questions.push('Why was this approach chosen?')
  }
  if (/what|define|mean/i.test(text)) {
    questions.push('What does this mean?')
  }
  if (/when|date|deadline/i.test(text)) {
    questions.push('When does this happen?')
  }

  // Default if no patterns match
  if (questions.length === 0) {
    questions.push('What is this about?')
  }

  return questions.slice(0, count)
}
