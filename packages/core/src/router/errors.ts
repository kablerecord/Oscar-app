/**
 * Router Errors
 *
 * Custom error types for the Multi-Model Router.
 */

import type { RouterErrorCode, MergeReadinessPack } from './types';

/**
 * Base router error class
 */
export class RouterError extends Error {
  public readonly code: RouterErrorCode;
  public readonly retryable: boolean;
  public readonly mrp?: Partial<MergeReadinessPack>;

  constructor(
    code: RouterErrorCode,
    message: string,
    retryable: boolean = false,
    mrp?: Partial<MergeReadinessPack>
  ) {
    super(message);
    this.name = 'RouterError';
    this.code = code;
    this.retryable = retryable;
    this.mrp = mrp;
  }
}

/**
 * Classification failed error
 */
export class ClassificationError extends RouterError {
  constructor(message: string, mrp?: Partial<MergeReadinessPack>) {
    super('CLASSIFICATION_FAILED', message, true, mrp);
    this.name = 'ClassificationError';
  }
}

/**
 * Routing failed error
 */
export class RoutingError extends RouterError {
  constructor(message: string, mrp?: Partial<MergeReadinessPack>) {
    super('ROUTING_FAILED', message, false, mrp);
    this.name = 'RoutingError';
  }
}

/**
 * Model unavailable error
 */
export class ModelUnavailableError extends RouterError {
  public readonly modelId: string;

  constructor(modelId: string, mrp?: Partial<MergeReadinessPack>) {
    super('MODEL_UNAVAILABLE', `Model ${modelId} is unavailable`, true, mrp);
    this.name = 'ModelUnavailableError';
    this.modelId = modelId;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends RouterError {
  public readonly operation: string;
  public readonly timeoutMs: number;

  constructor(
    operation: string,
    timeoutMs: number,
    mrp?: Partial<MergeReadinessPack>
  ) {
    super(
      'TIMEOUT',
      `${operation} timed out after ${timeoutMs}ms`,
      true,
      mrp
    );
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Validation failed error
 */
export class ValidationError extends RouterError {
  public readonly issues: string[];

  constructor(issues: string[], mrp?: Partial<MergeReadinessPack>) {
    super(
      'VALIDATION_FAILED',
      `Validation failed: ${issues.join(', ')}`,
      false,
      mrp
    );
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * Provider error (API errors from Groq/Anthropic)
 */
export class ProviderError extends RouterError {
  public readonly provider: string;
  public readonly originalError: Error;

  constructor(
    provider: string,
    originalError: Error,
    mrp?: Partial<MergeReadinessPack>
  ) {
    const isRetryable = isRetryableProviderError(originalError);
    super(
      'PROVIDER_ERROR',
      `Provider ${provider} error: ${originalError.message}`,
      isRetryable,
      mrp
    );
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
  }
}

/**
 * Invalid request error
 */
export class InvalidRequestError extends RouterError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super('INVALID_REQUEST', message, false);
    this.name = 'InvalidRequestError';
    this.field = field;
  }
}

/**
 * Check if a provider error is retryable
 */
function isRetryableProviderError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Rate limit errors are retryable
  if (message.includes('rate limit') || message.includes('429')) {
    return true;
  }

  // Service unavailable is retryable
  if (
    message.includes('service unavailable') ||
    message.includes('503') ||
    message.includes('502')
  ) {
    return true;
  }

  // Connection errors are retryable
  if (
    message.includes('connection') ||
    message.includes('network') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // Timeout is retryable
  if (message.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Check if an error is a RouterError
 */
export function isRouterError(error: unknown): error is RouterError {
  return error instanceof RouterError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): RouterErrorCode {
  if (isRouterError(error)) {
    return error.code;
  }
  return 'PROVIDER_ERROR';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isRouterError(error)) {
    return error.retryable;
  }

  if (error instanceof Error) {
    return isRetryableProviderError(error);
  }

  return false;
}
