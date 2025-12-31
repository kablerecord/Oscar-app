/**
 * LLM-Based Fact Extraction
 *
 * Uses Claude to intelligently extract facts from conversations.
 * Replaces regex-based extraction with semantic understanding.
 *
 * AUTONOMOUS DECISION: Using Anthropic SDK directly instead of router
 * to keep extraction lightweight and avoid circular dependencies.
 */

import type {
  Conversation,
  SemanticMemory,
  MemoryCategory,
  Entity,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Entity extracted from conversation
 */
export interface ExtractedEntity {
  name: string;
  type: 'person' | 'company' | 'project' | 'place' | 'product' | 'technology' | 'other';
}

/**
 * Temporal context for time-sensitive facts
 */
export interface TemporalContext {
  isTimeSensitive: boolean;
  validUntil?: Date;
  mentionedDate?: Date;
}

/**
 * Enhanced extracted fact with LLM-powered analysis
 */
export interface ExtractedFact {
  content: string;
  category: MemoryCategory;
  confidence: number;
  topics: string[];
  entities: ExtractedEntity[];
  temporalContext?: TemporalContext;
  reasoning: string;
  contradicts?: string[];
  supersedes?: string[];
}

/**
 * Contradiction result between new and existing facts
 */
export interface ContradictionResult {
  newFactContent: string;
  existingMemoryId: string;
  existingContent: string;
  resolution: 'keep_existing' | 'replace_with_new' | 'keep_both';
  reasoning: string;
}

/**
 * LLM Extractor configuration
 */
export interface LLMExtractorConfig {
  /** Model to use for extraction (haiku for speed, sonnet for quality) */
  model: 'haiku' | 'sonnet' | 'opus';
  /** Minimum confidence to include a fact */
  minConfidence: number;
  /** Maximum facts to extract per conversation */
  maxFacts: number;
  /** API key (defaults to env var) */
  apiKey?: string;
}

const DEFAULT_CONFIG: LLMExtractorConfig = {
  model: 'haiku',
  minConfidence: 0.6,
  maxFacts: 20,
};

// ============================================================================
// Prompts
// ============================================================================

const EXTRACTION_PROMPT = `You are analyzing a conversation to extract factual information about the user.
Extract discrete, memorable facts that would be useful in future conversations.

CATEGORIES (extract into these):
- personal_info: Name, background, identity facts
- business_info: Companies, roles, industries, professional context
- relationships: People mentioned (colleagues, family, friends)
- projects: Active work, products being built, goals
- preferences: How user likes to work, communication style
- domain_knowledge: Areas of expertise, skills
- decisions: Choices made with rationale
- commitments: Promises, deadlines, obligations

FOR EACH FACT:
1. Extract the specific information (be precise, not vague)
2. Assign a confidence score (0.0-1.0)
3. Identify the category
4. Extract relevant topics (2-5 keywords)
5. Note any entities (people, companies, projects)
6. Check if time-sensitive (e.g., "launching next month")
7. Briefly explain why this is worth remembering

IMPORTANT:
- Only extract facts the USER stated or clearly implied
- Do NOT extract assistant statements as user facts
- Prefer specific over general (e.g., "building OSQR" not "building software")
- If uncertain, lower the confidence score
- Ignore pleasantries and meta-conversation
- Extract at most ${DEFAULT_CONFIG.maxFacts} facts

OUTPUT FORMAT (JSON array):
[
  {
    "content": "User is building OSQR, an AI operating system",
    "category": "projects",
    "confidence": 0.95,
    "topics": ["osqr", "ai", "operating system"],
    "entities": [{"name": "OSQR", "type": "project"}],
    "temporalContext": {"isTimeSensitive": false},
    "reasoning": "Explicitly stated project with clear description"
  }
]

If no extractable facts are found, return an empty array: []

CONVERSATION:
{conversation}

{existingContext}`;

const SUMMARY_PROMPT = `Generate a concise summary of this conversation.
Focus on what was discussed, what was accomplished, and any key outcomes.
Keep it to 2-3 sentences maximum.

CONVERSATION:
{conversation}

SUMMARY:`;

const CONTRADICTION_PROMPT = `Compare these new facts against existing knowledge to detect contradictions.

NEW FACTS:
{newFacts}

EXISTING KNOWLEDGE:
{existingMemories}

For each potential contradiction, determine:
1. Is there actually a contradiction? (same topic with conflicting info)
2. Which is more likely to be current/accurate?
3. Should we: keep_existing, replace_with_new, or keep_both (if context-dependent)?

OUTPUT FORMAT (JSON array):
[
  {
    "newFactContent": "User works at Acme Corp",
    "existingMemoryId": "mem_123",
    "existingContent": "User works at OldCo",
    "resolution": "replace_with_new",
    "reasoning": "User stated new employer in recent conversation"
  }
]

If no contradictions, return an empty array: []`;

// ============================================================================
// Model Mapping
// ============================================================================

const MODEL_MAP = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

// ============================================================================
// LLM Extractor Implementation
// ============================================================================

/**
 * Call the Anthropic API with retry logic
 * AUTONOMOUS DECISION: Implementing direct API call to avoid dependency on router
 * which may have circular import issues with memory-vault
 */
async function callLLM(
  prompt: string,
  config: LLMExtractorConfig
): Promise<string> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[LLMExtractor] No API key available, returning empty result');
    return '[]';
  }

  const modelId = MODEL_MAP[config.model];
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      return data.content?.[0]?.text || '[]';
    } catch (error) {
      console.error(`[LLMExtractor] Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  console.warn('[LLMExtractor] All retries failed, returning empty result');
  return '[]';
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
function parseJSONResponse<T>(response: string, fallback: T): T {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[LLMExtractor] Failed to parse JSON response:', error);
    return fallback;
  }
}

/**
 * Format conversation for prompt
 */
function formatConversation(conversation: Conversation): string {
  return conversation.messages
    .map((m) => {
      const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
      return `${role}: ${m.content}`;
    })
    .join('\n\n');
}

/**
 * Format existing memories for context
 */
function formatExistingMemories(memories: SemanticMemory[]): string {
  if (memories.length === 0) {
    return '';
  }

  const memoryText = memories
    .slice(0, 20) // Limit context size
    .map((m) => `- [${m.category}] ${m.content}`)
    .join('\n');

  return `\nEXISTING KNOWLEDGE (check for updates/contradictions):\n${memoryText}`;
}

/**
 * Extract facts from a conversation using LLM
 */
export async function extractFacts(
  conversation: Conversation,
  existingMemories: SemanticMemory[] = [],
  config: Partial<LLMExtractorConfig> = {}
): Promise<ExtractedFact[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Skip empty conversations
  if (conversation.messages.length === 0) {
    return [];
  }

  // Skip conversations with no user messages
  const userMessages = conversation.messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    return [];
  }

  // Build prompt
  const conversationText = formatConversation(conversation);
  const existingContext = formatExistingMemories(existingMemories);

  const prompt = EXTRACTION_PROMPT
    .replace('{conversation}', conversationText)
    .replace('{existingContext}', existingContext);

  // Call LLM
  const response = await callLLM(prompt, cfg);

  // Parse response
  const rawFacts = parseJSONResponse<any[]>(response, []);

  // Validate and filter facts
  const facts: ExtractedFact[] = rawFacts
    .filter((f) => {
      // Basic validation
      if (!f.content || typeof f.content !== 'string') return false;
      if (!f.category || !isValidCategory(f.category)) return false;
      if (typeof f.confidence !== 'number') return false;
      return f.confidence >= cfg.minConfidence;
    })
    .map((f) => ({
      content: f.content,
      category: f.category as MemoryCategory,
      confidence: Math.max(0, Math.min(1, f.confidence)),
      topics: Array.isArray(f.topics) ? f.topics : [],
      entities: Array.isArray(f.entities)
        ? f.entities.filter((e: any) => e.name && e.type)
        : [],
      temporalContext: f.temporalContext
        ? {
            isTimeSensitive: Boolean(f.temporalContext.isTimeSensitive),
            validUntil: f.temporalContext.validUntil
              ? new Date(f.temporalContext.validUntil)
              : undefined,
            mentionedDate: f.temporalContext.mentionedDate
              ? new Date(f.temporalContext.mentionedDate)
              : undefined,
          }
        : undefined,
      reasoning: f.reasoning || '',
    }))
    .slice(0, cfg.maxFacts);

  return facts;
}

/**
 * Generate a summary for a conversation
 */
export async function generateSummary(
  conversation: Conversation,
  config: Partial<LLMExtractorConfig> = {}
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (conversation.messages.length === 0) {
    return 'Empty conversation.';
  }

  const conversationText = formatConversation(conversation);
  const prompt = SUMMARY_PROMPT.replace('{conversation}', conversationText);

  const response = await callLLM(prompt, cfg);

  // Clean up response (remove any leading/trailing whitespace or quotes)
  return response.trim().replace(/^["']|["']$/g, '');
}

/**
 * Detect contradictions between new facts and existing memories
 */
export async function detectContradictions(
  newFacts: ExtractedFact[],
  existingMemories: SemanticMemory[],
  config: Partial<LLMExtractorConfig> = {}
): Promise<ContradictionResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (newFacts.length === 0 || existingMemories.length === 0) {
    return [];
  }

  // Format facts for prompt
  const newFactsText = newFacts
    .map((f, i) => `${i + 1}. [${f.category}] ${f.content}`)
    .join('\n');

  const existingText = existingMemories
    .slice(0, 30) // Limit context
    .map((m) => `- ID: ${m.id} [${m.category}] ${m.content}`)
    .join('\n');

  const prompt = CONTRADICTION_PROMPT
    .replace('{newFacts}', newFactsText)
    .replace('{existingMemories}', existingText);

  const response = await callLLM(prompt, cfg);
  const results = parseJSONResponse<any[]>(response, []);

  // Validate and return
  return results
    .filter((r) => {
      return (
        r.newFactContent &&
        r.existingMemoryId &&
        r.existingContent &&
        ['keep_existing', 'replace_with_new', 'keep_both'].includes(r.resolution)
      );
    })
    .map((r) => ({
      newFactContent: r.newFactContent,
      existingMemoryId: r.existingMemoryId,
      existingContent: r.existingContent,
      resolution: r.resolution as ContradictionResult['resolution'],
      reasoning: r.reasoning || '',
    }));
}

/**
 * Check if a category is valid
 */
function isValidCategory(category: string): category is MemoryCategory {
  const validCategories: MemoryCategory[] = [
    'personal_info',
    'business_info',
    'relationships',
    'projects',
    'preferences',
    'domain_knowledge',
    'decisions',
    'commitments',
  ];
  return validCategories.includes(category as MemoryCategory);
}

/**
 * Synthesize facts using LLM extraction
 * This is the main entry point that integrates with the existing synthesis pipeline
 */
export async function synthesizeWithLLM(
  conversation: Conversation,
  existingMemories: SemanticMemory[] = [],
  config: Partial<LLMExtractorConfig> = {}
): Promise<{
  facts: ExtractedFact[];
  summary: string;
  contradictions: ContradictionResult[];
}> {
  // Extract facts
  const facts = await extractFacts(conversation, existingMemories, config);

  // Generate summary
  const summary = await generateSummary(conversation, config);

  // Detect contradictions
  const contradictions = await detectContradictions(facts, existingMemories, config);

  // Mark facts that should supersede existing memories
  for (const contradiction of contradictions) {
    if (contradiction.resolution === 'replace_with_new') {
      const fact = facts.find((f) => f.content === contradiction.newFactContent);
      if (fact) {
        fact.supersedes = fact.supersedes || [];
        fact.supersedes.push(contradiction.existingMemoryId);
      }
    }
  }

  return { facts, summary, contradictions };
}

// ============================================================================
// Exports
// ============================================================================

export {
  extractFacts as extractFactsWithLLM,
  generateSummary as generateConversationSummaryWithLLM,
  detectContradictions as detectContradictionsWithLLM,
};
