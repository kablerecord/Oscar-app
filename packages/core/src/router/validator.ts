/**
 * Validator - LLM-as-Judge Validation
 *
 * Validates model responses for quality, accuracy, and safety.
 */

import type {
  ValidationResult,
  ValidationIssue,
  RouterConfig,
} from './types';
import { MODEL_REGISTRY } from './types';
import { ValidationError, TimeoutError } from './errors';
import { getProviderManager } from './providers';

/**
 * Validation system prompt
 */
export const VALIDATION_SYSTEM_PROMPT = `You are a validation agent for OSQR.
Your job is to check if an AI response is valid and appropriate.

Check for:
1. FORMAT: Is the response properly structured? Valid JSON if expected?
2. HALLUCINATION: Does it make claims that seem unfounded or invented?
3. COMPLETENESS: Does it fully address the original request?
4. RELEVANCE: Is it on-topic and relevant?
5. SAFETY: Any concerning content?

Respond ONLY with valid JSON:
{
  "isValid": <boolean>,
  "issues": [
    {
      "type": "format|hallucination|incomplete|off_topic|safety",
      "severity": "warning|error",
      "description": "<specific issue>",
      "location": "<where in response, if applicable>"
    }
  ],
  "shouldEscalate": <boolean>,
  "suggestedRepair": "<feedback for repair loop, if needed>"
}`;

/**
 * Validate classification result
 */
function validateValidationResult(result: unknown): result is {
  isValid: boolean;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    location?: string;
  }>;
  shouldEscalate: boolean;
  suggestedRepair?: string;
} {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const obj = result as Record<string, unknown>;

  return (
    typeof obj.isValid === 'boolean' &&
    Array.isArray(obj.issues) &&
    typeof obj.shouldEscalate === 'boolean'
  );
}

/**
 * Validate a model response using LLM-as-Judge
 */
export async function validateResponse(
  originalInput: string,
  modelResponse: string,
  config?: Partial<RouterConfig>
): Promise<ValidationResult> {
  const timeoutMs = config?.validationTimeoutMs || 5000;

  const providerManager = getProviderManager();

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError('Validation', timeoutMs));
      }, timeoutMs);
    });

    // Create the validation prompt
    const validationPrompt = `ORIGINAL REQUEST:
${originalInput}

MODEL RESPONSE:
${modelResponse}`;

    // Create the validation promise
    const validationPromise = providerManager.complete(
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
          { role: 'user', content: validationPrompt },
        ],
        temperature: 0.1,
        maxTokens: 512,
        responseFormat: 'json',
      },
      MODEL_REGISTRY
    );

    // Race between validation and timeout
    const response = await Promise.race([validationPromise, timeoutPromise]);

    // Parse the response
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch (e) {
      throw new ValidationError(['Failed to parse validation JSON']);
    }

    // Validate the result
    if (!validateValidationResult(parsed)) {
      throw new ValidationError(['Invalid validation result structure']);
    }

    // Parse issues
    const issues: ValidationIssue[] = parsed.issues.map((issue) => ({
      type: issue.type as ValidationIssue['type'],
      severity: issue.severity as ValidationIssue['severity'],
      description: issue.description,
      location: issue.location,
    }));

    return {
      isValid: parsed.isValid,
      validationModel: 'llama-3.1-8b-instant',
      issues,
      shouldEscalate: parsed.shouldEscalate,
      suggestedRepair: parsed.suggestedRepair,
    };
  } catch (error) {
    if (error instanceof TimeoutError || error instanceof ValidationError) {
      throw error;
    }

    // Wrap other errors
    if (error instanceof Error) {
      throw new ValidationError([error.message]);
    }

    throw new ValidationError(['Unknown validation error']);
  }
}

/**
 * Quick validation heuristics (no LLM call)
 * Used for very basic checks
 */
export function quickValidate(
  originalInput: string,
  modelResponse: string
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check for empty response
  if (!modelResponse || modelResponse.trim().length === 0) {
    issues.push({
      type: 'incomplete',
      severity: 'error',
      description: 'Response is empty',
    });
  }

  // Check for very short response
  if (modelResponse.length < 10 && originalInput.length > 50) {
    issues.push({
      type: 'incomplete',
      severity: 'warning',
      description: 'Response is very short relative to input',
    });
  }

  // Check for error indicators
  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /failed to/i,
    /cannot process/i,
    /i cannot/i,
    /i'm sorry, i cannot/i,
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(modelResponse)) {
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        description: 'Response contains potential error indicators',
      });
      break;
    }
  }

  // Check for safety concerns
  const safetyPatterns = [
    /\bharm\b/i,
    /\billegal\b/i,
    /\bviolence\b/i,
    /\bhack\b/i,
    /\bexploit\b/i,
  ];

  for (const pattern of safetyPatterns) {
    if (pattern.test(modelResponse) && !pattern.test(originalInput)) {
      issues.push({
        type: 'safety',
        severity: 'warning',
        description: 'Response contains potentially sensitive content',
      });
      break;
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    validationModel: 'quick-validate',
    issues,
    shouldEscalate: hasErrors,
  };
}

/**
 * Check if validation should be skipped based on confidence
 */
export function shouldSkipValidation(
  confidenceScore: number,
  config: Partial<RouterConfig> = {}
): boolean {
  const highConfidenceThreshold = config.highConfidenceThreshold || 0.95;
  return confidenceScore >= highConfidenceThreshold;
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  let shouldEscalate = false;
  const repairs: string[] = [];

  for (const result of results) {
    allIssues.push(...result.issues);
    if (result.shouldEscalate) {
      shouldEscalate = true;
    }
    if (result.suggestedRepair) {
      repairs.push(result.suggestedRepair);
    }
  }

  // Deduplicate issues by description
  const uniqueIssues = allIssues.filter(
    (issue, index, self) =>
      index === self.findIndex((i) => i.description === issue.description)
  );

  const hasErrors = uniqueIssues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    validationModel: 'merged',
    issues: uniqueIssues,
    shouldEscalate,
    suggestedRepair: repairs.length > 0 ? repairs.join('; ') : undefined,
  };
}

/**
 * Get issue count by type
 */
export function getIssueCountByType(
  issues: ValidationIssue[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const issue of issues) {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
  }

  return counts;
}

/**
 * Get issue count by severity
 */
export function getIssueCountBySeverity(
  issues: ValidationIssue[]
): { warnings: number; errors: number } {
  return {
    warnings: issues.filter((i) => i.severity === 'warning').length,
    errors: issues.filter((i) => i.severity === 'error').length,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Valid: ${result.isValid ? 'Yes' : 'No'}`);
  lines.push(`Validator: ${result.validationModel}`);

  if (result.issues.length > 0) {
    lines.push(`Issues (${result.issues.length}):`);
    for (const issue of result.issues) {
      lines.push(`  - [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description}`);
    }
  }

  if (result.shouldEscalate) {
    lines.push('Escalation recommended');
  }

  if (result.suggestedRepair) {
    lines.push(`Suggested repair: ${result.suggestedRepair}`);
  }

  return lines.join('\n');
}
