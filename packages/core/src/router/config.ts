/**
 * Router Configuration
 *
 * Loads configuration from environment variables with defaults.
 */

import type { RouterConfig, RetryConfig } from './types';
import { DEFAULT_ROUTER_CONFIG, DEFAULT_RETRY_CONFIG } from './types';

/**
 * Load router configuration from environment
 */
export function loadRouterConfig(): RouterConfig {
  return {
    escalationThreshold: parseFloat(
      process.env.OSQR_ROUTER_ESCALATION_THRESHOLD || String(DEFAULT_ROUTER_CONFIG.escalationThreshold)
    ),
    highConfidenceThreshold: parseFloat(
      process.env.OSQR_ROUTER_HIGH_CONFIDENCE_THRESHOLD || String(DEFAULT_ROUTER_CONFIG.highConfidenceThreshold)
    ),
    maxEscalations: parseInt(
      process.env.OSQR_ROUTER_MAX_ESCALATIONS || String(DEFAULT_ROUTER_CONFIG.maxEscalations),
      10
    ),
    maxValidationRetries: parseInt(
      process.env.OSQR_ROUTER_MAX_VALIDATION_RETRIES || String(DEFAULT_ROUTER_CONFIG.maxValidationRetries),
      10
    ),
    classificationTimeoutMs: parseInt(
      process.env.OSQR_ROUTER_CLASSIFICATION_TIMEOUT_MS || String(DEFAULT_ROUTER_CONFIG.classificationTimeoutMs),
      10
    ),
    routingTimeoutMs: parseInt(
      process.env.OSQR_ROUTER_ROUTING_TIMEOUT_MS || String(DEFAULT_ROUTER_CONFIG.routingTimeoutMs),
      10
    ),
    validationTimeoutMs: parseInt(
      process.env.OSQR_ROUTER_VALIDATION_TIMEOUT_MS || String(DEFAULT_ROUTER_CONFIG.validationTimeoutMs),
      10
    ),
    enableValidation:
      process.env.OSQR_ROUTER_ENABLE_VALIDATION !== 'false',
    enableMrpGeneration:
      process.env.OSQR_ROUTER_ENABLE_MRP_GENERATION !== 'false',
    enableCostTracking:
      process.env.OSQR_ROUTER_ENABLE_COST_TRACKING !== 'false',
  };
}

/**
 * Load retry configuration from environment
 */
export function loadRetryConfig(): RetryConfig {
  return {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: parseInt(
      process.env.OSQR_ROUTER_MAX_RETRIES || String(DEFAULT_RETRY_CONFIG.maxRetries),
      10
    ),
    baseDelayMs: parseInt(
      process.env.OSQR_ROUTER_BASE_DELAY_MS || String(DEFAULT_RETRY_CONFIG.baseDelayMs),
      10
    ),
    maxDelayMs: parseInt(
      process.env.OSQR_ROUTER_MAX_DELAY_MS || String(DEFAULT_RETRY_CONFIG.maxDelayMs),
      10
    ),
  };
}

/**
 * Get API keys from environment
 */
export function getApiKeys(): { groqApiKey: string | null; anthropicApiKey: string | null } {
  return {
    groqApiKey: process.env.GROQ_API_KEY || null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  };
}

/**
 * Check if required API keys are configured
 */
export function hasRequiredApiKeys(): { groq: boolean; anthropic: boolean } {
  const keys = getApiKeys();
  return {
    groq: Boolean(keys.groqApiKey),
    anthropic: Boolean(keys.anthropicApiKey),
  };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: RouterConfig): string[] {
  const errors: string[] = [];

  if (config.escalationThreshold < 0 || config.escalationThreshold > 1) {
    errors.push('escalationThreshold must be between 0 and 1');
  }

  if (config.highConfidenceThreshold < 0 || config.highConfidenceThreshold > 1) {
    errors.push('highConfidenceThreshold must be between 0 and 1');
  }

  if (config.escalationThreshold >= config.highConfidenceThreshold) {
    errors.push('escalationThreshold must be less than highConfidenceThreshold');
  }

  if (config.maxEscalations < 0) {
    errors.push('maxEscalations must be non-negative');
  }

  if (config.maxValidationRetries < 0) {
    errors.push('maxValidationRetries must be non-negative');
  }

  if (config.classificationTimeoutMs < 100) {
    errors.push('classificationTimeoutMs must be at least 100ms');
  }

  if (config.routingTimeoutMs < 10) {
    errors.push('routingTimeoutMs must be at least 10ms');
  }

  if (config.validationTimeoutMs < 100) {
    errors.push('validationTimeoutMs must be at least 100ms');
  }

  return errors;
}
