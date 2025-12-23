/**
 * @osqr/core - Operating System for Quantum Reasoning
 *
 * The brain library for OSQR. Exports all core components for integration.
 *
 * Usage:
 *   import { Constitutional, Router, MemoryVault, Council, Guidance, Temporal, Bubble } from '@osqr/core';
 *
 * Or import specific items:
 *   import { validateIntent, validateOutput } from '@osqr/core/constitutional';
 */

// ============================================================================
// Core Components as Namespaces
// ============================================================================

export * as Constitutional from './constitutional';
export * as Router from './router';
export * as MemoryVault from './memory-vault';
export * as Council from './council';
export * as Guidance from './guidance';
export * as Temporal from './temporal-intelligence';
export * as Bubble from './bubble';
export * as DesignSystem from './design-system';
export * as DocumentIndexing from './document-indexing';
export * as Throttle from './throttle';

// ============================================================================
// Key Router Enums (commonly used directly)
// ============================================================================
export { TaskType, ComplexityTier, ModelProvider } from './router';

// ============================================================================
// Key Throttle Types and Functions (commonly used directly)
// ============================================================================
export type { BudgetPersistenceAdapter, DailyBudget, Tier, BudgetState } from './throttle';
export { setPersistenceAdapter, getPersistenceAdapter, hasPersistenceAdapter } from './throttle';
