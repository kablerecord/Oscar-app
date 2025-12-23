/**
 * Classifier - Task Classification using Llama 8B
 *
 * Classifies user input to determine task type and complexity tier.
 */

import type {
  ClassificationResult,
  RouterConfig,
} from './types';
import { ComplexityTier, TaskType, MODEL_REGISTRY } from './types';
import { ClassificationError, TimeoutError } from './errors';
import { getProviderManager } from './providers';

/**
 * Classification system prompt
 */
export const CLASSIFICATION_SYSTEM_PROMPT = `You are a task classifier for OSQR, an AI operating system.
Your job is to analyze user input and determine:
1. What type of task this is
2. How complex it is (which model should handle it)
3. How confident you are in this classification

TASK TYPES:
- intent_classification: Meta-queries about what the user wants
- simple_qa: Factual questions with straightforward answers
- knowledge_lookup: Queries requiring retrieval from knowledge base
- content_generation: Writing, summarizing, creative content
- code_generation: Writing new code
- code_review: Analyzing or debugging existing code
- strategic_planning: Multi-step planning, complex reasoning
- multi_model_deliberation: Requires multiple perspectives (Supreme Court)
- voice_transcription: Audio input processing
- output_validation: Checking/validating previous output
- formatting: Simple reformatting, cleanup

COMPLEXITY TIERS:
- 1 (ROUTING): Classification only, trivial formatting
- 2 (SIMPLE): Lookup, simple Q&A, basic tasks
- 3 (COMPLEX): Content generation, code, nuanced writing
- 4 (STRATEGIC): Deep reasoning, multi-step planning, agentic tasks

CONFIDENCE GUIDELINES:
- 0.9-1.0: Obvious, unambiguous task
- 0.7-0.9: Clear task with some interpretation needed
- 0.5-0.7: Ambiguous, could be multiple types
- Below 0.5: Unclear, needs clarification

Respond ONLY with valid JSON matching this schema:
{
  "taskType": "<task_type>",
  "complexityTier": <1-4>,
  "confidenceScore": <0.0-1.0>,
  "requiredContext": ["<context_key>", ...],
  "reasoning": "<brief explanation>",
  "inputTokenEstimate": <number>
}`;

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate classification result
 */
function validateClassificationResult(result: unknown): result is {
  taskType: string;
  complexityTier: number;
  confidenceScore: number;
  requiredContext: string[];
  reasoning: string;
  inputTokenEstimate: number;
} {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const obj = result as Record<string, unknown>;

  return (
    typeof obj.taskType === 'string' &&
    typeof obj.complexityTier === 'number' &&
    typeof obj.confidenceScore === 'number' &&
    Array.isArray(obj.requiredContext) &&
    typeof obj.reasoning === 'string' &&
    typeof obj.inputTokenEstimate === 'number'
  );
}

/**
 * Parse task type from string
 */
function parseTaskType(taskType: string): TaskType {
  const typeMap: Record<string, TaskType> = {
    'intent_classification': TaskType.INTENT_CLASSIFICATION,
    'simple_qa': TaskType.SIMPLE_QA,
    'knowledge_lookup': TaskType.KNOWLEDGE_LOOKUP,
    'content_generation': TaskType.CONTENT_GENERATION,
    'code_generation': TaskType.CODE_GENERATION,
    'code_review': TaskType.CODE_REVIEW,
    'strategic_planning': TaskType.STRATEGIC_PLANNING,
    'multi_model_deliberation': TaskType.MULTI_MODEL_DELIBERATION,
    'voice_transcription': TaskType.VOICE_TRANSCRIPTION,
    'output_validation': TaskType.OUTPUT_VALIDATION,
    'formatting': TaskType.FORMATTING,
  };

  return typeMap[taskType] || TaskType.SIMPLE_QA;
}

/**
 * Parse complexity tier from number
 */
function parseComplexityTier(tier: number): ComplexityTier {
  if (tier >= 1 && tier <= 4) {
    return tier as ComplexityTier;
  }
  return ComplexityTier.SIMPLE;
}

/**
 * Classify input using the lightweight model
 */
export async function classifyInput(
  input: string,
  config?: Partial<RouterConfig>
): Promise<ClassificationResult> {
  const startTime = Date.now();
  const timeoutMs = config?.classificationTimeoutMs || 5000;

  const providerManager = getProviderManager();

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError('Classification', timeoutMs));
      }, timeoutMs);
    });

    // Create the classification promise
    const classificationPromise = providerManager.complete(
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: input },
        ],
        temperature: 0.1,
        maxTokens: 256,
        responseFormat: 'json',
      },
      MODEL_REGISTRY
    );

    // Race between classification and timeout
    const response = await Promise.race([classificationPromise, timeoutPromise]);

    // Parse the response
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch (e) {
      throw new ClassificationError(`Failed to parse classification JSON: ${response.content}`);
    }

    // Validate the result
    if (!validateClassificationResult(parsed)) {
      throw new ClassificationError('Invalid classification result structure');
    }

    return {
      taskType: parseTaskType(parsed.taskType),
      complexityTier: parseComplexityTier(parsed.complexityTier),
      confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore)),
      requiredContext: parsed.requiredContext,
      reasoning: parsed.reasoning,
      inputTokenEstimate: parsed.inputTokenEstimate || estimateTokens(input),
      timestamp: new Date(),
    };
  } catch (error) {
    if (error instanceof TimeoutError || error instanceof ClassificationError) {
      throw error;
    }

    // Wrap other errors
    if (error instanceof Error) {
      throw new ClassificationError(error.message);
    }

    throw new ClassificationError('Unknown classification error');
  }
}

/**
 * Quick classification heuristics (no LLM call)
 * Used as a fallback or for very obvious cases
 */
export function quickClassify(input: string): ClassificationResult {
  const lowerInput = input.toLowerCase();
  const inputTokens = estimateTokens(input);

  // Very short inputs are usually simple
  if (input.length < 20) {
    return {
      taskType: TaskType.SIMPLE_QA,
      complexityTier: ComplexityTier.SIMPLE,
      confidenceScore: 0.6,
      requiredContext: [],
      reasoning: 'Short input, likely simple query',
      inputTokenEstimate: inputTokens,
      timestamp: new Date(),
    };
  }

  // Code-related keywords
  if (
    lowerInput.includes('function') ||
    lowerInput.includes('code') ||
    lowerInput.includes('debug') ||
    lowerInput.includes('implement') ||
    lowerInput.includes('python') ||
    lowerInput.includes('javascript') ||
    lowerInput.includes('typescript')
  ) {
    return {
      taskType: lowerInput.includes('debug') || lowerInput.includes('fix')
        ? TaskType.CODE_REVIEW
        : TaskType.CODE_GENERATION,
      complexityTier: ComplexityTier.COMPLEX,
      confidenceScore: 0.75,
      requiredContext: ['project_context'],
      reasoning: 'Code-related keywords detected',
      inputTokenEstimate: inputTokens,
      timestamp: new Date(),
    };
  }

  // Writing/content keywords
  if (
    lowerInput.includes('write') ||
    lowerInput.includes('create') ||
    lowerInput.includes('draft') ||
    lowerInput.includes('compose') ||
    lowerInput.includes('blog') ||
    lowerInput.includes('article')
  ) {
    return {
      taskType: TaskType.CONTENT_GENERATION,
      complexityTier: ComplexityTier.COMPLEX,
      confidenceScore: 0.7,
      requiredContext: ['user_preferences'],
      reasoning: 'Content generation keywords detected',
      inputTokenEstimate: inputTokens,
      timestamp: new Date(),
    };
  }

  // Planning/strategy keywords
  if (
    lowerInput.includes('plan') ||
    lowerInput.includes('strategy') ||
    lowerInput.includes('roadmap') ||
    lowerInput.includes('architecture') ||
    lowerInput.includes('design')
  ) {
    return {
      taskType: TaskType.STRATEGIC_PLANNING,
      complexityTier: ComplexityTier.STRATEGIC,
      confidenceScore: 0.7,
      requiredContext: ['project_context'],
      reasoning: 'Strategic planning keywords detected',
      inputTokenEstimate: inputTokens,
      timestamp: new Date(),
    };
  }

  // Question words suggest simple Q&A
  if (
    lowerInput.startsWith('what') ||
    lowerInput.startsWith('who') ||
    lowerInput.startsWith('when') ||
    lowerInput.startsWith('where') ||
    lowerInput.startsWith('how')
  ) {
    return {
      taskType: TaskType.SIMPLE_QA,
      complexityTier: ComplexityTier.SIMPLE,
      confidenceScore: 0.65,
      requiredContext: [],
      reasoning: 'Question format detected',
      inputTokenEstimate: inputTokens,
      timestamp: new Date(),
    };
  }

  // Default to simple task
  return {
    taskType: TaskType.SIMPLE_QA,
    complexityTier: ComplexityTier.SIMPLE,
    confidenceScore: 0.5,
    requiredContext: [],
    reasoning: 'No specific patterns detected, defaulting to simple',
    inputTokenEstimate: inputTokens,
    timestamp: new Date(),
  };
}

/**
 * Get task type display name
 */
export function getTaskTypeDisplayName(taskType: TaskType): string {
  const displayNames: Record<TaskType, string> = {
    intent_classification: 'Intent Classification',
    simple_qa: 'Simple Q&A',
    knowledge_lookup: 'Knowledge Lookup',
    content_generation: 'Content Generation',
    code_generation: 'Code Generation',
    code_review: 'Code Review',
    strategic_planning: 'Strategic Planning',
    multi_model_deliberation: 'Multi-Model Deliberation',
    voice_transcription: 'Voice Transcription',
    output_validation: 'Output Validation',
    formatting: 'Formatting',
  };

  return displayNames[taskType] || taskType;
}

/**
 * Get complexity tier display name
 */
export function getComplexityTierDisplayName(tier: ComplexityTier): string {
  const displayNames: Record<ComplexityTier, string> = {
    [ComplexityTier.ROUTING]: 'Routing (Tier 1)',
    [ComplexityTier.SIMPLE]: 'Simple (Tier 2)',
    [ComplexityTier.COMPLEX]: 'Complex (Tier 3)',
    [ComplexityTier.STRATEGIC]: 'Strategic (Tier 4)',
  };

  return displayNames[tier] || `Tier ${tier}`;
}

// Alias for classifyInput (for compatibility with tests)
export { classifyInput as classifyTask };

/**
 * Parse classification response JSON
 */
export function parseClassificationResponse(json: string): ClassificationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('Failed to parse classification JSON');
  }

  if (!validateClassificationResult(parsed)) {
    throw new Error('Invalid classification result structure');
  }

  return {
    taskType: parseTaskType(parsed.taskType),
    complexityTier: parseComplexityTier(parsed.complexityTier),
    confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore)),
    requiredContext: parsed.requiredContext,
    reasoning: parsed.reasoning,
    inputTokenEstimate: parsed.inputTokenEstimate,
    timestamp: new Date(),
  };
}

/**
 * Detect task type from input (heuristic)
 */
export function detectTaskType(input: string): TaskType {
  const lowerInput = input.toLowerCase();

  // Code-related
  if (
    lowerInput.includes('write') &&
    (lowerInput.includes('function') ||
      lowerInput.includes('code') ||
      lowerInput.includes('component'))
  ) {
    return TaskType.CODE_GENERATION;
  }
  if (lowerInput.includes('create') && lowerInput.includes('component')) {
    return TaskType.CODE_GENERATION;
  }
  if (lowerInput.includes('implement')) {
    return TaskType.CODE_GENERATION;
  }
  if (
    lowerInput.includes('review') ||
    lowerInput.includes('debug') ||
    lowerInput.includes('find') && lowerInput.includes('error')
  ) {
    return TaskType.CODE_REVIEW;
  }

  // Writing/content
  if (
    lowerInput.includes('write') &&
    (lowerInput.includes('blog') ||
      lowerInput.includes('email') ||
      lowerInput.includes('article'))
  ) {
    return TaskType.CONTENT_GENERATION;
  }
  if (lowerInput.includes('summarize')) {
    return TaskType.CONTENT_GENERATION;
  }

  // Planning
  if (
    lowerInput.includes('plan') ||
    lowerInput.includes('design') &&
      (lowerInput.includes('architecture') || lowerInput.includes('system'))
  ) {
    return TaskType.STRATEGIC_PLANNING;
  }
  if (lowerInput.includes('roadmap')) {
    return TaskType.STRATEGIC_PLANNING;
  }

  // Default to simple Q&A
  return TaskType.SIMPLE_QA;
}

/**
 * Estimate complexity from input and task type
 */
export function estimateComplexity(
  input: string,
  taskType: TaskType
): ComplexityTier {
  // Very short inputs are trivial
  if (input.length < 10) {
    return ComplexityTier.ROUTING;
  }

  // Task-based complexity
  if (taskType === TaskType.STRATEGIC_PLANNING || taskType === TaskType.MULTI_MODEL_DELIBERATION) {
    return ComplexityTier.STRATEGIC;
  }

  if (taskType === TaskType.CODE_GENERATION || taskType === TaskType.CODE_REVIEW) {
    return ComplexityTier.COMPLEX;
  }

  if (taskType === TaskType.CONTENT_GENERATION) {
    // Long content requests are complex
    if (input.length > 200) {
      return ComplexityTier.STRATEGIC;
    }
    return ComplexityTier.COMPLEX;
  }

  // Simple by default
  return ComplexityTier.SIMPLE;
}
