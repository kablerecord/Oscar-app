/**
 * OSQR Model Router
 *
 * Dynamically selects the best AI model based on question type and complexity.
 * "OSQR is the AI that knows when to think."
 *
 * Architecture:
 * 1. MODEL_REGISTRY - Single source of truth for all models & their capabilities
 * 2. detectQuestionType() - Pattern-based question classification
 * 3. routeQuestion() - Combines type + complexity to select optimal model
 * 4. getAlternativeModels() - Finds contrast models for Alt-Opinion feature
 */

import type { ProviderType } from './types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Question types that OSQR can detect
export type QuestionType =
  | 'factual'        // "What is X?" - facts, definitions, lookups
  | 'creative'       // "Write a poem", "Generate ideas" - creative/generative tasks
  | 'coding'         // "Debug this", "Write code" - technical/programming
  | 'analytical'     // "Compare X vs Y", "Analyze" - synthesis/comparison
  | 'reasoning'      // "Why does X happen?", multi-step logic
  | 'summarization'  // "Summarize", "Extract key points"
  | 'conversational' // Casual chat, opinions, discussion
  | 'high_stakes'    // Major decisions, consequential advice
  | 'self_referential' // Questions about OSQR/Oscar himself - fast, uses constitution

// Provider types (expandable for future providers)
export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'xai' | 'mistral' | 'meta'

// Cost profile for billing/budget awareness
export type CostProfile = 'cheap' | 'medium' | 'expensive'

// Model capability scores (0-10 scale)
export interface ModelCapabilities {
  reasoning: number    // Multi-step logic, analysis
  creativity: number   // Creative writing, ideation
  coding: number       // Code generation, debugging
  speed: number        // Response latency
  accuracy: number     // Factual correctness
  nuance: number       // Emotional intelligence, tone
}

// Model personality for Council Mode identity
export interface ModelPersonality {
  codename: string     // e.g., "The Philosopher"
  description: string  // One-sentence personality summary
  strengths: string[]  // What this model excels at
  style: string        // Communication style
}

// Full model definition in the registry
export interface ModelDefinition {
  id: string                    // Unique identifier: "anthropic-claude-sonnet-4"
  provider: ModelProvider
  model: string                 // API model name
  displayName: string           // Human-readable name
  capabilities: ModelCapabilities
  costProfile: CostProfile
  maxContextTokens: number
  enabled: boolean              // Can be toggled off
  enabledForCouncil: boolean    // Available in Council Mode
  personality: ModelPersonality
}

// Model recommendation from the router
export interface ModelRecommendation {
  provider: ProviderType
  model: string
  reason: string
  displayName?: string
  personality?: ModelPersonality
}

// Full routing decision
export interface RoutingDecision {
  questionType: QuestionType
  complexity: number // 1-5 scale
  recommendedModel: ModelRecommendation
  alternativeModels: ModelRecommendation[]
  modeSuggestion: 'none' | 'thoughtful' | 'contemplate'
  confidence: number // 0-1
  shouldSuggestAltOpinion: boolean
}

// ============================================================================
// MODEL REGISTRY - Single Source of Truth
// ============================================================================

/**
 * The Model Registry defines all available models and their characteristics.
 * This is the foundation for:
 * - Quick Mode routing
 * - Thoughtful/Contemplate panel composition
 * - Council Mode model selection
 * - Alt-Opinion contrast matching
 */
export const MODEL_REGISTRY: ModelDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ANTHROPIC - Claude Models
  // Known for: Safety, reasoning, long-context, calm tone
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'anthropic-claude-opus-4',
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4',
    capabilities: {
      reasoning: 10,
      creativity: 9,
      coding: 9,
      speed: 5,
      accuracy: 10,
      nuance: 10,
    },
    costProfile: 'expensive',
    maxContextTokens: 200000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Philosopher',
      description: 'Calm, cautious, deeply logical, extremely reliable.',
      strengths: ['Deep reasoning', 'Nuanced analysis', 'Safety-conscious'],
      style: 'Thoughtful and measured, with careful consideration of implications',
    },
  },
  {
    id: 'anthropic-claude-sonnet-4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    capabilities: {
      reasoning: 9,
      creativity: 9,
      coding: 9,
      speed: 7,
      accuracy: 9,
      nuance: 9,
    },
    costProfile: 'medium',
    maxContextTokens: 200000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Balanced Thinker',
      description: 'Excellent all-rounder with strong creative and analytical abilities.',
      strengths: ['Creative writing', 'Code analysis', 'Balanced perspectives'],
      style: 'Clear, articulate, and adaptable to context',
    },
  },
  {
    id: 'anthropic-claude-3-5-sonnet',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    displayName: 'Claude 3.5 Sonnet',
    capabilities: {
      reasoning: 8,
      creativity: 9,
      coding: 8,
      speed: 7,
      accuracy: 8,
      nuance: 9,
    },
    costProfile: 'medium',
    maxContextTokens: 200000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Empath',
      description: 'Strong emotional intelligence with excellent creative abilities.',
      strengths: ['Emotional nuance', 'Creative writing', 'Tone matching'],
      style: 'Warm, empathetic, and contextually aware',
    },
  },
  {
    id: 'anthropic-claude-haiku',
    provider: 'anthropic',
    model: 'claude-3-5-haiku-latest',
    displayName: 'Claude Haiku',
    capabilities: {
      reasoning: 6,
      creativity: 6,
      coding: 6,
      speed: 10,
      accuracy: 7,
      nuance: 6,
    },
    costProfile: 'cheap',
    maxContextTokens: 200000,
    enabled: true,
    enabledForCouncil: false, // Too fast for visible council
    personality: {
      codename: 'The Speedster',
      description: 'Fast, lightweight Claude for quick tasks with high clarity.',
      strengths: ['Speed', 'Efficiency', 'Clear summaries'],
      style: 'Concise and direct',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPENAI - GPT Models
  // Known for: Versatility, creativity, coding skill, widespread adoption
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'openai-gpt-4o',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    capabilities: {
      reasoning: 8,
      creativity: 9,
      coding: 9,
      speed: 8,
      accuracy: 8,
      nuance: 7,
    },
    costProfile: 'medium',
    maxContextTokens: 128000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Creator',
      description: 'Great at everything: writing, coding, brainstorming, structure.',
      strengths: ['Versatility', 'Code generation', 'Structured output'],
      style: 'Practical, structured, and solution-oriented',
    },
  },
  {
    id: 'openai-gpt-4o-mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    capabilities: {
      reasoning: 6,
      creativity: 6,
      coding: 7,
      speed: 9,
      accuracy: 7,
      nuance: 5,
    },
    costProfile: 'cheap',
    maxContextTokens: 128000,
    enabled: true,
    enabledForCouncil: false,
    personality: {
      codename: 'The Efficient',
      description: 'Cheap, fast, great for routing and simple tasks.',
      strengths: ['Speed', 'Cost efficiency', 'Basic coding'],
      style: 'Brief and functional',
    },
  },
  {
    id: 'openai-gpt-4-1',
    provider: 'openai',
    model: 'gpt-4-1',
    displayName: 'GPT-4.1',
    capabilities: {
      reasoning: 9,
      creativity: 9,
      coding: 9,
      speed: 7,
      accuracy: 9,
      nuance: 8,
    },
    costProfile: 'expensive',
    maxContextTokens: 128000,
    enabled: false, // Enable when API available
    enabledForCouncil: true,
    personality: {
      codename: 'The Generalist',
      description: 'Extremely capable general-purpose model with strong reasoning.',
      strengths: ['Broad intelligence', 'Complex reasoning', 'Creative + analytical'],
      style: 'Confident and comprehensive',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GOOGLE - Gemini Models
  // Known for: Strong multimodality, long-context, STEM capabilities
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'google-gemini-2-pro',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash',
    capabilities: {
      reasoning: 8,
      creativity: 7,
      coding: 9,
      speed: 9,
      accuracy: 8,
      nuance: 6,
    },
    costProfile: 'medium',
    maxContextTokens: 1000000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Engineer',
      description: 'Excellent multimodality, STEM reasoning + code analysis.',
      strengths: ['STEM', 'Code analysis', 'Long context', 'Multimodal'],
      style: 'Technical and precise',
    },
  },
  {
    id: 'google-gemini-2-flash',
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    capabilities: {
      reasoning: 6,
      creativity: 6,
      coding: 7,
      speed: 10,
      accuracy: 7,
      nuance: 5,
    },
    costProfile: 'cheap',
    maxContextTokens: 1000000,
    enabled: false,
    enabledForCouncil: false,
    personality: {
      codename: 'The Lightning',
      description: 'Extremely fast, cheap, high-throughput for interactive apps.',
      strengths: ['Speed', 'Long context', 'Cost efficiency'],
      style: 'Quick and functional',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // xAI - Grok Models
  // Known for: Speed, snarky personality, high recency (data from X)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'xai-grok-2',
    provider: 'xai',
    model: 'grok-2-latest',
    displayName: 'Grok 2',
    capabilities: {
      reasoning: 7,
      creativity: 8,
      coding: 7,
      speed: 9,
      accuracy: 7,
      nuance: 8,
    },
    costProfile: 'medium',
    maxContextTokens: 128000,
    enabled: true,
    enabledForCouncil: true,
    personality: {
      codename: 'The Maverick',
      description: 'Fast, witty, contrarian, great for real-time and current events.',
      strengths: ['Real-time knowledge', 'Contrarian perspectives', 'Speed'],
      style: 'Edgy, direct, and unfiltered',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MISTRAL - Open & Proprietary Models (FUTURE)
  // Known for: Extremely efficient smaller models + great coding skill
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'mistral-large',
    provider: 'mistral',
    model: 'mistral-large-latest',
    displayName: 'Mistral Large',
    capabilities: {
      reasoning: 8,
      creativity: 7,
      coding: 8,
      speed: 7,
      accuracy: 8,
      nuance: 7,
    },
    costProfile: 'medium',
    maxContextTokens: 128000,
    enabled: false,
    enabledForCouncil: true,
    personality: {
      codename: 'The Prodigy',
      description: 'High-quality reasoning with European safety standards.',
      strengths: ['Efficiency', 'Coding', 'Multilingual'],
      style: 'Precise and professional',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // META - Llama Models (FUTURE - for self-hosted)
  // Known for: Best open-source ecosystem + powerful community tooling
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'meta-llama-3-1-405b',
    provider: 'meta',
    model: 'llama-3.1-405b',
    displayName: 'Llama 3.1 405B',
    capabilities: {
      reasoning: 8,
      creativity: 7,
      coding: 8,
      speed: 5,
      accuracy: 8,
      nuance: 6,
    },
    costProfile: 'expensive', // Due to compute requirements
    maxContextTokens: 128000,
    enabled: false,
    enabledForCouncil: true,
    personality: {
      codename: 'The Workhorse',
      description: 'Close to GPT-4 performance with fully open-source access.',
      strengths: ['Open source', 'Customizable', 'Strong coding'],
      style: 'Straightforward and capable',
    },
  },
]

// ============================================================================
// HELPER FUNCTIONS FOR REGISTRY
// ============================================================================

/**
 * Get all enabled models
 */
export function getEnabledModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.enabled)
}

/**
 * Get models enabled for Council Mode
 */
export function getCouncilModels(): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.enabled && m.enabledForCouncil)
}

/**
 * Get a model by ID
 */
export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id)
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider && m.enabled)
}

/**
 * Get the best model for a specific capability
 */
export function getBestModelForCapability(
  capability: keyof ModelCapabilities,
  costLimit?: CostProfile
): ModelDefinition | undefined {
  let models = getEnabledModels()

  if (costLimit) {
    const costOrder = ['cheap', 'medium', 'expensive']
    const maxCostIndex = costOrder.indexOf(costLimit)
    models = models.filter(m => costOrder.indexOf(m.costProfile) <= maxCostIndex)
  }

  return models.sort((a, b) => b.capabilities[capability] - a.capabilities[capability])[0]
}

// ============================================================================
// LEGACY AVAILABLE_MODELS (for backwards compatibility)
// ============================================================================

// Available models for routing (backwards compatible with existing code)
// NOTE: These map to the MODEL_REGISTRY entries
export const AVAILABLE_MODELS = {
  // Fast models for simple/quick tasks
  fast: [
    { provider: 'anthropic' as ProviderType, model: 'claude-3-5-haiku-latest', name: 'Claude Haiku' },
    { provider: 'openai' as ProviderType, model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  // Best for creative writing, emotional tone, nuance
  creative: [
    { provider: 'anthropic' as ProviderType, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { provider: 'anthropic' as ProviderType, model: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
  ],
  // Best for coding, technical tasks
  coding: [
    { provider: 'openai' as ProviderType, model: 'gpt-4o', name: 'GPT-4o' },
    { provider: 'anthropic' as ProviderType, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  ],
  // Best for multi-step reasoning
  reasoning: [
    { provider: 'openai' as ProviderType, model: 'gpt-4o', name: 'GPT-4o' },
    { provider: 'anthropic' as ProviderType, model: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  ],
  // Best for analysis and synthesis
  analytical: [
    { provider: 'anthropic' as ProviderType, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { provider: 'openai' as ProviderType, model: 'gpt-4o', name: 'GPT-4o' },
  ],
  // Best for summarization
  summarization: [
    { provider: 'anthropic' as ProviderType, model: 'claude-3-5-haiku-latest', name: 'Claude Haiku' },
    { provider: 'openai' as ProviderType, model: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  // Default/conversational
  default: [
    { provider: 'anthropic' as ProviderType, model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { provider: 'openai' as ProviderType, model: 'gpt-4o', name: 'GPT-4o' },
  ],
} as const

// Question type detection patterns
const QUESTION_PATTERNS: Record<QuestionType, RegExp[]> = {
  factual: [
    /^what is\b/i,
    /^who is\b/i,
    /^when (was|did|is)\b/i,
    /^where (is|was|are)\b/i,
    /^define\b/i,
    /^how many\b/i,
    /^how much\b/i,
    /\b(capital|population|distance|date|year)\b/i,
    /^is it true that\b/i,
    /^\d+\s*[\+\-\*\/x×÷]\s*\d+/i, // Math expressions
  ],
  creative: [
    /^write\b/i,
    /^create\b/i,
    /^generate\b/i,
    /^compose\b/i,
    /^draft\b/i,
    /\b(poem|story|song|essay|blog|article|headline|slogan)\b/i,
    /\b(brainstorm|ideas for|creative)\b/i,
    /\b(imagine|envision|invent)\b/i,
  ],
  coding: [
    /\b(code|coding|program|programming|script)\b/i,
    /\b(function|class|method|api|endpoint)\b/i,
    /\b(bug|debug|error|fix|refactor)\b/i,
    /\b(typescript|javascript|python|java|react|node|sql)\b/i,
    /```[\s\S]*```/, // Code blocks
    /\b(algorithm|data structure)\b/i,
  ],
  analytical: [
    /\b(compare|contrast|versus|vs\.?|difference between)\b/i,
    /\b(analyze|analysis|evaluate|assessment)\b/i,
    /\b(pros and cons|advantages|disadvantages)\b/i,
    /\b(trade-?offs?|implications)\b/i,
  ],
  reasoning: [
    /^why\b/i,
    /^how does\b/i,
    /^explain\b/i,
    /\b(because|therefore|consequently|implies)\b/i,
    /\b(logic|logical|reasoning|deduce|infer)\b/i,
    /\b(step by step|walk me through)\b/i,
  ],
  summarization: [
    /\b(summarize|summary|tldr|key points|main points)\b/i,
    /\b(extract|condense|distill)\b/i,
    /\b(highlight|overview)\b/i,
  ],
  conversational: [
    /^(hi|hello|hey|thanks|thank you)\b/i,
    /^how are you\b/i,
    /\b(opinion|think about|feel about)\b/i,
    /\b(chat|talk|discuss)\b/i,
  ],
  high_stakes: [
    /\b(should i|would you recommend)\b/i,
    /\b(hire|fire|invest|quit|divorce|buy|sell)\b/i,
    /\b(strategy|strategic|decision|choose|decide)\b/i,
    /\b(equity|salary|compensation|negotiate)\b/i,
    /\b(partner|cofounder|co-founder)\b/i,
    /\b(legal|contract|lawsuit)\b/i,
    /\b(health|medical|diagnosis)\b/i,
    /\b(career|job|offer)\b/i,
  ],
  self_referential: [
    /\b(osqr|oscar)\b/i,
    /\bwho (are|made) you\b/i,
    /\bwhat (are|model) you\b/i,
    /\babout yourself\b/i,
    /\byour (values|constitution|commitments|philosophy|principles)\b/i,
    /\bwhat (will you never|do you believe)\b/i,
    /\bhow do you (work|think|operate)\b/i,
    /\b(openai|anthropic|claude|gpt)\b/i, // Questions probing model identity
  ],
}

// Complexity indicators
const COMPLEXITY_INDICATORS = {
  high: [
    /\b(complex|complicated|nuanced|multifaceted)\b/i,
    /\b(strategy|strategic)\b/i,
    /\b(long-?term|short-?term)\b/i,
    /\b(business|company|organization)\b/i,
    /\b(relationship|family|marriage)\b/i,
    /\?.*\?/, // Multiple questions
    /\b(context|situation|circumstances)\b/i,
  ],
  low: [
    /^(yes|no|true|false)\?$/i,
    /^\d+\s*[\+\-\*\/x×÷]\s*\d+\s*=?\s*\??$/i, // Simple math
    /^(what|who|when|where) is [^?]{1,30}\??$/i, // Short factual
    /^define \w+\??$/i, // Simple definition
  ],
}

/**
 * Detect the question type based on content patterns
 */
export function detectQuestionType(question: string): QuestionType {
  const normalizedQuestion = question.trim().toLowerCase()

  // Check each pattern type in priority order
  const priorityOrder: QuestionType[] = [
    'self_referential', // Questions about OSQR - fast path
    'high_stakes',
    'coding',
    'creative',
    'analytical',
    'reasoning',
    'summarization',
    'factual',
    'conversational',
  ]

  for (const type of priorityOrder) {
    const patterns = QUESTION_PATTERNS[type]
    if (patterns.some(pattern => pattern.test(question))) {
      return type
    }
  }

  return 'conversational' // Default
}

/**
 * Estimate question complexity (1-5 scale)
 */
export function estimateComplexity(question: string): number {
  let score = 2 // Start at medium

  // Check for low complexity indicators
  for (const pattern of COMPLEXITY_INDICATORS.low) {
    if (pattern.test(question)) {
      score -= 1
    }
  }

  // Check for high complexity indicators
  for (const pattern of COMPLEXITY_INDICATORS.high) {
    if (pattern.test(question)) {
      score += 1
    }
  }

  // Length-based adjustments
  const wordCount = question.split(/\s+/).length
  if (wordCount < 5) score -= 1
  if (wordCount > 50) score += 1
  if (wordCount > 100) score += 1

  // Clamp to 1-5 range
  return Math.max(1, Math.min(5, score))
}

/**
 * Get the recommended model based on question type
 */
export function getRecommendedModel(
  questionType: QuestionType,
  complexity: number
): ModelRecommendation {
  // For very low complexity, always use fast models
  if (complexity <= 1) {
    const model = AVAILABLE_MODELS.fast[0]
    return {
      provider: model.provider,
      model: model.model,
      reason: `Simple question → using fast model (${model.name})`,
    }
  }

  // Map question type to model category
  const typeToCategory: Record<QuestionType, keyof typeof AVAILABLE_MODELS> = {
    factual: 'fast',
    creative: 'creative',
    coding: 'coding',
    analytical: 'analytical',
    reasoning: 'reasoning',
    summarization: 'summarization',
    conversational: 'default',
    high_stakes: 'reasoning', // Use best reasoning for high stakes
    self_referential: 'fast', // Questions about OSQR - use fast model, constitution is in prompt
  }

  const category = typeToCategory[questionType]
  const models = AVAILABLE_MODELS[category]

  // For high complexity, prefer the more capable model
  const modelIndex = complexity >= 4 ? 0 : 0 // Could randomize or alternate
  const model = models[modelIndex]

  return {
    provider: model.provider,
    model: model.model,
    reason: `${questionType} question → using ${model.name}`,
  }
}

/**
 * Get alternative models for comparison
 */
export function getAlternativeModels(
  questionType: QuestionType,
  primaryModel: ModelRecommendation
): ModelRecommendation[] {
  const alternatives: ModelRecommendation[] = []

  // Get models from the same category but different provider
  const allModels = Object.values(AVAILABLE_MODELS).flat()

  for (const model of allModels) {
    if (model.provider !== primaryModel.provider) {
      alternatives.push({
        provider: model.provider,
        model: model.model,
        reason: `Alternative: ${model.name}`,
      })
      break // Just get one alternative for now
    }
  }

  return alternatives
}

/**
 * Main routing function - determines the best model for a question
 */
export function routeQuestion(question: string): RoutingDecision {
  const questionType = detectQuestionType(question)
  const complexity = estimateComplexity(question)
  const recommendedModel = getRecommendedModel(questionType, complexity)
  const alternativeModels = getAlternativeModels(questionType, recommendedModel)

  // Determine if we should suggest a different mode
  // Self-referential questions always stay in Quick mode
  let modeSuggestion: 'none' | 'thoughtful' | 'contemplate' = 'none'
  if (questionType !== 'self_referential') {
    if (questionType === 'high_stakes' || complexity >= 4) {
      modeSuggestion = 'thoughtful'
    }
    if (questionType === 'high_stakes' && complexity >= 4) {
      modeSuggestion = 'contemplate'
    }
  }

  // Determine confidence based on pattern matching strength
  const confidence = questionType === 'conversational' ? 0.6 : 0.85

  // Suggest alt-opinion for uncertain or high-stakes questions
  const shouldSuggestAltOpinion =
    confidence < 0.7 ||
    questionType === 'high_stakes' ||
    questionType === 'analytical'

  return {
    questionType,
    complexity,
    recommendedModel,
    alternativeModels,
    modeSuggestion,
    confidence,
    shouldSuggestAltOpinion,
  }
}

/**
 * Enhanced classifier prompt that includes question type detection
 */
export const ENHANCED_CLASSIFIER_PROMPT = `You are OSQR's intelligent question router. Your job is to:
1. Classify the question type
2. Assess complexity
3. Recommend the optimal response approach

## Question Types

Classify into ONE of these categories:
- **factual**: Simple facts, definitions, lookups, math (e.g., "What is 2+2?", "Define photosynthesis")
- **creative**: Writing, brainstorming, generating content (e.g., "Write a poem", "Give me 5 ideas for...")
- **coding**: Programming, debugging, technical implementation (e.g., "Fix this code", "Write a function that...")
- **analytical**: Comparison, analysis, evaluation (e.g., "Compare X vs Y", "What are the pros and cons...")
- **reasoning**: Explanation, logic, understanding why (e.g., "Why does X happen?", "Explain how...")
- **summarization**: Condensing, extracting key points (e.g., "Summarize this", "What are the main points...")
- **conversational**: Casual chat, opinions, discussion (e.g., "What do you think about...", "Hi, how are you")
- **high_stakes**: Major decisions, consequential advice (e.g., "Should I quit my job?", "How do I negotiate equity...")

## Complexity Score (1-5)

1 = Trivial (simple math, yes/no, single fact)
2 = Easy (straightforward how-to, simple explanation)
3 = Medium (requires some synthesis, moderate context)
4 = Complex (multi-faceted, requires expertise)
5 = Very Complex (high stakes, many considerations, significant consequences)

## Model Routing

Based on question type, recommend the optimal model:
- factual/summarization → Fast model (Claude Haiku or GPT-4o-mini)
- creative → Claude (better at creative writing, tone, nuance)
- coding → GPT-4o (strong at code) or Claude Sonnet 4 (also excellent)
- analytical/reasoning → Either works well; Claude for nuance, GPT for structure
- high_stakes → Best available model + suggest Thoughtful mode

## Response Format

Respond with ONLY this JSON:
{
  "questionType": "<one of the types above>",
  "complexity": <1-5>,
  "scores": {
    "clarity": <0-3>,
    "intentDepth": <0-3>,
    "knowledgeRequirement": <0-3>,
    "consequenceWeight": <0-3>
  },
  "totalScore": <0-12>,
  "recommendedModel": {
    "provider": "<openai|anthropic>",
    "model": "<model-id>",
    "reason": "<1 sentence why this model>"
  },
  "modeSuggestion": "<none|thoughtful|contemplate>",
  "confidence": <0.0-1.0>,
  "shouldSuggestAltOpinion": <true|false>,
  "reasoning": "<1-2 sentence explanation>"
}
`
